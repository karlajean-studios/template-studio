# KarlaJean Studios counter backend — cost review & deploy guide

**Status: NOT deployed.** Nothing here costs anything until Karla finishes the setup below.

## What it is

A tiny Cloudflare Worker + D1 database that counts real events on the studio site:
page visits, unique devices per day, template editor opens, completed downloads,
and hub link taps. The site's `analytics.js` already speaks this API — flipping
`BACKEND_URL` on is the only code change needed.

Why D1 (not KV): every count is a single atomic SQL statement, so two visitors
arriving at the same instant can never overwrite each other's counts.

## Why not a free counter website?

Tested `counterapi.com` (free, no signup) on 2026-10-12: increments did not
persist (1, 1, 0 across three calls seconds apart). Unreliable — rejected.

## Cost review (Cloudflare free tier) — verified against Cloudflare's pricing page 2026-10-12

| Resource | Free allowance | Expected use | Cost |
|---|---|---|---|
| Worker requests | 100,000 / day | Dozens–hundreds / day | **$0** |
| D1 rows read | 5,000,000 / day | Hundreds / day | **$0** |
| D1 rows written | 100,000 / day | Dozens / day | **$0** |
| D1 storage | 5 GB | A few KB of integers | **$0** |

No credit card is required for the free tier. Nothing is charged automatically.

## Privacy

- Stored: integer counts keyed by event type (`download:birthday-queen` → 42).
- Uniques: one increment per device per day (the device dedups itself; the
  worker never sees who it is).
- NEVER stored: names, uploaded photos (they never leave the visitor's
  browser), IPs, or personal info.
- Dashboard detail endpoint (`/api/stats`) requires a secret token only Karla knows.

## Setup walkthrough (Karla does this — about 15 minutes)

**You own this.** The Cloudflare account is in your name, your email, your
password. Jessica never sees your password.

### Part 1 — Create your free Cloudflare account
1. Go to **dash.cloudflare.com/sign-up** in your browser.
2. Sign up with **karlajeanstudios@gmail.com** and a password you choose.
3. Verify your email (Cloudflare sends a confirmation link).
4. You do NOT need to add a website or domain — skip that. You only need
   Workers, which work without a domain.

### Part 2 — Create the database (D1)
1. In the Cloudflare dashboard sidebar, go to **Workers & Pages → D1**.
2. Click **Create**, name it `kjs-counters`, click **Create** again.
3. Click into `kjs-counters`, then open the **Console** tab.
4. Paste this and click **Execute**:
   ```sql
   CREATE TABLE IF NOT EXISTS counters (
     action TEXT NOT NULL,
     key TEXT NOT NULL,
     value INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (action, key)
   );
   ```
   You should see "Success".

### Part 3 — Create the Worker
1. Go to **Workers & Pages → Create → Create Worker**.
2. Name it `kjs-counter` (or anything you like).
3. Click **Deploy**, then **Edit code**.
4. Delete everything in the editor, paste the full contents of `worker.js`
   (from this repo's `worker/` folder), and click **Save and deploy**.
5. Copy your Worker URL — it looks like
   `https://kjs-counter.YOUR-NAME.workers.dev`. Save it somewhere.

### Part 4 — Connect the database to the Worker
1. On your Worker's page, go to **Settings → Bindings → Add binding → D1 database**.
2. Variable name: `DB` (must be exactly `DB`, capital letters).
3. Database: choose `kjs-counters`. Click **Add binding**.
4. Click **Redeploy** (or Deploy) so the binding takes effect.

### Part 5 — Set your private dashboard password (token)
1. On your Worker's page, go to **Settings → Variables and Secrets**.
2. Under **Secrets**, click **Add**, name it `DASH_TOKEN`.
3. Value: make up a long random phrase only you know, e.g.
   `purple-moon-77-witch-hat-creations` (longer is better).
   Write it down — you'll type it into your dashboard once.
4. Click **Redeploy** so the secret takes effect.

### Part 6 — Tell Jessica
Send Jessica two things:
1. Your Worker URL (`https://kjs-counter.…workers.dev`)
2. **Do NOT send the DASH_TOKEN in chat.** You'll type it into the dashboard
   yourself on your own device — Jessica never needs to see it.

Jessica then flips one line in `analytics.js` (`BACKEND_URL`), pushes the
site, and global counting goes live. The homepage "Creations Made" counter
will show the real studio-wide total, and your private dashboard will unlock
with the token.

## What you control

- The Cloudflare account, the database, and the Worker are all yours.
- You can see every count in D1's Console tab any time.
- You can delete everything (Worker → Manage → Delete; D1 → Delete).
- If you ever change the `DASH_TOKEN`, the dashboard simply asks for the new one.
