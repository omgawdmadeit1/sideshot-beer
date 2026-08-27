import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { handleWaitlistRequest, safeshotConfig } from "../lib/waitlist.mjs";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

async function serveStatic(url, res) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/shop/safeshot") {
    res.writeHead(302, { Location: "/safeshot" });
    res.end();
    return;
  }
  if (pathname === "/safeshot") pathname = "/safeshot/index.html";
  if (pathname === "/") pathname = "/index.html";

  const file = normalize(join(root, pathname.replace(/^\/+/, "")));
  if (!file.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  try {
    const body = await readFile(file);
    send(res, 200, body, { "Content-Type": types[extname(file)] || "application/octet-stream" });
  } catch {
    send(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/waitlist" || url.pathname === "/api/sideshot/waitlist") {
    const result = await handleWaitlistRequest({
      method: req.method,
      body: req.method === "POST" ? await readJson(req) : {},
      env: process.env,
    });
    if (result.body === null) {
      send(res, result.status, "");
      return;
    }
    send(res, result.status, JSON.stringify(result.body), {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    return;
  }

  if (url.pathname === "/api/config") {
    send(res, 200, JSON.stringify({ ok: true, ...safeshotConfig(process.env) }), {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    return;
  }

  await serveStatic(url, res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`SIDESHOT local site http://127.0.0.1:${port}`);
});
