/**
 * SIDESHOT waitlist capture.
 * Never reports success unless at least one durable store accepted the signup.
 */

export const INTEREST_OPTIONS = ["SafeShot", "cans", "merch"];
export const SOURCE_OPTIONS = ["homepage", "safeshot", "other"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NOTES_LENGTH = 500;
const DEFAULT_NOTION_DATABASE_ID = "2c3dc9f4c4454e3ebd1248d8aaed2818";
const DEFAULT_NOTION_DATA_SOURCE_ID = "110a3179-0341-48a3-926c-f69bf54fb3ce";

export function normalizeEmail(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().toLowerCase();
}

export function isValidEmail(email) {
  if (typeof email !== "string") {
    return false;
  }
  const value = email.trim();
  if (value.length < 5 || value.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  if (value.includes("..") || value.startsWith(".") || value.endsWith(".")) {
    return false;
  }
  return EMAIL_RE.test(value);
}

export function normalizeInterest(interest) {
  const values = Array.isArray(interest)
    ? interest
    : typeof interest === "string" && interest.length > 0
      ? interest.split(",").map((item) => item.trim())
      : [];
  return [...new Set(values.filter((item) => INTEREST_OPTIONS.includes(item)))];
}

export function normalizeSource(source) {
  if (typeof source === "string" && SOURCE_OPTIONS.includes(source)) {
    return source;
  }
  return "homepage";
}

export function parseWaitlistPayload(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body", status: 400 };
  }

  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return { ok: true, spam: true };
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address", status: 400 };
  }

  if (body.ageConfirmed !== true && body.ageConfirmed !== "true") {
    return { ok: false, error: "Confirm you are 21 or older", status: 400 };
  }

  const notes =
    typeof body.notes === "string" ? body.notes.trim().slice(0, MAX_NOTES_LENGTH) : "";

  return {
    ok: true,
    spam: false,
    signup: {
      email,
      source: normalizeSource(body.source),
      interest: normalizeInterest(body.interest),
      notes,
    },
  };
}

export function createLocalStore(fileStore) {
  if (!fileStore || typeof fileStore.read !== "function" || typeof fileStore.write !== "function") {
    throw new Error("Local store requires read and write functions");
  }

  return {
    name: "local",
    async find(email) {
      const rows = await fileStore.read();
      if (!Array.isArray(rows)) {
        return null;
      }
      return rows.find((row) => row && row.email === email) ?? null;
    },
    async save(signup) {
      const rows = await fileStore.read();
      const list = Array.isArray(rows) ? rows : [];
      const existing = list.find((row) => row && row.email === signup.email);
      if (existing) {
        return { alreadyJoined: true, id: existing.id ?? existing.email };
      }
      const record = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        email: signup.email,
        source: signup.source,
        interest: signup.interest,
        notes: signup.notes,
        createdAt: new Date().toISOString(),
      };
      list.push(record);
      await fileStore.write(list);
      return { alreadyJoined: false, id: record.id };
    },
  };
}

export function createNotionStore(options) {
  const fetchImpl = options?.fetch;
  const token = options?.token;
  const databaseId = options?.databaseId ?? DEFAULT_NOTION_DATABASE_ID;
  if (typeof fetchImpl !== "function") {
    throw new Error("Notion store requires fetch");
  }
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("Notion store requires token");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };

  return {
    name: "notion",
    async find(email) {
      const response = await fetchImpl(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          filter: {
            property: "Email",
            title: { equals: email },
          },
          page_size: 1,
        }),
      });
      if (!response.ok) {
        throw new Error(`Notion lookup failed (${response.status})`);
      }
      const data = await response.json();
      const page = Array.isArray(data.results) ? data.results[0] : null;
      return page ? { id: page.id, email } : null;
    },
    async save(signup) {
      const existing = await this.find(signup.email);
      if (existing) {
        return { alreadyJoined: true, id: existing.id };
      }
      const response = await fetchImpl("https://api.notion.com/v1/pages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            Email: {
              title: [{ type: "text", text: { content: signup.email } }],
            },
            Source: {
              select: { name: signup.source },
            },
            Interest: {
              multi_select: signup.interest.map((name) => ({ name })),
            },
            Notes: {
              rich_text: signup.notes
                ? [{ type: "text", text: { content: signup.notes } }]
                : [],
            },
          },
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Notion write failed (${response.status}): ${detail.slice(0, 200)}`);
      }
      const page = await response.json();
      return { alreadyJoined: false, id: page.id };
    },
  };
}

export function createNotifyEmailStore(options) {
  const fetchImpl = options?.fetch;
  const to = options?.to;
  if (typeof fetchImpl !== "function") {
    throw new Error("Notify store requires fetch");
  }
  if (typeof to !== "string" || !isValidEmail(to)) {
    throw new Error("Notify store requires a valid destination email");
  }

  return {
    name: "notify",
    async find() {
      return null;
    },
    async save(signup) {
      const response = await fetchImpl(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: signup.email,
          source: signup.source,
          interest: signup.interest.join(", "),
          notes: signup.notes,
          _subject: `SIDESHOT waitlist: ${signup.email}`,
          _template: "table",
        }),
      });
      if (!response.ok) {
        throw new Error(`Notify email failed (${response.status})`);
      }
      return { alreadyJoined: false, id: `notify_${signup.email}` };
    },
  };
}

export function createResendStore(options) {
  const fetchImpl = options?.fetch;
  const apiKey = options?.apiKey;
  const to = options?.to;
  const from = options?.from ?? "SIDESHOT <onboarding@resend.dev>";
  if (typeof fetchImpl !== "function") {
    throw new Error("Resend store requires fetch");
  }
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    throw new Error("Resend store requires apiKey");
  }
  if (typeof to !== "string" || !isValidEmail(to)) {
    throw new Error("Resend store requires a valid destination email");
  }

  return {
    name: "resend",
    async find() {
      return null;
    },
    async save(signup) {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `SIDESHOT waitlist: ${signup.email}`,
          text: [
            `Email: ${signup.email}`,
            `Source: ${signup.source}`,
            `Interest: ${signup.interest.join(", ") || "n/a"}`,
            `Notes: ${signup.notes || "n/a"}`,
          ].join("\n"),
        }),
      });
      if (!response.ok) {
        throw new Error(`Resend failed (${response.status})`);
      }
      const data = await response.json();
      return { alreadyJoined: false, id: data.id ?? `resend_${signup.email}` };
    },
  };
}

export async function captureWaitlist(body, stores) {
  if (!Array.isArray(stores)) {
    throw new Error("captureWaitlist requires a stores array");
  }

  const parsed = parseWaitlistPayload(body);
  if (!parsed.ok) {
    return { ok: false, status: parsed.status, error: parsed.error };
  }
  if (parsed.spam) {
    return { ok: true, status: 200, spam: true };
  }

  if (stores.length === 0) {
    return {
      ok: false,
      status: 503,
      error: "Waitlist storage is not configured",
    };
  }

  const errors = [];
  let alreadyJoined = false;
  let stored = false;

  for (const store of stores) {
    if (!store || typeof store.save !== "function") {
      errors.push("invalid_store");
      continue;
    }
    try {
      if (typeof store.find === "function") {
        const existing = await store.find(parsed.signup.email);
        if (existing) {
          alreadyJoined = true;
          stored = true;
          continue;
        }
      }
      const result = await store.save(parsed.signup);
      stored = true;
      if (result?.alreadyJoined) {
        alreadyJoined = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "store failed";
      errors.push(`${store.name ?? "store"}: ${message}`);
    }
  }

  if (!stored) {
    return {
      ok: false,
      status: 502,
      error: "Could not save your email. Try again in a moment.",
      detail: errors,
    };
  }

  return {
    ok: true,
    status: 200,
    alreadyJoined,
    email: parsed.signup.email,
  };
}

export function resolveStoresFromEnv(env, adapters) {
  if (!env || typeof env !== "object") {
    throw new Error("resolveStoresFromEnv requires env");
  }
  if (!adapters || typeof adapters.fetch !== "function") {
    throw new Error("resolveStoresFromEnv requires fetch");
  }

  const stores = [];
  const notifyTo = typeof env.WAITLIST_NOTIFY_EMAIL === "string"
    ? env.WAITLIST_NOTIFY_EMAIL.trim()
    : "";
  const notionToken = typeof env.NOTION_TOKEN === "string" ? env.NOTION_TOKEN.trim() : "";
  const resendKey = typeof env.RESEND_API_KEY === "string" ? env.RESEND_API_KEY.trim() : "";
  const allowLocal =
    env.ALLOW_LOCAL_WAITLIST === "1" ||
    env.NODE_ENV !== "production";

  if (notionToken) {
    stores.push(
      createNotionStore({
        fetch: adapters.fetch,
        token: notionToken,
        databaseId: env.NOTION_WAITLIST_DATABASE_ID ?? DEFAULT_NOTION_DATABASE_ID,
        dataSourceId: env.NOTION_WAITLIST_DATA_SOURCE_ID ?? DEFAULT_NOTION_DATA_SOURCE_ID,
      }),
    );
  }

  if (resendKey && isValidEmail(notifyTo)) {
    stores.push(
      createResendStore({
        fetch: adapters.fetch,
        apiKey: resendKey,
        to: notifyTo,
        from: env.RESEND_FROM,
      }),
    );
  } else if (isValidEmail(notifyTo)) {
    stores.push(
      createNotifyEmailStore({
        fetch: adapters.fetch,
        to: notifyTo,
      }),
    );
  }

  if (allowLocal && adapters.fileStore) {
    stores.push(createLocalStore(adapters.fileStore));
  }

  return stores;
}
