// The latest versions of the maintained projects (home page strip and releases.xml feed), from their changelogs.
import { current, type Project } from "./projects";
import { getChangelog } from "./changelog";
import { newest } from "./news.mjs";
import { latestRelease } from "./releases";

export interface NewsItem {
  project: Project;
  title: string;
  version: string;
  date: string; // YYYY-MM-DD
  html: string;
  anchor: string; // id of the version on the project page
  at: string; // release time when known, else the date
}

export async function news(n: number, perProject = 1): Promise<NewsItem[]> {
  const all = await Promise.all(
    current.map(async (p) => {
      const [log, rel] = await Promise.all([getChangelog(p), latestRelease(p)]);
      return (log?.entries ?? []).slice(0, perProject).map((e) => ({
        project: p, title: p.title, version: e.version, date: e.date ?? "", html: e.html, anchor: e.id,
        // Same-day versions in the order they were released
        at: rel && rel.tag.replace(/^v/, "") === e.version ? rel.date : e.date ?? "",
      }));
    }),
  );
  return newest(all.flat(), n);
}
