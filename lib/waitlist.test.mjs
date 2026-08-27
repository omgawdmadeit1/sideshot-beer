import { strict as assert } from "node:assert";
import {
  handleWaitlistRequest,
  isValidEmail,
  normalizeEmail,
  parseWaitlistInput,
  persistWaitlistSignup,
  safeshotConfig,
} from "./waitlist.mjs";

function pass(name) {
  console.log(`ok  ${name}`);
}

{
  assert.equal(normalizeEmail("  A@B.COM "), "a@b.com");
  assert.equal(isValidEmail("a@b.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  pass("email normalize + validate");
}

{
  const bad = parseWaitlistInput({ email: "nope", ageConfirmed: true });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /valid email/i);
  pass("rejects invalid email");
}

{
  const underage = parseWaitlistInput({ email: "ok@sideshot.beer", ageConfirmed: false });
  assert.equal(underage.ok, false);
  assert.match(underage.error, /21/i);
  pass("requires 21+ confirmation");
}

{
  const bot = parseWaitlistInput({
    email: "ok@sideshot.beer",
    ageConfirmed: true,
    website: "https://spam.example",
  });
  assert.equal(bot.ok, true);
  assert.equal(bot.honeypot, true);
  pass("honeypot is silent");
}

{
  const parsed = parseWaitlistInput({
    email: "fan@sideshot.beer",
    ageConfirmed: "on",
    source: "safeshot",
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.signup.source, "safeshot");
  assert.deepEqual(parsed.signup.interests, ["SafeShot"]);
  pass("defaults SafeShot interest from safeshot source");
}

{
  const missing = await persistWaitlistSignup(
    { email: "a@b.com", source: "homepage", interests: ["cans"], notes: "" },
    { VERCEL_ENV: "production" },
  );
  assert.equal(missing.ok, false);
  assert.equal(missing.status, 503);
  assert.match(missing.error, /not saved/i);
  pass("production without Notion does not fake success");
}

{
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (String(url).includes("/query")) {
      return {
        ok: true,
        json: async () => ({ results: [] }),
      };
    }
    return {
      ok: true,
      json: async () => ({ id: "page_1" }),
    };
  };

  const stored = await persistWaitlistSignup(
    { email: "fan@sideshot.beer", source: "homepage", interests: ["cans"], notes: "" },
    { NOTION_TOKEN: "secret", NOTION_WAITLIST_DATABASE_ID: "db_test" },
    fetchImpl,
  );
  assert.equal(stored.ok, true);
  assert.equal(stored.alreadyOnList, false);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /databases\/db_test\/query/);
  assert.match(calls[1].url, /pages$/);
  pass("writes new Notion row after empty lookup");
}

{
  const fetchImpl = async (url) => {
    if (String(url).includes("/query")) {
      return { ok: true, json: async () => ({ results: [{ id: "existing" }] }) };
    }
    throw new Error("insert should not run for duplicates");
  };
  const stored = await persistWaitlistSignup(
    { email: "fan@sideshot.beer", source: "homepage", interests: ["cans"], notes: "" },
    { NOTION_TOKEN: "secret" },
    fetchImpl,
  );
  assert.equal(stored.ok, true);
  assert.equal(stored.alreadyOnList, true);
  pass("duplicate email is honest already-on-list");
}

{
  const fetchImpl = async () => ({ ok: false, status: 401, text: async () => "unauthorized" });
  const stored = await persistWaitlistSignup(
    { email: "fan@sideshot.beer", source: "homepage", interests: ["cans"], notes: "" },
    { NOTION_TOKEN: "bad" },
    fetchImpl,
  );
  assert.equal(stored.ok, false);
  assert.equal(stored.status, 502);
  assert.match(stored.error, /Could not save/i);
  pass("store failure is an error, not success");
}

{
  const honeypot = await handleWaitlistRequest({
    method: "POST",
    body: { email: "bot@x.com", ageConfirmed: true, company: "spam" },
    env: {},
  });
  assert.equal(honeypot.status, 200);
  assert.equal(honeypot.body.ignored, true);
  pass("API honeypot returns ignored");
}

{
  const get = await handleWaitlistRequest({ method: "GET", body: {}, env: {} });
  assert.equal(get.status, 405);
  pass("API rejects GET");
}

{
  assert.equal(safeshotConfig({}).preorderUrl, null);
  assert.equal(
    safeshotConfig({ SAFESHOT_PREORDER_URL: " https://buy.stripe.com/test " }).preorderUrl,
    "https://buy.stripe.com/test",
  );
  pass("preorder URL stays unset until configured");
}

console.log("All waitlist tests passed.");
