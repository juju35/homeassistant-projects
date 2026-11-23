// Internal links of the built site: every href/src under the base path must point to a file of dist/, and every
// #anchor to an id of the target page. Usage: node scripts/check-links.mjs [dist]. Exits 1 with the broken links.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const BASE = "/homeassistant-projects";
const dist = process.argv[2] ?? "dist";

const pages = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) pages.push(p);
  }
};
walk(dist);

const idsCache = new Map();
const ids = (file) => {
  if (!idsCache.has(file)) {
    const html = readFileSync(file, "utf8");
    idsCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsCache.get(file);
};

// "/homeassistant-projects/projects/x/" -> dist/projects/x/index.html
function target(path) {
  const rel = decodeURIComponent(path.slice(BASE.length)).replace(/^\//, "");
  const file = join(dist, rel);
  if (existsSync(file) && statSync(file).isFile()) return file;
  const index = join(file, "index.html");
  if (existsSync(index)) return index;
  if (existsSync(`${file}.html`)) return `${file}.html`;
  return null;
}

const broken = new Set();
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const url = raw.replaceAll("&amp;", "&");
    if (/^(https?:|mailto:|data:|javascript:|tel:)/.test(url) || url === "") continue;
    const [pathq, hash] = url.split("#");
    const path = pathq.split("?")[0];
    let file = page;
    if (path) {
      if (!path.startsWith(BASE)) {
        broken.add(`${relative(dist, page)}: ${attr}="${raw}" (outside ${BASE})`);
        continue;
      }
      file = target(path);
      if (!file) {
        broken.add(`${relative(dist, page)}: ${attr}="${raw}"`);
        continue;
      }
    }
    if (hash && file.endsWith(".html") && !ids(file).has(decodeURIComponent(hash)))
      broken.add(`${relative(dist, page)}: ${attr}="${raw}" (no #${hash})`);
  }
}

console.log(`${pages.length} pages checked`);
if (broken.size) {
  console.error(`${broken.size} broken links:\n  ${[...broken].sort().join("\n  ")}`);
  process.exit(1);
}
