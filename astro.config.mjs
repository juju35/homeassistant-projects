import { defineConfig } from "astro/config";
import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The screenshots re-encoded during the build (src/lib/optimize.ts) are copied from its cache to dist/img/.
const CACHE_DIR = join(process.cwd(), "node_modules", ".cache", "hp-images");
const optimizedImages = {
  name: "optimized-images",
  hooks: {
    "astro:build:done": async ({ dir, logger }) => {
      const used = globalThis.__hpImages ?? new Set();
      if (!used.size) return;
      const out = join(fileURLToPath(dir), "img");
      await mkdir(out, { recursive: true });
      await Promise.all([...used].map((f) => copyFile(join(CACHE_DIR, f), join(out, f))));
      // Forget the encodings of captures that changed or left the site
      for (const f of await readdir(CACHE_DIR)) if (!used.has(f)) await rm(join(CACHE_DIR, f), { force: true });
      logger.info(`${used.size} optimized images copied to img/`);
    },
  },
};

export default defineConfig({
  site: "https://juju35.github.io",
  base: "/homeassistant-projects",
  trailingSlash: "always",
  integrations: [optimizedImages],
});
