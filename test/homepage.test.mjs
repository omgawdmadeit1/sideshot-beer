import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "index.html"),
  "utf8",
);

test("homepage has no fake waitlist alert", () => {
  assert.equal(html.includes("alert("), false);
  assert.match(html, /id="waitlist-form"/);
  assert.match(html, /fetch\("\/api\/waitlist"/);
  assert.match(html, /name="ageConfirmed"/);
  assert.match(html, /21\+ only/);
});

test("homepage has no unverified brand metrics", () => {
  assert.equal(html.includes("3.8s"), false);
  assert.equal(html.includes("99.8%"), false);
  assert.equal(html.includes("$0.65"), false);
  assert.equal(html.includes("70%+"), false);
  assert.equal(html.includes("Avg Drain Time"), false);
  assert.equal(html.includes('class="metrics"'), false);
});
