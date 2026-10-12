/* KarlaJean Studios counter backend — Cloudflare Worker + KV.
 * $0 on Cloudflare's free tier. NOT YET DEPLOYED — see README.md.
 *
 * API:
 *   GET /api/hit/{action}/{key}   increment a counter      -> {action,key,value}
 *   GET /api/get/{action}/{key}   read one counter         -> {action,key,value}
 *   GET /api/public                public aggregates        -> {visits,totalOpens,totalDownloads,uniquesTotal}
 *   GET /api/stats?token=SECRET    full detail (dashboard)  -> {visits,uniques{},opens{},downloads{},clicks{},...}
 *
 * Actions used by the site: visit, unique, open, download, click.
 * unique keys are dates (YYYY-MM-DD); each device fires once per day.
 * Never stores names, photos, IPs, or personal info — just integer counts.
 */
const ALLOWED_ORIGIN = 'https://karlajean-studios.github.io';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': ALLOWED_ORIGIN,
      'access-control-allow-methods': 'GET, OPTIONS',
      'cache-control': 'no-store',
    },
  });
}

function ck(action, key) {
  return 'c:' + action + ':' + key;
}

async function readInt(env, name) {
  return parseInt((await env.COUNTERS.get(name)) || '0', 10) || 0;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return json({}, 204);
    const parts = url.pathname.split('/').filter(Boolean);

    // increment
    if (parts[0] === 'api' && parts[1] === 'hit' && parts[2] && parts[3]) {
      const action = parts[2];
      const key = parts.slice(3).join('/');
      const value = (await readInt(env, ck(action, key))) + 1;
      await env.COUNTERS.put(ck(action, key), String(value));
      return json({ action, key, value });
    }

    // read one
    if (parts[0] === 'api' && parts[1] === 'get' && parts[2] && parts[3]) {
      const action = parts[2];
      const key = parts.slice(3).join('/');
      return json({ action, key, value: await readInt(env, ck(action, key)) });
    }

    // public aggregates (homepage counter — no token needed, counts only)
    if (parts[0] === 'api' && parts[1] === 'public') {
      return json(await publicStats(env));
    }

    // full detail (dashboard — token required)
    if (parts[0] === 'api' && parts[1] === 'stats') {
      if (!env.DASH_TOKEN || url.searchParams.get('token') !== env.DASH_TOKEN) {
        return json({ error: 'forbidden' }, 403);
      }
      return json(await fullStats(env));
    }

    return json({ ok: true, service: 'kjs-counter' });
  },
};

async function publicStats(env) {
  const s = await fullStats(env);
  return {
    visits: s.visits,
    totalOpens: s.totalOpens,
    totalDownloads: s.totalDownloads,
    uniquesTotal: s.uniquesTotal,
  };
}

async function fullStats(env) {
  const stats = {
    visits: 0,
    uniques: {},
    opens: {},
    downloads: {},
    clicks: {},
    totalOpens: 0,
    totalDownloads: 0,
    uniquesTotal: 0,
  };
  let cursor = undefined;
  do {
    const page = await env.COUNTERS.list({ prefix: 'c:', cursor });
    for (const entry of page.keys) {
      const m = entry.name.match(/^c:(visit|unique|open|download|click):(.+)$/);
      if (!m) continue;
      const v = await readInt(env, entry.name);
      const action = m[1];
      const key = m[2];
      if (action === 'visit') stats.visits += v;
      else if (action === 'unique') { stats.uniques[key] = v; stats.uniquesTotal += v; }
      else if (action === 'open') { stats.opens[key] = v; stats.totalOpens += v; }
      else if (action === 'download') { stats.downloads[key] = v; stats.totalDownloads += v; }
      else if (action === 'click') stats.clicks[key] = v;
    }
    cursor = page.cursor;
    if (page.list_complete) break;
  } while (cursor);
  return stats;
}
