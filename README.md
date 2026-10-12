# KarlaJean Studios — Template Studio

A branded, mobile-first web app where creators personalize KarlaJean Studios
graphics in their browser: upload photos, type names, preview live, download
a high-quality PNG. **100% client-side — no server, no accounts, no uploads
leaving the device.**

## Status — v0.1 prototype (2026-10-11)

First template: **Creator Spotlight** (networking graphic).
- 1 large + 5 small circular photo slots, 6 editable name badges
- Tap circle to select · drag to reposition · zoom slider · double-tap resets
- Live preview canvas · one-tap **2160×2700 PNG download**
- Fully tested end-to-end in headless Chromium (uploads, drag, zoom, download)

## Project layout

```
index.html / styles.css / app.js      — the studio (multi-file, for hosting)
assets/templates/creator-spotlight/
  bg-back.png        — artwork + headlines + decorations (no photos/names)
  bg-front.png       — neon photo rings + blank name badge plates (transparent)
  spec.json          — slot geometry shared by the app (the layer contract)
  thumb.jpg          — gallery thumbnail
dist/karlajean-template-studio.html   — single-file build (phone testing)
build_layers.py      — regenerates bg/back+front/spec from art + PIL
build_singlefile.py  — bundles dist/ single-file build
make_test_assets.py  — sample portraits + gallery thumbnail
e2e_test.py          — Playwright end-to-end test
```

**Layer contract** (her requirement): background, frame, decoration, photo,
and text are separate layers. Photos and names are drawn live at render time —
never baked into the artwork. Swapping a template = new back/front PNGs +
a new spec.json; the app code doesn't change.

## Hosting determination — $0 path (her requirement: no spending before testing)

The app is static files only — no backend, no database, no build step.
Cheapest reliable route: **GitHub Pages** (free, custom domain optional later).

1. Create a free GitHub account (if none) → new public repo
   e.g. `karlajean-studios/template-studio`
2. Upload `index.html`, `styles.css`, `app.js`, `assets/` (multi-file version)
3. Repo Settings → Pages → deploy from branch → live at
   `https://<user>.github.io/template-studio/` in ~1 minute
4. Total cost: **$0**. No subscriptions, no hosting fees.

Alternatives if she prefers: Cloudflare Pages or Netlify Drop (also free).
Custom domain (e.g. templates.karlajean.com) is ~$12/yr later — only when
she's ready. **Nothing published until she approves.**

## Privacy

- Photos are read with `URL.createObjectURL` and drawn to `<canvas>` locally.
- No network requests except the page's own files. No analytics in v0.1.
- Stated plainly in the UI: "Your photos never leave your device unless you
  share the finished graphic."

## Roadmap (per her brief)

- v0.2: template gallery grows (Witchy Humor, Christmas, Kindness Challenge…)
- Premium templates + custom design contact flow (email CTA already in place)
- Animated versions → CapCut template route stays open for later
- Payment integration only when she says so

## Open questions for Karla

1. Send the **original six-creator networking graphic** → its artwork becomes
   the background layer (current bg is a faithful stand-in recreation).
2. Approve the $0 GitHub Pages route (or pick Cloudflare/Netlify) before
   anything goes public.
3. Template #2 pick when ready.
