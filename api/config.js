import { safeshotConfig } from "../lib/waitlist.mjs";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Use GET." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true, ...safeshotConfig(process.env) });
}
