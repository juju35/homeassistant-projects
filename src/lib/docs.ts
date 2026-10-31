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

// GitHub alerts: "> [!NOTE]" becomes a titled callout instead of showing the marker.
const ALERTS: Record<string, string> = { note: "Note", tip: "Tip", important: "Important", warning: "Warning", caution: "Caution" };
const alerts = (html: string) =>
  html.replace(
    /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br\s*\/?>)?\s*(<\/p>\s*)?/gi,
    (_m, type: string, closed?: string) => {
      const t = type.toLowerCase();
      const head = `<blockquote class="alert alert-${t}">\n<p class="alert-title">${ALERTS[t]}</p>\n`;
      return closed ? head : `${head}<p>`;
    },
  );

// Screenshots of the repository: the page's gallery already shows them, so drop them from the docs,
// then whatever they leave empty (paragraphs, links, image-only tables, "More screenshots" folds).
const isEmpty = (inner: string) => !inner.replace(/<br\s*\/?>|&nbsp;|\s/g, "");
const dropScreenshots = (html: string) => {
  let out = html
    .replace(/<img\b[^>]*\bsrc="[^"]*\/main\/screenshots\/[^"]*"[^>]*>/gi, "")
    .replace(/<source\b[^>]*\bsrcset="[^"]*\/main\/screenshots\/[^"]*"[^>]*>/gi, "");
  for (let i = 0; i < 3; i++) {
    out = out
      .replace(/<picture>\s*<\/picture>/gi, "")
      .replace(/<a\b(?![^>]*\b(?:id|name)=)[^>]*>\s*<\/a>/gi, "")
      .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (m, inner) => (isEmpty(inner) ? "" : m))
      .replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (m) =>
        isEmpty(m.replace(/<\/?(table|thead|tbody|tr|th|td)\b[^>]*>/gi, "")) ? "" : m,
      )
      .replace(/<details\b[^>]*>\s*(<summary\b[^>]*>[\s\S]*?<\/summary>)?([\s\S]*?)<\/details>/gi, (m, _s, rest) =>
        isEmpty(rest) ? "" : m,
      );
  }
  return out.replace(/\n{3,}/g, "\n\n");
};

// my.home-assistant.io badges: a text button instead of a remote image (broken when the host is unreachable).
const HA_LABELS: Record<string, string> = {
  config_flow_start: "Add integration to my Home Assistant",
  hacs_repository: "Open in HACS",
  integration: "Open integration",
};
const haButtons = (html: string) =>
  html.replace(
    /<a\b[^>]*\bhref="(https:\/\/my\.home-assistant\.io\/redirect\/([^/"?]+)[^"]*)"[^>]*>\s*<img\b[^>]*\bsrc="https:\/\/my\.home-assistant\.io\/badges\/[^"]*"[^>]*>\s*<\/a>/gi,
    (m, href: string, path: string) => {
      const alt = /\balt="([^"]*)"/i.exec(m)?.[1]?.trim() ?? "";
      const label = alt && alt.length <= 40 && !/^open your home assistant/i.test(alt) ? alt : HA_LABELS[path] ?? "Open in Home Assistant";
      return `<a class="ha-btn" href="${href}" target="_blank" rel="noopener">${label}</a>`;
    },
  );

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
      const html = haButtons(dropScreenshots(alerts(fixHtml(marked.parse(`## ${s.title}\n${s.body.join("\n")}`) as string, p.slug))));
      return { id, title, html: html.replace(/^<h2/, '<h2 class="doc-anchor"'), open: OPEN.test(title) };
    })
    .filter((s) => s.html.replace(/<h2[^>]*>.*?<\/h2>/s, "").trim());
}
