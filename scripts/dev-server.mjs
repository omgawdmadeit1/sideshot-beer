import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import waitlistHandler from "../api/waitlist.js";
import configHandler from "../api/config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number.parseInt(process.env.PORT ?? "4173", 10);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Length": Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function createResAdapter(res) {
  const headers = {};
  return {
    statusCode: 200,
    setHeader(name, value) {
      headers[name] = value;
    },
    end(payload = "") {
      send(res, this.statusCode, payload, headers);
    },
  };
}

async function serveStatic(urlPath, res) {
  let relative = urlPath === "/" ? "index.html" : path.normalize(urlPath).replace(/^\/+/, "");
  if (relative === "safeshot" || relative === "safeshot/") {
    relative = path.join("safeshot", "index.html");
  }

  const requested = path.join(root, relative);
  if (!requested.startsWith(root + path.sep) && requested !== root) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  try {
    const body = await readFile(requested);
    const ext = path.extname(requested);
    send(res, 200, body, { "Content-Type": TYPES[ext] ?? "application/octet-stream" });
  } catch {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.length === 0) {
    return {};
  }
  return JSON.parse(raw);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);

  if (url.pathname === "/shop/safeshot") {
    res.writeHead(302, { Location: "/safeshot" });
    res.end();
    return;
  }

  const isWaitlist =
    url.pathname === "/api/waitlist" || url.pathname === "/api/sideshot/waitlist";
  if (isWaitlist) {
    let body = {};
    if (req.method === "POST") {
      try {
        body = await readJsonBody(req);
      } catch {
        send(res, 400, { ok: false, error: "Invalid JSON" }, {
          "Content-Type": "application/json",
        });
        return;
      }
    }
    await waitlistHandler(
      { ...req, body, headers: req.headers, socket: req.socket },
      createResAdapter(res),
    );
    return;
  }

  if (url.pathname === "/api/config") {
    await configHandler(
      { ...req, headers: req.headers },
      createResAdapter(res),
    );
    return;
  }

  if (req.method === "GET") {
    await serveStatic(url.pathname, res);
    return;
  }

  send(res, 405, "Method not allowed", { "Content-Type": "text/plain; charset=utf-8" });
});

server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`SIDESHOT waitlist dev server on http://0.0.0.0:${port}\n`);
});
