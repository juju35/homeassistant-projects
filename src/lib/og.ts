// Share pictures (Open Graph, 1200×630) and home screen icons, drawn at build time from the projects' data with
// satori (layout → SVG) and resvg (SVG → PNG), so they follow every new project, icon or accent by themselves.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { icon, kindLabel, categories, projects, shotUrl, type Project } from "./projects";
import { kindCounts } from "./kinds";

const require = createRequire(import.meta.url);
const font = (w: number) => readFileSync(require.resolve(`@fontsource/roboto/files/roboto-latin-${w}-normal.woff`));
const FONTS = [400, 500, 700].map((weight) => ({ name: "Roboto", data: font(weight), weight: weight as 400 | 500 | 700, style: "normal" as const }));

export const OG = { width: 1200, height: 630 };
const HA = "#41bdf5";
const BG = "#e8eaed";
const TEXT = "#1c1c1c";
const MUTED = "#5f6368";

// Tiny hyperscript for satori's element objects
type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Node => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children },
});
const mdi = (name: string, size: number, color: string): Node => ({
  type: "svg",
  props: {
    width: size, height: size, viewBox: "0 0 24 24",
    children: { type: "path", props: { d: icon(name), fill: color } },
  },
});
// The round tinted pastille of the cards' headers
const pastille = (name: string, color: string, size: number) =>
  h("div", { width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", background: `${color}29` },
    mdi(name, Math.round(size * 0.57), color));

const png = async (node: Node, width: number, height: number) => {
  const svg = await satori(node as never, { width, height, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
};

// The hero screenshot as a data URI, with its size, or nothing if it can't be read (the picture is drawn without it)
async function hero(p: Project) {
  if (!p.hero) return null;
  try {
    const res = await fetch(shotUrl(p, p.hero.src), { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type") ?? "image/png";
    // PNG: width and height are in the IHDR chunk; GIF: in the logical screen descriptor
    const [w, ht] = buf.toString("ascii", 1, 4) === "PNG" ? [buf.readUInt32BE(16), buf.readUInt32BE(20)]
      : buf.toString("ascii", 0, 3) === "GIF" ? [buf.readUInt16LE(6), buf.readUInt16LE(8)] : [0, 0];
    if (!w || !ht) return null;
    return { src: `data:${type};base64,${buf.toString("base64")}`, w, h: ht };
  } catch {
    return null;
  }
}

const footer = () =>
  h("div", { alignItems: "center", gap: 10, fontSize: 22, color: MUTED, whiteSpace: "nowrap" },
    mdi("mdiHomeAssistant", 28, HA), "juju35.github.io/homeassistant-projects");
// The light page background with the white card on it (satori adds the padding to the size: the card is sized)
const CARD = { w: OG.width - 80, h: OG.height - 80 };
const page = ([py, px]: [number, number], card: Record<string, unknown>, ...children: unknown[]) =>
  h("div", { width: OG.width, height: OG.height, background: BG, alignItems: "center", justifyContent: "center", fontFamily: "Roboto" },
    h("div", { width: CARD.w - 2 * px, height: CARD.h - 2 * py, padding: `${py}px ${px}px`, background: "#fff", borderRadius: 28, boxShadow: "0 2px 8px rgba(0,0,0,.08)", overflow: "hidden", ...card }, ...children));

export async function homeImage() {
  const counts = kindCounts(projects);
  const icons = [...new Map(projects.map((p) => [p.icon, p])).values()].slice(0, 16);
  const stat = (v: string, l: string, c: string, i: string) =>
    h("div", { alignItems: "center", gap: 14, padding: "14px 22px 14px 14px", borderRadius: 20, background: "#f1f3f4" },
      pastille(i, c, 56), h("div", { flexDirection: "column" }, h("div", { fontSize: 34, fontWeight: 500, color: TEXT, lineHeight: 1.1 }, v), h("div", { fontSize: 19, color: MUTED }, l)));
  return png(
    page([52, 56], { gap: 40 },
      h("div", { flex: 1, flexDirection: "column", justifyContent: "space-between" },
        h("div", { flexDirection: "column", gap: 24 },
          pastille("mdiHomeAssistant", HA, 104),
          h("div", { fontSize: 54, fontWeight: 500, color: TEXT, letterSpacing: -1, lineHeight: 1.05, whiteSpace: "nowrap" }, "Home Assistant projects"),
          h("div", { fontSize: 26, color: MUTED, lineHeight: 1.35 }, "Custom cards and integrations, all HACS-ready")),
        h("div", { flexDirection: "column", gap: 22 },
          h("div", { gap: 12 },
            stat(`${counts.card}`, "Cards", "#5b6cf0", "mdiViewDashboardVariant"),
            stat(`${counts.integration}`, "Integrations", "#26a69a", "mdiPuzzle"),
            stat("22", "Languages", HA, "mdiTranslate")),
          footer())),
      // A wall of the projects' icons, each in its accent
      h("div", { width: 320, flexWrap: "wrap", gap: 16, alignContent: "center", flex: "none" },
        ...icons.map((p) => pastille(p.icon, p.accent, 68)))),
    OG.width, OG.height,
  );
}

export async function projectImage(p: Project) {
  const shot = await hero(p);
  const category = categories.find((c) => c.id === p.category)?.label ?? "";
  // The screenshot on the right, full width of its column: a tall card shows its top, cut by a fade
  const box = { w: 420, h: CARD.h - 96 };
  const scale = shot ? Math.min(box.w / shot.w, 1.6) : 0;
  const sh = shot ? Math.round(shot.h * scale) : 0;
  const shown = Math.min(sh, box.h);
  return png(
    page([48, 52], { gap: 44 },
      h("div", { flex: 1, flexDirection: "column", justifyContent: "space-between", minWidth: 0 },
        h("div", { flexDirection: "column", gap: 28 },
          pastille(p.icon, p.accent, 96),
          h("div", { flexDirection: "column", gap: 8 },
            h("div", { fontSize: 56, fontWeight: 500, color: TEXT, letterSpacing: -0.5, lineHeight: 1.08 }, p.title),
            h("div", { fontSize: 24, color: MUTED }, `${kindLabel(p)} · ${category}`)),
          h("div", { fontSize: 32, color: TEXT, lineHeight: 1.35 }, p.tagline)),
        h("div", { alignItems: "center", gap: 16 },
          h("div", { padding: "9px 18px", borderRadius: 22, background: "#18bcf2", color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: 1 }, "HACS"),
          footer())),
      ...(shot
        ? [h("div", { width: box.w, height: box.h, alignItems: "center", justifyContent: "center", flex: "none" },
            h("div", { position: "relative", width: Math.round(shot.w * scale), height: shown, borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 24px rgba(0,0,0,.16)", border: "1px solid #e3e5e8" },
              { type: "img", props: { src: shot.src, width: Math.round(shot.w * scale), height: sh, style: { position: "absolute", top: 0, left: 0 } } },
              ...(sh > box.h ? [h("div", { position: "absolute", left: 0, right: 0, bottom: 0, height: 90, backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0), #fff)" })] : [])))]
        : [])),
    OG.width, OG.height,
  );
}

// Home screen icon: the Home Assistant house in white on a blue gradient, full bleed (iOS and Android round it)
export const appIcon = (size: number) =>
  png(
    h("div", { width: size, height: size, alignItems: "center", justifyContent: "center", backgroundImage: `linear-gradient(135deg, ${HA}, #0b7aa6)` },
      mdi("mdiHomeAssistant", Math.round(size * 0.62), "#fff")),
    size, size,
  );
