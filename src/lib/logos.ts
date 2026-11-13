// Logos of a project, read from the top of its README (see header-logos.ts): its own logo, shown wherever the site
// shows the project, and the logos of the brands and integrations it supports, shown on its page. Raster logos are
// re-encoded like the captures (optimize.ts); SVGs are used as they are.
import type { Project } from "./projects";
import { readme, rawUrl } from "./readme";
import { headerLogos, type HeaderLogo } from "./header-logos";
import { optimizedUrl } from "./optimize";

export interface Logos {
  own: HeaderLogo | null;
  brands: HeaderLogo[];
}

/** Largest size a logo is shown at (the empty hero: 96px), at 2x. */
const OWN_WIDTH = 192;
/** Brand logos: 40px tiles, at 2x. */
const BRAND_WIDTH = 96;

const optimized = async (l: HeaderLogo, width: number): Promise<HeaderLogo> =>
  /\.svg(\?|$)/i.test(l.src) ? l : { ...l, src: await optimizedUrl(l.src, width) };

const cache = new Map<string, Promise<Logos>>();

export function getLogos(p: Project): Promise<Logos> {
  if (!cache.has(p.slug)) cache.set(p.slug, load(p));
  return cache.get(p.slug)!;
}

async function load(p: Project): Promise<Logos> {
  const md = await readme(p);
  if (md === null) return { own: null, brands: [] };
  const { own, brands } = headerLogos(md, rawUrl(p.slug));
  return {
    own: own && (await optimized(own, OWN_WIDTH)),
    brands: await Promise.all(brands.map((b) => optimized(b, BRAND_WIDTH))),
  };
}
