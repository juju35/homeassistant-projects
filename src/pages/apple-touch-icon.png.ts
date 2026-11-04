// Home screen icon, 180×180
import type { APIRoute } from "astro";
import { appIcon } from "../lib/og";

export const GET: APIRoute = async () => new Response(await appIcon(180), { headers: { "Content-Type": "image/png" } });
