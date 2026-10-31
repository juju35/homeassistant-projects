// Build-time optimisation of the hot-linked screenshots. Each capture on raw.githubusercontent.com is fetched once
// per build (with retries) and re-encoded with sharp into WebP at the few widths the pages need; animated GIFs
// become animated WebP (every frame kept). The files are written to a cache folder (reused by the next build when
// the capture hasn't changed) and copied to `dist/img/` at the end of the build by the integration declared in
// `astro.config.mjs`.
// Astro's own image service isn't used: it downloads the original again for every width, and a single failed
// download fails the whole build. Here, a capture that can't be fetched or processed keeps its original URL.
// In `astro dev`, the original URLs are used.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { imageSize, type Size } from "./imgsize";

export interface OptimizedSet {
  src: string;
  srcset?: string;
  /** Intrinsic size of the original capture (keeps the reserved space and the aspect ratio). */
  width?: number;
  height?: number;
}

/** Cards and gallery tiles: shown at most ~400px wide, 800px covers 2x screens. */
export const CARD_WIDTHS = [400, 800];
export const CARD_SIZES = "(max-width: 600px) 100vw, 400px";
/** Hero of a project page: ~700px in the left column, the whole width below 900px. */
export const HERO_WIDTHS = [480, 800, 1200, 1600];
export const HERO_SIZES = "(max-width: 899px) calc(100vw - 32px), 720px";

const THUMB_WIDTH = 160;
const FULL_WIDTH = 1600;
/** Bump to re-encode everything after a change of the settings below. */
const VERSION = 1;
const QUALITY = 80;

export const CACHE_DIR = join(process.cwd(), "node_modules", ".cache", "hp-images");
/** Files used by this build, copied to `dist/img/` by the integration. */
const used: Set<string> = ((globalThis as any).__hpImages ??= new Set<string>());
const OUT = `${import.meta.env.BASE_URL.replace(/\/?$/, "/")}img/`;
const enabled = !import.meta.env.DEV;

// ---------- Sources: downloaded once ----------
const sources = new Map<string, Promise<Buffer | null>>();
function source(url: string): Promise<Buffer | null> {
  if (!sources.has(url)) sources.set(url, download(url));
  return sources.get(url)!;
}
async function download(url: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (res.status === 404) return null;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  console.warn(`[optimize] could not download ${url}, the original URL is used`);
  return null;
}

// ---------- Encoding: a few at a time, each width once ----------
let sharp: typeof import("sharp").default | undefined;
const queue: (() => void)[] = [];
let running = 0;
const LIMIT = 4;
async function limited<T>(job: () => Promise<T>): Promise<T> {
  if (running >= LIMIT) await new Promise<void>((r) => queue.push(r));
  running++;
  try {
    return await job();
  } finally {
    running--;
    queue.shift()?.();
  }
}

const outputs = new Map<string, Promise<string>>();

/** URL of the capture re-encoded as WebP at `width` (never wider than the original). */
export function optimizedUrl(url: string, width: number): Promise<string> {
  if (!enabled) return Promise.resolve(url);
  const key = `${url}@${width}`;
  if (!outputs.has(key)) outputs.set(key, encode(url, width));
  return outputs.get(key)!;
}

async function encode(url: string, width: number): Promise<string> {
  try {
    const [size, buf] = await Promise.all([imageSize(url), source(url)]);
    if (!size || !buf) return url;
    const w = Math.min(width, size.w);
    const hash = createHash("sha1").update(buf).update(`${VERSION}/${QUALITY}/${w}`).digest("hex").slice(0, 10);
    const stem = (url.split("/").pop() ?? "img").replace(/\.\w+$/, "").replace(/[^\w-]/g, "_");
    const name = `${stem}-${w}-${hash}.webp`;
    const file = join(CACHE_DIR, name);
    if (!existsSync(file)) {
      await limited(async () => {
        sharp ??= (await import("sharp")).default;
        const animated = /\.gif$/i.test(url);
        const data = await sharp(buf, { animated, failOn: "none" })
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: QUALITY, ...(animated ? { loop: 0 } : {}) })
          .toBuffer();
        await mkdir(CACHE_DIR, { recursive: true });
        await writeFile(`${file}.tmp`, data);
        await rename(`${file}.tmp`, file);
      });
    }
    used.add(name);
    return OUT + name;
  } catch (e) {
    console.warn(`[optimize] could not process ${url} at ${width}px (${e}), the original URL is used`);
    return url;
  }
}

/** The widths of `wanted` the capture can provide, plus its own width when it is narrower than the largest. */
function usableWidths(size: Size, wanted: number[]): number[] {
  const ws = wanted.filter((w) => w < size.w);
  if (ws.length < wanted.length) ws.push(size.w);
  return ws;
}

/** `src` / `srcset` of the capture in WebP at the given widths, for an `<img sizes=…>`. */
export async function optimizedSet(url: string, { widths = CARD_WIDTHS }: { widths?: number[] } = {}): Promise<OptimizedSet> {
  const size = await imageSize(url);
  if (!size) return { src: url };
  if (!enabled) return { src: url, width: size.w, height: size.h };
  const ws = usableWidths(size, widths);
  const urls = await Promise.all(ws.map((w) => optimizedUrl(url, w)));
  // Nothing could be processed: keep the original
  if (urls.some((u) => u === url)) return { src: url, width: size.w, height: size.h };
  return {
    src: urls[0],
    srcset: urls.map((u, i) => `${u} ${ws[i]}w`).join(", "),
    width: size.w,
    height: size.h,
  };
}

/** Small preview (~160px wide), e.g. for a strip of thumbnails. */
export const thumbUrl = (url: string) => optimizedUrl(url, THUMB_WIDTH);

/** Large version for the viewer: the original width, capped at 1600px. */
export const fullUrl = (url: string) => optimizedUrl(url, FULL_WIDTH);
