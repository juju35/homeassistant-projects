import { load } from "js-yaml";
import * as mdi from "@mdi/js";
import raw from "../data/projects.yaml?raw";

export const OWNER = "juju35";

export interface Shot {
  src: string;
  dark?: string;
  caption?: string;
  /** Tab of the gallery this screenshot is shown under (one card or variant per tab). */
  group?: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export interface Project {
  slug: string;
  title: string;
  kind: "card" | "integration";
  withCard?: boolean;
  category: string;
  icon: string;
  accent: string;
  tagline: string;
  summary: string;
  highlights: string[];
  homeassistant: string;
  /** Extra search terms: brands, integration domains, synonyms. */
  keywords?: string;
  /** Other projects this one works with, and why (shown on both sides). */
  worksWith?: { slug: string; why: string }[];
  cardTypes?: string[];
  hero?: Shot;
  screenshots?: Shot[];
  animations?: Shot[];
  /** Archived repository: no more updates, no install link; listed apart and left out of the counts. */
  archived?: boolean;
  /** Slug of the project that replaces an archived one. */
  replacedBy?: string;
}

export interface Contributor {
  /** GitHub login. */
  login: string;
  contribution: string;
  /** Slug of the project it went into, when it is about one project. */
  project?: string;
}

const data = load(raw) as { categories: Category[]; projects: Project[]; contributors?: Contributor[] };

export const categories = data.categories;
export const projects = data.projects;
/** The maintained projects, and the archived ones (listed apart, left out of the counts). */
export const current = projects.filter((p) => !p.archived);
export const archived = projects.filter((p) => p.archived);
export const contributors = data.contributors ?? [];

/** One entry per person, with every contribution in the order of the list (a person may contribute several times). */
export const contributorsByLogin = (list: Contributor[] = contributors) => {
  const people = new Map<string, { login: string; items: Omit<Contributor, "login">[] }>();
  for (const { login, ...item } of list) {
    const key = login.toLowerCase();
    if (!people.has(key)) people.set(key, { login, items: [] });
    people.get(key)!.items.push(item);
  }
  return [...people.values()];
};

/** Screenshots and animations of a project, the hero included. */
export const shotCount = (p: Project) => (p.hero ? 1 : 0) + (p.screenshots?.length ?? 0) + (p.animations?.length ?? 0);
/** The page shows a gallery unless its only capture is the hero (same rule as Gallery.astro). */
export const hasGallery = (p: Project) => shotCount(p) > 1 || (shotCount(p) === 1 && !p.hero);

export const repoUrl = (p: Project) => `https://github.com/${OWNER}/${p.slug}`;

export const shotUrl = (p: Project, file: string) =>
  `https://raw.githubusercontent.com/${OWNER}/${p.slug}/main/screenshots/${file}`;

// Opens the "add from link" dialog of the Marketplace on the visitor's instance.
export const marketplaceUrl = (p: Project) =>
  `https://my.home-assistant.io/redirect/marketplace_repository/?owner=${OWNER}&repository=${p.slug}&category=${
    p.kind === "integration" ? "integration" : "plugin"
  }`;

export const icon = (name: string): string =>
  (mdi as Record<string, string>)[name] ?? mdi.mdiHomeAssistant;

export const kindLabel = (p: Project) =>
  p.kind === "card" ? "Lovelace card" : p.withCard ? "Integration + card" : "Integration";

// "mini-card-zoom-dark.png" -> "Mini card zoom"
export const caption = (s: Shot) =>
  s.caption ||
  s.src
    .replace(/\.\w+$/, "")
    .replace(/-dark$/, "")
    .replace(/-/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

export const categoryOf = (p: Project) => categories.find((c) => c.id === p.category)!;
