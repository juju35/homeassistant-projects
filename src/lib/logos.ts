// Logos of a project, read from the top of its README (see header-logos.ts): its own logo, shown on the page of an
// integration (see ProjectLogo.astro), and the logos of the brands and integrations it supports, shown on its page.
// Raster logos are re-encoded like the captures (optimize.ts); SVGs are used as they are.
import type { Project } from "./projects";
import { readme, rawUrl } from "./readme";
import { headerLogos, type HeaderLogo } from "./header-logos";
import { optimizedUrl } from "./optimize";
import { imageSize } from "./imgsize";

export interface Logos {
  own: HeaderLogo | null;
  brands: HeaderLogo[];
}

/** Largest size a logo is shown at (the empty hero: 96px), at 2x. */
const OWN_WIDTH = 192;
/** Brand logos: 40px tiles, at 2x. */
const BRAND_WIDTH = 96;
/** Widest own logo shown in the round slot (width / height). */
const MAX_RATIO = 1.25;

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
  const { own: found, brands } = headerLogos(md, rawUrl(p.slug));
  // The logo fills a round slot: a wide wordmark would shrink to a line there, so the site's icon is kept instead
  const size = found && !/\.svg(\?|$)/i.test(found.src) ? await imageSize(found.src) : null;
  const own = size && size.w > size.h * MAX_RATIO ? null : found;
  return {
    own: own && (await optimized(own, OWN_WIDTH)),
    brands: await Promise.all(brands.map((b) => optimized(b, BRAND_WIDTH))),
  };
}
