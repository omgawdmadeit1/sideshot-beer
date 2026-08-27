import assert from "node:assert/strict";
import { test } from "node:test";
import {
  captureWaitlist,
  createLocalStore,
  createNotifyEmailStore,
  createNotionStore,
  createResendStore,
  isValidEmail,
  normalizeEmail,
  parseWaitlistPayload,
  resolveStoresFromEnv,
} from "../lib/waitlist.js";

function memoryFileStore(seed = []) {
  let rows = [...seed];
  return {
    async read() {
      return [...rows];
    },
    async write(next) {
      rows = [...next];
    },
    snapshot() {
      return rows;
    },
  };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  };
}

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  Alex@SIDESHOT.beer "), "alex@sideshot.beer");
});

test("isValidEmail rejects junk", () => {
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail("a@b"), false);
  assert.equal(isValidEmail("ok@sideshot.beer"), true);
});

test("parseWaitlistPayload requires 21+ and a real email", () => {
  assert.equal(parseWaitlistPayload({ email: "ok@sideshot.beer" }).ok, false);
  assert.equal(
    parseWaitlistPayload({ email: "ok@sideshot.beer", ageConfirmed: true }).ok,
    true,
  );
  assert.equal(parseWaitlistPayload({ email: "nope", ageConfirmed: true }).ok, false);
});

test("honeypot is treated as silent spam success", () => {
  const parsed = parseWaitlistPayload({
    email: "bot@spam.test",
    ageConfirmed: true,
    website: "https://spam.example",
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.spam, true);
});

test("local store saves once and then reports already joined", async () => {
  const files = memoryFileStore();
  const store = createLocalStore(files);
  const signup = {
    email: "first@sideshot.beer",
    source: "homepage",
    interest: ["SafeShot"],
    notes: "",
  };
  const first = await store.save(signup);
  const second = await store.save(signup);
  assert.equal(first.alreadyJoined, false);
  assert.equal(second.alreadyJoined, true);
  assert.equal(files.snapshot().length, 1);
});

test("captureWaitlist never succeeds when every store fails", async () => {
  const result = await captureWaitlist(
    { email: "real@sideshot.beer", ageConfirmed: true },
    [
      {
        name: "down",
        async save() {
          throw new Error("network down");
        },
      },
    ],
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 502);
});

test("captureWaitlist succeeds only after a durable write", async () => {
  const files = memoryFileStore();
  const result = await captureWaitlist(
    {
      email: "quest@sideshot.beer",
      ageConfirmed: true,
      source: "safeshot",
      interest: ["SafeShot", "merch"],
    },
    [createLocalStore(files)],
  );
  assert.equal(result.ok, true);
  assert.equal(result.alreadyJoined, false);
  assert.equal(files.snapshot()[0].email, "quest@sideshot.beer");
});

test("captureWaitlist with no stores configured returns 503", async () => {
  const result = await captureWaitlist(
    { email: "real@sideshot.beer", ageConfirmed: true },
    [],
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
});

test("spam honeypot does not write", async () => {
  const files = memoryFileStore();
  const result = await captureWaitlist(
    { email: "bot@spam.test", ageConfirmed: true, website: "http://x" },
    [createLocalStore(files)],
  );
  assert.equal(result.ok, true);
  assert.equal(result.spam, true);
  assert.equal(files.snapshot().length, 0);
});

test("Notion store writes the SIDESHOT Waitlist schema", async () => {
  const calls = [];
  const store = createNotionStore({
    token: "secret-token",
    databaseId: "2c3dc9f4c4454e3ebd1248d8aaed2818",
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (String(url).includes("/query")) {
        return jsonResponse(200, { results: [] });
      }
      return jsonResponse(200, { id: "page_123" });
    },
  });
  const saved = await store.save({
    email: "cadence@sideshot.beer",
    source: "homepage",
    interest: ["cans"],
    notes: "launch pack",
  });
  assert.equal(saved.id, "page_123");
  const write = calls.find((call) => call.url === "https://api.notion.com/v1/pages");
  assert.ok(write);
  const payload = JSON.parse(write.init.body);
  assert.equal(payload.parent.database_id, "2c3dc9f4c4454e3ebd1248d8aaed2818");
  assert.equal(payload.properties.Email.title[0].text.content, "cadence@sideshot.beer");
  assert.equal(payload.properties.Source.select.name, "homepage");
  assert.equal(payload.properties.Interest.multi_select[0].name, "cans");
});

test("notify and resend stores fail closed on HTTP errors", async () => {
  const notify = createNotifyEmailStore({
    to: "founder@sideshot.beer",
    fetch: async () => jsonResponse(500, { error: "nope" }),
  });
  await assert.rejects(() =>
    notify.save({
      email: "x@sideshot.beer",
      source: "other",
      interest: [],
      notes: "",
    }),
  );

  const resend = createResendStore({
    apiKey: "re_test",
    to: "founder@sideshot.beer",
    fetch: async () => jsonResponse(401, { message: "bad key" }),
  });
  await assert.rejects(() =>
    resend.save({
      email: "x@sideshot.beer",
      source: "other",
      interest: [],
      notes: "",
    }),
  );
});

test("resolveStoresFromEnv keeps production from using local-only success", () => {
  const stores = resolveStoresFromEnv(
    { NODE_ENV: "production" },
    { fetch: async () => jsonResponse(200, {}) },
  );
  assert.equal(stores.length, 0);
});

test("resolveStoresFromEnv wires Notion + notify when configured", () => {
  const stores = resolveStoresFromEnv(
    {
      NODE_ENV: "production",
      NOTION_TOKEN: "ntn_test",
      WAITLIST_NOTIFY_EMAIL: "josephlamartaylor@icloud.com",
    },
    { fetch: async () => jsonResponse(200, {}) },
  );
  assert.deepEqual(
    stores.map((store) => store.name),
    ["notion", "notify"],
  );
});
