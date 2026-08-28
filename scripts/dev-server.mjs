import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import handler from "../api/waitlist.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number.parseInt(process.env.PORT ?? "4173", 10);

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
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
  const requested =
    urlPath === "/" || urlPath === "/index.html"
      ? path.join(root, "index.html")
      : path.join(root, path.normalize(urlPath).replace(/^\/+/, ""));

  if (!requested.startsWith(root + path.sep) && requested !== root) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  try {
    const html = await readFile(requested, "utf8");
    const type = requested.endsWith(".html")
      ? "text/html; charset=utf-8"
      : "text/plain; charset=utf-8";
    send(res, 200, html, { "Content-Type": type });
  } catch {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
  const isWaitlist =
    url.pathname === "/api/waitlist" || url.pathname === "/api/sideshot/waitlist";

  if (isWaitlist) {
    let body = {};
    if (req.method === "POST") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw.length > 0) {
        try {
          body = JSON.parse(raw);
        } catch {
          send(res, 400, { ok: false, error: "Invalid JSON" }, {
            "Content-Type": "application/json",
          });
          return;
        }
      }
    }
    await handler({ ...req, body, headers: req.headers, socket: req.socket }, createResAdapter(res));
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
