// Repository facts read at build time from the GitHub API: when it was created (the "New" badge) and its stars.
// Like the releases, an API that can't be reached stops the build unless ALLOW_MISSING_SOURCES is set.
import { OWNER, current, type Project } from "./projects";
import { fetchSource, tolerant } from "./sources";

export interface Repo {
  created: string; // ISO
  stars: number;
  /** Downloads of every release asset (the Marketplace installs and updates from them). */
  downloads: number;
}

const cache = new Map<string, Promise<Repo | null>>();

export function repoInfo(p: Project): Promise<Repo | null> {
  if (!cache.has(p.slug)) cache.set(p.slug, load(p.slug));
  return cache.get(p.slug)!;
}

async function load(slug: string): Promise<Repo | null> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "homeassistant-projects" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const api = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const res = await fetchSource(`${api}/repos/${OWNER}/${slug}`, {
    what: `${slug} repository`,
    optional: true,
    init: { headers },
    tolerant: import.meta.env.DEV || tolerant(),
  });
  if (!res) return null;
  const r = (await res.json()) as { created_at?: string; stargazers_count?: number };
  if (!r.created_at) return null;
  return { created: r.created_at, stars: r.stargazers_count ?? 0, downloads: await downloads(slug, headers, api) };
}

async function downloads(slug: string, headers: Record<string, string>, api: string): Promise<number> {
  let total = 0;
  for (let page = 1; page <= 5; page++) {
    const res = await fetchSource(`${api}/repos/${OWNER}/${slug}/releases?per_page=100&page=${page}`, {
      what: `${slug} releases`,
      optional: true,
      init: { headers },
      tolerant: import.meta.env.DEV || tolerant(),
    });
    if (!res) break;
    const list = (await res.json()) as { assets?: { download_count?: number }[] }[];
    for (const r of list) for (const a of r.assets ?? []) total += a.download_count ?? 0;
    if (list.length < 100) break;
  }
  return total;
}

// 47170 -> "47k", 1509 -> "1.5k", 860 -> "860"
export const compact = (n: number) =>
  n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);

// "New" badge: the projects whose repository is less than a week old, the 12 newest at most (most of the
// catalogue is a few weeks old: a wider window would put the badge on half the tiles).
export const NEW_DAYS = 7;
export const NEW_MAX = 12;
let fresh: Promise<Set<string>> | undefined;
export function newSlugs(now = Date.now()): Promise<Set<string>> {
  fresh ??= Promise.all(current.map(async (p) => ({ slug: p.slug, r: await repoInfo(p) }))).then(
    (all) =>
      new Set(
        all
          .filter(({ r }) => r && now - Date.parse(r.created) < NEW_DAYS * 86_400_000)
          .sort((a, b) => b.r!.created.localeCompare(a.r!.created))
          .slice(0, NEW_MAX)
          .map(({ slug }) => slug),
      ),
  );
  return fresh;
}
