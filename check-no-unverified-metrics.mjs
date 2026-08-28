import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "index.html"), "utf8");

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

const hits = banned.filter((phrase) => html.includes(phrase));

if (hits.length > 0) {
  console.error("Unverified metrics still present on the SIDESHOT homepage:");
  for (const hit of hits) {
    console.error(`  - ${hit}`);
  }
  process.exit(1);
}

if (html.includes('class="metrics"') || html.includes("class='metrics'")) {
  console.error("Homepage still includes a metrics container.");
  process.exit(1);
}

console.log("SIDESHOT homepage has no unverified metrics.");
