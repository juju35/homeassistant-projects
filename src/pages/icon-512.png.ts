// Home screen icon, 512×512
import type { APIRoute } from "astro";
import { appIcon } from "../lib/og";

export const GET: APIRoute = async () => new Response(await appIcon(512), { headers: { "Content-Type": "image/png" } });
