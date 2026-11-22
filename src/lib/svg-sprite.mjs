// Last-but-one step of the build (astro.config.mjs): an inline SVG drawn several times on a page (the same MDI icon
// on many tiles, the "MY" chip of every Add to Marketplace button) is written once, as a <symbol> of a hidden sprite
// at the top of <body>, and each copy becomes a <use> of it. The page looks the same and weighs much less.
// Only self-contained drawings move: no class, id or <style> inside (a scoped style can't reach into a <use>), no
// nested <svg>; scripts are left as they are. Plain module: unit-tested with `node --test` (test/svg-sprite.test.mjs).
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SVG = /<svg\b([^>]*)>((?:(?!<svg\b|<\/svg>)[\s\S])*)<\/svg>/g;
const SCRIPT = /(<script\b[\s\S]*?<\/script>)/g;
const MOVABLE = (inner) => inner.length >= 40 && !/\b(class|id)=|<style|<use\b|<symbol\b/.test(inner);

/** The page with its repeated SVG drawings moved to a sprite, and the bytes saved. */
export function spritePage(html) {
  const parts = html.split(SCRIPT); // odd indexes are <script> blocks, left untouched
  const count = new Map();
  for (let i = 0; i < parts.length; i += 2) {
    for (const m of parts[i].matchAll(SVG)) {
      const box = /\sviewBox="([^"]+)"/.exec(m[1])?.[1];
      if (box && MOVABLE(m[2])) count.set(`${box}\n${m[2]}`, (count.get(`${box}\n${m[2]}`) ?? 0) + 1);
    }
  }
  const ids = new Map();
  // Worth it only when the copies saved outweigh the symbol and the <use> elements (about 60 bytes each)
  for (const [key, n] of count) if (n > 1 && (n - 1) * key.length > n * 60 + 80) ids.set(key, `spr-${ids.size}`);
  if (!ids.size) return { html, saved: 0 };

  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i].replace(SVG, (all, attrs, inner) => {
      const box = /\sviewBox="([^"]+)"/.exec(attrs)?.[1];
      const id = box && ids.get(`${box}\n${inner}`);
      if (!id) return all;
      const [x, y, w, h] = box.trim().split(/[\s,]+/);
      const pos = x === "0" && y === "0" ? "" : ` x="${x}" y="${y}"`;
      return `<svg${attrs}><use href="#${id}"${pos} width="${w}" height="${h}"/></svg>`;
    });
  }
  const symbols = [...ids].map(([key, id]) => {
    const [box, inner] = key.split("\n");
    return `<symbol id="${id}" viewBox="${box}">${inner}</symbol>`;
  });
  const sprite = `<svg width="0" height="0" style="position:absolute;overflow:hidden" aria-hidden="true" focusable="false"><defs>${symbols.join("")}</defs></svg>`;
  const out = parts.join("").replace(/<body\b[^>]*>/, (b) => b + sprite);
  return out.length < html.length ? { html: out, saved: html.length - out.length } : { html, saved: 0 };
}

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

/** Every page of the build through spritePage(); returns the bytes saved. */
export async function spriteDist(dir) {
  let saved = 0;
  for await (const file of htmlFiles(dir)) {
    const r = spritePage(await readFile(file, "utf8"));
    if (r.saved) await writeFile(file, r.html);
    saved += r.saved;
  }
  return saved;
}
