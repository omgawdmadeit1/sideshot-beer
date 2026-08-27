import { handleWaitlistRequest } from "../lib/waitlist.mjs";

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return Object.fromEntries(new URLSearchParams(req.body));
    }
  }
  return {};
}

export default async function handler(req, res) {
  const result = await handleWaitlistRequest({
    method: req.method,
    body: readBody(req),
    env: process.env,
  });

  if (result.body === null) {
    res.status(result.status).end();
    return;
  }

  res.status(result.status).setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.json(result.body);
}
