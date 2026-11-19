# Vice City Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Apip21/vice-city-poster-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Apip21/vice-city-poster-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn a photo and a caption into cover art in the style of GTA 6's multi-panel posters — right in your browser, fully offline, with no uploads and no libraries.

## What it does

- **Multi-panel posters** — 2, 3 or 4 panels (one big hero panel plus side panels) inside white poster frames, each with its own panel tag (VICE CITY, OCEAN DRIVE, NEON NIGHTS…).
- **Your photos, your framing** — upload several photos at once (or start from the two built-in samples), click a panel to select it, drag to pan, use the zoom slider to crop, give each panel a different photo, or fill every panel with one photo.
- **Caption lettering** — an editable title and sub-caption in bold poster type that auto-fits the poster width, with an accent rule and offset colour shadow.
- **Three colour grades** — Sunset, Neon and Dusk. Each grade re-skins the whole poster: sky, sun, photo wash, panel tags and accents.
- **Procedural Vice City art** — panels without a photo are filled with drawn artwork: gradient skies, a striped low sun, a lit skyline, palm silhouettes and a water band. All art is generated with canvas gradients and paths; no third-party artwork, logos or fonts are used — lettering uses system font stacks only.
- **Real PNG export** — 1080 × 1080, 1080 × 1350 and 1920 × 1080, rendered by the exact same engine as the live preview, downloaded straight from the page.
- **Surprise me** — one click randomises grade, layout, caption and framing.

Photos are read locally on your machine and never leave it. The app makes no network requests at runtime.

## Run it

Serve the static app and open it in a desktop browser:

```sh
node serve.ts            # then open http://localhost:8080
```

Any static file server pointed at `app/` works just as well — there is no build step.

## Hand in (make.fun)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` there using `vendor/makefun-app.ts`.

## Layout of this repo

- `app/` — the web app: `index.html`, `style.css`, `src/engine.js` (the poster drawing engine), `src/main.js` (the editor), `samples/` (two sample photos).
- `screenshots/` — screenshots of the app and covers it exported.
- `main.ts` — the hand-in program. `serve.ts` — a tiny local preview server.
- `vendor/makefun-app.ts` — the make.fun dossier library, unmodified.

Entered on [make.fun](https://make.fun/?ref=9ndw1r0s&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards
