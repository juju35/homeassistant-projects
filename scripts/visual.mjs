// Rendering check of the built site in WebKit (Safari's engine): a few representative pages, light and dark,
// desktop and phone. Fails on a script error, a broken same-site request or a page wider than the screen, and
// saves full-page captures to visual/ (uploaded as a workflow artifact, to look at Safari's rendering of a PR).
// Pixel references aren't compared: the content changes every day with the projects' READMEs and releases.
// Usage: node scripts/visual.mjs [dist]   (BROWSER=chromium to run it where WebKit isn't installed)
import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import * as pw from "playwright";

const BASE = "/homeassistant-projects";
const dist = process.argv[2] ?? "dist";
const out = "visual";
const PAGES = [
  ["home", "/"],
  ["weather-card", "/projects/ha-weather-card/"],
  ["tapo", "/projects/ha-tapo/"],
  ["404", "/404.html"],
];
const VIEWPORTS = [
  ["desktop", { viewport: { width: 1280, height: 800 } }],
  ["phone", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
];
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".json": "application/json",
  ".woff2": "font/woff2", ".woff": "font/woff", ".xml": "application/xml", ".webmanifest": "application/manifest+json" };

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!path.startsWith(BASE)) return res.writeHead(404).end();
  let file = join(dist, path.slice(BASE.length));
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const engine = process.env.BROWSER ?? "webkit";
const browser = await pw[engine].launch(
  process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {},
);
await mkdir(out, { recursive: true });
const problems = [];

for (const [vpName, vp] of VIEWPORTS) {
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ ...vp, colorScheme: scheme });
    for (const [name, path] of PAGES) {
      const page = await context.newPage();
      const where = `${name} ${vpName} ${scheme}`;
      page.on("pageerror", (e) => problems.push(`${where}: script error ${e.message}`));
      page.on("response", (r) => {
        if (r.url().startsWith(origin) && r.status() >= 400 && !r.url().endsWith("/404.html"))
          problems.push(`${where}: ${r.status()} ${r.url().slice(origin.length)}`);
      });
      await page.goto(origin + BASE + path, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const { scroll, width } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: window.innerWidth,
      }));
      if (scroll > width + 1) problems.push(`${where}: ${scroll}px wide for a ${width}px screen`);
      await page.screenshot({ path: `${out}/${name}-${vpName}-${scheme}.png`, fullPage: true });
      await page.close();
    }
    await context.close();
  }
}

await browser.close();
server.close();
console.log(`${PAGES.length * VIEWPORTS.length * 2} renders in ${engine}, captures in ${out}/`);
if (problems.length) {
  console.error(`${problems.length} problems:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
