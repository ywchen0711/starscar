// Pixel sprites drawn in code: people (from their job's colours and headgear) and the sixteen monster families.
// Each sprite is drawn once on a small canvas and cached; the map scales it up with crisp pixels.
import { JOBS } from '../data/jobs.js';
import { MONSTERS } from '../data/monsters.js';
import { ITEMS } from '../data/items.js';

const cache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const SPR_W = 20, SPR_H = 26;
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
};

// ---------------------------------------------------------------- people
// pose: 'idle0' 'idle1' 'walk0' 'walk1' 'act' 'hurt' 'dead'; back: seen from behind
export function person(u, back, pose = 'idle0') {
  const j = JOBS[u.job] || JOBS.sellsword, look = { ...j.look, ...(u.look || {}) }, w = u.eq && u.eq.w && ITEMS[u.eq.w];
  const key = `p:${u.job}:${look.hair}:${look.skin}:${u.sex}:${w ? w.type : '-'}:${back}:${pose}:${look.body}`;
  if (cache.has(key)) return cache.get(key);
  const c = mk(SPR_W, SPR_H), g = c.getContext('2d');
  const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  const body = look.body || '#7a5a3a', trim = look.trim || '#c8a060', hair = look.hair || '#5a3a1a', skin = look.skin || '#f0d0b0';
  const dark = shade(body, -0.35), light = shade(body, 0.25);
  if (pose === 'dead') {
    // lying on the ground
    R(3, 19, 14, 4, body); R(3, 19, 14, 1, light); R(15, 18, 4, 4, skin); R(15, 18, 4, 1, hair); R(3, 23, 14, 1, 'rgba(0,0,0,.35)');
    cache.set(key, c); return c;
  }
  const bob = pose === 'idle1' ? 1 : 0, lunge = pose === 'act' ? 2 : 0, hurtK = pose === 'hurt' ? -1 : 0;
  const ox = 5 + lunge + hurtK, oy = 4 + bob;
  // shadow
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(10, 24.5, 6, 1.6, 0, 0, Math.PI * 2); g.fill();
  // legs
  const step = pose === 'walk0' ? 1 : pose === 'walk1' ? -1 : 0;
  R(ox + 2, oy + 15 + Math.max(0, step), 2, 4 - Math.max(0, step), dark); R(ox + 6, oy + 15 + Math.max(0, -step), 2, 4 - Math.max(0, -step), dark);
  R(ox + 1, oy + 19, 3, 1, '#2a1a10'); R(ox + 6, oy + 19, 3, 1, '#2a1a10');
  // body / robe
  const robe = ['robe'].includes(u.eq && u.eq.b && ITEMS[u.eq.b] && ITEMS[u.eq.b].type) || ['scholar', 'elementalist', 'cleric', 'hexer', 'chronomancer', 'summoner', 'sage', 'archmage', 'timewalker', 'necromancer', 'astromancer', 'lampwarden'].includes(u.job);
  R(ox + 1, oy + 8, 8, 7, body); R(ox + 1, oy + 8, 8, 1, light); R(ox + 1, oy + 12, 8, 1, trim);
  if (robe) { R(ox, oy + 13, 10, 4, body); R(ox, oy + 16, 10, 1, dark); R(ox + 4, oy + 9, 2, 8, back ? dark : trim); }
  // arms
  R(ox - 1, oy + 9, 2, 5, dark); R(ox + 9, oy + 9, 2, 5, dark); R(ox - 1, oy + 14, 2, 1, skin); R(ox + 9, oy + 14, 2, 1, skin);
  // head
  R(ox + 1, oy + 1, 8, 7, skin); R(ox + 1, oy + 7, 8, 1, shade(skin, -0.15));
  // hair
  R(ox + 1, oy, 8, 2, hair); R(ox, oy + 1, 1, 5, hair); R(ox + 9, oy + 1, 1, 5, hair);
  if (back) R(ox + 1, oy + 1, 8, 6, hair);
  else { R(ox + 1, oy + 2, 2, 1, hair); R(ox + 7, oy + 2, 2, 1, hair); R(ox + 2, oy + 4, 2, 2, '#1a1a2a'); R(ox + 6, oy + 4, 2, 2, '#1a1a2a'); R(ox + 2, oy + 4, 1, 1, '#fff'); R(ox + 6, oy + 4, 1, 1, '#fff'); }
  if (u.sex === 'f' && !['helm', 'greathelm', 'kabuto', 'mask'].includes(look.head)) { R(ox - 1, oy + 3, 2, 7, hair); R(ox + 9, oy + 3, 2, 7, hair); }
  // headgear
  headgear(R, look.head, ox, oy, trim, body, back);
  // weapon
  weapon(g, R, w ? w.type : null, ox, oy, pose, back);
  if (pose === 'hurt') { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,80,80,.35)'; g.fillRect(0, 0, SPR_W, SPR_H); g.globalCompositeOperation = 'source-over'; }
  cache.set(key, c); return c;
}
function headgear(R, kind, ox, oy, trim, body, back) {
  const metal = '#c0c8d0', mdark = '#7a8290';
  switch (kind) {
    case 'helm': R(ox, oy - 1, 10, 4, metal); R(ox, oy + 2, 10, 1, mdark); if (!back) R(ox + 4, oy + 2, 2, 4, mdark); break;
    case 'greathelm': R(ox - 1, oy - 2, 12, 9, metal); R(ox - 1, oy - 2, 12, 1, '#e0e8f0'); if (!back) { R(ox + 1, oy + 3, 8, 1, '#1a1a1a'); } R(ox + 4, oy - 4, 2, 2, trim); break;
    case 'hood': R(ox - 1, oy - 1, 12, 4, body); R(ox - 1, oy + 1, 2, 7, body); R(ox + 9, oy + 1, 2, 7, body); break;
    case 'hat': R(ox - 2, oy, 14, 2, shade(body, -0.2)); R(ox + 1, oy - 3, 8, 3, shade(body, -0.2)); R(ox + 1, oy - 1, 8, 1, trim); break;
    case 'wizard': R(ox - 2, oy, 14, 2, body); R(ox + 1, oy - 3, 8, 3, body); R(ox + 3, oy - 6, 4, 3, body); R(ox + 5, oy - 8, 2, 2, body); R(ox + 1, oy - 1, 8, 1, trim); break;
    case 'band': R(ox, oy + 1, 10, 1, trim); break;
    case 'horns': R(ox, oy - 1, 10, 3, '#3a3a3a'); R(ox - 2, oy - 4, 2, 4, '#e0d8c0'); R(ox + 10, oy - 4, 2, 4, '#e0d8c0'); break;
    case 'dragon': R(ox, oy - 2, 10, 5, metal); R(ox + 3, oy - 5, 4, 3, trim); R(ox - 1, oy, 2, 3, mdark); R(ox + 9, oy, 2, 3, mdark); break;
    case 'kabuto': R(ox - 1, oy - 1, 12, 4, '#3a2a2a'); R(ox + 1, oy - 4, 2, 3, '#e0c040'); R(ox + 7, oy - 4, 2, 3, '#e0c040'); break;
    case 'mask': R(ox, oy - 1, 10, 3, body); if (!back) R(ox + 1, oy + 5, 8, 3, body); R(ox + 9, oy + 1, 3, 1, body); break;
    case 'goggles': R(ox, oy + 1, 10, 1, '#4a3a2a'); if (!back) { R(ox + 1, oy + 3, 3, 2, '#8ad8ff'); R(ox + 6, oy + 3, 3, 2, '#8ad8ff'); } break;
    case 'fur': R(ox - 1, oy - 1, 12, 3, '#8a6a3a'); R(ox - 1, oy - 2, 3, 2, '#8a6a3a'); R(ox + 8, oy - 2, 3, 2, '#8a6a3a'); break;
    case 'circlet': R(ox, oy + 1, 10, 1, trim); if (!back) R(ox + 4, oy + 1, 2, 1, '#8ad8ff'); break;
    case 'cap': R(ox, oy - 1, 10, 2, body); R(ox + (back ? 0 : 5), oy + 1, 6, 1, shade(body, -0.3)); break;
    case 'tricorn': R(ox - 2, oy - 1, 14, 3, '#2a2a2a'); R(ox + 2, oy - 3, 6, 2, '#2a2a2a'); R(ox - 2, oy + 1, 14, 1, trim); break;
    case 'plume': R(ox, oy - 1, 10, 4, metal); R(ox + 4, oy - 5, 2, 4, '#e04a3a'); R(ox + 6, oy - 6, 2, 3, '#e04a3a'); break;
    case 'skullhood': R(ox - 1, oy - 1, 12, 4, '#1a1a1a'); R(ox - 1, oy + 1, 2, 7, '#1a1a1a'); R(ox + 9, oy + 1, 2, 7, '#1a1a1a'); if (!back) R(ox + 3, oy - 1, 4, 2, '#e0e0d0'); break;
    case 'star': R(ox - 2, oy, 14, 2, body); R(ox + 1, oy - 4, 8, 4, body); R(ox + 4, oy - 6, 2, 2, '#f0f0a0'); R(ox + 3, oy - 5, 4, 1, '#f0f0a0'); break;
    case 'tiara': R(ox + 1, oy, 8, 1, '#ffd040'); R(ox + 4, oy - 2, 2, 2, '#ff5a8a'); break;
    case 'tophat': R(ox - 1, oy, 12, 1, '#1a1a1a'); R(ox + 1, oy - 5, 8, 5, '#1a1a1a'); R(ox + 1, oy - 1, 8, 1, '#c84a4a'); break;
    case 'widehat': R(ox - 3, oy, 16, 2, '#2a1a10'); R(ox + 1, oy - 3, 8, 3, '#2a1a10'); R(ox + 1, oy - 1, 8, 1, '#c0c0c0'); break;
    case 'feather': R(ox, oy + 1, 10, 1, trim); R(ox + 8, oy - 4, 2, 5, '#f0f0e0'); break;
    case 'veil': R(ox - 1, oy - 1, 12, 3, '#f0f0ff'); R(ox - 1, oy + 1, 2, 9, '#f0f0ff'); R(ox + 9, oy + 1, 2, 9, '#f0f0ff'); R(ox + 3, oy - 2, 4, 1, '#f0c040'); break;
    case 'halo': R(ox + 1, oy - 4, 8, 1, '#ffe08a'); R(ox, oy - 3, 1, 1, '#ffe08a'); R(ox + 9, oy - 3, 1, 1, '#ffe08a'); break;
    case 'crown': R(ox + 1, oy - 2, 8, 2, '#ffd040'); R(ox + 1, oy - 4, 2, 2, '#ffd040'); R(ox + 4, oy - 4, 2, 2, '#ffd040'); R(ox + 7, oy - 4, 2, 2, '#ffd040'); R(ox + 4, oy - 1, 2, 1, '#e02a3a'); break;
    case 'horn': R(ox, oy + 1, 10, 1, trim); R(ox + 4, oy - 4, 2, 4, '#e0e0f0'); break;
    default: break;
  }
}
function weapon(g, R, type, ox, oy, pose, back) {
  if (!type) return;
  const x = back ? ox - 2 : ox + 10, y = oy + 8 - (pose === 'act' ? 3 : 0), steel = '#d8dce8', wood = '#8a5a2a', gold = '#e0c040';
  switch (type) {
    case 'sword': case 'katana': case 'ninjato': R(x, y - 6, 1, 9, steel); R(x - 1, y + 2, 3, 1, gold); R(x, y + 3, 1, 2, wood); break;
    case 'greatsword': R(x, y - 9, 2, 12, steel); R(x - 1, y + 2, 4, 1, gold); R(x, y + 3, 2, 2, wood); break;
    case 'knife': R(x, y + 1, 1, 4, steel); R(x - 1, y + 4, 3, 1, gold); break;
    case 'spear': R(x, y - 10, 1, 17, wood); R(x - 1, y - 12, 3, 3, steel); break;
    case 'axe': R(x, y - 5, 1, 11, wood); R(x + 1, y - 5, 3, 4, steel); break;
    case 'hammer': R(x, y - 4, 1, 10, wood); R(x - 1, y - 6, 4, 3, '#9a9aa8'); break;
    case 'staff': R(x, y - 8, 1, 14, wood); R(x - 1, y - 10, 3, 3, '#8ad8ff'); break;
    case 'rod': R(x, y - 6, 1, 11, '#c8c0a0'); R(x - 1, y - 8, 3, 3, '#ff7aaa'); break;
    case 'bow': g.strokeStyle = wood; g.lineWidth = 1; g.beginPath(); g.arc(x - 2, y, 6, -1.1, 1.1); g.stroke(); R(x - 2, y - 5, 1, 10, '#e0e0e0'); break;
    case 'crossbow': R(x - 2, y, 6, 1, wood); R(x, y - 2, 1, 5, '#7a7a7a'); break;
    case 'gun': R(x - 1, y + 1, 5, 2, '#5a5a6a'); R(x - 1, y + 3, 2, 2, wood); break;
    case 'book': R(x - 1, y + 1, 4, 5, '#7a2a2a'); R(x, y + 2, 2, 3, gold); break;
    case 'harp': R(x, y - 3, 1, 8, gold); R(x + 1, y - 3, 3, 1, gold); R(x + 3, y - 3, 1, 6, gold); break;
    case 'claw': R(x - 1, y + 3, 3, 3, '#9a9aa8'); break;
    case 'fan': R(x - 2, y - 1, 5, 4, '#e04a7a'); R(x, y + 3, 1, 2, wood); break;
    case 'whip': g.strokeStyle = '#6a3a1a'; g.beginPath(); g.moveTo(x, y + 4); g.quadraticCurveTo(x + 6, y - 2, x + 2, y - 8); g.stroke(); break;
    default: break;
  }
}

// ---------------------------------------------------------------- monsters (drawn on a 32×32 canvas)
export const MON_W = 32, MON_H = 32;
export function monster(id, back, pose = 'idle0') {
  const m = MONSTERS[id], key = `m:${id}:${back}:${pose}`;
  if (cache.has(key)) return cache.get(key);
  const c = mk(MON_W, MON_H), g = c.getContext('2d'), [a, b] = m.col, d = shade(a, -0.35), l = shade(a, 0.3);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const E = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const bob = pose === 'idle1' ? 1 : 0, lunge = pose === 'act' ? 2 : 0;
  if (pose === 'dead') { E(16, 26, 11, 4, d); E(16, 25, 9, 3, a); cache.set(key, c); return c; }
  g.save(); g.translate(lunge, bob);
  E(16, 29, 10, 2.2, 'rgba(0,0,0,.3)');
  const eyes = (x1, x2, y, col = '#ffe14a') => { if (back) return; R(x1, y, 2, 2, col); R(x2, y, 2, 2, col); };
  switch (m.look) {
    case 'wolf': E(15, 20, 9, 5, a); R(7, 22, 3, 6, d); R(19, 22, 3, 6, d); R(10, 23, 2, 5, d); R(21, 23, 2, 5, d); E(23, 15, 5, 4, a); R(24, 10, 2, 3, d); R(21, 10, 2, 3, d); R(26, 16, 4, 2, b); R(4, 16, 4, 2, a); eyes(22, 25, 14, '#ff5a3a'); E(15, 19, 6, 2, l); break;
    case 'ooze': E(16, 21, 11, 8, a); E(16, 18, 8, 6, l); E(12, 15, 3, 2, 'rgba(255,255,255,.5)'); eyes(12, 18, 18, '#1a1a2a'); R(13, 23, 6, 1, d); break;
    case 'goblin': R(11, 16, 10, 9, b); R(12, 25, 3, 4, d); R(18, 25, 3, 4, d); E(16, 12, 6, 5, a); R(8, 10, 3, 2, a); R(21, 10, 3, 2, a); eyes(13, 18, 11, '#ff3a3a'); R(21, 15, 2, 8, '#6a4a2a'); R(20, 13, 4, 3, '#8a8a8a'); break;
    case 'skeleton': R(14, 15, 4, 10, a); for (let i = 0; i < 3; i++) R(11, 16 + i * 3, 10, 1, a); R(12, 25, 2, 5, a); R(18, 25, 2, 5, a); E(16, 11, 5, 5, a); if (!back) { R(13, 10, 2, 2, '#1a1a1a'); R(17, 10, 2, 2, '#1a1a1a'); R(14, 14, 4, 1, '#1a1a1a'); } R(22, 8, 1, 14, '#c0c0c0'); R(21, 20, 3, 1, b); break;
    case 'wraith': g.globalAlpha = 0.85; E(16, 14, 7, 7, a); R(9, 14, 14, 10, a); for (let i = 0; i < 4; i++) E(10 + i * 4, 25, 2, 3, a); g.globalAlpha = 1; eyes(13, 18, 13, b); R(7, 16, 3, 2, a); R(22, 16, 3, 2, a); break;
    case 'gryphon': E(15, 19, 9, 6, a); E(8, 14, 7, 3, b); E(24, 14, 7, 3, b); E(21, 12, 4, 4, b); R(24, 12, 3, 2, '#e0a030'); eyes(20, 22, 11, '#1a1a1a'); R(10, 24, 2, 5, d); R(18, 24, 2, 5, d); break;
    case 'lizard': R(12, 13, 8, 12, a); E(16, 10, 5, 4, a); R(16, 10, 6, 3, a); eyes(14, 18, 9); R(12, 25, 3, 4, d); R(17, 25, 3, 4, d); R(6, 22, 6, 2, a); R(22, 6, 1, 20, '#8a6a3a'); R(21, 4, 3, 3, '#c0c0c0'); E(16, 17, 3, 5, b); break;
    case 'troll': E(16, 18, 10, 9, a); E(16, 9, 6, 5, a); eyes(13, 18, 8, '#ff5a3a'); R(14, 12, 4, 2, d); R(6, 16, 4, 10, a); R(22, 16, 4, 10, a); R(10, 26, 4, 4, d); R(18, 26, 4, 4, d); R(24, 6, 3, 18, b); break;
    case 'fiend': E(16, 17, 8, 9, a); E(16, 9, 5, 5, a); R(11, 3, 2, 4, b); R(19, 3, 2, 4, b); eyes(13, 18, 8, '#ffffff'); for (let i = 0; i < 5; i++) E(8 + i * 4, 6 + (i % 2) * 2, 2, 3, b); E(6, 14, 5, 2, d); E(26, 14, 5, 2, d); break;
    case 'gargoyle': R(11, 14, 10, 11, a); E(16, 10, 5, 5, a); R(12, 5, 2, 4, d); R(18, 5, 2, 4, d); eyes(13, 18, 9, b); R(3, 10, 8, 10, d); R(21, 10, 8, 10, d); R(12, 25, 3, 4, d); R(17, 25, 3, 4, d); break;
    case 'spider': E(16, 18, 7, 5, a); E(16, 13, 4, 3, a); for (let i = 0; i < 4; i++) { R(4, 13 + i * 3, 8, 1, d); R(20, 13 + i * 3, 8, 1, d); R(3, 14 + i * 3, 1, 4, d); R(28, 14 + i * 3, 1, 4, d); } eyes(14, 17, 12, b); E(16, 20, 4, 2, b); break;
    case 'serpent': for (let i = 0; i < 6; i++) E(8 + i * 3, 24 - Math.abs(i - 2) * 2, 4, 3, i % 2 ? a : d); E(24, 10, 5, 4, a); R(27, 11, 4, 1, '#e04a4a'); eyes(22, 25, 8); E(24, 14, 3, 1, b); break;
    case 'treant': R(12, 10, 8, 18, d); E(16, 8, 10, 7, b); E(10, 6, 5, 4, b); E(22, 6, 5, 4, b); eyes(13, 18, 15, '#ffe060'); R(6, 14, 6, 2, d); R(20, 14, 6, 2, d); R(10, 27, 3, 2, d); R(19, 27, 3, 2, d); break;
    case 'dragon': E(15, 19, 9, 6, a); R(19, 8, 4, 10, a); E(22, 8, 5, 3, a); R(25, 9, 4, 2, a); eyes(21, 23, 6, b); R(20, 4, 2, 3, b); R(24, 4, 2, 3, b); E(8, 12, 7, 6, d); E(4, 9, 4, 4, d); R(5, 20, 4, 2, a); R(1, 21, 4, 2, a); R(10, 23, 3, 6, d); R(18, 23, 3, 6, d); E(15, 21, 6, 2, b); break;
    case 'golem': R(9, 12, 14, 13, a); R(9, 12, 14, 2, l); R(12, 4, 8, 8, a); eyes(13, 18, 7, b); R(4, 13, 5, 11, a); R(23, 13, 5, 11, a); R(10, 25, 5, 5, d); R(17, 25, 5, 5, d); R(14, 16, 4, 4, b); break;
    case 'celestial': E(6, 13, 6, 9, 'rgba(255,255,255,.85)'); E(26, 13, 6, 9, 'rgba(255,255,255,.85)'); R(12, 12, 8, 14, a); R(11, 22, 10, 6, a); E(16, 8, 4, 4, '#f4e0c8'); R(13, 2, 6, 1, b); eyes(14, 17, 8, '#4a6ad0'); R(23, 4, 1, 20, b); R(21, 3, 5, 2, b); break;
    default: E(16, 18, 9, 8, a);
  }
  g.restore();
  if (pose === 'hurt') { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,80,80,.4)'; g.fillRect(0, 0, MON_W, MON_H); g.globalCompositeOperation = 'source-over'; }
  if (back) { const f = mk(MON_W, MON_H), fg = f.getContext('2d'); fg.translate(MON_W, 0); fg.scale(-1, 1); fg.drawImage(c, 0, 0); cache.set(key, f); return f; }
  cache.set(key, c); return c;
}
// a portrait for dialogue and menus: the sprite's head and shoulders, scaled up
export function portrait(u, size = 64) {
  const key = `por:${u.mon || u.job}:${JSON.stringify(u.look || {})}:${u.sex}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const c = mk(size, size), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#1a1830'; g.fillRect(0, 0, size, size);
  if (u.mon) g.drawImage(monster(u.mon, false), 0, 0, MON_W, MON_H, 0, 0, size, size);
  else g.drawImage(person(u, false), 2, 0, 16, 16, 0, 2, size, size);
  cache.set(key, c); return c;
}
