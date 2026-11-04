// Home screen icon, 192×192
import type { APIRoute } from "astro";
import { appIcon } from "../lib/og";

export const GET: APIRoute = async () => new Response(await appIcon(192), { headers: { "Content-Type": "image/png" } });
