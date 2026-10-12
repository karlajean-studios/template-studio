# KarlaJean Studios — Template Studio & Creative Hub

A branded, mobile-first creative hub where creators personalize KarlaJean
Studios graphics in their browser: upload photos, type words, preview live,
download a high-quality PNG. **100% client-side — no server, no accounts, no
uploads leaving the device.**

Live: https://karlajean-studios.github.io/template-studio/

## What's here (v0.2 — 2026-10-12)

**Creative hub homepage** (`index.html`): hero with a public
"Creations Made at KarlaJean Studios" counter, template gallery with category
filters, and a KarlaJean-everywhere links section (`links.json`).

**6 templates**, all driven by pure configuration (`templates.json` →
`assets/templates/<id>/spec.json`). Adding a template = new artwork +
spec.json + thumbnail. No editor code changes.

| Template | Category | Slots | Text fields |
|---|---|---|---|
| Creator Spotlight | Networking | 6 circles + name badges | 6 (legacy badges) |
| Creator Besties | Networking | 2 circles | headline, subhead, 2 names |
| Birthday Queen | Celebration | 1 circle | headline, name, subtext |
| Milestone Magic | Celebration | 1 circle | milestone, label, thank-you |
| Small Business Spotlight | Business | 2 roundrects | headline, biz name, tagline |
| Let's Collaborate | Networking | 2 circles | headline, 2 names, CTA |

Editor features: tap to select · drag to reposition · zoom slider ·
double-tap resets · live preview · one-tap **2508×2508 PNG download**.

**Privacy-friendly analytics** (`analytics.js`): counts page visits (once per
session), unique devices per day, editor opens, *completed* downloads, and
link taps. Never collects names, photos, or personal info. Two modes:
- **local** (default): counts stay in the visitor's browser localStorage.
- **global**: point `BACKEND_URL` at the counter worker in `worker/` ($0
  Cloudflare free tier — see `worker/README.md` cost review; NOT deployed).

**Private dashboard** (`dashboard.html`): PIN-protected (device-level),
shows totals, per-template popularity, link taps, and a plain-language
"What we store" explainer.

## Project layout

```
index.html / styles.css / app.js / analytics.js   — the hub + editor
dashboard.html        — private stats dashboard (PIN-gated)
templates.json        — gallery manifest (id, name, category, thumb, spec)
links.json            — hub links (label, url, icon)
assets/templates/<id>/
  bg.jpg              — template artwork (no text baked in — all text is live)
  bg-front.png        — optional foreground layer (Creator Spotlight only)
  spec.json           — slots, texts, frames, brand (the layer contract)
  thumb.jpg           — gallery thumbnail
worker/
  worker.js           — Cloudflare counter backend (NOT deployed)
  README.md           — cost review ($0) + deploy steps
```

**Layer contract** (her requirement): background, frame, decoration, photo,
and text are separate layers. Photos and words are drawn live at render time —
never baked into the artwork.

## Privacy

- Photos are read with `URL.createObjectURL` and drawn to `<canvas>` locally.
- Analytics count events only: no names, no photos, no personal info, ever.
- Stated plainly in the UI and on the dashboard.

## Roadmap

- 6 more templates: Witchy Wisdom, Kindness Challenge, Witchy Christmas,
  Forever Remembered, Beautifully Unhinged, Daily Affirmations
- Global counting via the Cloudflare worker (awaiting her approval — $0)
- More hub links (awaiting her link list)
