import { load } from "js-yaml";
import * as mdi from "@mdi/js";
import raw from "../data/projects.yaml?raw";

export const OWNER = "juju35";

export interface Shot {
  src: string;
  dark?: string;
  caption?: string;
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
  cardTypes?: string[];
  hero?: Shot;
  screenshots?: Shot[];
  animations?: Shot[];
}

const data = load(raw) as { categories: Category[]; projects: Project[] };

export const categories = data.categories;
export const projects = data.projects;

export const repoUrl = (p: Project) => `https://github.com/${OWNER}/${p.slug}`;

export const shotUrl = (p: Project, file: string) =>
  `https://raw.githubusercontent.com/${OWNER}/${p.slug}/main/screenshots/${file}`;

// Opens the "add custom repository" dialog of HACS on the visitor's instance.
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
