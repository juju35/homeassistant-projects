// Brands index: the brand and integration logos found at the top of the READMEs (logos.ts), gathered across the
// maintained projects, each with the projects that support it.
import { current, type Project } from "./projects";
import { getLogos } from "./logos";

export interface Brand {
  id: string; // anchor on the brands page
  name: string;
  src: string;
  projects: Project[];
}

// "Roborock logo" and "roborock" are one brand
const key = (alt: string) => alt.replace(/\s+logo$/i, "").trim().toLowerCase();
export const brandId = (alt: string) =>
  key(alt).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

let all: Promise<Brand[]> | undefined;
export function brands(): Promise<Brand[]> {
  all ??= (async () => {
    const map = new Map<string, Brand>();
    for (const p of current) {
      for (const b of (await getLogos(p)).brands) {
        const id = brandId(b.alt);
        if (!id) continue;
        const brand = map.get(id) ?? { id, name: b.alt.replace(/\s+logo$/i, "").trim(), src: b.src, projects: [] };
        if (!brand.projects.includes(p)) brand.projects.push(p);
        map.set(id, brand);
      }
    }
    for (const b of map.values()) b.projects.sort((x, y) => x.title.localeCompare(y.title, "en"));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }));
  })();
  return all;
}
