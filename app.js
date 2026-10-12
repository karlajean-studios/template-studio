/* KarlaJean Studios Template Studio — Creator Spotlight editor.
   100% client-side: photos never leave the device. */
(function () {
  'use strict';

  var TPL_BASE = 'assets/templates/creator-spotlight/';
  var LOGICAL_W = 1080, LOGICAL_H = 1350; // defaults; replaced by spec.canvas

  var TEMPLATES = [
    {
      id: 'creator-spotlight',
      name: 'Creator Spotlight',
      tag: 'Networking',
      desc: 'Six photo spots, six name badges. Shout out your creator circle and grow together.',
      thumb: TPL_BASE + 'thumb.jpg',
      spec: TPL_BASE + 'spec.json',
      live: true
    },
    { id: 'witchy-humor', name: 'Witchy Humor', tag: 'Coming soon', desc: 'Sassy spell-coded laughs.', live: false },
    { id: 'christmas', name: 'Christmas Magic', tag: 'Coming soon', desc: 'Holiday sparkle, Karla Jean style.', live: false },
    { id: 'kindness', name: 'Kindness Challenge', tag: 'Coming soon', desc: 'Fifty days of soft hearts.', live: false }
  ];

  var spec = null, backImg = null, frontImg = null;
  var slots = [];          // {photo:{img,w,h}|null, scale, ox, oy (logical units), name}
  var activeSlot = 0;
  var canvas, ctx, filePicker, pickingSlot = 0;

  function el(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- gallery ---------- */
  function renderGallery() {
    var g = el('gallery');
    g.innerHTML = '';
    TEMPLATES.forEach(function (t) {
      var card = document.createElement('div');
      card.className = 'tcard' + (t.live ? '' : ' soon');
      var img = document.createElement('img');
      img.alt = t.name + ' template preview';
      img.loading = 'lazy';
      if (t.live) img.src = t.thumb;
      else img.src = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#1a0b30"/>' +
        '<text x="200" y="250" fill="#c9a7ff" font-family="sans-serif" font-size="28" text-anchor="middle">Coming soon</text></svg>');
      var body = document.createElement('div');
      body.className = 'tcard-body';
      body.innerHTML = '<span class="tag">' + t.tag + '</span><h3>' + t.name + '</h3><p>' + t.desc + '</p>';
      var btn = document.createElement(t.live ? 'button' : 'span');
      btn.className = 'btn ' + (t.live ? 'btn-primary' : 'btn-ghost');
      btn.textContent = t.live ? 'Customize →' : 'In the cauldron…';
      if (t.live) btn.addEventListener('click', function () { openEditor(t); });
      body.appendChild(btn);
      card.appendChild(img); card.appendChild(body);
      g.appendChild(card);
    });
  }

  /* ---------- editor ---------- */
  function openEditor(t) {
    el('editor').hidden = false;
    el('editorTitle').textContent = t.name;
    el('templates').scrollIntoView({ behavior: 'smooth' });
    setTimeout(function () { el('editor').scrollIntoView({ behavior: 'smooth' }); }, 60);
    if (spec) { buildSlotCards(); draw(); return; }
    fetch(t.spec).then(function (r) { return r.json(); }).then(function (s) {
      spec = s;
      LOGICAL_W = s.canvas.w; LOGICAL_H = s.canvas.h;
      canvas.width = LOGICAL_W; canvas.height = LOGICAL_H;
      var fp = document.getElementById('dlFinePrint');
      if (fp) fp.textContent = 'High-quality ' + (LOGICAL_W * 2) + ' × ' + (LOGICAL_H * 2) +
        ' PNG, ready for Facebook, Threads & Instagram.';
      loadImage(TPL_BASE + s.layers.back, function (img) { backImg = img; draw(); });
      loadImage(TPL_BASE + s.layers.front, function (img) { frontImg = img; draw(); });
      slots = s.slots.map(function () { return { photo: null, scale: 1, ox: 0, oy: 0, name: '' }; });
      buildSlotCards();
      draw();
    });
  }

  function loadImage(src, cb) {
    var img = new Image();
    img.onload = function () { cb(img); };
    img.src = src;
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

      var zoomRow = document.createElement('div');
      zoomRow.className = 'zoom-row';
      var zlab = document.createElement('span'); zlab.textContent = 'Zoom';
      var z = document.createElement('input');
      z.type = 'range'; z.min = '1'; z.max = '3'; z.step = '0.05'; z.value = '1';
      z.setAttribute('aria-label', 'Zoom photo for ' + s.label);
      z.addEventListener('input', function () { slots[i].scale = parseFloat(z.value); draw(); });
      zoomRow.appendChild(zlab); zoomRow.appendChild(z);

      fields.appendChild(lab); fields.appendChild(row); fields.appendChild(zoomRow);
      card.appendChild(thumb); card.appendChild(fields);
      wrap.appendChild(card);
    });
  }

  function setActive(i) {
    activeSlot = i;
    spec.slots.forEach(function (_, j) {
      var c = el('slotCard' + j);
      if (c) c.classList.toggle('active', j === i);
    });
    el('canvasHint').textContent = spec.slots[i].label + ' selected — upload a photo, drag it to position, zoom to fit.';
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
      th.classList.add('has-photo');
      th.style.backgroundImage = 'url(' + url + ')';
      th.textContent = '';
      draw();
    };
    img.src = url;
  }

  /* ---------- rendering ---------- */
  function draw() {
    if (!canvas) return;
    drawTo(ctx, canvas.width, canvas.height);
  }

  function drawTo(c, W, H) {
    var f = W / LOGICAL_W; // scale factor
    c.clearRect(0, 0, W, H);
    if (backImg) c.drawImage(backImg, 0, 0, W, H);
    else { c.fillStyle = '#12081f'; c.fillRect(0, 0, W, H); }

    spec.slots.forEach(function (s, i) {
      var st = slots[i];
      var cx = s.cx * f, cy = s.cy * f, r = s.r * f;
      c.save();
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
      if (st.photo) {
        var p = st.photo;
        var cover = Math.max((r * 2) / p.w, (r * 2) / p.h);
        var sc = cover * st.scale;
        var dw = p.w * sc, dh = p.h * sc;
        // ox/oy are stored in logical (spec) units so the preview and the
        // high-res download stay in sync; scale them to canvas pixels here.
        var maxOx = Math.max(0, (dw / 2 - r) / f), maxOy = Math.max(0, (dh / 2 - r) / f);
        st.ox = clamp(st.ox, -maxOx, maxOx);
        st.oy = clamp(st.oy, -maxOy, maxOy);
        c.drawImage(p.img, cx - dw / 2 + st.ox * f, cy - dh / 2 + st.oy * f, dw, dh);
      } else if (spec.placeholder !== 'native') {
        c.fillStyle = 'rgba(22,10,40,0.88)';
        c.fillRect(cx - r, cy - r, r * 2, r * 2);
        c.fillStyle = '#c9a7ff';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '700 ' + Math.round(r * 0.5) + 'px Montserrat, sans-serif';
        c.fillText('+', cx, cy - r * 0.28);
        c.font = '700 ' + Math.round(r * 0.16) + 'px Montserrat, sans-serif';
        c.fillStyle = '#b9a8d6';
        c.fillText('TAP TO ADD', cx, cy + r * 0.22);
        c.fillText('PHOTO', cx, cy + r * 0.42);
      }
      c.restore();
    });

    if (frontImg) c.drawImage(frontImg, 0, 0, W, H);

    // names on badge plates, auto-fit (style from spec.badgeText)
    var bt = spec.badgeText || { font: 'Montserrat', fill: '#ffffff', weight: 700 };
    spec.slots.forEach(function (s, i) {
      var name = (slots[i].name || '').trim();
      if (!name) return;
      var b = s.badge;
      var bx = b.cx * f, by = b.cy * f, bw = b.w * f, bh = b.h * f;
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

  /* ---------- canvas interaction: tap to select, drag to pan ---------- */
  function canvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    var p = e.touches && e.touches[0] ? e.touches[0] : e;
    return {
      x: (p.clientX - rect.left) * (LOGICAL_W / rect.width),
      y: (p.clientY - rect.top) * (LOGICAL_H / rect.height)
    };
  }

  function slotAt(x, y) {
    // smallest circle wins on overlap
    var order = spec.slots.map(function (s, i) { return i; })
      .sort(function (a, b) { return spec.slots[a].r - spec.slots[b].r; });
    for (var k = 0; k < order.length; k++) {
      var s = spec.slots[order[k]];
      var dx = x - s.cx, dy = y - s.cy;
      if (dx * dx + dy * dy <= s.r * s.r) return order[k];
    }
    return -1;
  }

  var dragging = false, lastPos = null, moved = 0;

  function bindCanvas() {
    canvas.addEventListener('pointerdown', function (e) {
      var pos = canvasPos(e);
      var i = slotAt(pos.x, pos.y);
      if (i < 0) return;
      setActive(i);
      if (slots[i].photo) {
        dragging = true; moved = 0; lastPos = pos;
        canvas.setPointerCapture(e.pointerId);
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var pos = canvasPos(e);
      // canvasPos is already in logical units; store the drag offset in
      // logical units so it renders identically at any export resolution.
      slots[activeSlot].ox += (pos.x - lastPos.x);
      slots[activeSlot].oy += (pos.y - lastPos.y);
      moved += Math.abs(pos.x - lastPos.x) + Math.abs(pos.y - lastPos.y);
      lastPos = pos;
      draw();
    });
    function endDrag(e) {
      if (dragging) { dragging = false; }
      else if (e.type === 'pointerup') {
        // tap on empty slot -> open picker
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
      var pos = canvasPos(e);
      var i = slotAt(pos.x, pos.y);
      if (i >= 0 && slots[i].photo) {
        slots[i].scale = 1; slots[i].ox = 0; slots[i].oy = 0;
        var z = document.querySelector('#slotCard' + i + ' input[type=range]');
        if (z) z.value = '1';
        draw();
      }
    });
  }

  /* ---------- download ---------- */
  function download() {
    var c = document.createElement('canvas');
    c.width = LOGICAL_W * 2; c.height = LOGICAL_H * 2;
    drawTo(c.getContext('2d'), c.width, c.height);
    c.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'karlajean-studios-creator-spotlight.png';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    }, 'image/png');
  }

  function resetAll() {
    slots.forEach(function (st, i) {
      st.photo = null; st.scale = 1; st.ox = 0; st.oy = 0; st.name = '';
      var th = document.querySelector('#slotCard' + i + ' .slot-thumb');
      if (th) { th.classList.remove('has-photo'); th.style.backgroundImage = ''; th.textContent = '+'; }
      var inp = el('name' + i); if (inp) inp.value = '';
      var z = document.querySelector('#slotCard' + i + ' input[type=range]'); if (z) z.value = '1';
    });
    setActive(0);
    draw();
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    canvas = el('preview'); ctx = canvas.getContext('2d');
    filePicker = el('filePicker');
    renderGallery();
    bindCanvas();
    filePicker.addEventListener('change', function () { handleFile(filePicker.files[0]); });
    el('downloadBtn').addEventListener('click', download);
    el('resetBtn').addEventListener('click', resetAll);
    el('backToGallery').addEventListener('click', function () {
      el('editor').hidden = true;
      el('templates').scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
