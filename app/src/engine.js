// engine.js — the poster drawing engine for Vice City Cover Maker.
//
// Everything the app shows and exports comes from drawPoster() below: the
// on-screen preview and the downloaded PNGs are the same function run at
// different pixel sizes, so what you see is exactly what you get.
//
// All artwork is procedural. Skies, suns, skylines and palms are drawn with
// canvas gradients and paths; photos supplied by the user are colour-graded
// with translucent washes. No third-party artwork, logos or fonts are used —
// lettering relies on the system font stacks named in TITLE_FONT / SUB_FONT.

// ---------------------------------------------------------------------------
// Colour grades. Each grade is a complete little world: a sky ramp, a sun,
// a wash laid over photographs, and the accent colours used for panel tags,
// rules and lettering shadows.
// ---------------------------------------------------------------------------

export const GRADES = {
  sunset: {
    label: 'Sunset',
    skyTop: '#2a1052',
    skyMid: '#a62b7a',
    skyLow: '#ff7a3c',
    horizon: '#ffd76a',
    sunCore: '#fff3b0',
    sunEdge: '#ff9e45',
    wash: 'rgba(255, 110, 64, 0.16)',
    shade: 'rgba(38, 8, 66, 0.30)',
    accent: '#ffb03a',
    tagBg: '#ff2e7e',
    tagFg: '#ffffff',
    silhouette: '#1c0b33',
    water: '#3d1566',
  },
  neon: {
    label: 'Neon',
    skyTop: '#070224',
    skyMid: '#3b0a6e',
    skyLow: '#c2189e',
    horizon: '#ff5da2',
    sunCore: '#c8fff4',
    sunEdge: '#00d8c8',
    wash: 'rgba(210, 30, 160, 0.15)',
    shade: 'rgba(6, 0, 32, 0.34)',
    accent: '#2ee6c8',
    tagBg: '#00c2b8',
    tagFg: '#06222b',
    silhouette: '#0a0430',
    water: '#160a4d',
  },
  dusk: {
    label: 'Dusk',
    skyTop: '#101d2e',
    skyMid: '#274b63',
    skyLow: '#c96f3b',
    horizon: '#f0b269',
    sunCore: '#ffe9c4',
    sunEdge: '#e08b4e',
    wash: 'rgba(70, 110, 150, 0.14)',
    shade: 'rgba(8, 16, 28, 0.32)',
    accent: '#f0a95c',
    tagBg: '#e2703a',
    tagFg: '#ffffff',
    silhouette: '#0b1524',
    water: '#12283d',
  },
};

export const GRADE_KEYS = Object.keys(GRADES);

// ---------------------------------------------------------------------------
// Layouts. Rectangles are fractions of the poster area (inside the white
// frame). Every layout has one large hero panel plus smaller side panels.
// ---------------------------------------------------------------------------

export const LAYOUTS = {
  duo: {
    label: '2 panels',
    panels: [
      { x: 0, y: 0, w: 0.635, h: 1, tag: 'VICE CITY' },
      { x: 0.635, y: 0, w: 0.365, h: 1, tag: 'OCEAN DRIVE' },
    ],
  },
  trio: {
    label: '3 panels',
    panels: [
      { x: 0, y: 0, w: 0.615, h: 1, tag: 'VICE CITY' },
      { x: 0.615, y: 0, w: 0.385, h: 0.505, tag: 'NEON NIGHTS' },
      { x: 0.615, y: 0.505, w: 0.385, h: 0.495, tag: 'THE PIER' },
    ],
  },
  quad: {
    label: '4 panels',
    panels: [
      { x: 0, y: 0, w: 0.595, h: 0.715, tag: 'VICE CITY' },
      { x: 0.595, y: 0, w: 0.405, h: 0.36, tag: 'DOWNTOWN' },
      { x: 0.595, y: 0.36, w: 0.405, h: 0.355, tag: 'PALM ROW' },
      { x: 0, y: 0.715, w: 1, h: 0.285, tag: 'SUNSET STRIP' },
    ],
  },
};

export const LAYOUT_KEYS = Object.keys(LAYOUTS);

export const EXPORT_SIZES = [
  { key: 'square', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { key: 'portrait', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { key: 'wide', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

const TITLE_FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const SUB_FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

// A tiny deterministic generator so the procedural skyline looks designed
// rather than random, and renders identically on every run.
function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// --- procedural scenery -----------------------------------------------------

function paintSky(ctx, grade, x, y, w, h) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.52, grade.skyMid);
  sky.addColorStop(0.8, grade.skyLow);
  sky.addColorStop(1, grade.horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  // The low sun: a soft halo behind a striped disc, very poster-like.
  const sunX = x + w * 0.68;
  const sunY = y + h * 0.62;
  const sunR = Math.min(w, h) * 0.30;
  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.1);
  halo.addColorStop(0, grade.horizon);
  halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = halo;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  const disc = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  disc.addColorStop(0, grade.sunCore);
  disc.addColorStop(1, grade.sunEdge);
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = disc;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  // Retro slats cut across the lower half of the disc.
  ctx.fillStyle = grade.skyMid;
  let slatY = sunY + sunR * 0.08;
  let slatH = sunR * 0.045;
  while (slatY < sunY + sunR) {
    ctx.globalAlpha = 0.55;
    ctx.fillRect(sunX - sunR, slatY, sunR * 2, slatH);
    slatY += slatH * 2.6;
    slatH *= 1.35;
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function paintSkyline(ctx, grade, x, y, w, h, seed) {
  const rand = seededRandom(seed);
  const groundY = y + h * 0.86;
  ctx.fillStyle = grade.silhouette;
  // Two rows of towers: a fainter back row, then the main silhouette.
  for (const [rowBase, rowTop, alpha] of [[0.86, 0.34, 0.45], [0.86, 0.5, 1]]) {
    ctx.globalAlpha = alpha;
    let bx = x - w * 0.02;
    while (bx < x + w) {
      const bw = w * (0.05 + rand() * 0.09);
      const bh = h * (rowTop * (0.45 + rand() * 0.55));
      ctx.fillRect(bx, y + h * rowBase - bh, bw, bh);
      if (rand() > 0.55) {
        // Antenna / water-tower nub on some roofs.
        ctx.fillRect(bx + bw * 0.42, y + h * rowBase - bh - h * 0.05, bw * 0.12, h * 0.05);
      }
      bx += bw + w * 0.012;
    }
  }
  ctx.globalAlpha = 1;
  // Lit windows on the front row.
  ctx.fillStyle = grade.horizon;
  const winRand = seededRandom(seed + 77);
  for (let i = 0; i < Math.floor(w / 9); i++) {
    if (winRand() > 0.5) continue;
    const wx = x + winRand() * w * 0.96;
    const wy = y + h * (0.42 + winRand() * 0.4);
    ctx.globalAlpha = 0.35 + winRand() * 0.5;
    ctx.fillRect(wx, wy, Math.max(2, w * 0.008), Math.max(2, h * 0.012));
  }
  ctx.globalAlpha = 1;
  // Ground / water band with a horizon glow line.
  const ground = ctx.createLinearGradient(0, groundY, 0, y + h);
  ground.addColorStop(0, grade.horizon);
  ground.addColorStop(0.12, grade.water);
  ground.addColorStop(1, grade.silhouette);
  ctx.fillStyle = ground;
  ctx.fillRect(x, groundY, w, y + h - groundY);
}

function paintPalm(ctx, grade, px, py, size, lean) {
  ctx.save();
  ctx.translate(px, py);
  ctx.strokeStyle = grade.silhouette;
  ctx.fillStyle = grade.silhouette;
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.lineCap = 'round';
  // Trunk: a gentle curve leaning with the sea breeze.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * size * 0.4, -size * 0.55, lean * size, -size);
  ctx.stroke();
  // Fronds fanning from the crown.
  const crownX = lean * size;
  const crownY = -size;
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * (0.08 + (i / 6) * 0.84);
    const reach = size * (0.55 + (i % 3) * 0.1);
    const fx = crownX + Math.cos(angle) * reach * (angle < Math.PI / 2 ? 1 : -1) * -1;
    const fy = crownY - Math.sin(angle) * reach * 0.42 + reach * 0.22;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(
      crownX + (fx - crownX) * 0.5,
      crownY - reach * 0.34,
      fx,
      fy,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function paintArtPanel(ctx, grade, rect, seed) {
  paintSky(ctx, grade, rect.x, rect.y, rect.w, rect.h);
  paintSkyline(ctx, grade, rect.x, rect.y, rect.w, rect.h, seed);
  const base = rect.y + rect.h * 0.88;
  paintPalm(ctx, grade, rect.x + rect.w * 0.13, base, rect.h * 0.42, 0.35);
  paintPalm(ctx, grade, rect.x + rect.w * 0.94, base, rect.h * 0.3, -0.3);
}

// --- photographs ------------------------------------------------------------

function paintPhotoPanel(ctx, grade, rect, photo, view) {
  const img = photo.img;
  const zoom = view.zoom || 1;
  const baseScale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = baseScale * zoom;
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const slackX = Math.max(0, drawW - rect.w);
  const slackY = Math.max(0, drawH - rect.h);
  const dx = rect.x + (rect.w - drawW) / 2 + (view.dx || 0) * slackX * 0.5;
  const dy = rect.y + (rect.h - drawH) / 2 + (view.dy || 0) * slackY * 0.5;
  ctx.drawImage(img, dx, dy, drawW, drawH);

  // Grade wash: a warm/cool tint plus a top-and-bottom shade so lettering
  // and tags stay readable over any photograph.
  ctx.fillStyle = grade.wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const shade = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  shade.addColorStop(0, grade.shade);
  shade.addColorStop(0.28, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.72, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, grade.shade);
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// --- lettering ---------------------------------------------------------------

function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px ${TITLE_FONT}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size *= 0.92;
    ctx.font = `900 ${size}px ${TITLE_FONT}`;
  }
  return size;
}

function paintCaption(ctx, grade, W, H, title, sub) {
  const cleanTitle = (title || '').trim().toUpperCase() || 'VICE CITY';
  const cleanSub = (sub || '').trim().toUpperCase();
  const margin = W * 0.055;

  // Accent rule above the title block.
  const ruleY = H - H * 0.235;
  ctx.fillStyle = grade.accent;
  ctx.fillRect(margin, ruleY, W * 0.16, Math.max(3, H * 0.008));

  const titleSize = fitTitleSize(ctx, cleanTitle, W - margin * 2, H * 0.115);
  ctx.font = `900 ${titleSize}px ${TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const titleY = ruleY + titleSize * 1.18;
  // Hard offset shadow in the grade accent, then the white face.
  ctx.fillStyle = grade.tagBg;
  ctx.fillText(cleanTitle, margin + titleSize * 0.045, titleY + titleSize * 0.05);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(cleanTitle, margin, titleY);

  if (cleanSub) {
    const subSize = Math.max(13, H * 0.032);
    ctx.font = `700 ${subSize}px ${SUB_FONT}`;
    // Letter-spaced sub-caption: draw with manual spacing via canvas
    // letterSpacing when available, plain text otherwise.
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch { /* older engines */ }
    ctx.fillStyle = grade.horizon;
    ctx.fillText(cleanSub, margin + 2, titleY + subSize * 1.55);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
}

function paintTag(ctx, grade, rect, text, unit) {
  const fontSize = Math.max(11, unit * 2.6);
  ctx.font = `800 ${fontSize}px ${SUB_FONT}`;
  const padX = fontSize * 0.7;
  const width = ctx.measureText(text).width + padX * 2;
  const height = fontSize * 1.65;
  const tx = rect.x + unit * 1.4;
  const ty = rect.y + unit * 1.4;
  ctx.fillStyle = grade.tagBg;
  roundedRect(ctx, tx, ty, width, height, height * 0.28);
  ctx.fill();
  ctx.fillStyle = grade.tagFg;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, tx + padX, ty + height * 0.54);
}

// --- the poster ---------------------------------------------------------------

// state = {
//   grade: 'sunset' | 'neon' | 'dusk',
//   layout: 'duo' | 'trio' | 'quad',
//   title, sub: strings,
//   panels: [{ photo: photoOrNull, dx, dy, zoom }] — one entry per layout panel
// }
// photos are objects with an .img (HTMLImageElement or ImageBitmap).
export function drawPoster(ctx, W, H, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.trio;
  const unit = Math.min(W, H) / 100;

  // White poster frame.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  const frame = unit * 3.4;
  const gutter = unit * 1.6;
  const innerX = frame;
  const innerY = frame;
  const innerW = W - frame * 2;
  const innerH = H - frame * 2;

  // Dark backing visible through the gutters gives the panels punch.
  ctx.fillStyle = '#14101f';
  ctx.fillRect(innerX - gutter * 0.4, innerY - gutter * 0.4, innerW + gutter * 0.8, innerH + gutter * 0.8);

  layout.panels.forEach((panel, index) => {
    const rect = {
      x: innerX + panel.x * innerW + (panel.x > 0 ? gutter * 0.5 : 0),
      y: innerY + panel.y * innerH + (panel.y > 0 ? gutter * 0.5 : 0),
      w: panel.w * innerW - (panel.w < 1 ? gutter * 0.5 : 0) - (panel.x > 0 ? gutter * 0.5 : 0),
      h: panel.h * innerH - (panel.h < 1 ? gutter * 0.5 : 0) - (panel.y > 0 ? gutter * 0.5 : 0),
    };
    const view = state.panels[index] || { photo: null, dx: 0, dy: 0, zoom: 1 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (view.photo && view.photo.img) {
      paintPhotoPanel(ctx, grade, rect, view.photo, view);
    } else {
      paintArtPanel(ctx, grade, rect, 1234 + index * 987);
    }
    ctx.restore();
    paintTag(ctx, grade, rect, panel.tag, unit);
  });

  // Caption sits over the lower panels, on a soft dark gradient so it reads
  // over photographs and artwork alike.
  const bandH = H * 0.30;
  const band = ctx.createLinearGradient(0, H - bandH, 0, H);
  band.addColorStop(0, 'rgba(10, 4, 24, 0)');
  band.addColorStop(0.45, 'rgba(10, 4, 24, 0.55)');
  band.addColorStop(1, 'rgba(10, 4, 24, 0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(0, H - bandH, W, bandH);
  paintCaption(ctx, grade, W, H, state.title, state.sub);
}

// Panel rectangles in canvas pixel coordinates — the editor uses these to
// hit-test clicks and drags against the same geometry the engine draws.
export function panelRects(W, H, layoutKey) {
  const layout = LAYOUTS[layoutKey] || LAYOUTS.trio;
  const unit = Math.min(W, H) / 100;
  const frame = unit * 3.4;
  const gutter = unit * 1.6;
  const innerW = W - frame * 2;
  const innerH = H - frame * 2;
  return layout.panels.map((panel) => ({
    x: frame + panel.x * innerW + (panel.x > 0 ? gutter * 0.5 : 0),
    y: frame + panel.y * innerH + (panel.y > 0 ? gutter * 0.5 : 0),
    w: panel.w * innerW - (panel.w < 1 ? gutter * 0.5 : 0) - (panel.x > 0 ? gutter * 0.5 : 0),
    h: panel.h * innerH - (panel.h < 1 ? gutter * 0.5 : 0) - (panel.y > 0 ? gutter * 0.5 : 0),
    tag: panel.tag,
  }));
}
