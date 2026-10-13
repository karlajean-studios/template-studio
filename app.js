/* KarlaJean Studios Template Studio — multi-template editor.
   100% client-side: photos never leave the device.
   Templates are pure configuration: templates.json points at
   assets/templates/<id>/spec.json. Adding a template needs NO editor code.
   Spec v2 adds: texts[], shape circle|roundrect, frame chrome, brand footer.
   The Creator Spotlight spec (badges + native placeholder) keeps working as-is. */
(function () {
  'use strict';

  var FALLBACK_TEMPLATES = [
    {
      id: 'creator-spotlight', name: 'Creator Spotlight', category: 'Networking',
      desc: 'Six photo spots, six name badges. Shout out your creator circle and grow together.',
      thumb: 'assets/templates/creator-spotlight/thumb.jpg',
      spec: 'assets/templates/creator-spotlight/spec.json', live: true
    }
  ];

  var TEMPLATES = [];
  var spec = null, backImg = null, frontImg = null, currentTpl = null;
  var slots = [];   // {photo:{img,w,h}|null, scale, ox, oy (logical units), name}
  var texts = {};   // {textId: current string}
  var activeSlot = 0;
  var canvas, ctx, filePicker, pickingSlot = 0;
  var LOGICAL_W = 1254, LOGICAL_H = 1254;
  var ASSET_V = '0.3.2'; // bump to bust caches on updates

  function el(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function track(t, k) { if (window.KJSAnalytics) KJSAnalytics.track(t, k); }

  /* ---------- gallery ---------- */
  function renderGallery() {
    if (!el('gallery')) return;
    var cats = ['All'];
    TEMPLATES.forEach(function (t) {
      var c = t.category || 'Templates';
      if (cats.indexOf(c) < 0) cats.push(c);
    });
    var chips = el('catChips');
    if (chips) {
      chips.innerHTML = '';
      cats.forEach(function (c, ix) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (ix === 0 ? ' on' : '');
        b.textContent = c;
        b.setAttribute('aria-pressed', ix === 0 ? 'true' : 'false');
        b.addEventListener('click', function () {
          var all = chips.querySelectorAll('.chip');
          for (var i = 0; i < all.length; i++) {
            all[i].classList.remove('on');
            all[i].setAttribute('aria-pressed', 'false');
          }
          b.classList.add('on');
          b.setAttribute('aria-pressed', 'true');
          renderCards(c);
        });
        chips.appendChild(b);
      });
    }
    renderCards('All');
  }

  function renderCards(cat) {
    var g = el('gallery');
    g.innerHTML = '';
    TEMPLATES.forEach(function (t) {
      if (cat !== 'All' && (t.category || 'Templates') !== cat) return;
      var card = document.createElement('div');
      card.className = 'tcard' + (t.live ? '' : ' soon');
      var img = document.createElement('img');
      img.alt = t.name + ' template preview';
      img.loading = 'lazy';
      if (t.live) { img.src = t.thumb; }
      else {
        img.src = 'data:image/svg+xml,' + encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#1a0b30"/>' +
          '<text x="200" y="250" fill="#c9a7ff" font-family="sans-serif" font-size="28" text-anchor="middle">Coming soon</text></svg>');
      }
      var body = document.createElement('div');
      body.className = 'tcard-body';
      var tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = t.category || 'Templates';
      var h = document.createElement('h3');
      h.textContent = t.name;
      var p = document.createElement('p');
      p.textContent = t.desc;
      var btn = document.createElement(t.live ? 'button' : 'span');
      btn.className = 'btn ' + (t.live ? 'btn-primary' : 'btn-ghost');
      btn.textContent = t.live ? 'Use This Template →' : 'In the cauldron…';
      if (t.live) btn.addEventListener('click', function () { openEditor(t); });
      body.appendChild(tag); body.appendChild(h); body.appendChild(p); body.appendChild(btn);
      card.appendChild(img); card.appendChild(body);
      g.appendChild(card);
    });
  }

  /* ---------- links hub ---------- */
  function renderLinks() {
    var grid = el('linkGrid');
    if (!grid) return;
    fetch('links.json?v=' + ASSET_V).then(function (r) { return r.json(); }).then(function (j) {
      (j.links || []).forEach(function (l) {
        var isPending = l.pending && !l.url;
        var card = document.createElement(isPending ? 'div' : 'a');
        card.className = 'link-card' + (isPending ? ' link-pending' : '') + (l.soon ? ' link-soon' : '');
        if (!isPending) {
          card.href = l.url;
          if (l.url.indexOf('mailto:') !== 0) { card.target = '_blank'; card.rel = 'noopener'; }
          card.addEventListener('click', function () { track('click', l.id); });
        } else {
          card.setAttribute('aria-disabled', 'true');
        }
        var icon = document.createElement('span');
        icon.className = 'link-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = l.icon || '✦';
        var tx = document.createElement('span');
        tx.className = 'link-text';
        var strong = document.createElement('strong');
        strong.textContent = l.label;
        var small = document.createElement('small');
        small.textContent = isPending ? 'Coming soon' : (l.sub || '');
        tx.appendChild(strong); tx.appendChild(small);
        var go = document.createElement('span');
        go.className = 'link-go';
        go.setAttribute('aria-hidden', 'true');
        go.textContent = isPending ? '…' : '→';
        card.appendChild(icon); card.appendChild(tx); card.appendChild(go);
        grid.appendChild(card);
      });
    }).catch(function () {});
  }

  /* ---------- editor ---------- */
  function openEditor(t) {
    currentTpl = t;
    spec = null; backImg = null; frontImg = null;
    slots = []; texts = {}; activeSlot = 0;
    el('editor').hidden = false;
    el('editorTitle').textContent = t.name;
    el('slotCards').innerHTML = '';
    var tc = el('textCards');
    if (tc) tc.innerHTML = '';
    var th = el('textCardsHead');
    if (th) th.hidden = true;
    track('open', t.id);
    fetch(t.spec + '?v=' + ASSET_V).then(function (r) { return r.json(); }).then(function (s) {
      spec = s;
      LOGICAL_W = s.canvas.w; LOGICAL_H = s.canvas.h;
      canvas.width = LOGICAL_W; canvas.height = LOGICAL_H;
      var fp = el('dlFinePrint');
      if (fp) fp.textContent = 'High-quality ' + (LOGICAL_W * 2) + ' × ' + (LOGICAL_H * 2) +
        ' PNG, ready for Facebook, Threads & Instagram.';
      var base = 'assets/templates/' + t.id + '/';
      loadImage(base + s.layers.back, function (img) { backImg = img; draw(); });
      if (s.layers.front) loadImage(base + s.layers.front, function (img) { frontImg = img; draw(); });
      slots = s.slots.map(function () { return { photo: null, scale: 1, ox: 0, oy: 0, name: '' }; });
      (s.texts || []).forEach(function (tx) { texts[tx.id] = tx.default || ''; });
      buildSlotCards();
      buildTextCards();
      if (s.slots.length) setActive(0);
      else el('canvasHint').textContent = 'Edit the words below — your design updates live.';
      draw();
    });
    el('templates').scrollIntoView({ behavior: 'smooth' });
    setTimeout(function () { el('editor').scrollIntoView({ behavior: 'smooth' }); }, 60);
  }

  function loadImage(src, cb) {
    var img = new Image();
    img.onload = function () { cb(img); };
    img.src = src + '?v=' + ASSET_V;
  }

  function buildSlotCards() {
    var wrap = el('slotCards');
    wrap.innerHTML = '';
    spec.slots.forEach(function (s, i) {
      var card = document.createElement('div');
      card.className = 'slot-card' + (i === activeSlot ? ' active' : '');
      card.id = 'slotCard' + i;

      var thumb = document.createElement('button');
      thumb.className = 'slot-thumb';
      thumb.type = 'button';
      thumb.setAttribute('aria-label', 'Upload photo for ' + s.label);
      thumb.textContent = '+';
      thumb.addEventListener('click', function () { setActive(i); pickPhoto(i); });

      var fields = document.createElement('div');
      fields.className = 'slot-fields';
      var lab = document.createElement('label');
      lab.textContent = s.label;
      lab.setAttribute('for', 'name' + i);
      fields.appendChild(lab);

      // Legacy badge name field (Creator Spotlight). New templates use texts[].
      if (s.badge) {
        var row = document.createElement('div');
        row.className = 'slot-row';
        var input = document.createElement('input');
        input.type = 'text'; input.id = 'name' + i;
        input.maxLength = 24;
        input.placeholder = 'Type a name…';
        input.setAttribute('aria-label', 'Name for ' + s.label);
        input.addEventListener('input', function () { slots[i].name = input.value; draw(); });
        var upBtn = document.createElement('button');
        upBtn.type = 'button'; upBtn.className = 'btn btn-ghost btn-small';
        upBtn.textContent = '📷 Photo';
        upBtn.addEventListener('click', function () { setActive(i); pickPhoto(i); });
        row.appendChild(input); row.appendChild(upBtn);
        fields.appendChild(row);
      } else {
        var upBtn2 = document.createElement('button');
        upBtn2.type = 'button'; upBtn2.className = 'btn btn-ghost btn-small';
        upBtn2.textContent = '📷 Upload photo';
        upBtn2.addEventListener('click', function () { setActive(i); pickPhoto(i); });
        fields.appendChild(upBtn2);
      }

      var zoomRow = document.createElement('div');
      zoomRow.className = 'zoom-row';
      var zlab = document.createElement('span'); zlab.textContent = 'Zoom';
      var z = document.createElement('input');
      z.type = 'range'; z.min = '1'; z.max = '3'; z.step = '0.05'; z.value = '1';
      z.id = 'zoom' + i;
      z.setAttribute('aria-label', 'Zoom photo for ' + s.label);
      z.addEventListener('input', function () { slots[i].scale = parseFloat(z.value); draw(); });
      zoomRow.appendChild(zlab); zoomRow.appendChild(z);

      fields.appendChild(zoomRow);
      card.appendChild(thumb); card.appendChild(fields);
      wrap.appendChild(card);
    });
  }

  function buildTextCards() {
    var wrap = el('textCards');
    if (!wrap) return;
    wrap.innerHTML = '';
    var list = spec.texts || [];
    var head = el('textCardsHead');
    if (head) head.hidden = !list.length;
    list.forEach(function (tx) {
      var card = document.createElement('div');
      card.className = 'slot-card text-card';
      var fields = document.createElement('div');
      fields.className = 'slot-fields';
      var lab = document.createElement('label');
      lab.textContent = tx.label || tx.id;
      lab.setAttribute('for', 'txt_' + tx.id);
      var input = document.createElement('input');
      input.type = 'text'; input.id = 'txt_' + tx.id;
      input.maxLength = tx.maxLength || 60;
      input.value = texts[tx.id] || '';
      input.placeholder = tx.placeholder || 'Type here…';
      input.setAttribute('aria-label', tx.label || tx.id);
      input.addEventListener('input', function () { texts[tx.id] = input.value; draw(); });
      fields.appendChild(lab); fields.appendChild(input);
      card.appendChild(fields);
      wrap.appendChild(card);
    });
  }

  function setActive(i) {
    if (!spec || !spec.slots[i]) return;
    activeSlot = i;
    spec.slots.forEach(function (_, j) {
      var c = el('slotCard' + j);
      if (c) c.classList.toggle('active', j === i);
    });
    var shape = (spec.slots[i].shape || 'circle') === 'circle' ? 'circle' : 'frame';
    el('canvasHint').textContent = spec.slots[i].label + ' selected — upload a photo, drag it to position, zoom to fit the ' + shape + '.';
  }

  function pickPhoto(i) {
    pickingSlot = i;
    filePicker.value = '';
    filePicker.click();
  }

  function handleFile(file) {
    if (!file || !file.type.match(/^image\//)) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      slots[pickingSlot].photo = { img: img, w: img.naturalWidth, h: img.naturalHeight };
      slots[pickingSlot].scale = 1; slots[pickingSlot].ox = 0; slots[pickingSlot].oy = 0;
      var th = document.querySelector('#slotCard' + pickingSlot + ' .slot-thumb');
      if (th) {
        th.classList.add('has-photo');
        th.style.backgroundImage = 'url(' + url + ')';
        th.textContent = '';
      }
      var z = el('zoom' + pickingSlot);
      if (z) z.value = '1';
      draw();
    };
    img.src = url;
  }

  /* ---------- rendering ---------- */
  function draw() {
    if (!canvas || !spec) return;
    drawTo(ctx, canvas.width, canvas.height);
  }

  function slotPath(c, s, f) {
    c.beginPath();
    if ((s.shape || 'circle') === 'circle') {
      c.arc(s.cx * f, s.cy * f, s.r * f, 0, Math.PI * 2);
    } else {
      var x = (s.cx - s.w / 2) * f, y = (s.cy - s.h / 2) * f;
      roundRectPath(c, x, y, s.w * f, s.h * f, (s.radius || 24) * f);
    }
  }

  function roundRectPath(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawTo(c, W, H) {
    var f = W / LOGICAL_W; // scale factor
    c.clearRect(0, 0, W, H);
    if (backImg) c.drawImage(backImg, 0, 0, W, H);
    else { c.fillStyle = '#12081f'; c.fillRect(0, 0, W, H); }

    spec.slots.forEach(function (s, i) {
      var st = slots[i];
      var isCircle = (s.shape || 'circle') === 'circle';
      var cx = s.cx * f, cy = s.cy * f;
      var fw = (isCircle ? s.r * 2 : s.w) * f;
      var fh = (isCircle ? s.r * 2 : s.h) * f;
      c.save();
      slotPath(c, s, f);
      c.clip();
      if (st.photo) {
        var p = st.photo;
        var cover = Math.max(fw / p.w, fh / p.h);
        var sc = cover * st.scale;
        var dw = p.w * sc, dh = p.h * sc;
        // ox/oy stored in logical units; scale to canvas pixels here so the
        // preview and the high-res download stay in sync.
        var maxOx = Math.max(0, (dw - fw) / 2 / f), maxOy = Math.max(0, (dh - fh) / 2 / f);
        st.ox = clamp(st.ox, -maxOx, maxOx);
        st.oy = clamp(st.oy, -maxOy, maxOy);
        c.drawImage(p.img, cx - dw / 2 + st.ox * f, cy - dh / 2 + st.oy * f, dw, dh);
      } else if (spec.placeholder !== 'native') {
        c.fillStyle = 'rgba(22,10,40,0.88)';
        c.fillRect(cx - fw / 2, cy - fh / 2, fw, fh);
        c.fillStyle = '#c9a7ff';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        var rr = Math.min(fw, fh) / 2;
        c.font = '700 ' + Math.round(rr * 0.5) + 'px Montserrat, sans-serif';
        c.fillText('+', cx, cy - rr * 0.28);
        c.font = '700 ' + Math.round(rr * 0.16) + 'px Montserrat, sans-serif';
        c.fillStyle = '#b9a8d6';
        c.fillText('TAP TO ADD', cx, cy + rr * 0.22);
        c.fillText('PHOTO', cx, cy + rr * 0.42);
      }
      c.restore();
      // decorative frame chrome (opt-in via spec.frame or slot.frame)
      var fr = s.frame || spec.frame;
      if (fr) {
        c.save();
        slotPath(c, s, f);
        if (fr.glow) { c.shadowColor = fr.glow; c.shadowBlur = (fr.glowBlur || 20) * f; }
        c.strokeStyle = fr.stroke || '#ff4fd8';
        c.lineWidth = (fr.width || 10) * f;
        c.stroke();
        c.restore();
      }
    });

    if (frontImg) c.drawImage(frontImg, 0, 0, W, H);

    drawBadges(c, f); // legacy Creator Spotlight name badges
    drawTexts(c, f);  // generic editable text fields
    drawBrand(c, f);  // tasteful studio mark
  }

  function drawBadges(c, f) {
    var bt = spec.badgeText;
    if (!bt) return;
    spec.slots.forEach(function (s, i) {
      if (!s.badge) return;
      var name = (slots[i].name || '').trim();
      if (!name) return;
      var b = s.badge;
      var bx = b.cx * f, by = b.cy * f, bw = b.w * f;
      var size = (b.fontSize || 30) * f;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      var fontOf = function (px) { return bt.weight + ' ' + Math.round(px) + 'px ' + bt.font + ', sans-serif'; };
      c.font = fontOf(size);
      while (c.measureText(name.toUpperCase()).width > bw - 16 * f && size > 10 * f) { size -= 2 * f; c.font = fontOf(size); }
      if (bt.fill === '#ffffff') { c.shadowColor = 'rgba(255,46,154,.8)'; c.shadowBlur = 12 * f; }
      c.fillStyle = bt.fill;
      c.fillText(name.toUpperCase(), bx, by + 1 * f);
      c.shadowBlur = 0;
    });
  }

  function drawTexts(c, f) {
    (spec.texts || []).forEach(function (tx) {
      var str = texts[tx.id];
      if (str === undefined || str === null) str = '';
      str = String(str);
      if (!str.trim()) return;
      var lines = str.split('\n');
      if (tx.uppercase) lines = lines.map(function (l) { return l.toUpperCase(); });
      var size = (tx.size || 48) * f;
      c.save();
      c.textAlign = tx.align || 'center';
      c.textBaseline = 'middle';
      var fontOf = function (px) {
        return (tx.weight || 400) + ' ' + Math.round(px) + 'px "' + (tx.font || 'Montserrat') + '", sans-serif';
      };
      if (tx.maxWidth) {
        var fits = function () {
          c.font = fontOf(size);
          var wmax = 0;
          lines.forEach(function (ln) { wmax = Math.max(wmax, c.measureText(ln).width); });
          return wmax;
        };
        var w = fits();
        while (w > tx.maxWidth * f && size > 12 * f) { size -= 2 * f; w = fits(); }
      }
      c.font = fontOf(size);
      if (tx.shadow) { c.shadowColor = tx.shadow; c.shadowBlur = (tx.shadowBlur || 16) * f; }
      var lh = size * (tx.lineHeight || 1.18);
      var cx = tx.x * f, cy0 = tx.y * f - ((lines.length - 1) * lh) / 2;
      lines.forEach(function (ln, ix) {
        var ly = cy0 + ix * lh;
        if (tx.stroke) {
          c.strokeStyle = tx.stroke;
          c.lineWidth = (tx.strokeWidth || 6) * f;
          c.lineJoin = 'round';
          c.strokeText(ln, cx, ly);
        }
        c.fillStyle = tx.fill || '#ffffff';
        c.fillText(ln, cx, ly);
      });
      c.restore();
    });
  }

  function drawBrand(c, f) {
    var b = spec.brand;
    if (!b || !b.text) return;
    c.save();
    c.globalAlpha = (b.alpha != null ? b.alpha : 0.85);
    c.textAlign = b.align || 'center';
    c.textBaseline = 'middle';
    var bx = (b.x != null ? b.x : LOGICAL_W / 2) * f;
    var by = (b.y != null ? b.y : LOGICAL_H - 44) * f;
    // Main line: studio name
    c.font = '700 ' + Math.round((b.size || 28) * f) + 'px Montserrat, sans-serif';
    c.shadowColor = 'rgba(255,79,216,.6)';
    c.shadowBlur = 10 * f;
    c.fillStyle = b.fill || '#ffd7f2';
    c.fillText(b.text, bx, by);
    // Sub line: studio URL (smaller, quieter)
    if (b.sub) {
      c.shadowBlur = 0;
      c.font = '600 ' + Math.round((b.subSize || 18) * f) + 'px Montserrat, sans-serif';
      c.fillStyle = b.subFill || '#c9a7ff';
      c.fillText(b.sub, bx, by + Math.round((b.size || 28) * 1.1) * f);
    }
    c.restore();
  }

  /* ---------- canvas interaction: tap to select, drag to pan ---------- */
  function canvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    var p = e.touches && e.touches[0] ? e.touches[0] : e;
    return {
      x: (p.clientX - rect.left) * (LOGICAL_W / rect.width),
      y: (p.clientY - rect.top) * (LOGICAL_H / rect.height)
    };
  }

  function slotArea(i) {
    var s = spec.slots[i];
    return (s.shape || 'circle') === 'circle' ? s.r * s.r * 4 : s.w * s.h;
  }

  function slotAt(x, y) {
    // smallest frame wins on overlap
    var order = spec.slots.map(function (s, i) { return i; })
      .sort(function (a, b) { return slotArea(a) - slotArea(b); });
    for (var k = 0; k < order.length; k++) {
      var s = spec.slots[order[k]];
      if ((s.shape || 'circle') === 'circle') {
        var dx = x - s.cx, dy = y - s.cy;
        if (dx * dx + dy * dy <= s.r * s.r) return order[k];
      } else if (Math.abs(x - s.cx) <= s.w / 2 && Math.abs(y - s.cy) <= s.h / 2) {
        return order[k];
      }
    }
    return -1;
  }

  var dragging = false, lastPos = null, moved = 0;

  function bindCanvas() {
    canvas.addEventListener('pointerdown', function (e) {
      if (!spec) return;
      var pos = canvasPos(e);
      var i = slotAt(pos.x, pos.y);
      if (i < 0) return;
      setActive(i);
      if (slots[i].photo) {
        dragging = true; moved = 0; lastPos = pos;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var pos = canvasPos(e);
      // canvasPos is already in logical units; the offset is stored in logical
      // units so the preview and the high-res download stay in sync.
      slots[activeSlot].ox += (pos.x - lastPos.x);
      slots[activeSlot].oy += (pos.y - lastPos.y);
      moved += Math.abs(pos.x - lastPos.x) + Math.abs(pos.y - lastPos.y);
      lastPos = pos;
      draw();
    });
    function endDrag(e) {
      if (dragging) { dragging = false; }
      else if (e.type === 'pointerup' && spec) {
        // tap on empty frame -> open picker
        var pos = canvasPos(e);
        var i = slotAt(pos.x, pos.y);
        if (i >= 0 && !slots[i].photo && moved < 4) pickPhoto(i);
      }
      moved = 0;
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', function () { dragging = false; });
    // double-tap / double-click resets photo position
    canvas.addEventListener('dblclick', function (e) {
      if (!spec) return;
      var pos = canvasPos(e);
      var i = slotAt(pos.x, pos.y);
      if (i >= 0 && slots[i].photo) {
        slots[i].scale = 1; slots[i].ox = 0; slots[i].oy = 0;
        var z = el('zoom' + i);
        if (z) z.value = '1';
        draw();
      }
    });
  }

  /* ---------- download ---------- */
  var lastBlob = null;   // the most recent creation, for share/open fallbacks
  var lastBlobUrl = null;
  function download() {
    if (!spec || !currentTpl) return;
    var btn = el('downloadBtn');
    var origText = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Creating PNG…'; btn.disabled = true; }
    var c = document.createElement('canvas');
    c.width = LOGICAL_W * 2; c.height = LOGICAL_H * 2;
    try {
      drawTo(c.getContext('2d'), c.width, c.height);
    } catch (e) {
      if (btn) { btn.textContent = origText; btn.disabled = false; }
      showSaveMessage('Something went wrong creating your image — please try tapping Download again.');
      return;
    }
    var finished = false;
    var timer = setTimeout(function () {
      if (!finished && btn) { btn.textContent = origText; btn.disabled = false; }
    }, 15000);
    c.toBlob(function (blob) {
      finished = true; clearTimeout(timer);
      if (btn) { btn.textContent = origText; btn.disabled = false; }
      if (!blob) {
        showSaveMessage('Your image could not be created — please try tapping Download again.');
        return;
      }
      // count only completed downloads — the PNG actually exists here
      track('download', currentTpl.id);
      lastBlob = blob;
      if (lastBlobUrl) { try { URL.revokeObjectURL(lastBlobUrl); } catch (e) {} }
      lastBlobUrl = URL.createObjectURL(blob);
      // Primary: direct download via anchor (works on desktop + most mobile)
      var a = document.createElement('a');
      a.href = lastBlobUrl;
      a.download = 'karlajean-studios-' + currentTpl.id + '.png';
      document.body.appendChild(a); a.click();
      setTimeout(function () { a.remove(); }, 4000);
      // reveal sharing options after a completed creation
      showShareRow();
    }, 'image/png');
  }

  var STUDIO_URL = 'https://karlajean-studios.github.io/template-studio/';
  function showSaveMessage(msg) {
    var hint = el('shareHint');
    if (hint) { hint.innerHTML = msg; hint.hidden = false; }
    var row = el('shareRow');
    if (row) row.hidden = false;
  }
  function showShareRow() {
    var row = el('shareRow'), hint = el('shareHint');
    if (!row) return;
    row.hidden = false;
    if (hint) {
      hint.innerHTML = 'If your download didn\'t start, tap <strong>Save image</strong> below — or View full image, then long-press it to save.';
      hint.hidden = false;
    }
    // The Save button ALWAYS works: file-share where supported,
    // otherwise the full-image view (long-press to save). It never
    // falls back to sharing just the studio link.
    var sb = el('shareBtn');
    if (sb) sb.hidden = false;
    var oRow = el('openImgRow');
    if (oRow) oRow.hidden = !lastBlobUrl;
  }
  function copyStudioLink() {
    var done = function () {
      var b = el('copyLinkBtn');
      if (b) { var t = b.textContent; b.textContent = '✓ Copied!'; setTimeout(function () { b.textContent = t; }, 1800); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(STUDIO_URL).then(done, done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = STUDIO_URL; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove(); done();
    }
  }
  function nativeShare() {
    // Save flow: share the actual image file where the browser supports
    // it (Android share sheet offers "Save to device" / "Download").
    // Where file-sharing is NOT supported (in-app browsers, some iOS
    // contexts), show the full-image view instead — long-press to save.
    // NEVER fall back to sharing just the studio link: that made users
    // think their image was saved when only a link went out.
    if (lastBlob) {
      try {
        var file = new File([lastBlob], 'karlajean-studios-' + (currentTpl ? currentTpl.id : 'creation') + '.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'My KarlaJean Studios creation' }).catch(function () {});
          return;
        }
      } catch (e) {}
    }
    // No file-share available (or no image yet): open the full image so
    // the user can long-press and save it. Never silently do nothing.
    openFullImage();
  }
  function openFullImage() {
    // Bulletproof fallback: show the PNG full-screen in a modal.
    // Long-pressing the <img> brings up the native "Save image" menu
    // in every mobile browser, including in-app browsers where
    // downloads and window.open are blocked.
    var modal = el('imgModal'), img = el('imgModalImg');
    if (modal && img && lastBlobUrl) {
      img.src = lastBlobUrl;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    }
  }
  function closeImgModal() {
    var modal = el('imgModal');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
  }

  function resetAll() {
    slots.forEach(function (st, i) {
      st.photo = null; st.scale = 1; st.ox = 0; st.oy = 0; st.name = '';
      var th = document.querySelector('#slotCard' + i + ' .slot-thumb');
      if (th) { th.classList.remove('has-photo'); th.style.backgroundImage = ''; th.textContent = '+'; }
      var inp = el('name' + i); if (inp) inp.value = '';
      var z = el('zoom' + i); if (z) z.value = '1';
    });
    (spec.texts || []).forEach(function (tx) {
      texts[tx.id] = tx.default || '';
      var inp = el('txt_' + tx.id);
      if (inp) inp.value = texts[tx.id];
    });
    setActive(0);
    draw();
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    canvas = el('preview'); ctx = canvas.getContext('2d');
    filePicker = el('filePicker');
    if (window.KJSAnalytics) {
      KJSAnalytics.track('visit', 'home');
      KJSAnalytics.track('unique', 'daily');
      KJSAnalytics.renderPublicCounter('creationsCount');
    }
    fetch('templates.json?v=' + ASSET_V)
      .then(function (r) { return r.json(); })
      .then(function (j) { TEMPLATES = j.templates || j; renderGallery(); })
      .catch(function () { TEMPLATES = FALLBACK_TEMPLATES; renderGallery(); });
    renderLinks();
    bindCanvas();
    filePicker.addEventListener('change', function () { handleFile(filePicker.files[0]); });
    el('downloadBtn').addEventListener('click', download);
    el('resetBtn').addEventListener('click', resetAll);
    if (el('copyLinkBtn')) el('copyLinkBtn').addEventListener('click', copyStudioLink);
    if (el('shareBtn')) el('shareBtn').addEventListener('click', nativeShare);
    if (el('openImgBtn')) el('openImgBtn').addEventListener('click', openFullImage);
    if (el('imgModalClose')) el('imgModalClose').addEventListener('click', closeImgModal);
    if (el('imgModal')) el('imgModal').addEventListener('click', function (e) {
      if (e.target === el('imgModal')) closeImgModal();
    });
    el('backToGallery').addEventListener('click', function () {
      el('editor').hidden = true;
      el('templates').scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
