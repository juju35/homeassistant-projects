// SVG sprite of the built pages (src/lib/svg-sprite.mjs): repeated drawings become <use>, nothing else changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spritePage } from "../src/lib/svg-sprite.mjs";

const D = "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z".repeat(3);
const icon = (attrs = "") =>
  `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"${attrs}><path fill="currentColor" d="${D}"></path></svg>`;
const page = (body) => `<!doctype html><html><head></head><body class="b">${body}</body></html>`;

test("an icon drawn twice is written once, as a symbol, and used twice", () => {
  const { html, saved } = spritePage(page(`<p>${icon(' data-astro-cid-x="true"')}</p><p>${icon(' class="big"')}</p>`));
  assert.ok(saved > 0);
  assert.equal(html.split(D).length - 1, 1, "the path is written once");
  assert.match(html, /<body class="b"><svg width="0" height="0"[^>]*><defs><symbol id="spr-0" viewBox="0 0 24 24">/);
  assert.equal((html.match(/<use href="#spr-0" width="24" height="24"\/>/g) ?? []).length, 2);
  assert.match(html, /<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" class="big"><use /, "the svg keeps its attributes");
});

test("a viewBox not starting at 0 0 places the use at its origin", () => {
  const chip = `<svg class="my" viewBox="344 16 137 64" aria-hidden="true"><rect width="137" height="64" x="344" y="16" fill="#f2f4f9" rx="32"/><path d="${D}"/></svg>`;
  const { html } = spritePage(page(chip + chip));
  assert.match(html, /<use href="#spr-0" x="344" y="16" width="137" height="64"\/>/);
});

test("a small drawing shown twice is left inline: a sprite would weigh more", () => {
  const dot = `<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="red"/></svg>`;
  const src = page(dot + dot);
  assert.equal(spritePage(src).html, src);
});

test("drawings shown once, with classes or ids inside, and scripts are left as they are", () => {
  const once = icon();
  const classed = `<svg viewBox="0 0 24 24"><path class="ink" d="${D}"/></svg>`;
  const script = `<script>const s='${icon()}';</script>`;
  const src = page(once + classed + classed + script + script);
  assert.equal(spritePage(src).html, src);
});
