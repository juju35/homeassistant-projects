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
export const contributors = data.contributors ?? [];

/** Screenshots and animations of a project, the hero included. */
export const shotCount = (p: Project) => (p.hero ? 1 : 0) + (p.screenshots?.length ?? 0) + (p.animations?.length ?? 0);
/** The page shows a gallery unless its only capture is the hero (same rule as Gallery.astro). */
export const hasGallery = (p: Project) => shotCount(p) > 1 || (shotCount(p) === 1 && !p.hero);

export const repoUrl = (p: Project) => `https://github.com/${OWNER}/${p.slug}`;

export const shotUrl = (p: Project, file: string) =>
  `https://raw.githubusercontent.com/${OWNER}/${p.slug}/main/screenshots/${file}`;

// Opens the "add custom repository" dialog of the Marketplace on the visitor's instance.
export const hacsUrl = (p: Project) =>
  `https://my.home-assistant.io/redirect/hacs_repository/?owner=${OWNER}&repository=${p.slug}&category=${
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
