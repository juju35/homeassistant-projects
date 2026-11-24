#!/usr/bin/env python3
"""Collect everything the presentation video shows into video/.cache/.

Reads src/data/projects.yaml, video/content.yaml and video/i18n/<lang>.yaml, fetches each
project's README, brand logos, screenshots and animations from raw.githubusercontent.com,
splits the GIFs into frames and writes video/.cache/data.<lang>.json for render.py.

    python3 video/build.py --lang fr        # or en; downloads are cached between runs
"""
import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import yaml
from PIL import Image

VIDEO = Path(__file__).resolve().parent
ROOT = VIDEO.parent
CACHE = VIDEO / ".cache"
RAW = "https://raw.githubusercontent.com/juju35/{slug}/main/{path}"
NODE = VIDEO / "node_modules"


def fetch(url, dest):
    """Download url to dest once (cached). Returns True when the file exists."""
    dest = Path(dest)
    if dest.exists() and dest.stat().st_size:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    ok = subprocess.run(["curl", "-sfL", "-o", str(tmp), url]).returncode == 0
    if ok:
        tmp.rename(dest)
    else:
        tmp.unlink(missing_ok=True)
    return ok


def fetch_all(jobs):
    with ThreadPoolExecutor(16) as pool:
        return list(pool.map(lambda j: fetch(*j), jobs))


# --- README header logos (same rules as src/lib/header-logos.ts) ---------------------------
NOT_LOGO = re.compile(r"shields\.io|/badge\.svg|my\.home-assistant\.io|buymeacoffee|/screenshots/|"
                      r"/archived\.svg|/wip\.svg", re.I)
ALLOWED = re.compile(r"^https://(raw\.githubusercontent\.com|github\.com|user-images\.githubusercontent\.com)/", re.I)


def attr(tag, name):
    m = re.search(r"\b" + name + r'="([^"]*)"', tag, re.I)
    return m.group(1).strip() if m else ""


def header_logos(readme, slug):
    head = readme.split("\n## ")[0]
    base = RAW.format(slug=slug, path="")
    blocks = []
    for m in re.finditer(r'<p\s+align="center"\s*>([\s\S]*?)</p>', head, re.I):
        imgs = []
        for tag in re.findall(r"<img\b[^>]*>", m.group(1), re.I):
            src, alt = attr(tag, "src"), html.unescape(attr(tag, "alt"))
            if not src or NOT_LOGO.search(src):
                continue
            if not re.match(r"^[a-z]+:|^//", src, re.I):
                src = base + re.sub(r"^\.?/", "", src)
            if ALLOWED.match(src):
                imgs.append({"src": src, "alt": alt})
        blocks.append(imgs)
    own_at = next((i for i, b in enumerate(blocks) if len(b) == 1), -1)
    own = blocks[own_at][0] if own_at >= 0 else None
    seen, brands = set(), []
    for b in (x for bl in blocks[own_at + 1:] for x in bl):
        if b["alt"] and b["alt"].lower() not in seen:
            seen.add(b["alt"].lower())
            brands.append(b)
    return own, brands


def brand_id(alt):
    k = re.sub(r"\s+logo$", "", alt, flags=re.I).strip().lower()
    k = "".join(c for c in unicodedata.normalize("NFD", k) if not unicodedata.combining(c))
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", k))


# --- GIF frames ----------------------------------------------------------------------------
def split_gif(gif, out):
    """Write every frame of gif as out/NNN.png; return the frame durations (ms) and size."""
    im = Image.open(gif)
    out.mkdir(parents=True, exist_ok=True)
    durations = []
    for i in range(im.n_frames):
        im.seek(i)
        durations.append(im.info.get("duration", 100) or 100)
        frame = out / f"{i:03d}.png"
        if not frame.exists():
            im.convert("RGBA").save(frame)
    return durations, list(im.size)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="fr", choices=[p.stem for p in (VIDEO / "i18n").glob("*.yaml")])
    lang = ap.parse_args().lang

    site = yaml.safe_load((ROOT / "src/data/projects.yaml").read_text())
    content = yaml.safe_load((VIDEO / "content.yaml").read_text())
    text = yaml.safe_load((VIDEO / "i18n" / f"{lang}.yaml").read_text())
    excluded = set(content["exclude"])
    active = [p for p in site["projects"] if not p.get("archived") and p["slug"] not in excluded]
    by_slug = {p["slug"]: p for p in site["projects"]}
    icons = set()

    # READMEs → own logo + brand logos
    fetch_all([(RAW.format(slug=p["slug"], path="README.md"), CACHE / "readme" / f"{p['slug']}.md") for p in active])
    owns, brands = {}, {}
    for p in active:
        f = CACHE / "readme" / f"{p['slug']}.md"
        if not f.exists():
            print("no README for", p["slug"])
            continue
        own, bl = header_logos(f.read_text(), p["slug"])
        owns[p["slug"]] = own
        for b in bl:
            bid = brand_id(b["alt"])
            if not bid:
                continue
            ext = b["src"].split("?")[0].rsplit(".", 1)[-1].lower()
            e = brands.setdefault(bid, {"name": re.sub(r"\s+logo$", "", b["alt"], flags=re.I).strip(),
                                        "src": b["src"], "projects": set(),
                                        "file": f"brands/{hashlib.md5(bid.encode()).hexdigest()[:10]}.{ext}"})
            e["projects"].add(p["slug"])
    ok = fetch_all([(b["src"], CACHE / b["file"]) for b in brands.values()])
    brands = {k: b for (k, b), good in zip(brands.items(), ok) if good}

    # Screenshots and animations
    def shot(slug, name):
        p = by_slug[slug]
        name = p["hero"]["src"] if name == "hero" else name
        rel = f"shots/{slug}/{name}"
        if not fetch(RAW.format(slug=slug, path=f"screenshots/{name}"), CACHE / rel):
            raise SystemExit(f"missing screenshot {slug}/{name}")
        w, h = Image.open(CACHE / rel).size
        caption = next((s.get("caption", "") for s in (p.get("screenshots") or []) + [p.get("hero") or {}]
                        if s.get("src") == name), "")
        return {"file": rel, "w": w, "h": h, "cap": caption}

    gifmeta, gifsize = {}, {}

    def anim(slug, idx, dark=False):
        a = by_slug[slug]["animations"][idx]
        name = (a.get("dark") or a["src"]) if dark else a["src"]
        key = f"{slug}__{idx}"
        gif = CACHE / ("gif-dark" if dark else "gif") / f"{key}.gif"
        if not fetch(RAW.format(slug=slug, path=f"screenshots/{name}"), gif):
            raise SystemExit(f"missing animation {slug}/{name}")
        durations, size = split_gif(gif, CACHE / ("frames-dark" if dark else "frames") / key)
        gifmeta[("D:" if dark else "") + key] = durations
        gifsize[key] = size
        cap = text.get("captions", {}).get(f"{slug}#{idx}", a.get("caption", ""))
        return {"type": "gif", "slug": slug, "title": by_slug[slug]["title"], "gif": key, "cap": cap,
                "w": size[0], "h": size[1]}

    def media(m):
        if "anim" in m:
            return anim(m["slug"], m["anim"])
        s = shot(m["slug"], m["shot"])
        return {"type": "img", "slug": m["slug"], "title": by_slug[m["slug"]]["title"], "src": s["file"],
                "w": s["w"], "h": s["h"], "cap": ""}

    # Categories
    cat_of = {p["slug"]: p["category"] for p in active}
    cats = []
    for c in site["categories"]:
        ps = sorted((p for p in active if p["category"] == c["id"]), key=lambda p: p["title"].lower())
        if not ps:
            continue
        ranked = []  # brands most specific to the category first
        for b in brands.values():
            n = sum(cat_of.get(s) == c["id"] for s in b["projects"])
            if n:
                ranked.append((-(n / len(b["projects"])), -n, b["name"].lower(), b))
        ranked.sort(key=lambda r: r[:3])
        icons.update([c["icon"], *c["scene"]], (p["icon"] for p in ps))
        cats.append({"id": c["id"], **text["categories"][c["id"]], "accent": c["accent"], "icon": c["icon"],
                     "scene": c["scene"],
                     "projects": [{"t": p["title"], "k": p["kind"], "i": p["icon"], "a": p["accent"]} for p in ps],
                     "anims": [media(m) for m in content["categories"].get(c["id"], [])],
                     "brands": [{"name": r[3]["name"], "file": r[3]["file"]} for r in ranked]})

    # Spotlight integrations
    focus = []
    for f, txt in ((f, text["focus"][f["slug"]]) for f in content["focus"]):
        own = owns.get(f["slug"])
        icon = f"shots/{f['slug']}/_icon.png"
        if not own or not fetch(own["src"], CACHE / icon):
            raise SystemExit(f"no README icon for {f['slug']}")
        icons.update(s[0] for s in txt["simple"])
        focus.append({"slug": f["slug"], "name": f["name"], "accent": f["accent"], "icon": icon, "tag": txt["tag"],
                      "simple": txt["simple"], "shots": [shot(f["slug"], s) for s in f["shots"]]})

    panels = []
    for p in content["panels"]:
        s = shot(p["slug"], p["shot"])
        proj = by_slug[p["slug"]]
        icons.add(proj["icon"])
        panels.append({"slug": p["slug"], "title": proj["title"], "icon": proj["icon"], "accent": proj["accent"],
                       **s})

    montage = [anim(m["slug"], m["anim"]) for m in content["montage"]]
    twins = []
    for m in content["twins"]:
        a = anim(m["slug"], m["anim"])
        anim(m["slug"], m["anim"], dark=True)
        twins.append({k: a[k] for k in ("gif", "title", "cap", "w", "h")})

    domains = [{"i": d["icon"], "l": label, "d": d["domain"], "c": d["card"], "a": d["accent"]}
               for d, label in zip(content["domains"], text["domains"])]
    icons.update(d["i"] for d in domains)

    langs = content["languages"]
    first = [l for l in langs if l[0] == text["first_language"]]
    langs = first + [l for l in langs if l[0] != text["first_language"]]
    (CACHE / "flags").mkdir(parents=True, exist_ok=True)
    flag_of = {"en": "gb", "sr": "rs", "sr-Latn": "rs", "da": "dk", "sv": "se", "uk": "ua", "cs": "cz",
               "sl": "si", "el": "gr"}
    for code, *_ in langs:
        shutil.copy(NODE / "flag-icons/flags/4x3" / f"{flag_of.get(code, code)}.svg", CACHE / "flags" / f"{code}.svg")
    shutil.copy(VIDEO / "assets/me.jpg", CACHE / "me.jpg")

    # MDI paths for every icon the scenes use
    mdi = dict(re.findall(r'export var (mdi\w+) = "([^"]+)"', (NODE / "@mdi/js/mdi.js").read_text()))
    custom = dict(re.findall(r'(\w+):\s*"(M[^"]+)"', (ROOT / "src/lib/projects.ts").read_text()))
    icons |= set(re.findall(r"mdi[A-Z]\w+", (VIDEO / "scene.html").read_text()))
    missing = sorted(i for i in icons if i not in mdi and i not in custom)
    if missing:
        print("unknown icons (shown as the HA logo):", ", ".join(missing))
    paths = {i: mdi.get(i) or custom.get(i) or mdi["mdiHomeAssistant"] for i in icons}

    data = {
        "counts": {"total": len(active), "cards": sum(p["kind"] == "card" for p in active),
                   "integ": sum(p["kind"] == "integration" for p in active),
                   "themes": sum(p["kind"] == "theme" for p in active), "brands": len(brands),
                   "anims": sum(len(p.get("animations") or []) for p in active), "panels": len(panels)},
        "cats": cats, "focus": focus, "panels": panels, "montage": montage, "twins": twins, "domains": domains,
        "langs": langs, "gifmeta": gifmeta, "gifsize": gifsize, "icons": paths,
        "brandsAll": sorted(({"name": b["name"], "file": b["file"], "n": len(b["projects"])} for b in brands.values()),
                            key=lambda b: -b["n"]),
    }
    out = CACHE / f"data.{lang}.json"
    out.write_text(json.dumps(data, ensure_ascii=False))
    print(f"{out.relative_to(ROOT)}: {data['counts']}")


if __name__ == "__main__":
    main()
