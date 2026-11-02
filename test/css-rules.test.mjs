// CSS rules checked without a browser: the colour of the GitHub alert titles in the README sections
// (4.5:1 in both themes, for every accent an alert can take) and the home page grid on 320px phones.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const docs = read("../src/components/Docs.astro");
const index = read("../src/pages/index.astro");
const globalCss = read("../src/styles/global.css");
const { projects } = load(read("../src/data/projects.yaml"));

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// color-mix(in srgb, A p%, B): p% of A, the rest of B
const mix = (a, b, p) => a.map((v, i) => v * p + b[i] * (1 - p));

const block = (sel) => {
  const i = globalCss.indexOf(sel);
  return globalCss.slice(i, globalCss.indexOf("}", i));
};
const themes = {
  light: block(":root {"),
  dark: block(':root[data-theme="dark"]'),
};
const tokens = (theme) => {
  const get = (n) => { const m = themes[theme].match(new RegExp(`${n}:\\s*([^;]+);`)) || themes.light.match(new RegExp(`${n}:\\s*([^;]+);`)); return m[1].trim(); };
  return {
    ink: hex(get("--ink")), inkAmt: parseFloat(get("--ink-amt")) / 100,
    text: hex(get("--primary-text-color")), warning: hex(get("--warning-color")),
    backgrounds: [hex(get("--card-background-color")), hex(get("--primary-background-color"))],
  };
};

// The alert title colour, as written in Docs.astro, resolved for an accent A
const titleRule = docs.match(/\.alert-title\)\s*\{[^}]*?\bcolor:\s*([^;]+);/)[1].trim();
const titleColor = (accent, t) => {
  let m = titleRule.match(/^color-mix\(in srgb, var\(--a\),\s*var\(--ink\) var\(--ink-amt\)\)$/);
  if (m) return mix(accent, t.ink, 1 - t.inkAmt);
  m = titleRule.match(/^color-mix\(in srgb, var\(--a\) (\d+)%,\s*var\(--primary-text-color\)\)$/);
  if (m) return mix(accent, t.text, +m[1] / 100);
  throw new Error(`unsupported alert title colour: ${titleRule}`);
};

test("GitHub alert titles reach 4.5:1 in both themes, for every alert type and project accent", () => {
  const fixed = [...docs.matchAll(/blockquote\.alert-(\w+)\)\s*\{\s*--a:\s*([^;]+);/g)];
  assert.ok(fixed.length >= 3, "IMPORTANT / WARNING / CAUTION colours found");
  const fails = [];
  for (const theme of ["light", "dark"]) {
    const t = tokens(theme);
    const accents = [
      // NOTE and TIP take the project accent
      ...[...new Set(projects.map((p) => p.accent))].map((c) => ["note/tip " + c, hex(c)]),
      ...fixed.map(([, kind, v]) => [kind, v.trim() === "var(--warning-color)" ? t.warning : hex(v.trim())]),
    ];
    for (const [name, a] of accents) {
      for (const page of t.backgrounds) {
        const bg = mix(a, page, 0.1); // the alert's 10% tint
        const r = ratio(titleColor(a, t), bg);
        if (r < 4.5) fails.push(`${theme} ${name}: ${r.toFixed(2)}:1`);
      }
    }
  }
  assert.deepEqual(fails, []);
});

test("the alert icon uses the same (contrasted) colour as its title", () => {
  const before = docs.match(/\.alert-title::before\)\s*\{[^}]*?\bbackground:\s*([^;]+);/)[1].trim();
  assert.equal(before, titleRule);
});

test("home page grid: the single column can shrink below its cards' min-content width (320px phones)", () => {
  const phone = index.match(/@media \(max-width: 380px\)\s*\{\s*\.grid\s*\{\s*grid-template-columns:\s*([^;]+);/);
  assert.ok(phone, "phone rule of .grid found");
  assert.equal(phone[1].trim(), "minmax(0, 1fr)");
});
