// Documentation of each project, taken at build time from the README of its repository,
// so the site always documents the options and behaviour of the released version.
import { Marked } from "marked";
import { gfmHeadingId, resetHeadings } from "marked-gfm-heading-id";
import { OWNER, icon, projects, type Project } from "./projects";

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
  // One slugger for the whole README (reset in load()), so ids match GitHub's, unique across sections.
  marked.use(gfmHeadingId({ globalSlugs: true }));
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

// my.home-assistant.io badges: shown as in the READMEs (loaded from my.home-assistant.io), 40px high so they line
// up with the page's buttons; a copy in public/badges/ takes over if that host can't be reached.
const BADGE_RATIO: Record<string, number> = { hacs_repository: 850 / 96, config_flow_start: 583 / 96 };
const haButtons = (html: string) =>
  html.replace(
    /<a\b[^>]*\bhref="(https:\/\/my\.home-assistant\.io\/redirect\/[^"]*)"[^>]*>\s*<img\b[^>]*\bsrc="https:\/\/my\.home-assistant\.io\/badges\/([a-z_]+)\.svg"[^>]*>\s*<\/a>/gi,
    (m, href: string, badge: string) => {
      const alt = attr(/\balt="([^"]*)"/i.exec(m)?.[1]?.trim() || "Open in My Home Assistant");
      const ratio = BADGE_RATIO[badge];
      const size = ratio ? ` width="${Math.round(40 * ratio)}" height="40"` : ' height="40"';
      const fallback = ratio ? ` onerror="this.onerror=null;this.src='${import.meta.env.BASE_URL}badges/${badge}.svg'"` : "";
      return `<a class="ha-badge" href="${href}" target="_blank" rel="noopener"><img src="https://my.home-assistant.io/badges/${badge}.svg" alt="${alt}"${size}${fallback}></a>`;
    },
  );

const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const attr = (text: string) => text.replace(/"/g, "&quot;");

// Tables: each cell carries its column header, shown as a label when rows stack as cards on phones.
const tableLabels = (html: string) =>
  html.replace(/<table>([\s\S]*?)<\/table>/gi, (m, inner: string) => {
    const head = /<thead>([\s\S]*?)<\/thead>/i.exec(inner);
    if (!head) return m;
    const labels = [...head[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((x) => attr(strip(x[1])));
    if (labels.length < 2) return m;
    const body = inner.replace(/<tr>([\s\S]*?)<\/tr>/gi, (row) => {
      let i = 0;
      return row.replace(/<td\b/gi, () => `<td data-label="${labels[i++] ?? ""}"`);
    });
    return `<table class="stack">${body}</table>`;
  });

// Code blocks: a copy button in the top-right corner, like the YAML snippet of the page.
const svg = (name: string, cls: string) =>
  `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="${icon(name)}"></path></svg>`;
const COPY_BTN = `<button class="icon-btn doc-copy" type="button" aria-label="Copy code" title="Copy">${svg("mdiContentCopy", "i-copy")}${svg("mdiCheck", "i-done")}</button>`;
const codeCopy = (html: string) => html.replace(/<pre\b[\s\S]*?<\/pre>/gi, (m) => `<div class="code-block">${m}${COPY_BTN}</div>`);

// Links to another project's repository (root or #readme) go to its page on this site, in the same tab;
// links to files in a repository keep going to GitHub. ha-iptv is never linked.
const SLUGS = new Set(projects.map((p) => p.slug));
const siteLinks = (html: string, self: string) =>
  html
    .replace(/<a\b[^>]*\bhref="https:\/\/github\.com\/juju35\/ha-iptv\b[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(
      /<a\b([^>]*?)\bhref="https:\/\/github\.com\/juju35\/([\w.-]+?)\/?(?:#readme)?"([^>]*)>/gi,
      (m, before: string, slug: string, after: string) => {
        if (slug === self || !SLUGS.has(slug)) return m;
        const rest = `${before} ${after}`.replace(/\s(target|rel)="[^"]*"/gi, "").replace(/\s+/g, " ").trim();
        return `<a href="${import.meta.env.BASE_URL}projects/${slug}/"${rest ? " " + rest : ""}>`;
      },
    );

// Sub-headings get a "#" permalink.
const permalinks = (html: string) =>
  html.replace(
    /<h([34]) id="([^"]+)">([\s\S]*?)<\/h\1>/g,
    (_m, level: string, id: string, text: string) =>
      `<h${level} id="${id}">${text}<a class="hl" href="#${id}" aria-label="Link to ${attr(strip(text))}">#</a></h${level}>`,
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
  resetHeadings(); // the sections below are parsed synchronously, in order, with one shared slugger
  return splitSections(md)
    .filter((s) => !SKIP.test(plain(s.title)))
    .map((s) => {
      const title = plain(s.title);
      const id = `doc-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
      // Re-add the heading so the README's own #anchors to it keep working, then hide it (the fold shows it).
      const parsed = siteLinks(marked.parse(`## ${s.title}\n${s.body.join("\n")}`) as string, p.slug);
      const html = permalinks(codeCopy(tableLabels(haButtons(dropScreenshots(alerts(fixHtml(parsed, p.slug)))))));
      return { id, title, html: html.replace(/^<h2/, '<h2 class="doc-anchor"'), open: OPEN.test(title) };
    })
    .filter((s) => s.html.replace(/<h2[^>]*>.*?<\/h2>/s, "").trim());
}
