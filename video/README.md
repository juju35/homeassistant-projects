# Presentation video

A ~4 min 1080p video of all the `ha-*` projects, in French and English, generated from the same
data as the site: `src/data/projects.yaml`, each project's README (logos, brand logos) and the
captures and animations of each repo. Nothing in it is hand-animated: when projects, brands or
animations change, run it again and the numbers and scenes follow.

## Generate

```sh
pip install pyyaml pillow playwright && python3 -m playwright install chromium   # once
(cd video && npm ci)                    # MDI icons + flag-icons, once
python3 video/build.py --lang fr        # fetch READMEs, logos, captures, GIF frames → video/.cache/
python3 video/render.py --lang fr       # ~10 min with 3 browsers → video/dist/projets-home-assistant-fr.mp4
```

`--lang en` gives `video/dist/home-assistant-projects-en.mp4`. Needs `ffmpeg` and access to
`raw.githubusercontent.com`. Downloads are cached in `video/.cache/` (delete it to refetch).

Check before a full render, and redo only what changed:

```sh
python3 video/render.py --lang fr --still 5.5     # one JPEG per scene → video/.cache/still-fr-NN.jpg
python3 video/render.py --lang fr --scenes 3,13   # re-render those scenes, then join the video again
```

## Scenes

| # | Scene | Content from |
|---|-------|--------------|
| 0 | Intro: projects, cards, integrations, themes, brands, animations, panels | counted from `projects.yaml` and READMEs |
| 1 | Wall of brand logos | README header logos (same rules as `src/lib/header-logos.ts`) |
| 2 | Works with almost every integration: device types → card | `content.yaml` `domains` |
| 3–7 | Spotlights: an animated « Smart » demo + « Simple » points and the panel | `content.yaml` `focus`, demos in `scene.html` (`demoSC`, `demoSH`, `demoHR`, `demoEH`, `demoMT`) |
| 8–20 | One scene per category: tiles, « works with » logos, 3 animations | `projects.yaml` + `content.yaml` `categories` |
| 21–22 | Sidebar panels, in a browser window | `content.yaml` `panels` |
| 23 | Animation grid | `content.yaml` `montage` |
| 24 | Light and dark: a wipe between the two themes | `content.yaml` `twins` |
| 25 | Languages with flags | `content.yaml` `languages` |
| 26 | Site link, key numbers, owner photo, Buy Me a Coffee | `assets/me.jpg` |

## Edit

- **Which captures/animations** a scene shows: `content.yaml` (`anim` = index in the project's
  `animations`, `shot` = file of its `screenshots/` or `hero`).
- **Texts**: `i18n/<lang>.yaml` (category labels, device types, spotlight tagline and « Simple » points,
  caption overrides). `scene.html` is written in English; `i18n/fr.yaml` `ui` lists the exact
  English snippets and their French replacement — change both when you change an English string
  (`render.py` stops if a snippet is no longer found).
- **New spotlight**: add it to `content.yaml` `focus` and `i18n/*.yaml` `focus`, and write its demo
  function in `scene.html` (register it in the `demo` map of `buildFocus`).
- **New language**: add `i18n/<code>.yaml` (with `ui` pairs) and the flag mapping in `build.py` if needed.

## Rules decided by the owner

- Never show IPTV / `ha-iptv`; archived projects are left out.
- Light, sober background (pale grey, faint blue haze); light-theme captures and GIFs.
- Panel captures are top-aligned, never scrolled, so the panel banner stays under the window bar.
- Never mention YAML; do not show captures with a YAML banner.
- Spotlight demos are marked « example »: their figures are illustrative.
- End: « Fait en France, en Bretagne », the owner's photo, small, and buymeacoffee.com/julienstep9.
