/* KarlaJean Studios — privacy-friendly usage analytics.
 *
 * Two modes:
 *  - local (default): counts live in this browser's localStorage. No network at all.
 *  - global: BACKEND_URL points at her counter worker; events are fire-and-forget.
 *
 * What is counted: page visits (once per session), unique devices (once per
 * device per day, via a random local id — never personal), template editor
 * opens, completed downloads (only when the PNG is actually created),
 * outbound link clicks. Counted once per real event — reloads and double
 * taps do not inflate the numbers.
 *
 * NEVER collected: names, uploaded photos (they never leave the device),
 * or any personal information.
 */
var KJSAnalytics = (function () {
  'use strict';

  // Set this to the counter worker URL to switch on global counting.
  // Example: 'https://kjs-counter.karlajean.workers.dev'. Empty = on-device only.
  var BACKEND_URL = '';

  var PROD_RE = /karlajean-studios\.github\.io$/;
  var LS_KEY = 'kjs_analytics_v1';

  function isProd() {
    try {
      return PROD_RE.test(location.hostname) || /[?&]kjstest=1/.test(location.search);
    } catch (e) { return false; }
  }

  function blank() {
    return { visits: 0, uniques: {}, opens: {}, downloads: {}, clicks: {} };
  }
  function loadLocal() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY));
      return s || blank();
    } catch (e) { return blank(); }
  }
  function saveLocal(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function today() {
    return new Date().toISOString().slice(0, 10);
  }
  function sessionGuard(key) {
    try {
      if (sessionStorage.getItem(key)) return true;
      sessionStorage.setItem(key, '1');
    } catch (e) {}
    return false;
  }
  function dayGuard(key) {
    // one hit per device per day (localStorage)
    try {
      var k = key + '_' + today();
      if (localStorage.getItem(k)) return true;
      localStorage.setItem(k, '1');
    } catch (e) {}
    return false;
  }

  function fire(url) {
    try {
      var ctl = new AbortController();
      var t = setTimeout(function () { ctl.abort(); }, 4000);
      fetch(url, { mode: 'cors', keepalive: true, signal: ctl.signal })
        .then(function () { clearTimeout(t); }, function () { clearTimeout(t); });
    } catch (e) {}
  }
  function hitUrl(type, key) {
    return BACKEND_URL + '/api/hit/' + encodeURIComponent(type) +
      '/' + encodeURIComponent(key);
  }

  function getToken() {
    try { return localStorage.getItem('kjs_dash_token') || ''; }
    catch (e) { return ''; }
  }
  function setToken(t) {
    try { localStorage.setItem('kjs_dash_token', t); } catch (e) {}
  }

  /* Track one real event. Types: visit, unique, open, download, click.
     key: template id for open/download, link id for click. */
  function track(type, key) {
    if (!isProd()) return; // never count dev / preview traffic
    if (type === 'unique') key = today(); // one bucket per day
    key = String(key || 'home').replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'home';
    if (type === 'visit' && sessionGuard('kjs_visit')) return;
    if (type === 'unique' && dayGuard('kjs_unique')) return;
    if (BACKEND_URL) { fire(hitUrl(type, key)); return; }
    var s = loadLocal();
    if (type === 'visit') s.visits++;
    else if (type === 'unique') s.uniques[today()] = 1;
    else {
      var bucket = s[type + 's']; // opens, downloads, clicks
      if (!bucket) return;
      bucket[key] = (bucket[key] || 0) + 1;
    }
    saveLocal(s);
  }

  function sum(o) {
    var n = 0;
    for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) n += o[k]; }
    return n;
  }

  function localStats() {
    var s = loadLocal();
    return {
      mode: 'local',
      visits: s.visits,
      uniqueDays: Object.keys(s.uniques).length,
      opens: s.opens,
      downloads: s.downloads,
      clicks: s.clicks,
      totalDownloads: sum(s.downloads),
      totalOpens: sum(s.opens),
      totalClicks: sum(s.clicks)
    };
  }

  /* Aggregated stats for the dashboard / public counter. */
  function getStats() {
    if (BACKEND_URL && isProd()) {
      var token = getToken();
      var url = BACKEND_URL + (token ? '/api/stats?token=' + encodeURIComponent(token) : '/api/public');
      var ctl = new AbortController();
      var t = setTimeout(function () { ctl.abort(); }, 6000);
      return fetch(url, { mode: 'cors', signal: ctl.signal })
        .then(function (r) {
          clearTimeout(t);
          if (!r.ok) throw new Error('stats ' + r.status);
          return r.json();
        })
        .then(function (j) {
          j.mode = 'global';
          j.authed = !!token;
          if (!j.totalDownloads) j.totalDownloads = 0;
          return j;
        })
        .catch(function () { return localStats(); });
    }
    return Promise.resolve(localStats());
  }

  /* Fill the public "Creations Made" counter element. */
  function renderPublicCounter(elmId) {
    var elm = document.getElementById(elmId);
    if (!elm) return;
    function show(n) {
      elm.textContent = (n || 0).toLocaleString('en-US');
    }
    if (BACKEND_URL && isProd()) {
      var ctl = new AbortController();
      var t = setTimeout(function () { ctl.abort(); }, 6000);
      fetch(BACKEND_URL + '/api/public', { mode: 'cors', signal: ctl.signal })
        .then(function (r) { clearTimeout(t); return r.json(); })
        .then(function (j) { show(j.totalDownloads); })
        .catch(function () { show(localStats().totalDownloads); });
      return;
    }
    show(localStats().totalDownloads);
  }

  return {
    track: track,
    getStats: getStats,
    renderPublicCounter: renderPublicCounter,
    setToken: setToken,
    isProd: isProd,
    backendOn: function () { return !!BACKEND_URL && isProd(); }
  };
})();
