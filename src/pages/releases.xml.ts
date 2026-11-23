// releases.xml: Atom feed of the latest versions of every maintained project, newest first.
import type { APIRoute } from "astro";
import { atom } from "../lib/news.mjs";
import { news } from "../lib/whats-new";

export const GET: APIRoute = async ({ site }) => {
  const root = new URL(import.meta.env.BASE_URL.replace(/\/?$/, "/"), site);
  const items = (await news(50, 6)).map((i) => ({
    ...i,
    url: new URL(`projects/${i.project.slug}/#${i.anchor}`, root).href,
  }));
  const body = atom({
    id: root.href,
    title: "Home Assistant projects · new versions",
    link: root.href,
    self: new URL("releases.xml", root).href,
    updated: `${items[0]?.date ?? "2026-01-01"}T00:00:00Z`,
    items,
  });
  return new Response(body, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
};
