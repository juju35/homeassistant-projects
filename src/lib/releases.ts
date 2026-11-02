// Latest release of each repository, read at build time from the GitHub API.
// In GitHub Actions the workflow passes GITHUB_TOKEN. A repository without a release shows no version; an API
// that can't be reached stops the build (see sources.ts), unless ALLOW_MISSING_SOURCES is set.
import { OWNER, type Project } from "./projects";
import { fetchSource, tolerant } from "./sources";

export interface Release {
  tag: string;
  date: string; // ISO
  url: string;
}

const cache = new Map<string, Promise<Release | null>>();

export function latestRelease(p: Project): Promise<Release | null> {
  if (!cache.has(p.slug)) cache.set(p.slug, load(p.slug));
  return cache.get(p.slug)!;
}

async function load(slug: string): Promise<Release | null> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "homeassistant-projects" };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const api = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const res = await fetchSource(`${api}/repos/${OWNER}/${slug}/releases/latest`, {
    what: `${slug} latest release`,
    optional: true,
    init: { headers },
    tolerant: import.meta.env.DEV || tolerant(),
  });
  if (!res) return null;
  const r = (await res.json()) as { tag_name?: string; published_at?: string; html_url?: string };
  if (!r.tag_name || !r.published_at || !r.html_url) return null;
  return { tag: r.tag_name, date: r.published_at, url: r.html_url };
}

// "Oct 29, 2026"
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
