// The README of each project, fetched once per build and shared by the documentation (docs.ts) and the logos
// (logos.ts). Every project has a README: when it can't be fetched (after retries), the build stops rather than
// publishing a page without it (ALLOW_MISSING_SOURCES=1, or `astro dev`, builds without it).
import { OWNER, type Project } from "./projects";
import { fetchSource, tolerant } from "./sources";

export const rawUrl = (slug: string, path = "") => `https://raw.githubusercontent.com/${OWNER}/${slug}/main/${path}`;

const cache = new Map<string, Promise<string | null>>();

export function readme(p: Project): Promise<string | null> {
  if (!cache.has(p.slug)) {
    cache.set(
      p.slug,
      fetchSource(rawUrl(p.slug, "README.md"), {
        what: `${p.slug} README`,
        tolerant: import.meta.env.DEV || tolerant(),
      }).then((res) => (res ? res.text() : null)),
    );
  }
  return cache.get(p.slug)!;
}
