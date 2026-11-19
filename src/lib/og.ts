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
// The ha-neutral palette of the ha-* cards' charter (light theme), as in global.css
const BG = "#e9ecef";
const TILE = "#f4f5f7";
const CARD_BG = "#ffffff";
const TEXT = "#1c1e21";
const MUTED = "#5f646c";
const PRIMARY = "#2563eb";
const SUCCESS = "#2f8a4c";
const KIND = { card: "#2563eb", integration: "#2f8a4c", withcard: "#7048e8", theme: "#c2387f", archived: MUTED };

// color-mix(in srgb, a p%, b) for #rrggbb colours (satori and resvg know no color-mix)
const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, p: number, b: string) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v * p / 100 + y[i] * (1 - p / 100)).toString(16).padStart(2, "0")).join("")}`;
};
// Text in an accent colour, darkened for contrast like the site's .kind-line
const ink = (c: string) => mix(c, 55, "#000000");

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
// The round tinted pastille of the cards' headers (on a card-coloured disc when it sits on a sky)
const pastille = (name: string, color: string, size: number, on = "transparent") =>
  h("div", { width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", flex: "none",
    background: on === "transparent" ? `${color}29` : mix(color, 16, on) },
    mdi(name, Math.round(size * 0.57), color));
// The status dot after a name, with its soft ring
const dot = (color: string, size = 16) => {
  const ring = Math.round(size * 0.3);
  return h("div", { width: size + 2 * ring, height: size + 2 * ring, borderRadius: size / 2 + ring, background: `${color}40`, alignItems: "center", justifyContent: "center", flex: "none" },
    h("div", { width: size, height: size, borderRadius: size / 2, background: color }));
};

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

// The illustrated header of the cards (Scene.astro), day sky, drawn in the scene's own 1200×90 units: right-aligned
// and bottom-aligned like preserveAspectRatio="xMaxYMax", at a scale (1.25) that keeps the silhouettes in the right
// part of the picture, clear of the title; the sky goes on above the scene's top
const SKY = { tint: 12, base: CARD_BG, sun: "#f5b83d" };
function scene(icons: string[], c: string, width: number, height: number) {
  const k = 1.25;
  const [w, ht] = [width / k, height / k];
  const [main, left, right] = icons;
  const path = (name: string | undefined, t: string, fill: string) =>
    name ? `<path transform="${t}" fill="${fill}" d="${icon(name)}"/>` : "";
  const ink42 = `${c}6b`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${1200 - w} ${90 - ht} ${w} ${ht}">`
    + `<rect x="${1200 - w}" y="${90 - ht}" width="${w}" height="${ht}" fill="${mix(c, SKY.tint, SKY.base)}"/>`
    + `<circle cx="1080" cy="22" r="11" fill="${SKY.sun}"/>`
    + `<path d="M620 84 Q760 58 880 70 T1090 60 T1200 64 V84 Z" fill="${mix(c, 22, SKY.base)}"/>`
    + path(left, "translate(858 48) scale(1.5)", ink42)
    + path(main, "translate(918 18) scale(2.75)", ink42)
    + path(right, "translate(1010 48) scale(1.5)", ink42)
    + `<rect x="${1200 - w}" y="84" width="${w}" height="6" fill="${mix(c, 62, SKY.base)}"/></svg>`;
  return { type: "img", props: { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, width, height, style: { position: "absolute", top: 0, left: 0 } } };
}

const footer = (size = 22) =>
  h("div", { alignItems: "center", gap: 10, fontSize: size, color: MUTED, whiteSpace: "nowrap" },
    mdi("mdiHomeAssistant", Math.round(size * 1.25), HA), "juju35.github.io/homeassistant-projects");
// The page background with the flat card on it; the card opens on its illustrated header (150 px: the cards' 90 px
// at this picture's scale), its row (pastille, title, status, coloured line) on the sky
const CARD = { w: OG.width - 80, h: OG.height - 80 };
const HEADER = 150;
const card = (c: string, icons: string[], row: unknown[], body: Node) =>
  h("div", { width: OG.width, height: OG.height, background: BG, alignItems: "center", justifyContent: "center", fontFamily: "Roboto" },
    h("div", { width: CARD.w, height: CARD.h, flexDirection: "column", background: CARD_BG, borderRadius: 28, boxShadow: "0 1px 2px rgba(0,0,0,.04), 0 12px 32px -16px rgba(0,0,0,.18)", overflow: "hidden" },
      h("div", { position: "relative", width: CARD.w, height: HEADER, flex: "none" },
        scene(icons, c, CARD.w, HEADER),
        h("div", { position: "relative", height: HEADER - 8, padding: "0 40px", alignItems: "center", gap: 24 }, ...row)),
      body));
const titles = (title: string, size: number, line: string, lineColor: string, status = SUCCESS) =>
  h("div", { flexDirection: "column", gap: 6, minWidth: 0 },
    h("div", { alignItems: "center", gap: 18 },
      h("div", { fontSize: size, fontWeight: 700, color: TEXT, letterSpacing: -0.5, lineHeight: 1.1, whiteSpace: "nowrap" }, title),
      dot(status)),
    h("div", { fontSize: 24, fontWeight: 500, color: ink(lineColor), whiteSpace: "nowrap" }, line));

export async function homeImage() {
  const counts = kindCounts(projects);
  // A calm tile: neutral background, tinted pastille, bold figure and its coloured line
  const stat = (v: string, l: string, c: string, i: string) =>
    h("div", { flex: 1, alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 20, background: TILE },
      pastille(i, c, 56),
      h("div", { flexDirection: "column" },
        h("div", { fontSize: 36, fontWeight: 700, color: TEXT, lineHeight: 1.1 }, v),
        h("div", { fontSize: 20, fontWeight: 500, color: ink(c) }, l)));
  return png(
    card(PRIMARY, ["mdiHomeOutline", "mdiSolarPanel", "mdiCarHatchback"],
      [pastille("mdiHomeAssistant", PRIMARY, 88, CARD_BG), titles("Home Assistant projects", 52, "All on the Marketplace · by juju35", SUCCESS)],
      h("div", { flex: 1, flexDirection: "column", justifyContent: "space-between", padding: "26px 40px 30px" },
        h("div", { fontSize: 27, color: MUTED, lineHeight: 1.35 }, "Custom cards, integrations and themes that look at home in Home Assistant"),
        h("div", { gap: 14 },
          stat(`${counts.card}`, "Cards", "#5b6cf0", "mdiViewDashboardVariant"),
          stat(`${counts.integration}`, "Integrations", "#26a69a", "mdiPuzzle"),
          stat(`${counts.theme}`, counts.theme === 1 ? "Theme" : "Themes", "#78909c", "mdiThemeLightDark"),
          stat("22", "Languages", "#41bdf5", "mdiTranslate")),
        // The home page's aisles: one pastille per category, in its accent
        h("div", { alignItems: "center", justifyContent: "space-between" },
          h("div", { gap: 8 }, ...categories.map((c) => pastille(c.icon ?? c.scene[0], c.accent, 40))),
          footer(20)))),
    OG.width, OG.height,
  );
}

export async function projectImage(p: Project) {
  const shot = await hero(p);
  const category = categories.find((c) => c.id === p.category);
  const kind = p.archived ? KIND.archived : p.kind === "integration" && p.withCard ? KIND.withcard : KIND[p.kind as "card"] ?? PRIMARY;
  // The screenshot on the right of the body, its top shown, cut by a fade when it is taller than the room
  const box = { w: 400, h: CARD.h - HEADER - 56 };
  const scale = shot ? Math.min(box.w / shot.w, 1.6) : 0;
  const sh = shot ? Math.round(shot.h * scale) : 0;
  const shown = Math.min(sh, box.h);
  return png(
    card(p.accent, [p.icon, ...(category?.scene.slice(1) ?? [])],
      [pastille(p.icon, p.accent, 88, CARD_BG), titles(p.title, p.title.length > 22 ? 44 : 52, `${kindLabel(p)} · ${category?.label ?? ""}`, kind, p.archived ? MUTED : SUCCESS)],
      h("div", { flex: 1, gap: 36, padding: "28px 40px" },
        h("div", { flex: 1, flexDirection: "column", justifyContent: "space-between", minWidth: 0 },
          h("div", { fontSize: 32, color: TEXT, lineHeight: 1.35 }, p.tagline),
          h("div", { alignItems: "center", gap: 16 },
            p.archived
              ? h("div", { alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 22, background: TILE, color: MUTED, fontSize: 20, fontWeight: 500 }, mdi("mdiArchiveOutline", 24, MUTED), "Archived")
              : h("div", { alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 22, background: `${p.accent}29`, color: ink(p.accent), fontSize: 20, fontWeight: 500 }, mdi("mdiStorefrontOutline", 24, ink(p.accent)), "Marketplace"),
            footer())),
        ...(shot
          ? [h("div", { width: box.w, height: box.h, alignItems: "flex-start", justifyContent: "center", flex: "none" },
              h("div", { position: "relative", width: Math.round(shot.w * scale), height: shown, borderRadius: 16, overflow: "hidden", border: `1px solid #e1e4e8` },
                { type: "img", props: { src: shot.src, width: Math.round(shot.w * scale), height: sh, style: { position: "absolute", top: 0, left: 0 } } },
                ...(sh > box.h ? [h("div", { position: "absolute", left: 0, right: 0, bottom: 0, height: 80, backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0), #fff)" })] : [])))]
          : []))),
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
