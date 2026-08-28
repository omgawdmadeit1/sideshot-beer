import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const banned = [
  'onclick="alert(',
  "onclick='alert(",
  "alert('You're on the list",
  'alert("You\'re on the list',
  "alert('You\\'re on the list",
];

function listPublic(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".data" || name === "lib") continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...listPublic(path));
    else if (/\.(html|js)$/.test(name) && !name.endsWith(".test.mjs") && !name.startsWith("check-")) {
      out.push(path);
    }
  }
  return out;
}

let failed = false;
for (const file of listPublic(root)) {
  const text = readFileSync(file, "utf8");
  const hits = banned.filter((phrase) => text.includes(phrase));
  if (hits.length > 0) {
    failed = true;
    console.error(`Fake waitlist success still present in ${file}:`);
    for (const hit of hits) console.error(`  - ${hit}`);
  }
}

const homepage = readFileSync(join(root, "index.html"), "utf8");
const client = readFileSync(join(root, "waitlist.js"), "utf8");
if (!homepage.includes('action="/api/waitlist"') || !homepage.includes('id="waitlist-form"')) {
  failed = true;
  console.error("Homepage waitlist form does not post to /api/waitlist.");
}
if (!client.includes("fetch(") || !client.includes("/api/waitlist")) {
  failed = true;
  console.error("waitlist.js does not POST to /api/waitlist.");
}

if (failed) process.exit(1);
console.log("SIDESHOT public pages do not fake waitlist success.");
