// Share picture of each project page (Open Graph, 1200×630)
import type { APIRoute, GetStaticPaths } from "astro";
import { projectImage } from "../../lib/og";
import { projects, type Project } from "../../lib/projects";

export const getStaticPaths: GetStaticPaths = () => projects.map((p) => ({ params: { slug: p.slug }, props: { project: p } }));

export const GET: APIRoute = async ({ props }) =>
  new Response(await projectImage((props as { project: Project }).project), { headers: { "Content-Type": "image/png" } });
