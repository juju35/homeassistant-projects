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
  /** Colour of the category's illustrated header (sky, ground bar, icon pastille). */
  accent: string;
  /** Silhouettes of that header: the main one, then two smaller ones (Material Design Icons names). */
  scene: string[];
}

export interface Project {
  slug: string;
  title: string;
  kind: "card" | "integration" | "theme";
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

// The Marketplace category of a project: an integration, a theme, or (for a card) a dashboard plugin.
export const marketplaceCategory = (p: Project) =>
  p.kind === "integration" ? "integration" : p.kind === "theme" ? "theme" : "plugin";

// Opens the "add from link" dialog of the Marketplace on the visitor's instance.
export const marketplaceUrl = (p: Project) =>
  `https://my.home-assistant.io/redirect/marketplace_repository/?owner=${OWNER}&repository=${p.slug}&category=${marketplaceCategory(p)}`;

// Icons Material Design Icons doesn't have, drawn on the same 24 × 24 grid (the Matter logo, from the card's own icon).
const CUSTOM_ICONS: Record<string, string> = {
  matterLogo:
    "M7.13 6.3c1.01 0.82 2.21 1.37 3.48 1.6V1.07l1.39-0.8 1.39 0.8v6.83c1.28-0.23 2.48-0.78 3.49-1.6l2.53 1.45c-4.11 4.06-10.71 4.06-14.82 0z m3.07 17.43C11.66 18.14 8.35 12.42 2.78 10.9v2.92c1.21 0.46 2.29 1.23 3.13 2.22L0 19.45v1.6l1.39 0.8 5.91-3.41c0.44 1.22 0.56 2.54 0.36 3.82z m11.03-12.83C15.66 12.42 12.36 18.15 13.82 23.73l2.53-1.46c-0.21-1.28-0.08-2.6 0.36-3.82l5.9 3.4 1.39-0.8v-1.6l-5.91-3.41c0.84-0.99 1.92-1.76 3.13-2.23z",
};

export const icon = (name: string): string =>
  CUSTOM_ICONS[name] ?? (mdi as Record<string, string>)[name] ?? mdi.mdiHomeAssistant;

export const kindLabel = (p: Project) =>
  p.kind === "card"
    ? "Lovelace card"
    : p.kind === "theme"
      ? "Theme"
      : p.withCard
        ? "Integration + card"
        : "Integration";

// "mini-card-zoom-dark.png" -> "Mini card zoom"
export const caption = (s: Shot) =>
  s.caption ||
  s.src
    .replace(/\.\w+$/, "")
    .replace(/-dark$/, "")
    .replace(/-/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

// Class of the coloured state line under a project's name (global.css .kind-*)
export const kindClass = (p: Project) =>
  p.archived ? "kind-archived" : p.kind === "integration" && p.withCard ? "kind-withcard" : `kind-${p.kind}`;

export const categoryOf = (p: Project) => categories.find((c) => c.id === p.category)!;
