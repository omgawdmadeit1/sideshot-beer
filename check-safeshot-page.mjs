import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(root, "safeshot", "index.html"), "utf8");
const vercel = readFileSync(join(root, "vercel.json"), "utf8");
const homepage = readFileSync(join(root, "index.html"), "utf8");
const js = readFileSync(join(root, "safeshot.js"), "utf8");

const required = [
  ["21+ copy", /21\+/],
  ["price not set", /Price<\/th><td>Not set/],
  ["peer price is not ours", /that is not our price/],
  ["waitlist form", /id="waitlist-form"/],
  ["safeshot source", /name="source" value="safeshot"/],
  ["SafeShot interest", /name="interest" value="SafeShot"/],
  ["21+ checkbox", /I am 21 or older/],
  ["concept labeled", /Concept renders only/],
  ["bundle secondary", /Bundle language.*stays secondary/],
  ["no drinking tube", /No drinking tube/],
  ["preorder starts hidden", /id="safeshot-preorder" hidden/],
];

const forbidden = [
  ["invented MSRP", /MSRP\s*\$\d/i],
  ["fake alert success", /onclick="alert\(/],
  ["ship date claim", /ships (today|tomorrow|this week)/i],
];

let failed = false;

for (const [name, pattern] of required) {
  if (!pattern.test(page)) {
    failed = true;
    console.error(`SafeShot page missing: ${name}`);
  }
}

for (const [name, pattern] of forbidden) {
  if (pattern.test(page)) {
    failed = true;
    console.error(`SafeShot page has forbidden copy: ${name}`);
  }
}

if (!homepage.includes('href="/safeshot"')) {
  failed = true;
  console.error("Homepage does not link to /safeshot.");
}

if (!vercel.includes("/shop/safeshot") || !vercel.includes("/safeshot")) {
  failed = true;
  console.error("vercel.json is missing /shop/safeshot → /safeshot redirect.");
}

if (!js.includes("preorderUrl") || !js.includes("hidden = false")) {
  failed = true;
  console.error("safeshot.js does not swap pre-order from /api/config.");
}

if (failed) process.exit(1);
console.log("SafeShot product page meets SMI-148 checks.");
