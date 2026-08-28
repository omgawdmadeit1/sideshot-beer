import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { captureWaitlist, resolveStoresFromEnv } from "../lib/waitlist.js";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 8;
const hits = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const prior = hits.get(ip) ?? [];
  const recent = prior.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

async function readJsonArray(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function createFileStore() {
  const filePath = path.join(process.cwd(), ".data", "sideshot-waitlist.json");
  return {
    async read() {
      return readJsonArray(filePath);
    },
    async write(rows) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    },
  };
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseBody(req) {
  if (req.body === undefined || req.body === null || req.body === "") {
    return {};
  }
  if (typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return {};
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  if (isRateLimited(getClientIp(req))) {
    sendJson(res, 429, { ok: false, error: "Too many attempts. Try again later." });
    return;
  }

  const body = parseBody(req);
  if (body === null) {
    sendJson(res, 400, { ok: false, error: "Invalid JSON" });
    return;
  }

  const stores = resolveStoresFromEnv(process.env, {
    fetch,
    fileStore: createFileStore(),
  });

  const result = await captureWaitlist(body, stores);
  sendJson(res, result.status, {
    ok: result.ok,
    alreadyJoined: result.alreadyJoined ?? false,
    error: result.error,
  });
}
