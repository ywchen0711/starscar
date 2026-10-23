// The battle map seen from above at an angle: raised columns of ground, the units standing on them,
// coloured overlays for moving and aiming, and the little effects (numbers, flashes, spell rings).
import { TERRAIN, ELEMENTS, STATUS } from '../data/core.js';
import { groundTex, sprite as deco, tileHash, rnd as drnd } from './deco.js';
import { person, monster, SPR_W, SPR_H, SPR_SCALE, MON_W, MON_H } from './sprites.js';
import { MONSTERS } from '../data/monsters.js';

export const TW = 64, TH = 32, HS = 12;      // tile width, tile height, pixels per height step
const SIDE = TW / Math.SQRT2;                // the length of a tile's side on screen (at zoom 1)
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } return `rgb(${r | 0},${g | 0},${b | 0})`; };

// team colours: ring under the feet, outline round the sprite, a soft fill
const TEAM = {
  ally: { ring: '#5aa8ff', edge: '#3a7ae0', soft: 'rgba(80,150,255,.22)' },
  guest: { ring: '#6ae08a', edge: '#2aa85a', soft: 'rgba(90,220,130,.2)' },
  foe: { ring: '#ff6a5a', edge: '#d0302a', soft: 'rgba(255,90,80,.22)' },
};
const outlineCache = new Map();
// the sprite with a one-pixel outline of a colour around it (cached)
function outlined(img, col) {
  let m = outlineCache.get(img); if (!m) { m = new Map(); outlineCache.set(img, m); }
  if (m.has(col)) return m.get(col);
  const c = document.createElement('canvas'); c.width = img.width + 2; c.height = img.height + 2; const g = c.getContext('2d');
  const sil = document.createElement('canvas'); sil.width = img.width; sil.height = img.height; const sg = sil.getContext('2d');
  sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col; sg.fillRect(0, 0, sil.width, sil.height);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2], [0, 0], [2, 2], [0, 2], [2, 0]]) g.drawImage(sil, dx, dy);
  g.drawImage(img, 1, 1);
  m.set(col, c); return c;
}
export class IsoView {
  constructor(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    // the camera: angle (any value; 45° is the classic diamond view), pitch (how flat the ground looks), zoom and pan
    this.angle = Math.PI / 4; this.target = this.angle; this.pitch = 0.5; this.zoomUser = 1; this.zoom = 1; this.panX = 0; this.panY = 0;
    this.map = null; this.units = []; this.marks = new Map(); this.cursor = null; this.fx = []; this.anim = new Map(); this.showLoot = false; this.treasure = [];
    this.time = 0;
  }
  setMap(map) { this.map = map; this.fit(); }
  // the nearest quarter turn (keyboard arrows and the facing menu work in quarter turns)
  get rot() { return ((Math.round((this.angle - Math.PI / 4) / (Math.PI / 2)) % 4) + 4) % 4; }
  // grid point (gx, gy) at height h to the screen
  project(gx, gy, h) {
    const dx = gx - this.map.w / 2, dy = gy - this.map.h / 2, c = Math.cos(this.angle), s = Math.sin(this.angle), S = SIDE * this.zoom;
    return [this.ox + (dx * c - dy * s) * S, this.oy + (dx * s + dy * c) * S * this.pitch - h * HS * this.zoom];
  }
  depth(gx, gy) { const dx = gx - this.map.w / 2, dy = gy - this.map.h / 2; return dx * Math.sin(this.angle) + dy * Math.cos(this.angle); }
  // screen position of the top centre of a tile
  sp(x, y, hgt) { return this.project(x + 0.5, y + 0.5, hgt); }
  fit() {
    const W = this.cv.width, H = this.cv.height, maxH = Math.max(...this.map.tiles.map((t) => t.h));
    // fit the map's diagonal so it never spills out whichever way it's turned
    const diag = Math.hypot(this.map.w, this.map.h);
    const zx = W / (diag * SIDE * 1.05), zy = H / (diag * SIDE * this.pitch * 1.05 + maxH * HS + 120);
    this.zoom = Math.min(1.7, Math.max(0.35, Math.min(zx, zy))) * this.zoomUser;
    this.ox = W / 2 + this.panX; this.oy = H / 2 + (maxH * HS * this.zoom) / 2 + 20 * this.zoom + this.panY;
  }
  // a turn of 45° (eased); turnBy for free turning by any amount
  rotate(d) { this.target = Math.round((this.target + d * Math.PI / 4) / (Math.PI / 4)) * (Math.PI / 4); }
  turnBy(rad) { this.angle += rad; this.target = this.angle; }
  tilt(dp) { this.pitch = Math.max(0.3, Math.min(0.85, this.pitch + dp)); this.fit(); }
  zoomBy(k) { this.zoomUser = Math.max(0.5, Math.min(2.6, this.zoomUser * k)); this.fit(); }
  pan(dx, dy) { this.panX += dx; this.panY += dy; this.fit(); }
  // which way a unit faces on screen: towards the viewer or away, and mirrored or not
  facing(dir) {
    const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir || 0], c = Math.cos(this.angle), s = Math.sin(this.angle);
    const vx = dx * c - dy * s, vy = dx * s + dy * c;
    return { back: vy < -0.05, flip: vx > 0 };
  }

  draw(dt = 0) {
    this.time += dt;
    // ease the camera toward its target angle
    if (Math.abs(this.target - this.angle) > 0.001) { this.angle += (this.target - this.angle) * Math.min(1, dt * 9 || 0.25); if (Math.abs(this.target - this.angle) < 0.002) this.angle = this.target; }
    const g = this.g, W = this.cv.width, H = this.cv.height, map = this.map;
    if (!map) return;
    this.fit();
    const sky = map.dark ? ['#0a0a14', '#1a1626'] : map.theme === 'sky' || map.theme === 'void' ? ['#1a2a5a', '#6a7ac8'] : ['#2c2418', '#3e3222'];
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // a soft light behind the field and darker corners, so the map sits in a spotlight
    const glow = g.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, Math.max(W, H) * 0.6); glow.addColorStop(0, 'rgba(255,240,210,.10)'); glow.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    const vig = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.8); vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vig; g.fillRect(0, 0, W, H);
    // far tiles first
    const order = map.tiles.map((t) => ({ t, d: this.depth(t.x + 0.5, t.y + 0.5) })).sort((a, b) => a.d - b.d);
    this.order = order;
    const byTile = new Map(); for (const u of this.units) if (!u.gone && !u.jumping) byTile.set(`${u.x},${u.y}`, u);
    for (const { t } of order) {
      this.drawTile(t);
      const u = byTile.get(`${t.x},${t.y}`); if (u) this.drawUnit(u, t);
    }
    // jumping units hang in the air above the map
    for (const u of this.units) if (u.jumping && !u.gone) { const t = map.tiles[u.y * map.w + u.x]; if (t) this.drawUnit(u, t, 140); }
    this.drawFx(dt);
  }
  // the four corners of a tile's top at height h, in order: NW NE SE SW
  corners(t, h, k = 1) {
    const i = (1 - k) / 2;
    return [[t.x + i, t.y + i], [t.x + 1 - i, t.y + i], [t.x + 1 - i, t.y + 1 - i], [t.x + i, t.y + 1 - i]].map(([x, y]) => this.project(x, y, h));
  }
  pattern(col, kind, variant) {
    this.pats = this.pats || new Map(); const key = col + kind + variant;
    if (!this.pats.has(key)) this.pats.set(key, this.g.createPattern(groundTex(col, kind, variant), 'repeat'));
    return this.pats.get(key);
  }
  drawTile(t) {
    const g = this.g, z = this.zoom, T = TERRAIN[t.t] || TERRAIN.grass, map = this.map;
    const water = t.t === 'water' || t.t === 'deep', lava = t.t === 'lava';
    const top4 = this.corners(t, t.h), c = Math.cos(this.angle), s = Math.sin(this.angle);
    // the sides that face the camera, each down to the neighbour beyond it (or below the ground at the map's edge)
    const edges = [[0, 1, 0, -1], [1, 2, 1, 0], [2, 3, 0, 1], [3, 0, -1, 0]];
    for (const [a, b, nx, ny] of edges) {
      const facing = nx * s + ny * c; if (facing <= 0.01) continue;
      const nb = map.tiles[(t.y + ny) * map.w + (t.x + nx)], inside = t.x + nx >= 0 && t.y + ny >= 0 && t.x + nx < map.w && t.y + ny < map.h;
      const low = inside && nb ? nb.h : -2; if (low >= t.h) continue;
      const drop = (t.h - low) * HS * z, [ax, ay] = top4[a], [bx, by] = top4[b];
      const light = (nx * c - ny * s);    // light from the left
      g.fillStyle = shade(T.side, -0.12 - (light > 0 ? 0.22 * light : 0) + (light < 0 ? 0.05 : 0));
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(bx, by + drop); g.lineTo(ax, ay + drop); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; for (let d = HS * z; d < drop; d += HS * z) { g.beginPath(); g.moveTo(ax, ay + d); g.lineTo(bx, by + d); g.stroke(); }
    }
    // the top
    let top = T.top;
    if (water) top = shade(T.top, Math.sin(this.time * 2 + t.x + t.y) * 0.08);
    if (lava) top = shade(T.top, Math.sin(this.time * 3 + t.x * 2) * 0.15);
    if (!water && !lava) top = shade(top, Math.min(0.22, t.h * 0.03) - 0.04);
    const poly = (pts) => { g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]); g.closePath(); };
    g.fillStyle = top; poly(top4); g.fill();
    // a pixel texture over the top (not on moving water or lava), lit by height
    if (!water && !lava) {
      const pat = this.pattern(T.top, t.t, (t.x + t.y) % 2);
      pat.setTransform(new DOMMatrix().scale(z * 1.5));
      g.fillStyle = pat; poly(top4); g.fill();
      const lift = Math.min(0.22, t.h * 0.03) - 0.04; if (lift) { g.fillStyle = lift > 0 ? `rgba(255,240,200,${lift})` : `rgba(0,0,0,${-lift})`; poly(top4); g.fill(); }
    } else if (water) { g.fillStyle = 'rgba(220,240,255,.35)'; for (let i = 0; i < 2; i++) { const ph = (this.time * 0.6 + i * 0.5 + (t.x + t.y) * 0.13) % 1; const [px, py] = this.project(t.x + 0.2 + ph * 0.6, t.y + 0.3 + i * 0.35, t.h); g.fillRect(px, py, 5 * z, 1.5 * z); } }
    // a light rim on the far edges and a dark one on the near edges
    g.lineWidth = 1;
    for (const [a, b, nx, ny] of edges) { const f = nx * s + ny * c; g.strokeStyle = f > 0.01 ? 'rgba(46,30,18,.55)' : 'rgba(255,240,200,.18)'; g.beginPath(); g.moveTo(...top4[a]); g.lineTo(...top4[b]); g.stroke(); }
    const [cx, cy] = this.sp(t.x, t.y, t.h);
    // little things on natural ground: tufts, flowers, pebbles (they always face the camera)
    if (!water && !lava && !t.obj && ['grass', 'dirt', 'moss', 'sand', 'snow', 'swamp'].includes(t.t)) {
      const r = drnd(tileHash(t.x, t.y)), n = t.t === 'grass' || t.t === 'moss' ? 3 : 1;
      for (let i = 0; i < n; i++) { const roll = r(); const kind = t.t === 'snow' || t.t === 'sand' || t.t === 'dirt' ? (roll < 0.4 ? 'pebble' : null) : roll < 0.55 ? 'tuft' : roll < 0.7 ? 'flower' : roll < 0.8 ? 'pebble' : null; const u = 0.2 + r() * 0.6, v = 0.2 + r() * 0.6; if (!kind) continue; const o = deco(kind, Math.floor(r() * 3)), [px, py] = this.project(t.x + u, t.y + v, t.h), k2 = z * 1.6; g.drawImage(o.c, px - o.ax * k2, py - o.ay * k2, o.w * k2, o.h * k2); }
    }
    // overlays
    const m = this.marks.get(`${t.x},${t.y}`);
    if (m) { g.fillStyle = m; poly(this.corners(t, t.h, 0.82)); g.fill(); g.strokeStyle = m.replace(/[\d.]+\)$/, '0.95)'); g.lineWidth = 1.5; g.stroke(); }
    if (this.cursor && this.cursor[0] === t.x && this.cursor[1] === t.y) { g.strokeStyle = '#fff'; g.lineWidth = 2.5; poly(top4); g.stroke(); g.lineWidth = 1; }
    if (this.showLoot && this.treasure.some((q) => q.x === t.x && q.y === t.y && !q.taken)) { const k = (Math.sin(this.time * 5 + t.x) + 1) / 2; g.fillStyle = `rgba(255,230,120,${0.4 + k * 0.6})`; g.beginPath(); g.arc(cx, cy, (3 + k * 3) * z, 0, Math.PI * 2); g.fill(); }
    // things standing on the tile
    if (t.obj === 'tree' || t.obj === 'rock') {
      // pixel trees (a small grove) and boulders, standing on the tile
      const r = drnd(tileHash(t.x, t.y) + 5), k2 = z * 2.2;
      const items = t.obj === 'tree' ? [[r() < 0.3 ? 'pine' : 'tree', 0, 0]] : [['rock', 0, 0], ['rock', 0.18, 0.16]];
      if (t.obj === 'tree' && r() < 0.5) items.unshift([r() < 0.5 ? 'pine' : 'tree', -0.2, -0.18]);
      for (const [kind, du, dv] of items) { const o = deco(kind, Math.floor(r() * 3)), [px, py] = this.project(t.x + 0.5 + du, t.y + 0.5 + dv, t.h), kk = kind === 'rock' ? k2 * 1.15 : k2; g.drawImage(o.c, px - o.ax * kk, py - o.ay * kk, o.w * kk, o.h * kk); }
    }
    else if (t.obj === 'pillar') { g.fillStyle = '#d8d4e0'; g.fillRect(cx - 7 * z, cy - 46 * z, 14 * z, 46 * z); g.fillStyle = '#a8a4b8'; g.fillRect(cx + 2 * z, cy - 46 * z, 5 * z, 46 * z); g.fillStyle = '#f0ecf8'; g.fillRect(cx - 9 * z, cy - 50 * z, 18 * z, 5 * z); }
  }

  drawUnit(u, t, lift = 0) {
    const g = this.g, z = this.zoom, an = this.anim.get(u.id) || {};
    let [cx, cy] = this.sp(t.x, t.y, t.h);
    if (an.from) { const [fx, fy, fh] = an.from, k = an.k ?? 1; const [ax, ay] = this.sp(fx, fy, fh); cx = ax + (cx - ax) * k; cy = ay + (cy - ay) * k - Math.sin(k * Math.PI) * 10 * z * (an.hop || 0); }
    cy -= lift * z;
    const { back, flip } = this.facing(an.dir ?? u.dir);
    const pose = u.dead ? 'dead' : an.pose || (Math.floor(this.time * 2 + u.id) % 2 ? 'idle1' : 'idle0');
    const mon = u.u.mon, img = mon ? monster(mon, back, pose) : person(u.u, back, pose);
    const big = mon ? (MONSTERS[mon].size || 1) : 1, sw = (mon ? MON_W * 2 : SPR_W * SPR_SCALE) * z * big, sh = (mon ? MON_H * 2 : SPR_H * SPR_SCALE) * z * big;
    const team = TEAM[u.st && u.st.charm ? (u.side === 'foe' ? 'ally' : 'foe') : u.side] || TEAM.ally;
    g.save(); g.imageSmoothingEnabled = false;
    // a clean ring in the team's colour under the feet (none for the fallen)
    if (!u.dead) {
      const rx = 17 * z * big, ry = 7.5 * z * big;
      g.fillStyle = team.soft; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = team.ring; g.lineWidth = Math.max(1.5, 2 * z); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.stroke();
    }
    if (u.charging) { const s = (Math.sin(this.time * 6) + 1) / 2; g.strokeStyle = `rgba(190,170,255,${0.4 + s * 0.5})`; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, 23 * z, 10 * z, 0, 0, Math.PI * 2); g.stroke(); }
    if (an.flash) g.filter = 'brightness(2.2)';
    else if (u.st && u.st.stop) g.filter = 'grayscale(1)';
    g.translate(cx, cy + 4 * z); if (flip) g.scale(-1, 1);
    // the sprite with a thin outline in the team's colour, so friend and foe never blur together
    const pad = 2 * z * big;
    g.drawImage(u.dead ? img : outlined(img, team.edge), -sw / 2 - (u.dead ? 0 : pad), -sh + (mon ? 4 * z : 0) - (u.dead ? 0 : pad), sw + (u.dead ? 0 : pad * 2), sh + (u.dead ? 0 : pad * 2));
    g.restore();
    if (!u.dead && u.s) {
      // a slim health bar, framed in the team's colour
      const bw = 24 * z, bx = cx - bw / 2, by = cy - sh - 3 * z, p = Math.max(0, u.hp / u.s.hp);
      g.fillStyle = 'rgba(10,10,20,.75)'; g.fillRect(bx - 1, by - 1, bw + 2, 3 * z + 2);
      g.fillStyle = p > 0.5 ? '#6ad87a' : p > 0.25 ? '#e8c84a' : '#ef5a4a'; g.fillRect(bx, by, bw * p, 3 * z);
      g.strokeStyle = team.ring; g.lineWidth = 1; g.strokeRect(bx - 1.5, by - 1.5, bw + 3, 3 * z + 3);
      // statuses as small coloured dots
      const sts = Object.keys(u.st || {}).filter((k) => u.st[k] < 90 && STATUS[k]).slice(0, 5);
      sts.forEach((k, i) => { g.fillStyle = STATUS[k].col; g.beginPath(); g.arc(bx + 3 * z + i * 6 * z, by - 4 * z, 2.4 * z, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke(); });
      if (u.boss) { g.fillStyle = '#ffd040'; g.font = `bold ${11 * z}px sans-serif`; g.textAlign = 'center'; g.fillText('♛', cx, by - 7 * z - (sts.length ? 5 * z : 0)); g.textAlign = 'left'; }
      // whose turn it is: a bobbing gold arrow
      if (this.active === u) { const ay = by - 10 * z - Math.abs(Math.sin(this.time * 4)) * 5 * z - (u.boss || sts.length ? 9 * z : 0); g.fillStyle = '#ffd860'; g.strokeStyle = '#3a2a10'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 6 * z, ay - 7 * z); g.lineTo(cx + 6 * z, ay - 7 * z); g.lineTo(cx, ay); g.closePath(); g.fill(); g.stroke(); }
    }
    u._sx = cx; u._sy = cy;
  }
  // ---------------------------------------------------------------- effects
  pop(u, text, col = '#fff', big = false) { this.fx.push({ k: 'num', u, text, col, t: 0, big }); }
  ring(x, y, col = '#8ad8ff', r = 1) { this.fx.push({ k: 'ring', x, y, col, t: 0, r }); }
  bolt(from, to, col = '#fff') { this.fx.push({ k: 'line', from, to, col, t: 0 }); }
  drawFx(dt) {
    const g = this.g, z = this.zoom;
    for (const f of this.fx) {
      f.t += dt;
      if (f.k === 'num') {
        const x = f.u._sx ?? 0, y = (f.u._sy ?? 0) - 50 * z - f.t * 40 * z;
        g.font = `bold ${(f.big ? 22 : 17) * z}px "DotGothic16", sans-serif`; g.textAlign = 'center';
        g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(f.text, x, y); g.fillStyle = f.col; g.fillText(f.text, x, y); g.textAlign = 'left';
      } else if (f.k === 'ring') {
        const t = this.map.tiles[f.y * this.map.w + f.x]; if (!t) continue;
        const [cx, cy] = this.sp(f.x, f.y, t.h), k = Math.max(0, f.t / 0.7);
        g.strokeStyle = f.col; g.globalAlpha = Math.max(0, 1 - k); g.lineWidth = 3;
        g.beginPath(); g.ellipse(cx, cy - 10 * z, Math.max(1, (12 + k * 30 * f.r) * z), Math.max(1, (6 + k * 15 * f.r) * z), 0, 0, Math.PI * 2); g.stroke();
        g.fillStyle = f.col; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + f.t * 3; g.fillRect(cx + Math.cos(a) * 18 * z * (1 + k), cy - 10 * z - k * 40 * z + Math.sin(a) * 6 * z, 3 * z, 3 * z); }
        g.globalAlpha = 1; g.lineWidth = 1;
      } else if (f.k === 'line') {
        g.strokeStyle = f.col; g.globalAlpha = Math.max(0, 1 - f.t / 0.4); g.lineWidth = 3;
        g.beginPath(); g.moveTo(f.from._sx, f.from._sy - 30 * z); g.lineTo(f.to._sx, f.to._sy - 30 * z); g.stroke(); g.globalAlpha = 1; g.lineWidth = 1;
      }
    }
    this.fx = this.fx.filter((f) => f.t < (f.k === 'num' ? 1.1 : 0.8));
  }
  // ---------------------------------------------------------------- picking: which tile is under the pointer
  pick(px, py) {
    const inside = (pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; };
    const order = this.order || this.map.tiles.map((t) => ({ t, d: this.depth(t.x + 0.5, t.y + 0.5) })).sort((a, b) => a.d - b.d);
    for (let i = order.length - 1; i >= 0; i--) { const t = order[i].t; if (inside(this.corners(t, t.h))) return [t.x, t.y]; }
    // or a unit's body standing above its tile
    const z = this.zoom; for (const u of this.units) if (!u.gone && u._sx && Math.abs(px - u._sx) < 14 * z && py < u._sy && py > u._sy - 48 * z) return [u.x, u.y];
    return null;
  }

}
export const elColour = (el) => (el && ELEMENTS[el] ? ELEMENTS[el][2] : '#ffffff');
