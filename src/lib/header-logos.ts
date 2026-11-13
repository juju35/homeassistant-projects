// Logos shown at the top of a project's README, above its first section: the project's own logo (the first picture
// alone in a centered block: the integration icon, the card's pastille) and the logos of the brands and integrations
// it supports (the pictures of the centered blocks that follow it). The "archived" banner is neither.
// Plain module, no Astro import: unit-tested with `node --test` (test/header-logos.test.mjs).

export interface HeaderLogo {
  /** Absolute URL of the picture. */
  src: string;
  /** Its alt text: the brand's name for the brand logos. */
  alt: string;
}

export interface HeaderLogos {
  own: HeaderLogo | null;
  brands: HeaderLogo[];
}

const NOT_A_LOGO = /shields\.io|\/badge\.svg|my\.home-assistant\.io|buymeacoffee|\/screenshots\/|\/archived\.svg/i;
// Pictures come from the project's own repository or from GitHub; anything else is ignored.
const ALLOWED = /^https:\/\/(raw\.githubusercontent\.com|github\.com|user-images\.githubusercontent\.com)\//i;

const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tag)?.[1]?.trim() ?? "";
const unescape = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** `rawBase`: where relative paths of the README point, e.g. https://raw.githubusercontent.com/juju35/ha-x/main/ */
export function headerLogos(md: string, rawBase: string): HeaderLogos {
  // The header: everything before the first level-2 heading
  const head = md.split(/\n## /)[0];
  const blocks = [...head.matchAll(/<p\s+align="center"\s*>([\s\S]*?)<\/p>/gi)].map((m) =>
    [...m[1].matchAll(/<img\b[^>]*>/gi)]
      .map((t) => ({ src: attr(t[0], "src"), alt: unescape(attr(t[0], "alt")) }))
      .filter((i) => i.src && !NOT_A_LOGO.test(i.src))
      .map((i) => ({ ...i, src: /^[a-z]+:|^\/\//i.test(i.src) ? i.src : rawBase + i.src.replace(/^\.?\//, "") }))
      .filter((i) => ALLOWED.test(i.src)),
  );
  const at = blocks.findIndex((b) => b.length === 1);
  const own = at >= 0 ? blocks[at][0] : null;
  const seen = new Set<string>();
  const brands = blocks
    .slice(at + 1)
    .flat()
    .filter((b) => b.alt && !seen.has(b.alt.toLowerCase()) && seen.add(b.alt.toLowerCase()));
  return { own, brands };
}
