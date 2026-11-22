// Shape of projects.yaml: a slip of YAML (an unquoted ": " turning a highlight into an object, shown as
// "[object Object]" on the page) or a reference to nothing fails here rather than on the site.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import * as mdi from "@mdi/js";

const { categories, contributors, projects } = load(
  readFileSync(new URL("../src/data/projects.yaml", import.meta.url), "utf8"),
);
const CUSTOM_ICONS = ["matterLogo"]; // src/lib/projects.ts
const slugs = new Set(projects.map((p) => p.slug));
const images = (p) => ["hero", "screenshots", "animations"].flatMap((k) => [p[k] ?? []].flat());

test("every text field is a plain string", () => {
  for (const p of projects) {
    for (const k of ["title", "tagline", "summary", "keywords"]) {
      if (p[k] !== undefined) assert.equal(typeof p[k], "string", `${p.slug}: ${k}`);
    }
    for (const h of p.highlights ?? []) {
      assert.equal(typeof h, "string", `${p.slug}: highlight ${JSON.stringify(h)} — quote it, it contains ": "`);
    }
    for (const w of p.worksWith ?? []) assert.equal(typeof w.why, "string", `${p.slug}: worksWith ${w.slug}`);
    for (const i of images(p)) assert.equal(typeof (i.caption ?? ""), "string", `${p.slug}: caption of ${i.src}`);
  }
});

test("slugs, titles and card types are unique", () => {
  assert.equal(slugs.size, projects.length, "duplicate slug");
  const seen = new Map();
  for (const p of projects) {
    assert.ok(!seen.has(p.title), `${p.slug}: same title as ${seen.get(p.title)}`);
    seen.set(p.title, p.slug);
  }
  const types = projects.flatMap((p) => p.cardTypes ?? []);
  assert.equal(new Set(types).size, types.length, "a card type is listed twice");
});

test("references point to something that exists", () => {
  const cats = new Set(categories.map((c) => c.id));
  for (const p of projects) {
    assert.ok(cats.has(p.category), `${p.slug}: unknown category ${p.category}`);
    for (const w of p.worksWith ?? []) assert.ok(slugs.has(w.slug), `${p.slug}: worksWith ${w.slug}`);
    if (p.replacedBy) assert.ok(slugs.has(p.replacedBy), `${p.slug}: replacedBy ${p.replacedBy}`);
    for (const i of images(p)) assert.ok(i.src, `${p.slug}: an image without src`);
  }
  for (const c of contributors ?? []) {
    if (c.project) assert.ok(slugs.has(c.project), `${c.login}: project ${c.project}`);
  }
});

test("every icon exists in @mdi/js (or is a custom icon)", () => {
  const ok = (name) => CUSTOM_ICONS.includes(name) || name in mdi;
  for (const p of projects) assert.ok(ok(p.icon), `${p.slug}: icon ${p.icon}`);
  for (const c of categories) {
    for (const i of [c.icon, ...(c.scene ?? [])]) assert.ok(ok(i), `category ${c.id}: icon ${i}`);
  }
});
