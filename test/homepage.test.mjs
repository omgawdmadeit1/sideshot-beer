import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const client = readFileSync(join(root, "waitlist.js"), "utf8");
const safeshot = readFileSync(join(root, "safeshot", "index.html"), "utf8");

test("homepage has no fake waitlist alert", () => {
  assert.equal(html.includes("alert("), false);
  assert.match(html, /id="waitlist-form"/);
  assert.match(html, /action="\/api\/waitlist"/);
  assert.match(html, /name="ageConfirmed"/);
  assert.match(html, /21\+ only/);
  assert.match(client, /fetch\(/);
  assert.match(client, /\/api\/waitlist/);
});

test("homepage has no unverified brand metrics", () => {
  assert.equal(html.includes("3.8s"), false);
  assert.equal(html.includes("99.8%"), false);
  assert.equal(html.includes("$0.65"), false);
  assert.equal(html.includes("70%+"), false);
  assert.equal(html.includes("Avg Drain Time"), false);
  assert.equal(html.includes('class="metrics"'), false);
});

test("homepage uses SIDESHOT™ and links to SafeShot", () => {
  assert.match(html, /SIDESHOT™/);
  assert.match(html, /href="\/safeshot"/);
  assert.match(safeshot, /SIDESHOT™/);
  assert.match(safeshot, /21\+ only/);
});
