// Light / dark twin of a screenshot, found at build time in the repository when projects.yaml doesn't name it:
// `X.png` (light) pairs with `X-dark.png`, and a dark-default `X.png` pairs with `X-light.png`.
// So a twin added to a repository shows on the site at the next build, with no change here.
import { shotUrl, type Project, type Shot } from "./projects";
import { imageSize } from "./imgsize";

const exists = async (p: Project, file: string) => (await imageSize(shotUrl(p, file))) !== null;

export async function withTwin(p: Project, s: Shot): Promise<Shot> {
  if (s.dark || !/\.png$/i.test(s.src)) return s;
  const stem = s.src.replace(/\.png$/i, "");
  if (stem.endsWith("-dark") || stem.endsWith("-light")) return s;
  if (await exists(p, `${stem}-dark.png`)) return { ...s, dark: `${stem}-dark.png` };
  if (await exists(p, `${stem}-light.png`)) return { ...s, src: `${stem}-light.png`, dark: s.src };
  return s;
}
