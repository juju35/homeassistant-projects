// Repository facts read at build time from the GitHub API: when it was created (the "New" badge) and its stars.
// Like the releases, an API that can't be reached stops the build unless ALLOW_MISSING_SOURCES is set.
import { OWNER, current, type Project } from "./projects";
import { fetchSource, tolerant } from "./sources";

export interface Repo {
  created: string; // ISO
  stars: number;
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
  return { created: r.created_at, stars: r.stargazers_count ?? 0 };
}

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
