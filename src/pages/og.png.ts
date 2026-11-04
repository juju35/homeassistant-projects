// Share picture of the home page (Open Graph, 1200×630)
import type { APIRoute } from "astro";
import { homeImage } from "../lib/og";

export const GET: APIRoute = async () => new Response(await homeImage(), { headers: { "Content-Type": "image/png" } });
