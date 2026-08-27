const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(["homepage", "safeshot", "other"]);
const INTERESTS = new Set(["SafeShot", "cans", "merch"]);
const DEFAULT_NOTION_DATABASE_ID = "2c3dc9f4c4454e3ebd1248d8aaed2818";
const NOTION_VERSION = "2022-06-28";

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(email) {
  return EMAIL_RE.test(email) && email.length <= 254;
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function parseInterests(value) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");
  const picked = raw
    .map((item) => String(item).trim())
    .filter((item) => INTERESTS.has(item));
  return [...new Set(picked)];
}

export function parseWaitlistInput(input) {
  if (asString(input.website).trim() || asString(input.company).trim()) {
    return { ok: true, honeypot: true };
  }

  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }

  const ageConfirmed = input.ageConfirmed === true
    || input.ageConfirmed === "true"
    || input.ageConfirmed === "on"
    || input.ageConfirmed === "1";
  if (!ageConfirmed) {
    return { ok: false, status: 400, error: "Confirm you are 21 or older." };
  }

  const sourceRaw = asString(input.source).trim();
  const source = SOURCES.has(sourceRaw) ? sourceRaw : "other";
  const interests = parseInterests(input.interest ?? input.interests);
  if (interests.length === 0) {
    interests.push(source === "safeshot" ? "SafeShot" : "cans");
  }

  const notes = asString(input.notes).trim().slice(0, 500);

  return {
    ok: true,
    honeypot: false,
    signup: { email, source, interests, notes },
  };
}

export function waitlistStoreReady(env) {
  if (env.NOTION_TOKEN) return true;
  return env.WAITLIST_DEV_STORE === "1" && env.VERCEL_ENV !== "production";
}

function notionHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

async function findExistingNotionSignup(signup, env, fetchImpl) {
  const databaseId = env.NOTION_WAITLIST_DATABASE_ID || DEFAULT_NOTION_DATABASE_ID;
  const response = await fetchImpl(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: notionHeaders(env.NOTION_TOKEN),
    body: JSON.stringify({
      filter: {
        property: "Email",
        title: { equals: signup.email },
      },
      page_size: 1,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Notion lookup failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  return Array.isArray(data.results) && data.results.length > 0;
}

async function insertNotionSignup(signup, env, fetchImpl) {
  const databaseId = env.NOTION_WAITLIST_DATABASE_ID || DEFAULT_NOTION_DATABASE_ID;
  const response = await fetchImpl("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: notionHeaders(env.NOTION_TOKEN),
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Email: { title: [{ text: { content: signup.email } }] },
        Source: { select: { name: signup.source } },
        Interest: { multi_select: signup.interests.map((name) => ({ name })) },
        Notes: signup.notes
          ? { rich_text: [{ text: { content: signup.notes } }] }
          : { rich_text: [] },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Notion insert failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}

async function persistDevSignup(signup, env) {
  const { mkdir, readFile, writeFile } = await import("node:fs/promises");
  const { dirname, join } = await import("node:path");
  const file = env.WAITLIST_DEV_FILE || join(process.cwd(), ".data", "sideshot-waitlist.json");
  await mkdir(dirname(file), { recursive: true });

  let rows = [];
  try {
    rows = JSON.parse(await readFile(file, "utf8"));
    if (!Array.isArray(rows)) rows = [];
  } catch {
    rows = [];
  }

  const alreadyOnList = rows.some((row) => row.email === signup.email);
  if (!alreadyOnList) {
    rows.push({
      ...signup,
      createdAt: new Date().toISOString(),
    });
    await writeFile(file, `${JSON.stringify(rows, null, 2)}\n`);
  }
  return { alreadyOnList };
}

export async function persistWaitlistSignup(signup, env, fetchImpl = fetch) {
  if (!waitlistStoreReady(env)) {
    return {
      ok: false,
      status: 503,
      error: "Waitlist store is not configured yet. Your email was not saved.",
    };
  }

  try {
    if (env.NOTION_TOKEN) {
      const alreadyOnList = await findExistingNotionSignup(signup, env, fetchImpl);
      if (!alreadyOnList) {
        await insertNotionSignup(signup, env, fetchImpl);
      }
      return { ok: true, alreadyOnList };
    }

    return { ok: true, ...(await persistDevSignup(signup, env)) };
  } catch (error) {
    console.error("Waitlist store failed:", error instanceof Error ? error.message : error);
    return {
      ok: false,
      status: 502,
      error: "Could not save your email. Try again in a moment.",
    };
  }
}

export async function handleWaitlistRequest({ method, body, env, fetchImpl = fetch }) {
  if (method === "OPTIONS") {
    return { status: 204, body: null };
  }
  if (method !== "POST") {
    return { status: 405, body: { ok: false, error: "Use POST." } };
  }

  const parsed = parseWaitlistInput(body ?? {});
  if (parsed.honeypot) {
    return { status: 200, body: { ok: true, ignored: true } };
  }
  if (!parsed.ok) {
    return { status: parsed.status, body: { ok: false, error: parsed.error } };
  }

  const stored = await persistWaitlistSignup(parsed.signup, env, fetchImpl);
  if (!stored.ok) {
    return { status: stored.status, body: { ok: false, error: stored.error } };
  }

  return {
    status: 200,
    body: {
      ok: true,
      alreadyOnList: stored.alreadyOnList === true,
      message: stored.alreadyOnList
        ? "You were already on the list."
        : "You are on the list. We will email launch access.",
    },
  };
}

export function safeshotConfig(env) {
  const preorderUrl = asString(env.SAFESHOT_PREORDER_URL).trim();
  return {
    preorderUrl: preorderUrl || null,
  };
}
