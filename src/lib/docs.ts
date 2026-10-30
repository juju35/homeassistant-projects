// Documentation of each project, taken at build time from the README of its repository,
// so the site always documents the options and behaviour of the released version.
import { Marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { OWNER, type Project } from "./projects";

export interface DocSection {
  id: string;
  title: string;
  html: string;
  open: boolean;
}

// README sections that are not documentation, or that the page already shows.
const SKIP = /^(installation|screenshots|animations|animated scenes|development|releasing|translations|license|credits|upgrading\b|coming from\b|removal)/i;
// Sections unfolded by default: how to configure and use it.
const OPEN = /^(configuration|options|entities|actions?|services?|events?|card|mini card|map card)\b/i;

const raw = (slug: string, path = "") => `https://raw.githubusercontent.com/${OWNER}/${slug}/main/${path}`;
const blob = (slug: string, path = "") => `https://github.com/${OWNER}/${slug}/blob/main/${path}`;

const isRelative = (url: string) => !/^([a-z]+:|#|\/\/|\/)/i.test(url);
const isImage = (url: string) => /\.(png|gif|jpe?g|webp|svg)(\?.*)?$/i.test(url);

const plain = (md: string) =>
  md
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim();

// Split on level-2 headings, ignoring "##" inside fenced code blocks.
function splitSections(md: string) {
  const out: { title: string; body: string[] }[] = [];
  let fence = false;
  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const h = !fence && /^## (.+)$/.exec(line);
    if (h) out.push({ title: h[1].trim(), body: [] });
    else if (out.length) out[out.length - 1].body.push(line);
  }
  return out;
}

function renderer(slug: string) {
  const marked = new Marked({ gfm: true });
  marked.use(gfmHeadingId());
  marked.use({
    walkTokens(token) {
      if ((token.type === "image" || token.type === "link") && isRelative(token.href)) {
        token.href = token.type === "image" || isImage(token.href) ? raw(slug, token.href) : blob(slug, token.href);
      }
    },
  });
  return marked;
}

// Relative src/href inside raw HTML of the README (logos, <picture>).
const fixHtml = (html: string, slug: string) =>
  html
    .replace(/(src|srcset)="([^"]+)"/g, (m, attr, url) => (isRelative(url) ? `${attr}="${raw(slug, url)}"` : m))
    .replace(/<a href="(https?:)/g, '<a target="_blank" rel="noopener" href="$1');

const cache = new Map<string, Promise<DocSection[] | null>>();

export function getDocs(p: Project): Promise<DocSection[] | null> {
  if (!cache.has(p.slug)) cache.set(p.slug, load(p));
  return cache.get(p.slug)!;
}

async function load(p: Project): Promise<DocSection[] | null> {
  let md: string;
  try {
    const res = await fetch(raw(p.slug, "README.md"));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    md = await res.text();
  } catch (e) {
    console.warn(`[docs] ${p.slug}: README not loaded (${(e as Error).message})`);
    return null;
  }
  const marked = renderer(p.slug);
  return splitSections(md)
    .filter((s) => !SKIP.test(plain(s.title)))
    .map((s) => {
      const title = plain(s.title);
      const id = `doc-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
      // Re-add the heading so the README's own #anchors to it keep working, then hide it (the fold shows it).
      const html = fixHtml(marked.parse(`## ${s.title}\n${s.body.join("\n")}`) as string, p.slug);
      return { id, title, html: html.replace(/^<h2/, '<h2 class="doc-anchor"'), open: OPEN.test(title) };
    })
    .filter((s) => s.html.replace(/<h2[^>]*>.*?<\/h2>/s, "").trim());
}
