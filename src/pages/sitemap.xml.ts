// sitemap.xml: the home page and one page per project.
import type { APIRoute } from "astro";
import { projects } from "../lib/projects";

export const GET: APIRoute = ({ site }) => {
  const root = new URL(import.meta.env.BASE_URL.replace(/\/?$/, "/"), site);
  const urls = [root.href, ...projects.map((p) => new URL(`projects/${p.slug}/`, root).href)];
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
    "\n</urlset>\n";
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
