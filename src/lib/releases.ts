// Latest release of each repository, read at build time from the GitHub API.
// In GitHub Actions the workflow passes GITHUB_TOKEN; without it (or when the API is unreachable)
// the page simply shows no version.
import { OWNER, type Project } from "./projects";

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
  try {
    const api = process.env.GITHUB_API_URL ?? "https://api.github.com";
    const res = await fetch(`${api}/repos/${OWNER}/${slug}/releases/latest`, { headers });
    if (!res.ok) return null;
    const r = (await res.json()) as { tag_name?: string; published_at?: string; html_url?: string };
    if (!r.tag_name || !r.published_at || !r.html_url) return null;
    return { tag: r.tag_name, date: r.published_at, url: r.html_url };
  } catch {
    return null;
  }
}

// "Oct 29, 2026"
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
