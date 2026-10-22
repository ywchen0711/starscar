// Battle maps: a grid of columns, each with a height and a kind of ground, made from a theme and a seed.
// The same seed always makes the same field, so a story battle looks the same every time you fight it.
import { TERRAIN } from '../data/core.js';
import { seeded, clamp, pick } from '../util.js';

// themes: [ground by height band (low → high), height scale, extras]
const THEMES = {
  plains:   { bands: ['grass', 'grass', 'dirt', 'grass', 'stone'], amp: 3, trees: 0.04, rocks: 0.02 },
  forest:   { bands: ['moss', 'grass', 'grass', 'dirt', 'grass'], amp: 4, trees: 0.16, rocks: 0.02 },
  hills:    { bands: ['grass', 'dirt', 'stone', 'stone', 'snow'], amp: 7, trees: 0.03, rocks: 0.05 },
  river:    { bands: ['water', 'grass', 'grass', 'dirt', 'stone'], amp: 3, trees: 0.05, rocks: 0.02, river: true },
  town:     { bands: ['brick', 'brick', 'stone', 'brick', 'stone'], amp: 1, houses: 4, trees: 0.02 },
  castle:   { bands: ['stone', 'stone', 'brick', 'stone', 'stone'], amp: 2, walls: true, rocks: 0.01 },
  church:   { bands: ['marble', 'marble', 'brick', 'marble', 'marble'], amp: 1, houses: 2, pillars: true },
  cave:     { bands: ['dirt', 'stone', 'stone', 'dirt', 'stone'], amp: 6, rocks: 0.08, dark: true },
  mine:     { bands: ['dirt', 'crystal', 'stone', 'dirt', 'crystal'], amp: 5, rocks: 0.06, dark: true },
  desert:   { bands: ['sand', 'sand', 'sand', 'dirt', 'stone'], amp: 4, rocks: 0.03 },
  snow:     { bands: ['ice', 'snow', 'snow', 'stone', 'snow'], amp: 5, trees: 0.05, rocks: 0.02 },
  swamp:    { bands: ['swamp', 'swamp', 'moss', 'grass', 'moss'], amp: 2, trees: 0.08 },
  ruins:    { bands: ['moss', 'stone', 'brick', 'moss', 'stone'], amp: 4, rocks: 0.04, pillars: true, houses: 2 },
  volcano:  { bands: ['lava', 'ash', 'ash', 'stone', 'ash'], amp: 6, rocks: 0.05 },
  crystal:  { bands: ['crystal', 'stone', 'crystal', 'marble', 'crystal'], amp: 5, rocks: 0.03 },
  sky:      { bands: ['cloud', 'marble', 'cloud', 'marble', 'crystal'], amp: 4, pillars: true },
  void:     { bands: ['void', 'ash', 'crystal', 'void', 'marble'], amp: 6, pillars: true },
  bridge:   { bands: ['deep', 'deep', 'wood', 'wood', 'stone'], amp: 0, bridge: true },
  fortress: { bands: ['stone', 'dirt', 'stone', 'brick', 'stone'], amp: 3, walls: true, houses: 2 },
};
TERRAIN.ice = TERRAIN.ice || { name: ['冰面', 'Ice'], top: '#c8e8ff', side: '#7aa0c8', el: 'ice' };

// value noise on a coarse grid, smoothly blended
function noise(w, h, rnd, cell) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = Array.from({ length: gw * gh }, () => rnd());
  const at = (x, y) => g[y * gw + x];
  return (x, y) => {
    const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

export function makeMap({ theme = 'plains', w = 12, h = 12, seed = 1, players = 5, foes = 6, treasures = 2, foeSide = 'top' } = {}) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const m = build(theme, w, h, seed + attempt * 7919, players, foes, treasures, foeSide);
    if (m) return m;
  }
  // still failing: take the map and smooth it — no step taller than 2, and nothing walled in
  const m = build(theme, w, h, seed, players, foes, treasures, foeSide, true);
  for (let pass = 0; pass < 10; pass++) for (const t of m.tiles) for (const [dx, dy] of [[1, 0], [0, 1]]) {
    if (t.x + dx >= w || t.y + dy >= h) continue;
    const n = m.tiles[(t.y + dy) * w + t.x + dx];
    if (t.h - n.h > 2) t.h = n.h + 2; else if (n.h - t.h > 2) n.h = t.h + 2;
  }
  const at = (x, y) => m.tiles[y * w + x], start = at(...m.starts[0]);
  if (!connected(m.tiles, w, h, start, [])) for (const t of m.tiles) if (t.obj === 'tree' || t.obj === 'rock') { t.obj = null; t.block = false; }
  return m;
}

function build(theme, w, h, seed, players, foes, treasures, foeSide, force = false) {
  const T = THEMES[theme] || THEMES.plains, rnd = seeded(seed);
  const n1 = noise(w, h, rnd, 4), n2 = noise(w, h, rnd, 2), tiles = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = n1(x, y) * 0.75 + n2(x, y) * 0.25;
    const ht = Math.round(v * T.amp * 1.4);
    const band = clamp(Math.floor(v * T.bands.length), 0, T.bands.length - 1);
    tiles.push({ x, y, h: ht, t: T.bands[band] });
  }
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? tiles[y * w + x] : null);
  // a river across the middle, with a ford or two
  if (T.river) {
    let rx = Math.floor(w * (0.3 + rnd() * 0.4));
    for (let y = 0; y < h; y++) { for (let dx = 0; dx < 2; dx++) { const c = at(rx + dx, y); if (c) { c.t = 'deep'; c.h = 0; } } if (rnd() < 0.3) rx = clamp(rx + (rnd() < 0.5 ? -1 : 1), 1, w - 3); }
    for (let k = 0; k < 2; k++) { const y = Math.floor(h * (0.25 + k * 0.5)); for (let x = 0; x < w; x++) { const c = at(x, y); if (c && c.t === 'deep') { c.t = 'water'; } } }
  }
  // a long bridge over deep water
  if (T.bridge) {
    for (const c of tiles) { c.t = 'deep'; c.h = 0; }
    const y0 = Math.floor(h / 2) - 1;
    for (let y = y0; y < y0 + 3; y++) for (let x = 0; x < w; x++) { const c = at(x, y); c.t = 'wood'; c.h = 2; }
    for (const [cy, ch] of [[0, 3], [h - 3, 3]]) for (let y = cy; y < cy + ch; y++) for (let x = 0; x < w; x++) { const c = at(x, y); if (c) { c.t = 'stone'; c.h = 2 + (rnd() < 0.2 ? 1 : 0); } }
    for (let x = 0; x < w; x += 3) for (let y = 3; y < h - 3; y++) { const c = at(x, y); if (c && c.t === 'deep') { c.t = 'wood'; c.h = 2; } }
  }
  // houses: raised blocks with roofs you can climb onto
  for (let k = 0; k < (T.houses || 0); k++) {
    const bw = 2 + Math.floor(rnd() * 2), bh = 2 + Math.floor(rnd() * 2), bx = 1 + Math.floor(rnd() * (w - bw - 2)), by = 3 + Math.floor(rnd() * (h - bh - 6)), hh = 3 + Math.floor(rnd() * 2);
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) { const c = at(x, y); if (c) { c.h = (c.h > 0 ? c.h : 0) + hh; c.t = theme === 'church' ? 'marble' : 'roof'; } }
  }
  // castle walls: a raised rampart with gaps
  if (T.walls) {
    const wy = Math.floor(h * 0.35);
    for (let x = 0; x < w; x++) { if (x % 4 === 1) continue; const c = at(x, wy); c.h += 3; c.t = 'stone'; }
  }
  if (T.pillars) for (let k = 0; k < Math.floor(w * h / 30); k++) { const c = at(Math.floor(rnd() * w), 3 + Math.floor(rnd() * (h - 6))); if (c && !TERRAIN[c.t].block) { c.obj = 'pillar'; c.block = true; } }
  for (const c of tiles) {
    if (TERRAIN[c.t].block) { c.block = true; if (c.t === 'deep' || c.t === 'lava') c.h = 0; }
    if (!c.block && T.trees && rnd() < T.trees) { c.obj = 'tree'; c.block = true; }
    if (!c.block && T.rocks && rnd() < T.rocks) { c.obj = 'rock'; c.block = true; }
  }
  // starting zones: the players at the bottom, the foes at the top (or the sides)
  const open = (c) => c && !c.block;
  const zone = (rows, which) => {
    const out = [];
    for (const r of rows) for (let x = 0; x < w; x++) { const c = which === 'left' ? at(r, x) : which === 'right' ? at(w - 1 - r, x) : which === 'top' ? at(x, r) : at(x, h - 1 - r); if (open(c)) out.push(c); }
    return out;
  };
  let pz = zone([0, 1, 2], 'bottom'), fz = zone([0, 1, 2, 3], foeSide);
  if (foeSide === 'around') fz = [...zone([0, 1], 'top'), ...zone([0, 1], 'left'), ...zone([0, 1], 'right')].filter((c) => !pz.includes(c));
  if (pz.length < players || fz.length < foes) { if (!force) return null; }
  // everyone has to be able to reach everyone (with an ordinary jump of 3, walking round water and walls)
  if (!force && !connected(tiles, w, h, pz[0], fz)) return null;
  // centre the players' start, spread the foes
  pz.sort((a, b) => Math.abs(a.x - w / 2) + a.y * -0.1 - (Math.abs(b.x - w / 2) + b.y * -0.1));
  const fpick = []; const fz2 = [...fz]; while (fpick.length < foes && fz2.length) fpick.push(fz2.splice(Math.floor(rnd() * fz2.length), 1)[0]);
  // treasure buried somewhere in the middle (only a Treasure Hunter sees it shine)
  const mid = tiles.filter((c) => open(c) && c.y > 2 && c.y < h - 3 && !pz.includes(c) && !fz.includes(c));
  const loot = []; for (let k = 0; k < treasures && mid.length; k++) loot.push(mid.splice(Math.floor(rnd() * mid.length), 1)[0]);
  return { w, h, theme, dark: !!T.dark, tiles, starts: pz.slice(0, Math.max(players, 8)).map((c) => [c.x, c.y]), foeStarts: fpick.map((c) => [c.x, c.y]), treasure: loot.map((c) => [c.x, c.y]), seed };
}

function connected(tiles, w, h, from, targets) {
  if (!from) return false;
  const seen = new Set([from.y * w + from.x]), q = [from];
  while (q.length) {
    const c = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = c.x + dx, y = c.y + dy; if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const n = tiles[y * w + x]; if (n.block || seen.has(y * w + x) || Math.abs(n.h - c.h) > 2) continue;
      seen.add(y * w + x); q.push(n);
    }
  }
  // every open tile should be reachable too (walled-off pockets trap units forever)
  for (const t of tiles) if (!t.block && !seen.has(t.y * w + t.x)) return false;
  return targets.every((t) => seen.has(t.y * w + t.x));
}
export const THEME_LIST = Object.keys(THEMES);
