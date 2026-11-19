// main.js — editor wiring for Vice City Cover Maker.
//
// The drawing lives in engine.js; this file owns the state, the controls
// and the pointer work: loading photos, picking panels, dragging to pan,
// zooming to crop, randomising, and exporting real PNG files rendered by
// the same engine at full post size.

import {
  GRADES, GRADE_KEYS, LAYOUTS, LAYOUT_KEYS, EXPORT_SIZES, drawPoster, panelRects,
} from './engine.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

const els = {
  file: document.getElementById('photo-file'),
  samplePier: document.getElementById('sample-pier'),
  sampleBlvd: document.getElementById('sample-blvd'),
  thumbs: document.getElementById('thumbs'),
  layout: document.getElementById('layout-select'),
  gradeRow: document.getElementById('grade-row'),
  title: document.getElementById('title-input'),
  sub: document.getElementById('sub-input'),
  panelPhoto: document.getElementById('panel-photo'),
  zoom: document.getElementById('zoom-range'),
  fillAll: document.getElementById('fill-all'),
  clearPanel: document.getElementById('clear-panel'),
  surprise: document.getElementById('surprise'),
  size: document.getElementById('size-select'),
  exportBtn: document.getElementById('export-btn'),
  status: document.getElementById('status'),
  selectedLabel: document.getElementById('selected-label'),
};

// ---------------------------------------------------------------------------
// State. photos[] holds { id, name, img } for every picture the user has
// loaded (uploads and samples alike). panels[] mirrors the active layout:
// one { photoId, dx, dy, zoom } per panel.
// ---------------------------------------------------------------------------

let photoSeq = 0;
const photos = [];
const state = {
  grade: 'sunset',
  layout: 'trio',
  title: 'Vice City Nights',
  sub: 'One city · No brakes',
  panels: [],
};

function resetPanels(keepPhotos = false) {
  const count = LAYOUTS[state.layout].panels.length;
  const previous = state.panels;
  state.panels = Array.from({ length: count }, (_, i) => {
    if (keepPhotos && previous[i]) return previous[i];
    return { photoId: null, dx: 0, dy: 0, zoom: 1 };
  });
}
resetPanels();

let selected = 0;

function panelView(panel) {
  const photo = photos.find((p) => p.id === panel.photoId) || null;
  return { photo, dx: panel.dx, dy: panel.dy, zoom: panel.zoom };
}

function posterState() {
  return {
    grade: state.grade,
    layout: state.layout,
    title: state.title,
    sub: state.sub,
    panels: state.panels.map(panelView),
  };
}

// ---------------------------------------------------------------------------
// Rendering. The preview canvas keeps the export aspect at half resolution
// so the framing the user sees matches the exported file.
// ---------------------------------------------------------------------------

function render() {
  drawPoster(ctx, canvas.width, canvas.height, posterState());
  drawSelectionOutline();
  syncControls();
}

function drawSelectionOutline() {
  const rects = panelRects(canvas.width, canvas.height, state.layout);
  const rect = rects[selected];
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, canvas.width * 0.006);
  ctx.setLineDash([18, 12]);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function setAspect(sizeKey) {
  const size = EXPORT_SIZES.find((s) => s.key === sizeKey) || EXPORT_SIZES[0];
  canvas.width = Math.round(size.w / 2);
  canvas.height = Math.round(size.h / 2);
  canvas.style.aspectRatio = `${size.w} / ${size.h}`;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function say(message) {
  els.status.textContent = message;
}

function syncControls() {
  const panel = state.panels[selected];
  els.selectedLabel.textContent = panel
    ? `Panel ${selected + 1} of ${state.panels.length} — ${LAYOUTS[state.layout].panels[selected].tag}`
    : '';
  if (panel) {
    els.zoom.value = String(panel.zoom);
    els.panelPhoto.value = panel.photoId === null ? '' : String(panel.photoId);
  }
  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.grade === state.grade);
    btn.setAttribute('aria-pressed', String(btn.dataset.grade === state.grade));
  });
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function refreshPhotoPickers() {
  const options = ['<option value="">Procedural art (no photo)</option>'];
  for (const photo of photos) {
    options.push(`<option value="${photo.id}">${escapeHtml(photo.name)}</option>`);
  }
  els.panelPhoto.innerHTML = options.join('');
  els.thumbs.innerHTML = '';
  for (const photo of photos) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `Put ${photo.name} in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    const label = document.createElement('span');
    label.textContent = photo.name;
    btn.append(img, label);
    btn.addEventListener('click', () => assignPhoto(selected, photo.id));
    els.thumbs.append(btn);
  }
  syncControls();
}

function assignPhoto(panelIndex, photoId) {
  const panel = state.panels[panelIndex];
  if (!panel) return;
  panel.photoId = photoId;
  panel.dx = 0;
  panel.dy = 0;
  panel.zoom = 1;
  render();
}

function addPhoto(img, name) {
  const photo = { id: ++photoSeq, name, img };
  photos.push(photo);
  refreshPhotoPickers();
  return photo;
}

function loadImageFromUrl(url, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(addPhoto(img, name));
    img.onerror = reject;
    img.src = url;
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(addPhoto(img, file.name.replace(/\.[^.]+$/, '')));
    img.onerror = (err) => { URL.revokeObjectURL(url); reject(err); };
    img.src = url;
  });
}

// Fill empty panels from the loaded photos — hero first, then the rest —
// so one upload is enough for a finished cover.
function autoFillPanels() {
  if (!photos.length) return;
  state.panels.forEach((panel, i) => {
    if (panel.photoId === null) {
      panel.photoId = photos[Math.min(i, photos.length - 1)].id;
    }
  });
  render();
}

els.file.addEventListener('change', async () => {
  const files = [...els.file.files].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  say(`Loading ${files.length} photo${files.length > 1 ? 's' : ''}…`);
  for (const file of files) {
    try { await loadImageFromFile(file); } catch { say(`Could not read ${file.name}.`); }
  }
  autoFillPanels();
  say(`${photos.length} photo${photos.length === 1 ? '' : 's'} loaded. Click a panel, drag to pan, zoom to crop.`);
  els.file.value = '';
});

els.samplePier.addEventListener('click', async () => {
  await loadImageFromUrl('./samples/pier.jpg', 'Sample - The Pier');
  autoFillPanels();
  say('Sample photo loaded and placed. Make it yours: drag, zoom, re-caption.');
});
els.sampleBlvd.addEventListener('click', async () => {
  await loadImageFromUrl('./samples/boulevard.jpg', 'Sample - Boulevard');
  autoFillPanels();
  say('Sample photo loaded and placed. Make it yours: drag, zoom, re-caption.');
});

els.layout.addEventListener('change', () => {
  state.layout = els.layout.value;
  resetPanels(true);
  if (selected >= state.panels.length) selected = 0;
  render();
});

els.gradeRow.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-grade]');
  if (!btn) return;
  state.grade = btn.dataset.grade;
  render();
});

els.title.addEventListener('input', () => { state.title = els.title.value; render(); });
els.sub.addEventListener('input', () => { state.sub = els.sub.value; render(); });

els.panelPhoto.addEventListener('change', () => {
  const value = els.panelPhoto.value;
  assignPhoto(selected, value === '' ? null : Number(value));
});

els.zoom.addEventListener('input', () => {
  const panel = state.panels[selected];
  if (!panel) return;
  panel.zoom = Number(els.zoom.value);
  render();
});

els.fillAll.addEventListener('click', () => {
  const panel = state.panels[selected];
  const source = panel && panel.photoId !== null
    ? panel.photoId
    : (photos[0] ? photos[0].id : null);
  if (source === null) { say('Load a photo first, then fill every panel with it.'); return; }
  state.panels.forEach((p) => { p.photoId = source; });
  say('Every panel now shows that photo. Vary the zoom per panel for the poster look.');
  render();
});

els.clearPanel.addEventListener('click', () => {
  assignPhoto(selected, null);
  say('Panel cleared back to procedural Vice City art.');
});

// --- surprise me --------------------------------------------------------------

const SURPRISE_TITLES = [
  ['Neon Reckoning', 'The city never sleeps in'],
  ['Palm Tree Bandits', 'Steal the sunset'],
  ['Midnight Boulevard', 'Every light is a promise'],
  ['Vice City Nights', 'One city, no brakes'],
  ['Golden Hour Heist', 'In by dusk, out by dawn'],
  ['Chrome and Coral', 'Trouble looks good here'],
];

els.surprise.addEventListener('click', () => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.grade = pick(GRADE_KEYS);
  state.layout = pick(LAYOUT_KEYS);
  const [title, sub] = pick(SURPRISE_TITLES);
  state.title = title;
  state.sub = sub;
  els.title.value = title;
  els.sub.value = sub;
  els.layout.value = state.layout;
  resetPanels(true);
  state.panels.forEach((panel) => {
    if (photos.length && Math.random() > 0.25) {
      panel.photoId = pick(photos).id;
    }
    panel.dx = (Math.random() * 2 - 1) * 0.5;
    panel.dy = (Math.random() * 2 - 1) * 0.5;
    panel.zoom = 1 + Math.random() * 0.7;
  });
  selected = 0;
  render();
  say('Surprise served. Export it, or hit Surprise again.');
});

// --- export --------------------------------------------------------------------

els.size.addEventListener('change', () => { setAspect(els.size.value); render(); });

els.exportBtn.addEventListener('click', () => {
  const size = EXPORT_SIZES.find((s) => s.key === els.size.value) || EXPORT_SIZES[0];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawPoster(off.getContext('2d'), size.w, size.h, posterState());
  off.toBlob((blob) => {
    if (!blob) { say('Export failed in this browser — try again.'); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug = (state.title || 'vice-city').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'vice-city';
    link.href = url;
    link.download = `${slug}-${size.w}x${size.h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    say(`Exported ${size.w} x ${size.h} PNG. Post it anywhere.`);
  }, 'image/png');
});

// --- pointer work: select a panel, drag to pan ---------------------------------

let drag = null;

function canvasPoint(event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - box.left) * (canvas.width / box.width),
    y: (event.clientY - box.top) * (canvas.height / box.height),
  };
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const rects = panelRects(canvas.width, canvas.height, state.layout);
  const hit = rects.findIndex((r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h);
  if (hit === -1) return;
  selected = hit;
  const panel = state.panels[selected];
  drag = { startX: point.x, startY: point.y, dx: panel.dx, dy: panel.dy, rect: rects[hit] };
  canvas.setPointerCapture(event.pointerId);
  render();
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const panel = state.panels[selected];
  if (!panel || panel.photoId === null) return;
  panel.dx = clamp(drag.dx + (point.x - drag.startX) / (drag.rect.w * 0.5), -1.6, 1.6);
  panel.dy = clamp(drag.dy + (point.y - drag.startY) / (drag.rect.h * 0.5), -1.6, 1.6);
  render();
});

canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// ---------------------------------------------------------------------------
// Deep links and screenshot mode. ?shot=cover renders a clean cover with no
// editor chrome; any load can pre-set grade, layout, captions, size and a
// sample photo, e.g. ?grade=neon&layout=quad&photo=pier&photoAll=1.
// ---------------------------------------------------------------------------

async function applyQuery() {
  const query = new URLSearchParams(location.search);
  if (query.get('grade') && GRADES[query.get('grade')]) state.grade = query.get('grade');
  if (query.get('layout') && LAYOUTS[query.get('layout')]) {
    state.layout = query.get('layout');
    els.layout.value = state.layout;
    resetPanels();
  }
  if (query.get('title')) { state.title = query.get('title'); els.title.value = state.title; }
  if (query.get('sub')) { state.sub = query.get('sub'); els.sub.value = state.sub; }
  if (query.get('size') && EXPORT_SIZES.some((s) => s.key === query.get('size'))) {
    els.size.value = query.get('size');
  }
  setAspect(els.size.value);
  const photoName = query.get('photo');
  if (photoName === 'pier' || photoName === 'boulevard') {
    await loadImageFromUrl(`./samples/${photoName}.jpg`, `Sample - ${photoName}`);
    autoFillPanels();
    if (query.get('photoAll') === '1' && photos.length) {
      state.panels.forEach((p) => { p.photoId = photos[0].id; });
    }
  }
  if (query.get('shot') === 'cover') {
    document.body.classList.add('shot-cover');
    // The selection outline belongs to the editor, not the exported art.
    drawPoster(ctx, canvas.width, canvas.height, posterState());
    return;
  }
  render();
}

applyQuery().catch(() => { setAspect(els.size.value); render(); });
