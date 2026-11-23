import { test } from "node:test";
import assert from "node:assert/strict";
import { atom, headline, newest } from "../src/lib/news.mjs";

test("headline takes the first Features item", () => {
  const html = "<h4>Fixes</h4><ul><li>A fix</li></ul><h4>Features</h4><ul><li>New <strong>panel</strong> &amp; card</li><li>b</li></ul>";
  assert.equal(headline(html), "New panel & card");
});

test("headline falls back to the first item, without its nested list", () => {
  assert.equal(headline("<ul><li>Top<ul><li>nested</li></ul></li></ul>"), "Top");
  assert.equal(headline("<p>Only a paragraph</p>"), "Only a paragraph");
  assert.equal(headline(""), "");
});

test("headline cuts long lines on a word", () => {
  const h = headline(`<ul><li>${"word ".repeat(40)}</li></ul>`, 30);
  assert.ok(h.length <= 30 && h.endsWith("…") && !h.includes("wor…"), h);
});

test("newest sorts by date, then title, and drops undated", () => {
  const out = newest(
    [
      { title: "B", date: "2026-11-02" },
      { title: "A", date: "2026-11-02" },
      { title: "C", date: "2026-11-20" },
      { title: "D", date: "" },
    ],
    3,
  );
  assert.deepEqual(out.map((i) => i.title), ["C", "A", "B"]);
});

test("atom escapes titles and content", () => {
  const xml = atom({
    id: "https://x/", title: "T", link: "https://x/", self: "https://x/releases.xml", updated: "2026-11-20T00:00:00Z",
    items: [{ title: "A & B", version: "1.0.0", date: "2026-11-20", url: "https://x/p/#v", html: "<ul><li>x</li></ul>" }],
  });
  assert.match(xml, /<title>A &amp; B 1\.0\.0<\/title>/);
  assert.match(xml, /<content type="html">&lt;ul&gt;/);
  assert.match(xml, /<updated>2026-11-20T00:00:00Z<\/updated>/);
});

test("newest orders same-day versions by release time", () => {
  const out = newest(
    [
      { title: "A", date: "2026-11-22", at: "2026-11-22T08:00:00Z" },
      { title: "B", date: "2026-11-22", at: "2026-11-22T20:00:00Z" },
    ],
    2,
  );
  assert.deepEqual(out.map((i) => i.title), ["B", "A"]);
});
