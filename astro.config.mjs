import { defineConfig } from "astro/config";
import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDist } from "./src/lib/dist-check.mjs";

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

// Last step of the build: no page with an id twice, no page mentioning IPTV (src/lib/dist-check.mjs).
const distChecks = {
  name: "dist-checks",
  hooks: {
    "astro:build:done": async ({ dir, logger }) => {
      const problems = await checkDist(fileURLToPath(dir));
      if (problems.length) {
        for (const p of problems) logger.error(p);
        throw new Error(`${problems.length} problem(s) in the built pages, see above: nothing is deployed.`);
      }
      logger.info("built pages checked: unique ids, no IPTV mention");
    },
  },
};

// Former names of renamed repositories: their old project pages redirect to the new ones.
const renamed = {
  "ha-zoraxy": "ha-reverse-proxy",
  "ha-dockhand-card": "ha-docker-card",
  "ha-freebox-card": "ha-internet-box-card",
  "ha-ugreen-nas-card": "ha-nas-card",
  "ha-hp-printer-card": "ha-printer-card",
  "ha-home-connect-card": "ha-smart-appliance-card",
  "ha-roborock-card": "ha-vacuum-card",
  "ha-switch": "ha-switch-card",
  "ha-hacs-refresh": "ha-marketplace-refresh",
};

export default defineConfig({
  site: "https://juju35.github.io",
  base: "/homeassistant-projects",
  trailingSlash: "always",
  redirects: Object.fromEntries(Object.entries(renamed).map(([o, n]) => [`/projects/${o}/`, `/homeassistant-projects/projects/${n}/`])),
  integrations: [optimizedImages, distChecks],
});
