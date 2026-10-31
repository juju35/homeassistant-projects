// Light / dark twin of a screenshot or animation, found at build time in the repository when projects.yaml
// doesn't name it: `X.png` (light) pairs with `X-dark.png`, and a dark-default `X.png` pairs with `X-light.png`
// (same for `.gif`).
// So a twin added to a repository shows on the site at the next build, with no change here.
import { shotUrl, type Project, type Shot } from "./projects";
import { imageSize } from "./imgsize";

const exists = async (p: Project, file: string) => (await imageSize(shotUrl(p, file))) !== null;

export async function withTwin(p: Project, s: Shot): Promise<Shot> {
  const m = /^(.*)\.(png|gif)$/i.exec(s.src);
  if (s.dark || !m) return s;
  const [, stem, ext] = m;
  if (stem.endsWith("-dark") || stem.endsWith("-light")) return s;
  if (await exists(p, `${stem}-dark.${ext}`)) return { ...s, dark: `${stem}-dark.${ext}` };
  if (await exists(p, `${stem}-light.${ext}`)) return { ...s, src: `${stem}-light.${ext}`, dark: s.src };
  return s;
}
