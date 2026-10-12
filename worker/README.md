# KarlaJean Studios counter backend — cost review & deploy guide

**Status: NOT deployed.** Nothing here costs anything until Karla approves.

## What it is

A tiny Cloudflare Worker + KV store that counts real events on the studio site:
page visits, unique devices per day, template editor opens, completed downloads,
and hub link taps. The site's `analytics.js` already speaks this API — flipping
`BACKEND_URL` on is the only code change needed.

## Why not a free counter website?

Tested `counterapi.com` (free, no signup) on 2026-10-12: increments did not
persist (1, 1, 0 across three calls seconds apart). Unreliable — rejected.

## Cost review (Cloudflare free tier)

| Resource | Free allowance | Expected use | Cost |
|---|---|---|---|
| Worker requests | 100,000 / day | Dozens–hundreds / day | **$0** |
| KV reads | 100,000 / day | ~1 per event + dashboard reads | **$0** |
| KV writes | 1,000 / day | 1 per counted event | **$0** |
| KV storage | 1 GB | A few KB of integers | **$0** |

If she ever outgrows free (thousands of events/day), KV pay-as-you-go is
$0.50 per million writes — still pennies. Nothing is charged automatically;
Cloudflare free tier simply stops serving past quota.

## Privacy

- Stored: integer counts keyed by event type (`download:birthday-queen` → 42).
- Uniques: one increment per device per day (the device dedups itself; the
  worker never sees who it is).
- NEVER stored: names, uploaded photos (they never leave the visitor's
  browser), IPs, or personal info.
- Dashboard detail endpoint (`/api/stats`) requires a secret token.

## Deploy steps (when approved)

1. Create a free Cloudflare account (needs Karla's email verification).
2. Workers & Pages → Create Worker → paste `worker.js`.
3. Bindings → add KV namespace named `COUNTERS`, bind as `COUNTERS`.
4. Secrets → add `DASH_TOKEN` (any long random string; Karla keeps it).
5. Deploy → copy the `*.workers.dev` URL.
6. In `analytics.js`, set `BACKEND_URL` to that URL.
7. Commit + push — the site switches to global counting on next deploy.
8. In `dashboard.html`, enter the `DASH_TOKEN` once on Karla's device.

## Upgrade note

This replaces the on-device (localStorage) counting the site ships with.
Local mode keeps working with zero backend — the worker is purely additive.
