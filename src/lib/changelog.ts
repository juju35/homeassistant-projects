// Changelog of each project, taken at build time from the CHANGELOG.md of its repository.
// Versions without a date in their heading take the date of their GitHub release (when the API answers).
import { Marked } from "marked";
import { OWNER, type Project } from "./projects";
import { alerts, fixHtml, siteLinks } from "./docs";

export interface ChangelogEntry {
  id: string;
  version: string;
  date: string | null; // YYYY-MM-DD
  html: string;
}

export interface Changelog {
  entries: ChangelogEntry[]; // newest first, at most SHOWN
  total: number; // released versions in the file
  url: string;
}

// Versions shown on the page; the rest is one click away on GitHub.
const SHOWN = 6;

const raw = (slug: string) => `https://raw.githubusercontent.com/${OWNER}/${slug}/main/CHANGELOG.md`;
const blob = (slug: string, path = "") => `https://github.com/${OWNER}/${slug}/blob/main/${path}`;
const isRelative = (url: string) => !/^([a-z]+:|#|\/\/|\/)/i.test(url);

// "## 1.4.4 — 2026-11-01", "## 1.11.6 (2026-11-01)", "## [2.0.0] - 2026-10-01", "## v0.8.0"
const VERSION = /\bv?(\d+\.\d+\.\d+(?:[-+][\w.]+)?)\b/;
const DATE = /\b(\d{4}-\d{2}-\d{2})\b/;

function splitVersions(md: string) {
  const out: { heading: string; body: string[] }[] = [];
  let fence = false;
  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const h = !fence && /^## (.+)$/.exec(line);
    if (h) out.push({ heading: h[1].trim(), body: [] });
    else if (out.length) out[out.length - 1].body.push(line);
  }
  // Only released versions: "Unreleased" and other headings without a version number are left out.
  return out.filter((s) => VERSION.test(s.heading));
}

// Release dates by version, for the headings that don't carry one.
async function releaseDates(slug: string): Promise<Map<string, string>> {
  const dates = new Map<string, string>();
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "homeassistant-projects" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const api = process.env.GITHUB_API_URL ?? "https://api.github.com";
    const res = await fetch(`${api}/repos/${OWNER}/${slug}/releases?per_page=100`, { headers });
    if (!res.ok) return dates;
    for (const r of (await res.json()) as { tag_name?: string; published_at?: string; draft?: boolean }[]) {
      if (r.draft || !r.tag_name || !r.published_at) continue;
      dates.set(r.tag_name.replace(/^v/, ""), r.published_at.slice(0, 10));
    }
  } catch {
    // No dates then: the versions are still listed.
  }
  return dates;
}

function renderer(slug: string) {
  const marked = new Marked({ gfm: true });
  marked.use({
    walkTokens(token) {
      if ((token.type === "image" || token.type === "link") && isRelative(token.href)) token.href = blob(slug, token.href);
    },
  });
  return marked;
}

// "#12" and "@user" become links, as GitHub shows them (outside code and existing links).
const githubRefs = (html: string, slug: string) =>
  html
    .split(/(<code\b[\s\S]*?<\/code>|<a\b[\s\S]*?<\/a>|<[^>]+>)/g)
    .map((part, i) =>
      i % 2
        ? part
        : part
            .replace(/(^|[\s(])#(\d+)\b/g, `$1<a href="https://github.com/${OWNER}/${slug}/issues/$2" target="_blank" rel="noopener">#$2</a>`)
            .replace(
              /(^|[\s(])@([a-z\d](?:[a-z\d-]{0,38}))\b/gi,
              `$1<a href="https://github.com/$2" target="_blank" rel="noopener">@$2</a>`,
            ),
    )
    .join("");

const cache = new Map<string, Promise<Changelog | null>>();

export function getChangelog(p: Project): Promise<Changelog | null> {
  if (!cache.has(p.slug)) cache.set(p.slug, load(p));
  return cache.get(p.slug)!;
}

async function load(p: Project): Promise<Changelog | null> {
  let md: string;
  try {
    const res = await fetch(raw(p.slug));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    md = await res.text();
  } catch (e) {
    console.warn(`[changelog] ${p.slug}: CHANGELOG.md not loaded (${(e as Error).message})`);
    return null;
  }
  const versions = splitVersions(md);
  if (!versions.length) return null;
  const shown = versions.slice(0, SHOWN);
  const dates = shown.some((v) => !DATE.test(v.heading)) ? await releaseDates(p.slug) : new Map<string, string>();
  const marked = renderer(p.slug);
  const entries = shown.map((v) => {
    const version = VERSION.exec(v.heading)![1];
    const date = DATE.exec(v.heading)?.[1] ?? dates.get(version) ?? null;
    // Sub-headings of a version ("### Fixed") are shown one level down, without ids of their own.
    const body = v.body.join("\n").replace(/^###(#?) /gm, "####$1 ");
    const html = siteLinks(githubRefs(alerts(fixHtml(marked.parse(body) as string, p.slug)), p.slug), p.slug);
    return { id: `changelog-${version.replace(/[^\w]+/g, "-")}`, version, date, html };
  });
  return { entries, total: versions.length, url: blob(p.slug, "CHANGELOG.md") };
}
