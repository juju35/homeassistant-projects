// Checks of the built pages, run at the end of `astro build` (astro.config.mjs): the build fails, and nothing is
// deployed, when a page has an id twice (an in-page link would land on the wrong one) or mentions IPTV (ha-iptv
// is never shown on this site, whatever a README or a CHANGELOG says).
// Plain module: unit-tested with `node --test` (test/dist-check.test.mjs).
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const FORBIDDEN = /iptv/i;

/** Problems of one page, as readable sentences. */
export function checkPage(html, name = "page") {
  const problems = [];
  // Ids of elements only (not text that happens to read id="…" inside a <pre>, which is escaped anyway)
  const seen = new Map();
  for (const m of html.matchAll(/<[a-z][a-z0-9-]*\b[^>]*?\sid="([^"]+)"/gi)) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
  const dupes = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `#${id} (×${n})`);
  if (dupes.length) problems.push(`${name}: duplicate ids ${dupes.join(", ")}`);
  const hit = FORBIDDEN.exec(html);
  if (hit) {
    const at = hit.index;
    problems.push(`${name}: mentions "${hit[0]}" (…${html.slice(Math.max(0, at - 60), at + 40).replace(/\s+/g, " ")}…)`);
  }
  return problems;
}

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith(".html") || e.name.endsWith(".xml")) yield p;
  }
}

/** Problems of every page of the build. */
export async function checkDist(dir) {
  const problems = [];
  for await (const file of htmlFiles(dir)) problems.push(...checkPage(await readFile(file, "utf8"), relative(dir, file)));
  return problems;
}
