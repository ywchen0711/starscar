// The battle map seen from above at an angle: raised columns of ground, the units standing on them,
// coloured overlays for moving and aiming, and the little effects (numbers, flashes, spell rings).
import { TERRAIN, ELEMENTS } from '../data/core.js';
import { person, monster, SPR_W, SPR_H, MON_W, MON_H } from './sprites.js';
import { MONSTERS } from '../data/monsters.js';

export const TW = 64, TH = 32, HS = 12;      // tile width, tile height, pixels per height step
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } return `rgb(${r | 0},${g | 0},${b | 0})`; };

export class IsoView {
  constructor(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.rot = 0; this.zoom = 1; this.panX = 0; this.panY = 0;
    this.map = null; this.units = []; this.marks = new Map(); this.cursor = null; this.fx = []; this.anim = new Map(); this.showLoot = false; this.treasure = [];
    this.time = 0;
  }
  setMap(map) { this.map = map; this.fit(); }
  // rotate grid coordinates for the camera (0-3 quarter turns)
  rc(x, y) { const { w, h } = this.map; switch (this.rot) { case 1: return [h - 1 - y, x]; case 2: return [w - 1 - x, h - 1 - y]; case 3: return [y, w - 1 - x]; default: return [x, y]; } }
  // screen position of the top centre of a tile
  sp(x, y, hgt) { const [rx, ry] = this.rc(x, y); return [this.ox + (rx - ry) * TW / 2 * this.zoom, this.oy + ((rx + ry) * TH / 2 - hgt * HS) * this.zoom]; }
  fit() {
    const W = this.cv.width, H = this.cv.height, maxH = Math.max(...this.map.tiles.map((t) => t.h));
    const [RW, RH] = this.rot % 2 ? [this.map.h, this.map.w] : [this.map.w, this.map.h];
    const iw = (RW + RH) * TW / 2, top = maxH * HS + 70, bottom = (RW + RH - 2) * TH / 2 + TH + 20, ih = top + bottom;
    this.zoom = Math.min(1.6, Math.max(0.4, Math.min(W / (iw + 24), H / (ih + 24)))) * (this.zoomK || 1);
    this.ox = W / 2 - ((RW - 1) - (RH - 1)) * TW / 4 * this.zoom + this.panX;
    this.oy = H / 2 - ((bottom - top) / 2) * this.zoom + this.panY;
  }
  rotate(d) { this.rot = (this.rot + d + 4) % 4; this.fit(); }
  // which way a unit faces on screen: front (towards the viewer) or back, and mirrored or not
  facing(dir) { const d = (dir + this.rot) % 4; return { back: d === 2 || d === 3, flip: d === 0 || d === 3 }; }

  draw(dt = 0) {
    this.time += dt;
    const g = this.g, W = this.cv.width, H = this.cv.height, map = this.map;
    const sky = map.dark ? ['#0a0a14', '#1a1626'] : map.theme === 'sky' || map.theme === 'void' ? ['#1a2a5a', '#6a7ac8'] : ['#1a2238', '#3a4a6a'];
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (!map) return;
    const z = this.zoom, order = map.tiles.map((t) => ({ t, k: this.rc(t.x, t.y) })).sort((a, b) => a.k[0] + a.k[1] - (b.k[0] + b.k[1]) || a.k[0] - b.k[0]);
    const byTile = new Map(); for (const u of this.units) if (!u.gone && !u.jumping) byTile.set(`${u.x},${u.y}`, u);
    for (const { t } of order) {
      this.drawTile(t);
      const u = byTile.get(`${t.x},${t.y}`); if (u) this.drawUnit(u, t);
    }
    // jumping units hang in the air above the map
    for (const u of this.units) if (u.jumping && !u.gone) { const t = map.tiles[u.y * map.w + u.x]; if (t) this.drawUnit(u, t, 140); }
    this.drawFx(dt);
  }
  drawTile(t) {
    const g = this.g, z = this.zoom, T = TERRAIN[t.t] || TERRAIN.grass, [cx, cy] = this.sp(t.x, t.y, t.h), hw = TW / 2 * z, hh = TH / 2 * z;
    const water = t.t === 'water' || t.t === 'deep', lava = t.t === 'lava';
    // the sides: only down to the lower neighbour (or the ground)
    const nb = (dx, dy) => { const [rx, ry] = this.rc(t.x, t.y); const inv = this.inv(rx + dx, ry + dy); return inv ? this.map.tiles[inv[1] * this.map.w + inv[0]] : null; };
    const left = nb(0, 1), right = nb(1, 0), dropL = (t.h - (left ? left.h : -2)) * HS * z, dropR = (t.h - (right ? right.h : -2)) * HS * z;
    if (dropL > 0) { g.fillStyle = shade(T.side, -0.1); g.beginPath(); g.moveTo(cx - hw, cy); g.lineTo(cx, cy + hh); g.lineTo(cx, cy + hh + dropL); g.lineTo(cx - hw, cy + dropL); g.closePath(); g.fill(); this.strata(cx - hw, cy, cx, cy + hh, dropL, T.side); }
    if (dropR > 0) { g.fillStyle = shade(T.side, -0.3); g.beginPath(); g.moveTo(cx + hw, cy); g.lineTo(cx, cy + hh); g.lineTo(cx, cy + hh + dropR); g.lineTo(cx + hw, cy + dropR); g.closePath(); g.fill(); this.strata(cx, cy + hh, cx + hw, cy, dropR, shade(T.side, -0.2)); }
    // the top
    let top = T.top;
    if (water) top = shade(T.top, Math.sin(this.time * 2 + t.x + t.y) * 0.08);
    if (lava) top = shade(T.top, Math.sin(this.time * 3 + t.x * 2) * 0.15);
    g.fillStyle = top; g.beginPath(); g.moveTo(cx, cy - hh); g.lineTo(cx + hw, cy); g.lineTo(cx, cy + hh); g.lineTo(cx - hw, cy); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; g.stroke();
    // a little texture on grass and stone
    if (!water && !lava) { g.fillStyle = shade(T.top, -0.12); for (let i = 0; i < 3; i++) { const sx = ((t.x * 13 + t.y * 7 + i * 5) % 10) / 10 - 0.5, sy = ((t.x * 3 + t.y * 11 + i * 7) % 10) / 10 - 0.5; g.fillRect(cx + sx * hw * 0.9, cy + sy * hh * 0.9, 2 * z, 2 * z); } }
    // overlays
    const m = this.marks.get(`${t.x},${t.y}`);
    if (m) { g.fillStyle = m; g.beginPath(); g.moveTo(cx, cy - hh); g.lineTo(cx + hw, cy); g.lineTo(cx, cy + hh); g.lineTo(cx - hw, cy); g.closePath(); g.fill(); }
    if (this.cursor && this.cursor[0] === t.x && this.cursor[1] === t.y) { g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, cy - hh); g.lineTo(cx + hw, cy); g.lineTo(cx, cy + hh); g.lineTo(cx - hw, cy); g.closePath(); g.stroke(); g.lineWidth = 1; }
    if (this.showLoot && this.treasure.some((q) => q.x === t.x && q.y === t.y && !q.taken)) { const s = (Math.sin(this.time * 5 + t.x) + 1) / 2; g.fillStyle = `rgba(255,230,120,${0.4 + s * 0.6})`; g.beginPath(); g.arc(cx, cy, (3 + s * 3) * z, 0, Math.PI * 2); g.fill(); }
    // things standing on the tile
    if (t.obj === 'tree') { g.fillStyle = '#5a3a1a'; g.fillRect(cx - 3 * z, cy - 18 * z, 6 * z, 18 * z); g.fillStyle = '#2f6a2f'; g.beginPath(); g.arc(cx, cy - 26 * z, 15 * z, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3f8a3f'; g.beginPath(); g.arc(cx - 4 * z, cy - 30 * z, 9 * z, 0, Math.PI * 2); g.fill(); }
    else if (t.obj === 'rock') { g.fillStyle = '#7a7a80'; g.beginPath(); g.ellipse(cx, cy - 6 * z, 14 * z, 10 * z, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9a9aa0'; g.beginPath(); g.ellipse(cx - 3 * z, cy - 9 * z, 7 * z, 5 * z, 0, 0, Math.PI * 2); g.fill(); }
    else if (t.obj === 'pillar') { g.fillStyle = '#d8d4e0'; g.fillRect(cx - 7 * z, cy - 46 * z, 14 * z, 46 * z); g.fillStyle = '#a8a4b8'; g.fillRect(cx + 2 * z, cy - 46 * z, 5 * z, 46 * z); g.fillStyle = '#f0ecf8'; g.fillRect(cx - 9 * z, cy - 50 * z, 18 * z, 5 * z); }
  }
  strata(x0, y0, x1, y1, drop, col) { const g = this.g, z = this.zoom; g.strokeStyle = 'rgba(0,0,0,.12)'; for (let d = HS * z; d < drop; d += HS * z) { g.beginPath(); g.moveTo(x0, y0 + d); g.lineTo(x1, y1 + d); g.stroke(); } void col; }
  inv(rx, ry) { const { w, h } = this.map; let x, y; switch (this.rot) { case 1: x = ry; y = h - 1 - rx; break; case 2: x = w - 1 - rx; y = h - 1 - ry; break; case 3: x = w - 1 - ry; y = rx; break; default: x = rx; y = ry; } return x >= 0 && y >= 0 && x < w && y < h ? [x, y] : null; }

  drawUnit(u, t, lift = 0) {
    const g = this.g, z = this.zoom, an = this.anim.get(u.id) || {};
    let [cx, cy] = this.sp(t.x, t.y, t.h);
    if (an.from) { const [fx, fy, fh] = an.from, k = an.k ?? 1; const [ax, ay] = this.sp(fx, fy, fh); cx = ax + (cx - ax) * k; cy = ay + (cy - ay) * k - Math.sin(k * Math.PI) * 10 * z * (an.hop || 0); }
    cy -= lift * z;
    const { back, flip } = this.facing(an.dir ?? u.dir);
    const pose = u.dead ? 'dead' : an.pose || (Math.floor(this.time * 2 + u.id) % 2 ? 'idle1' : 'idle0');
    const mon = u.u.mon, img = mon ? monster(mon, back, pose) : person(u.u, back, pose);
    const big = mon ? (MONSTERS[mon].size || 1) : 1, sw = (mon ? MON_W : SPR_W) * 2 * z * big, sh = (mon ? MON_H : SPR_H) * 2 * z * big;
    g.save(); g.imageSmoothingEnabled = false;
    if (u.side === 'foe' && !u.dead) { g.fillStyle = 'rgba(255,70,70,.28)'; g.beginPath(); g.ellipse(cx, cy, 16 * z, 7 * z, 0, 0, Math.PI * 2); g.fill(); }
    else if (!u.dead && u.side !== 'foe') { g.fillStyle = u.side === 'guest' ? 'rgba(120,255,160,.25)' : 'rgba(90,160,255,.28)'; g.beginPath(); g.ellipse(cx, cy, 16 * z, 7 * z, 0, 0, Math.PI * 2); g.fill(); }
    if (an.flash) g.filter = 'brightness(2.2)';
    if (u.st && u.st.stop) g.filter = 'grayscale(1)';
    if (u.charging) { const s = (Math.sin(this.time * 6) + 1) / 2; g.strokeStyle = `rgba(160,200,255,${0.4 + s * 0.5})`; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, 20 * z, 9 * z, 0, 0, Math.PI * 2); g.stroke(); }
    g.translate(cx, cy + 4 * z); if (flip) g.scale(-1, 1);
    g.drawImage(img, -sw / 2, -sh + (mon ? 4 * z : 0), sw, sh);
    g.restore();
    // health bar over the head
    if (!u.dead && u.s) {
      const bw = 26 * z, bx = cx - bw / 2, by = cy - sh - 4 * z, p = Math.max(0, u.hp / u.s.hp);
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(bx - 1, by - 1, bw + 2, 5 * z + 2);
      g.fillStyle = p > 0.5 ? '#5ad06a' : p > 0.25 ? '#e0c040' : '#e05a4a'; g.fillRect(bx, by, bw * p, 3 * z);
      if (u.s.mp) { g.fillStyle = '#4a8aff'; g.fillRect(bx, by + 3 * z, bw * (u.mp / u.s.mp), 2 * z); }
      const icons = Object.keys(u.st || {}).filter((k) => u.st[k] < 90);
      if (icons.length) { g.font = `${9 * z}px sans-serif`; g.fillStyle = '#fff'; g.fillText(icons.length > 1 ? '✦' + icons.length : '✦', bx + bw + 2, by + 5 * z); }
      if (u.boss) { g.fillStyle = '#ffd040'; g.font = `bold ${10 * z}px sans-serif`; g.fillText('♛', bx - 11 * z, by + 5 * z); }
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
        const [cx, cy] = this.sp(f.x, f.y, t.h), k = f.t / 0.7;
        g.strokeStyle = f.col; g.globalAlpha = Math.max(0, 1 - k); g.lineWidth = 3;
        g.beginPath(); g.ellipse(cx, cy - 10 * z, (12 + k * 30 * f.r) * z, (6 + k * 15 * f.r) * z, 0, 0, Math.PI * 2); g.stroke();
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
    const z = this.zoom, order = this.map.tiles.map((t) => ({ t, k: this.rc(t.x, t.y) })).sort((a, b) => b.k[0] + b.k[1] - (a.k[0] + a.k[1]) || b.k[0] - a.k[0]);
    for (const { t } of order) {
      const [cx, cy] = this.sp(t.x, t.y, t.h), dx = Math.abs(px - cx) / (TW / 2 * z), dy = Math.abs(py - cy) / (TH / 2 * z);
      if (dx + dy <= 1) return [t.x, t.y];
    }
    // or a unit's body standing above its tile
    for (const u of this.units) if (!u.gone && u._sx && Math.abs(px - u._sx) < 14 * z && py < u._sy && py > u._sy - 48 * z) return [u.x, u.y];
    return null;
  }
}
export const elColour = (el) => (el && ELEMENTS[el] ? ELEMENTS[el][2] : '#ffffff');
