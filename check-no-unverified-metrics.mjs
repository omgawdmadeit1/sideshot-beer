import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const banned = [
  "3.8s",
  "99.8%",
  "$0.65",
  "70%+",
  "Avg Drain Time",
  "Can Integrity",
  "Target COGS",
  "Preference Goal",
];

function listHtml(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".data") continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...listHtml(path));
    else if (name.endsWith(".html")) out.push(path);
  }
  return out;
}

let failed = false;
for (const file of listHtml(root)) {
  const html = readFileSync(file, "utf8");
  const hits = banned.filter((phrase) => html.includes(phrase));
  if (hits.length > 0) {
    failed = true;
    console.error(`Unverified metrics still present in ${file}:`);
    for (const hit of hits) console.error(`  - ${hit}`);
  }
}

const homepage = readFileSync(join(root, "index.html"), "utf8");
if (homepage.includes('class="metrics"') || homepage.includes("class='metrics'")) {
  failed = true;
  console.error("Homepage still includes a metrics container.");
}

if (failed) process.exit(1);
console.log("SIDESHOT public HTML has no unverified metrics.");
