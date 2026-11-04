// Web app manifest: name and icons used by Android when the site is added to the home screen
import type { APIRoute } from "astro";

const base = import.meta.env.BASE_URL;
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: "Home Assistant projects",
      short_name: "HA projects",
      start_url: base,
      scope: base,
      display: "browser",
      background_color: "#e8eaed",
      theme_color: "#41bdf5",
      icons: [
        { src: `${base}icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: `${base}icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    }),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
