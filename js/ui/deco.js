// The warm pixel look shared by the field and the world map: textured ground for tile tops, and little upright
// things — trees, pines, rocks, tufts, flowers, peaks, towns — drawn as outlined pixel sprites.
const cache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619); return h >>> 0; };
const rnd = (seed) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; }; };
const hex = (c) => { if (c.startsWith('rgb')) return c.match(/\d+/g).map(Number); const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const shade = (c, k) => { const [r, g, b] = hex(c); const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
function outline(g, w, h) {
  const d = g.getImageData(0, 0, w, h), a = d.data, out = new Uint8ClampedArray(a);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (a[i + 3]) continue;
    const n = (dx, dy) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < h && a[(ny * w + nx) * 4 + 3] > 0; };
    if (n(1, 0) || n(-1, 0) || n(0, 1) || n(0, -1)) { out[i] = 46; out[i + 1] = 30; out[i + 2] = 18; out[i + 3] = 255; }
  }
  d.data.set(out); g.putImageData(d, 0, 0);
}
// a 32×32 ground texture from a base colour: speckles of lighter and darker, bits of earth on grassy ground
export function groundTex(base, kind = '', variant = 0) {
  const key = `g|${base}|${kind}|${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = mk(32, 32), g = c.getContext('2d'), r = rnd(hash(base + kind) + variant * 977);
  g.fillStyle = base; g.fillRect(0, 0, 32, 32);
  const d = shade(base, -0.12), l = shade(base, 0.1);
  for (let i = 0; i < 46; i++) { g.fillStyle = r() < 0.55 ? d : l; g.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2)); }
  if (['grass', 'moss', 'tree'].includes(kind)) for (let i = 0; i < 4; i++) { g.fillStyle = '#9a7a4a'; g.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 1); }
  if (['brick', 'marble', 'stone'].includes(kind)) { g.fillStyle = shade(base, -0.18); for (let y = 0; y < 32; y += 8) { g.fillRect(0, y + 7, 32, 1); for (let x = (y / 8) % 2 ? 4 : 0; x < 32; x += 8) g.fillRect(x, y, 1, 7); } }
  if (kind === 'wood') { g.fillStyle = shade(base, -0.25); for (let x = 0; x < 32; x += 6) g.fillRect(x, 0, 1, 32); }
  cache.set(key, c);
  return c;
}
// upright sprites: { c, ax, ay, w, h } with the foot at (ax, ay)
const SIZE = { tree: [14, 20], pine: [12, 22], snowpine: [12, 22], rock: [12, 9], tuft: [8, 7], flower: [6, 5], pebble: [5, 3], peak: [30, 30], citytown: [30, 28], hut: [20, 18], tower: [14, 26], cave: [22, 14], shrine: [20, 20] };
export function sprite(kind, variant = 0, col = '#3a5aa0') {
  const key = `s|${kind}|${variant}|${col}`;
  if (cache.has(key)) return cache.get(key);
  const [W, H] = SIZE[kind] || [16, 16], c = mk(W, H), g = c.getContext('2d');
  const R = (x, y, w, h, f) => { g.fillStyle = f; g.fillRect(x, y, w, h); };
  const roof = (x, y, w, h, rc) => { for (let i = 0; i < h; i++) R(x + i, y + h - 1 - i, w - i * 2, 1, i ? rc : shade(rc, -0.25)); R(x + 1, y + h - 2, w - 2, 1, shade(rc, 0.25)); };
  let line = true;
  switch (kind) {
    case 'tree': { const k = ['#4e7a2e', '#5e8a36', '#46702a'][variant % 3]; R(6, 13, 2, 7, '#6a4a2a'); R(2, 3, 10, 10, k); R(1, 5, 12, 6, k); R(4, 1, 6, 3, k); R(3, 3, 4, 3, shade(k, 0.3)); R(8, 9, 4, 3, shade(k, -0.25)); break; }
    case 'pine': case 'snowpine': { const k = kind === 'snowpine' ? '#5a7a5a' : '#3e6a34'; R(5, 17, 2, 5, '#6a4a2a'); for (let i = 0; i < 4; i++) R(4 - i, 3 + i * 4, 4 + i * 2, 4, k); R(5, 0, 2, 4, k); if (kind === 'snowpine') { R(4, 3, 4, 1, '#fff'); R(3, 7, 6, 1, '#fff'); R(2, 11, 8, 1, '#fff'); } else R(4, 4, 2, 2, shade(k, 0.3)); break; }
    case 'rock': R(1, 3, 10, 6, '#8e8676'); R(3, 1, 6, 3, '#a49c8c'); R(3, 1, 3, 2, '#c0b8a8'); R(7, 5, 4, 4, '#6e665a'); break;
    case 'tuft': R(1, 3, 1, 4, '#5e7a2e'); R(3, 0, 1, 7, '#6e8a36'); R(5, 2, 1, 5, '#5e7a2e'); R(6, 4, 1, 3, '#7e9a44'); line = false; break;
    case 'flower': R(2, 1, 2, 2, ['#f4f0e0', '#f0d040', '#e8808a'][variant % 3]); R(2, 3, 1, 2, '#5e7a2e'); line = false; break;
    case 'pebble': R(0, 1, 4, 2, '#9a9282'); R(1, 0, 2, 1, '#b8b0a0'); line = false; break;
    case 'peak': R(1, 20, 28, 10, '#7a6e5c'); R(5, 12, 20, 9, '#8e8270'); R(9, 5, 12, 8, '#a09482'); R(12, 1, 6, 5, '#b4a896'); R(12, 0, 6, 3, '#f4f6f8'); R(15, 6, 2, 22, '#685e4e'); R(20, 12, 4, 16, '#685e4e'); break;
    case 'citytown': R(2, 14, 26, 12, '#bcae92'); R(2, 14, 26, 2, '#d8ccb2'); for (let x = 2; x < 28; x += 4) R(x, 12, 2, 2, '#d8ccb2'); R(12, 19, 6, 7, '#5a3a1e'); R(7, 8, 16, 7, '#f0e2c4'); roof(5, 2, 20, 7, '#a8442e'); R(24, 0, 1, 12, '#6a4a2a'); R(25, 0, 5, 4, col); break;
    case 'hut': R(3, 9, 14, 9, '#d8c49a'); R(8, 12, 4, 6, '#6a4420'); roof(1, 1, 18, 9, '#b0904a'); break;
    case 'tower': R(3, 8, 8, 18, '#a49a88'); R(3, 8, 2, 18, '#c8c0b0'); R(9, 8, 2, 18, '#7e766a'); roof(1, 2, 12, 7, '#7a4a30'); R(6, 12, 2, 3, '#3a2a1c'); break;
    case 'cave': R(1, 4, 20, 10, '#8e8270'); R(4, 1, 14, 4, '#a09482'); R(7, 7, 8, 7, '#2a1e14'); break;
    case 'shrine': R(3, 10, 14, 10, '#ece4d4'); R(3, 10, 14, 1, '#ffffff'); R(8, 14, 4, 6, '#8a7a5a'); roof(1, 3, 18, 8, '#5a6aa8'); R(9, 0, 2, 4, '#ffd040'); break;
  }
  if (line) outline(g, W, H);
  const out = { c, ax: W / 2, ay: H, w: W, h: H };
  cache.set(key, out);
  return out;
}
export const tileHash = (x, y) => hash(`${x},${y}`);
export { rnd };
