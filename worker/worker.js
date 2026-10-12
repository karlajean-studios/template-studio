/* KarlaJean Studios counter backend — Cloudflare Worker + D1.
 * $0 on Cloudflare's free tier. See README.md for the setup walkthrough.
 *
 * Why D1 (not KV): counter increments are a single atomic SQL statement,
 * so simultaneous visitors can never overwrite each other's counts.
 *
 * API (all JSON):
 *   POST /api/hit   {action, key}   increment a counter (CORS: her site only)
 *   GET  /api/public                public aggregates (homepage counter)
 *   GET  /api/stats?token=SECRET    full detail (private dashboard)
 *
 * Actions: visit, unique, open, download, click.
 * Keys: template ids, link ids, or YYYY-MM-DD dates (for unique).
 * Never stores names, photos, IPs, or personal info — just integer counts.
 */

const ALLOWED_ORIGIN = 'https://karlajean-studios.github.io';
const VALID_ACTIONS = ['visit', 'unique', 'open', 'download', 'click'];

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': ALLOWED_ORIGIN,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'cache-control': 'no-store',
    },
  });
}

function cleanKey(k) {
  // allow letters, numbers, dash, underscore, slash, dot — max 120 chars
  k = String(k || '').slice(0, 120);
  return /^[A-Za-z0-9._\/-]+$/.test(k) ? k : null;
}

async function publicStats(db) {
  const rows = await db.prepare(
    "SELECT action, key, value FROM counters"
  ).all();
  const s = {
    visits: 0, uniquesTotal: 0, totalOpens: 0, totalDownloads: 0,
  };
  for (const r of rows.results || []) {
    if (r.action === 'visit') s.visits += r.value;
    else if (r.action === 'unique') s.uniquesTotal += r.value;
    else if (r.action === 'open') s.totalOpens += r.value;
    else if (r.action === 'download') s.totalDownloads += r.value;
  }
  return s;
}

async function fullStats(db) {
  const rows = await db.prepare(
    "SELECT action, key, value FROM counters ORDER BY action, key"
  ).all();
  const s = {
    visits: 0, uniques: {}, opens: {}, downloads: {}, clicks: {},
    totalOpens: 0, totalDownloads: 0, uniquesTotal: 0,
  };
  for (const r of rows.results || []) {
    if (r.action === 'visit') s.visits += r.value;
    else if (r.action === 'unique') { s.uniques[r.key] = r.value; s.uniquesTotal += r.value; }
    else if (r.action === 'open') { s.opens[r.key] = r.value; s.totalOpens += r.value; }
    else if (r.action === 'download') { s.downloads[r.key] = r.value; s.totalDownloads += r.value; }
    else if (r.action === 'click') s.clicks[r.key] = r.value;
  }
  return s;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return json({}, 204);
    const parts = url.pathname.split('/').filter(Boolean);

    // --- increment (atomic) ---
    if (parts[0] === 'api' && parts[1] === 'hit' && req.method === 'POST') {
      let body = {};
      try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      const action = body.action;
      const key = cleanKey(body.key);
      if (!VALID_ACTIONS.includes(action) || !key) {
        return json({ error: 'bad action or key' }, 400);
      }
      // Atomic: insert or bump in a single statement — no lost counts.
      const row = await env.DB.prepare(
        `INSERT INTO counters(action, key, value) VALUES(?, ?, 1)
         ON CONFLICT(action, key) DO UPDATE SET value = value + 1
         RETURNING value`
      ).bind(action, key).first();
      return json({ action, key, value: row ? row.value : 1 });
    }

    // --- public aggregates (homepage "Creations Made" counter) ---
    if (parts[0] === 'api' && parts[1] === 'public' && req.method === 'GET') {
      return json(await publicStats(env.DB));
    }

    // --- full detail (private dashboard — secret token required) ---
    if (parts[0] === 'api' && parts[1] === 'stats' && req.method === 'GET') {
      const token = url.searchParams.get('token') || '';
      if (!env.DASH_TOKEN || token !== env.DASH_TOKEN) {
        return json({ error: 'forbidden' }, 403);
      }
      return json(await fullStats(env.DB));
    }

    return json({ ok: true, service: 'kjs-counter' });
  },
};
