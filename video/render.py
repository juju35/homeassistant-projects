#!/usr/bin/env python3
"""Render the presentation video from video/.cache/data.<lang>.json (run build.py first).

Each scene of scene.html is drawn frame by frame in Chromium (Playwright), piped to ffmpeg as
one H.264 file per scene, then the scenes are joined (concat, no re-encode) and a soft
synthesised pad is added as sound.

    python3 video/render.py --lang fr                  # full video → video/dist/
    python3 video/render.py --lang fr --scenes 3,4     # re-render some scenes, then join again
    python3 video/render.py --lang fr --still 4.5      # one JPEG per scene at t=4.5 s, to check
"""
import argparse
import json
import os
import subprocess
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import yaml

VIDEO = Path(__file__).resolve().parent
CACHE = VIDEO / ".cache"
DIST = VIDEO / "dist"
FPS = 30
NAMES = {"fr": "projets-home-assistant-fr.mp4", "en": "home-assistant-projects-en.mp4"}


def page_for(lang):
    """scene.html with the language's `ui` replacements, written next to the cached assets."""
    html = (VIDEO / "scene.html").read_text()
    for en, other in yaml.safe_load((VIDEO / "i18n" / f"{lang}.yaml").read_text()).get("ui", []):
        if en not in html:
            raise SystemExit(f"i18n/{lang}.yaml: snippet not found in scene.html: {en[:80]!r}")
        html = html.replace(en, other)
    page = CACHE / f"scene.{lang}.html"
    page.write_text(html)
    return page


def scene_count(data):
    # intro, brands, integrations, spotlights, categories, 2 × panels, animations, light/dark, languages, outro
    return 3 + len(data["focus"]) + len(data["cats"]) + 6


def render(args):
    lang, scenes, still = args
    from playwright.sync_api import sync_playwright
    data = json.loads((CACHE / f"data.{lang}.json").read_text())
    page_url = page_for(lang).as_uri()
    out_dir = CACHE / f"out-{lang}"
    out_dir.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--allow-file-access-from-files"])
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        for s in scenes:
            page.goto(f"{page_url}?scene={s}")
            duration = page.evaluate("d => setup(d)", data)
            if still is not None:
                page.evaluate(f"render({still})")
                page.screenshot(path=str(CACHE / f"still-{lang}-{s:02d}.jpg"), type="jpeg", quality=85)
                continue
            tmp, final = out_dir / f"s{s:02d}.tmp.mp4", out_dir / f"s{s:02d}.mp4"
            ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS),
                                   "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                                   "-pix_fmt", "yuv420p", "-r", str(FPS), str(tmp)], stdin=subprocess.PIPE)
            for i in range(round(duration * FPS)):
                page.evaluate(f"render({i / FPS})")
                ff.stdin.write(page.screenshot(type="jpeg", quality=92))
            ff.stdin.close()
            if ff.wait() == 0:
                os.replace(tmp, final)
                print(f"scene {s} done ({duration} s)", flush=True)
        browser.close()


def join(lang, count):
    out_dir = CACHE / f"out-{lang}"
    files = [out_dir / f"s{s:02d}.mp4" for s in range(count)]
    missing = [f.name for f in files if not f.exists()]
    if missing:
        raise SystemExit(f"missing scenes: {', '.join(missing)}")
    (out_dir / "list.txt").write_text("".join(f"file '{f}'\n" for f in files))
    video = out_dir / "video.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(out_dir / "list.txt"),
                    "-c", "copy", str(video)], check=True)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                              str(video)], capture_output=True, text=True, check=True).stdout)
    pad = ("aevalsrc='0.10*(0.6+0.4*sin(2*PI*t/8))*(sin(2*PI*110*t)+0.7*sin(2*PI*164.81*t)+0.5*sin(2*PI*220*t)"
           "+0.35*sin(2*PI*277.18*t)*(0.5+0.5*sin(2*PI*t/13))+0.25*sin(2*PI*329.63*t)*(0.5+0.5*cos(2*PI*t/11)))'"
           f":s=48000:d={d}")
    audio = out_dir / "pad.m4a"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", pad, "-af",
                    f"lowpass=f=1200,aecho=0.8:0.7:400|700:0.25|0.15,afade=t=in:d=2,afade=t=out:st={d - 3}:d=3,"
                    "volume=0.8", "-c:a", "aac", "-b:a", "160k", str(audio)], check=True)
    DIST.mkdir(exist_ok=True)
    final = DIST / NAMES.get(lang, f"home-assistant-projects-{lang}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(video), "-i", str(audio), "-map", "0:v", "-map",
                    "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart", str(final)], check=True)
    print(f"{final.relative_to(VIDEO.parent)}: {d:.1f} s")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="fr")
    ap.add_argument("--scenes", help="comma-separated scene numbers (default: all)")
    ap.add_argument("--still", type=float, help="write one JPEG per scene at this time instead of rendering")
    ap.add_argument("--jobs", type=int, default=3, help="parallel browsers")
    a = ap.parse_args()
    data = json.loads((CACHE / f"data.{a.lang}.json").read_text())
    count = scene_count(data)
    scenes = [int(s) for s in a.scenes.split(",")] if a.scenes else list(range(count))
    batches = [scenes[i::a.jobs] for i in range(a.jobs) if scenes[i::a.jobs]]
    with ProcessPoolExecutor(len(batches)) as pool:
        list(pool.map(render, [(a.lang, b, a.still) for b in batches]))
    if a.still is None:
        join(a.lang, count)


if __name__ == "__main__":
    main()
