// People drawn at 32 × 42 pixels: shaded faces and hair, armour by kind (plate, leather, robe), capes,
// detailed headgear and weapons, and a dark outline like hand-made pixel art.
import { JOBS } from '../data/jobs.js';
import { ITEMS } from '../data/items.js';

export const W = 32, H = 42;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hex = (c) => { if (c[0] !== '#') return [128, 128, 128]; const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
// blend colour a toward b by k (0-1)
const mix = (a, b, k) => { const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b); return '#' + [r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); };
const sh = (c, k) => { let [r, g, b] = hex(c); if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } return `rgb(${r | 0},${g | 0},${b | 0})`; };
const CAPE = new Set(['knight', 'paladin', 'darkknight', 'templar', 'sovereign', 'starbearer', 'runeknight', 'swordmaster', 'skylancer', 'cavalier', 'tactician', 'sage', 'archmage', 'necromancer']);
const ROBE = new Set(['scholar', 'elementalist', 'cleric', 'hexer', 'chronomancer', 'summoner', 'sage', 'archmage', 'timewalker', 'necromancer', 'astromancer', 'lampwarden', 'seraph']);
const PLATE = new Set(['knight', 'paladin', 'darkknight', 'templar', 'bulwark', 'skylancer', 'cavalier', 'lancer', 'sovereign', 'runeknight', 'berserker']);
const METAL = '#c8d0dc', METAL_D = '#7c8696', METAL_L = '#eef2f8', OUT = '#16101c', LEATHER = '#6a4626';

const cache = new Map();
// pose: idle0 idle1 walk0 walk1 act hurt dead; back: seen from behind
export function personHD(u, back, pose = 'idle0') {
  const j = JOBS[u.job] || JOBS.sellsword, look = { ...j.look, ...(u.look || {}) }, wpn = u.eq && u.eq.w && ITEMS[u.eq.w];
  const bodyItem = u.eq && u.eq.b && ITEMS[u.eq.b];
  const kind = bodyItem ? (bodyItem.type === 'robe' ? 'robe' : bodyItem.type === 'heavy' ? 'plate' : 'light') : ROBE.has(u.job) ? 'robe' : PLATE.has(u.job) ? 'plate' : 'light';
  const key = `${u.job}|${look.hair}|${look.skin}|${look.body}|${look.trim}|${look.head}|${u.sex}|${wpn ? wpn.type : '-'}|${kind}|${back}|${pose}`;
  if (cache.has(key)) return cache.get(key);
  let c;
  if (pose === 'dead') {
    // the standing sprite, laid flat on the ground
    const up = personHD(u, false, 'idle0');
    c = mk(W, H); const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(16, 37, 14, 3, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(16, 36); g.rotate(-Math.PI / 2); g.scale(0.62, 0.9); g.drawImage(up, -16, -38); g.restore();
  } else c = draw(u, look, wpn, kind, back, pose);
  cache.set(key, c);
  return c;
}

function draw(u, look, wpn, kind, back, pose) {
  const c = mk(W, H), g = c.getContext('2d');
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const body = look.body || '#7a5a3a', trim = look.trim || '#c8a060', hair = look.hair || '#5a3a1a', skin = look.skin || '#f0d0b0';
  const bL = sh(body, 0.22), bD = sh(body, -0.32), bDD = sh(body, -0.5), hL = sh(hair, 0.3), hD = sh(hair, -0.35), sD = sh(skin, -0.16), sDD = sh(skin, -0.3), tD = sh(trim, -0.3);
  const fem = u.sex === 'f', job = u.job;
  const steel = mix('#c8d0dc', body[0] === '#' ? body : '#8a96a8', 0.38), M = steel, ML = sh(steel, 0.45), MD = sh(steel, -0.35);
  const bob = pose === 'idle1' ? 1 : 0, lean = pose === 'act' ? 1 : pose === 'hurt' ? -1 : 0;
  const step = pose === 'walk0' ? 1 : pose === 'walk1' ? -1 : 0;
  const X = lean, Y = bob;     // upper body offset
  // ---------------------------------------------------------------- shadow
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(16, 39.5, 9, 2.3, 0, 0, Math.PI * 2); g.fill();
  // ---------------------------------------------------------------- cape (behind the body)
  const cape = CAPE.has(job), capeC = job === 'darkknight' ? '#2a1a2e' : job === 'sovereign' ? '#8a1a2a' : sh(trim, -0.15);
  if (cape && !back) { R(8 + X, 19 + Y, 2, 16, sh(capeC, -0.25)); R(22 + X, 19 + Y, 2, 16, sh(capeC, -0.35)); }
  // ---------------------------------------------------------------- legs and boots
  const pants = kind === 'plate' ? MD : sh(body, -0.42), boot = kind === 'plate' ? '#5a6272' : '#3a2616';
  if (kind !== 'robe') {
    // a clear stride: the forward leg lifts and steps out, the other stays planted
    const legL = step > 0 ? [-1, -2] : step < 0 ? [1, 0] : [0, 0], legR = step < 0 ? [1, -2] : step > 0 ? [-1, 0] : [0, 0];
    R(11 + legL[0], 30 + legL[1], 4, 6, pants); R(11 + legL[0], 30 + legL[1], 1, 6, sh(pants, 0.15));
    R(17 + legR[0], 30 + legR[1], 4, 6, pants); R(20 + legR[0], 30 + legR[1], 1, 6, sh(pants, -0.2));
    R(10 + legL[0], 35 + legL[1], 5, 4, boot); R(10 + legL[0], 35 + legL[1], 5, 1, sh(boot, 0.25));
    R(17 + legR[0], 35 + legR[1], 5, 4, boot); R(17 + legR[0], 35 + legR[1], 5, 1, sh(boot, 0.25));
  } else {
    // feet peeking out under the robe
    R(11 + (step > 0 ? -1 : 0), 37, 4, 2, '#3a2616'); R(17 + (step < 0 ? 1 : 0), 37, 4, 2, '#3a2616');
  }
  // ---------------------------------------------------------------- torso
  const tx = 9 + X, ty = 18 + Y;
  if (kind === 'robe') {
    // a long robe that widens to the hem
    for (let i = 0; i < 20; i++) { const w = 14 + Math.floor(i / 4) * 2, x = 16 + X - w / 2 + (i > 12 ? 0 : 0); R(x, ty + i, w, 1, body); R(x, ty + i, 2, 1, bL); R(x + w - 3, ty + i, 3, 1, bD); }
    R(5 + X, ty + 18, 22, 2, trim); R(5 + X, ty + 19, 22, 1, tD);
    if (!back) { R(15 + X, ty + 1, 2, 17, trim); R(13 + X, ty, 6, 2, tD); }
    else R(15 + X, ty + 1, 2, 16, bD);
    R(tx + 1, ty + 8, 12, 2, sh(trim, -0.1));   // sash
  } else if (kind === 'plate') {
    R(tx, ty, 14, 12, M); R(tx, ty, 14, 1, ML); R(tx, ty, 2, 12, ML); R(tx + 11, ty, 3, 12, MD);
    if (!back) { R(tx + 5, ty + 2, 4, 5, body); R(tx + 6, ty + 3, 2, 3, bL); }   // a tabard panel in the job's colour
    R(tx - 1, ty + 9, 16, 3, body); R(tx - 1, ty + 9, 16, 1, bL); R(tx - 1, ty + 11, 16, 1, bD);   // faulds
    // pauldrons
    R(tx - 3, ty - 1, 5, 4, M); R(tx - 3, ty - 1, 5, 1, ML); R(tx - 3, ty + 2, 5, 1, MD);
    R(tx + 12, ty - 1, 5, 4, M); R(tx + 12, ty - 1, 5, 1, ML); R(tx + 12, ty + 2, 5, 1, MD);
  } else {
    // a tunic or leather vest with a belt
    R(tx, ty, 14, 12, body); R(tx, ty, 14, 1, bL); R(tx, ty + 1, 2, 11, bL); R(tx + 11, ty + 1, 3, 11, bD);
    if (!back) { R(tx + 4, ty, 6, 3, sh(body, -0.12)); R(tx + 6, ty + 1, 2, 2, sD); R(tx + 3, ty + 3, 1, 6, bDD); R(tx + 10, ty + 3, 1, 6, bDD); }
    if (job === 'thief' || job === 'ninja' || job === 'assassin') { R(tx, ty + 4, 14, 2, sh(trim, -0.2)); }
    R(tx, ty + 9, 14, 3, bD); R(tx, ty + 12, 14, 1, bDD);
  }
  // belt and buckle
  if (kind !== 'robe') { R(tx, ty + 8, 14, 2, LEATHER); if (!back) { R(tx + 6, ty + 8, 3, 2, trim); R(tx + 7, ty + 8, 1, 1, sh(trim, 0.4)); } }
  // ---------------------------------------------------------------- arms
  const sleeve = kind === 'plate' ? M : kind === 'robe' ? body : sh(body, -0.08);
  const armL = [tx - 3, ty + 2], armR = [tx + 14, ty + 2];
  R(armL[0], armL[1], 3, 8, sleeve); R(armL[0], armL[1], 1, 8, sh(sleeve, 0.2)); R(armL[0], armL[1] + 8, 3, 2, kind === 'plate' ? MD : skin);
  R(armR[0], armR[1], 3, 8, sh(sleeve, -0.15)); R(armR[0] + 2, armR[1], 1, 8, sh(sleeve, -0.35)); R(armR[0], armR[1] + 8, 3, 2, kind === 'plate' ? MD : sD);
  if (kind === 'robe') { R(armL[0] - 1, armL[1] + 6, 4, 2, trim); R(armR[0], armR[1] + 6, 4, 2, trim); }
  // ---------------------------------------------------------------- neck and head
  const hx = 9 + X, hy = 4 + Y;
  R(14 + X, 16 + Y, 4, 2, sD);
  // face: rounded with a shaded side and chin
  R(hx + 1, hy + 1, 12, 11, skin); R(hx, hy + 3, 14, 7, skin); R(hx + 2, hy + 12, 10, 1, skin);
  R(hx + 11, hy + 3, 3, 8, sD); R(hx + 3, hy + 12, 8, 1, sD); R(hx + 12, hy + 6, 2, 4, sDD);
  if (!back) {
    // eyes with a highlight, brows, a small mouth
    const ey = hy + 6;
    for (const ex of [hx + 3, hx + 8]) { R(ex, ey, 3, 4, '#1a1428'); R(ex, ey, 1, 1, '#ffffff'); R(ex + 1, ey + 3, 2, 1, fem ? '#5a4a8a' : '#3a3050'); }
    R(hx + 3, ey - 2, 3, 1, hD); R(hx + 8, ey - 2, 3, 1, hD);
    R(hx + 6, hy + 11, 2, 1, sDD);
    if (fem) { R(hx + 2, ey + 4, 2, 1, '#f0a0a0'); R(hx + 10, ey + 4, 2, 1, '#f0a0a0'); }
  }
  // ---------------------------------------------------------------- hair
  const covered = ['helm', 'greathelm', 'kabuto', 'mask', 'dragon', 'plume'].includes(look.head);
  if (!covered) {
    R(hx, hy - 1, 14, 5, hair); R(hx - 1, hy + 1, 16, 3, hair); R(hx + 2, hy - 2, 10, 1, hair);
    R(hx + 3, hy - 1, 6, 1, hL); R(hx + 2, hy, 3, 1, hL);
    if (!back) {
      // bangs
      R(hx, hy + 3, 3, 3, hair); R(hx + 4, hy + 3, 2, 2, hair); R(hx + 8, hy + 3, 2, 1, hair); R(hx + 11, hy + 3, 3, 4, hair); R(hx + 12, hy + 3, 2, 1, hD);
      R(hx - 1, hy + 3, 2, fem ? 13 : 6, hair); R(hx + 13, hy + 3, 2, fem ? 13 : 6, hD);
    } else {
      R(hx - 1, hy + 3, 16, fem ? 14 : 8, hair); R(hx + 1, hy + 3, 3, fem ? 12 : 6, hL); R(hx + 11, hy + 3, 3, fem ? 13 : 7, hD);
    }
  }
  // ---------------------------------------------------------------- headgear
  headgear(R, look.head, hx, hy, trim, body, back, cape ? capeC : null);
  // a big cape seen from behind covers the back
  if (cape && back) { R(tx - 1, ty + 1, 16, 17, capeC); R(tx - 1, ty + 1, 16, 1, sh(capeC, 0.25)); R(tx + 12, ty + 2, 3, 16, sh(capeC, -0.3)); R(tx + 2, ty + 15, 10, 2, sh(capeC, -0.2)); }
  // ---------------------------------------------------------------- weapon
  if (wpn) weapon(g, wpn.type, back ? armL[0] + 1 : armR[0] + 1, armR[1] + 9, pose, back);
  // ---------------------------------------------------------------- the outline, then the hurt tint
  const out = outline(c);
  if (pose === 'hurt') { const og = out.getContext('2d'); og.globalCompositeOperation = 'source-atop'; og.fillStyle = 'rgba(255,70,70,.38)'; og.fillRect(0, 0, W, H); }
  return out;
}

function headgear(R, kind, hx, hy, trim, body, back, capeC) {
  const tL = sh(trim, 0.35), tD = sh(trim, -0.3);
  const steel = mix('#c8d0dc', body[0] === '#' ? body : '#8a96a8', 0.25), METAL = steel, METAL_L = sh(steel, 0.45), METAL_D = sh(steel, -0.35);
  switch (kind) {
    case 'helm': case 'plume': case 'dragon': {
      R(hx - 1, hy - 2, 16, 9, METAL); R(hx - 1, hy - 2, 16, 1, METAL_L); R(hx - 1, hy - 1, 2, 8, METAL_L); R(hx + 12, hy - 1, 3, 8, METAL_D);
      if (!back) { R(hx + 1, hy + 4, 12, 2, '#1a1a22'); R(hx + 6, hy + 2, 2, 5, METAL_D); R(hx + 2, hy + 4, 3, 1, '#4a4a5a'); }
      R(hx - 1, hy + 6, 16, 1, METAL_D);
      if (kind === 'plume') { R(hx + 6, hy - 7, 3, 6, '#d83a3a'); R(hx + 8, hy - 8, 3, 4, '#e85a4a'); R(hx + 7, hy - 7, 1, 5, '#ff8a7a'); }
      if (kind === 'dragon') { R(hx + 5, hy - 6, 4, 4, trim); R(hx + 6, hy - 6, 2, 1, tL); R(hx - 3, hy, 3, 4, METAL_D); R(hx + 14, hy, 3, 4, METAL_D); }
      break;
    }
    case 'greathelm': R(hx - 2, hy - 3, 18, 15, METAL); R(hx - 2, hy - 3, 18, 1, METAL_L); R(hx - 2, hy - 2, 2, 13, METAL_L); R(hx + 13, hy - 2, 3, 13, METAL_D);
      if (!back) { R(hx + 1, hy + 5, 12, 2, '#14141c'); R(hx + 6, hy + 7, 2, 4, '#14141c'); } R(hx + 5, hy - 6, 4, 3, trim); break;
    case 'hood': R(hx - 2, hy - 2, 18, 6, body); R(hx - 2, hy - 2, 18, 1, sh(body, 0.25)); R(hx - 2, hy + 4, 3, 10, body); R(hx + 13, hy + 4, 3, 10, sh(body, -0.3)); if (back) R(hx - 1, hy + 4, 16, 9, sh(body, -0.1)); break;
    case 'hat': R(hx - 3, hy + 1, 20, 2, sh(body, -0.25)); R(hx + 1, hy - 4, 12, 5, sh(body, -0.2)); R(hx + 1, hy - 4, 12, 1, sh(body, 0.1)); R(hx + 1, hy, 12, 1, trim); break;
    case 'wizard': R(hx - 3, hy + 1, 20, 2, body); R(hx + 1, hy - 4, 12, 5, body); R(hx + 3, hy - 9, 8, 5, body); R(hx + 6, hy - 13, 4, 4, body); R(hx + 9, hy - 14, 3, 2, body); R(hx + 1, hy, 12, 1, trim); R(hx + 4, hy - 7, 2, 2, tL); R(hx + 3, hy - 9, 2, 5, sh(body, 0.2)); break;
    case 'band': R(hx - 1, hy + 1, 16, 2, trim); R(hx - 1, hy + 1, 16, 1, tL); if (back) { R(hx + 6, hy + 3, 2, 6, trim); R(hx + 8, hy + 4, 2, 5, tD); } break;
    case 'horns': R(hx - 1, hy - 1, 16, 4, '#3a3a40'); R(hx - 4, hy - 6, 3, 6, '#e8e0c8'); R(hx - 3, hy - 8, 2, 3, '#f8f0d8'); R(hx + 15, hy - 6, 3, 6, '#d8d0b8'); R(hx + 15, hy - 8, 2, 3, '#e8e0c8'); break;
    case 'kabuto': R(hx - 2, hy - 2, 18, 7, '#3a2a2a'); R(hx - 2, hy - 2, 18, 1, '#5a4a4a'); R(hx - 3, hy + 4, 20, 2, '#2a1a1a'); R(hx + 2, hy - 7, 3, 5, '#e0c040'); R(hx + 9, hy - 7, 3, 5, '#e0c040'); R(hx + 6, hy - 3, 2, 2, '#e0c040'); break;
    case 'mask': R(hx - 1, hy - 2, 16, 6, body); R(hx - 1, hy - 2, 16, 1, sh(body, 0.2)); if (!back) R(hx + 1, hy + 9, 12, 4, body); R(hx + 13, hy + 1, 5, 2, body); R(hx + 16, hy + 3, 3, 2, sh(body, -0.2)); break;
    case 'goggles': R(hx - 1, hy + 2, 16, 2, '#4a3a2a'); if (!back) { R(hx + 1, hy + 4, 5, 4, '#2a2a30'); R(hx + 8, hy + 4, 5, 4, '#2a2a30'); R(hx + 2, hy + 5, 3, 2, '#8ad8ff'); R(hx + 9, hy + 5, 3, 2, '#8ad8ff'); R(hx + 2, hy + 5, 1, 1, '#fff'); } break;
    case 'fur': R(hx - 2, hy - 2, 18, 5, '#8a6a3a'); R(hx - 2, hy - 2, 18, 1, '#aa8a5a'); R(hx - 2, hy - 4, 4, 3, '#8a6a3a'); R(hx + 12, hy - 4, 4, 3, '#8a6a3a'); R(hx - 3, hy + 3, 3, 8, '#7a5a2a'); break;
    case 'circlet': R(hx - 1, hy + 2, 16, 1, trim); if (!back) { R(hx + 6, hy + 1, 2, 3, '#8ad8ff'); R(hx + 6, hy + 1, 1, 1, '#fff'); } break;
    case 'cap': R(hx - 1, hy - 2, 16, 4, body); R(hx - 1, hy - 2, 16, 1, sh(body, 0.25)); R(back ? hx - 1 : hx + 7, hy + 2, 9, 1, sh(body, -0.35)); break;
    case 'tricorn': R(hx - 4, hy, 22, 3, '#22222a'); R(hx + 1, hy - 4, 12, 4, '#22222a'); R(hx - 4, hy + 2, 22, 1, trim); R(hx + 1, hy - 4, 12, 1, '#3a3a44'); if (!back) R(hx + 6, hy - 2, 2, 2, '#f0f0f0'); break;
    case 'skullhood': R(hx - 2, hy - 2, 18, 6, '#1a1a1a'); R(hx - 2, hy + 4, 3, 11, '#1a1a1a'); R(hx + 13, hy + 4, 3, 11, '#141414'); if (!back) { R(hx + 4, hy - 2, 6, 3, '#e8e4d8'); R(hx + 5, hy - 1, 1, 1, '#1a1a1a'); R(hx + 8, hy - 1, 1, 1, '#1a1a1a'); } break;
    case 'star': R(hx - 3, hy + 1, 20, 2, body); R(hx + 1, hy - 5, 12, 6, body); R(hx + 1, hy, 12, 1, trim); R(hx + 6, hy - 9, 2, 3, '#f8f0a0'); R(hx + 5, hy - 8, 4, 1, '#f8f0a0'); R(hx + 6, hy - 9, 1, 1, '#fff'); break;
    case 'tiara': R(hx + 1, hy, 12, 1, '#ffd040'); R(hx + 3, hy - 1, 8, 1, '#ffd040'); R(hx + 6, hy - 3, 2, 3, '#ffd040'); R(hx + 6, hy - 2, 2, 1, '#ff5a8a'); break;
    case 'tophat': R(hx - 2, hy, 18, 2, '#141418'); R(hx + 2, hy - 8, 10, 8, '#141418'); R(hx + 2, hy - 2, 10, 1, '#c84a4a'); R(hx + 3, hy - 8, 1, 6, '#2a2a30'); break;
    case 'widehat': R(hx - 5, hy, 24, 2, '#2a1a10'); R(hx + 1, hy - 5, 12, 5, '#2a1a10'); R(hx + 1, hy - 1, 12, 1, '#b8b8b8'); R(hx - 5, hy, 24, 1, '#3a2a1a'); break;
    case 'feather': R(hx - 1, hy + 2, 16, 1, trim); R(hx + 12, hy - 6, 2, 8, '#f0f0e0'); R(hx + 13, hy - 7, 2, 3, '#ffffff'); R(hx + 11, hy - 3, 1, 3, '#d0d0c0'); break;
    case 'veil': R(hx - 2, hy - 2, 18, 5, '#f4f4ff'); R(hx - 2, hy + 3, 3, 15, '#f4f4ff'); R(hx + 13, hy + 3, 3, 15, '#dcdcec'); R(hx + 4, hy - 3, 6, 1, '#f0c040'); R(hx + 6, hy - 4, 2, 1, '#f0c040'); if (back) R(hx - 1, hy + 3, 16, 15, '#ececf8'); break;
    case 'halo': R(hx + 1, hy - 6, 12, 1, '#ffe88a'); R(hx, hy - 5, 1, 1, '#ffe88a'); R(hx + 13, hy - 5, 1, 1, '#ffe88a'); R(hx + 1, hy - 4, 12, 1, 'rgba(255,232,138,.5)'); break;
    case 'crown': R(hx + 1, hy - 3, 12, 3, '#ffd040'); R(hx + 1, hy - 3, 12, 1, '#ffe88a'); for (const k of [1, 5, 9]) R(hx + k, hy - 6, 3, 3, '#ffd040'); R(hx + 6, hy - 2, 2, 1, '#e02a3a'); R(hx + 2, hy - 2, 1, 1, '#3a8aff'); R(hx + 10, hy - 2, 1, 1, '#3a8aff'); break;
    case 'horn': R(hx - 1, hy + 2, 16, 1, trim); R(hx + 6, hy - 6, 2, 7, '#e8e8f8'); R(hx + 6, hy - 6, 1, 6, '#ffffff'); break;
    default: break;
  }
  void capeC;
}

// weapons in the hand at (hx, hy): drawn upright; the attack pose tips them forward
function weapon(g, type, hx, hy, pose, back) {
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  g.save();
  g.translate(hx + 1, hy);
  if (pose === 'act') g.rotate(back ? -0.9 : 0.9); else if (pose === 'hurt') g.rotate(-0.25);
  const wood = '#8a5a2a', woodL = '#aa7a4a', gold = '#e8c050', goldD = '#a8802a', blade = '#dde3ee', bladeL = '#ffffff', bladeD = '#9aa4b4';
  switch (type) {
    case 'sword': case 'ninjato': R(-1, -19, 2, 17, blade); R(-1, -19, 1, 17, bladeL); R(0, -18, 1, 16, bladeD); R(-1, -20, 1, 1, blade); R(-3, -2, 6, 1, gold); R(-3, -1, 6, 1, goldD); R(-1, 0, 2, 3, wood); R(-1, 3, 2, 1, gold); break;
    case 'greatsword': R(-2, -24, 4, 22, blade); R(-2, -24, 1, 22, bladeL); R(1, -23, 1, 21, bladeD); R(-1, -25, 2, 1, blade); R(-4, -2, 8, 2, gold); R(-4, -1, 8, 1, goldD); R(-1, 0, 2, 4, '#5a3a1a'); R(-2, 4, 4, 1, gold); break;
    case 'katana': for (let i = 0; i < 18; i++) R(-1 + Math.floor(i / 9), -20 + i, 2, 1, i % 4 ? blade : bladeL); R(-2, -2, 4, 1, '#2a2a30'); R(-1, -1, 2, 5, '#5a1a1a'); R(-1, 0, 1, 4, '#8a2a2a'); break;
    case 'knife': R(-1, -9, 2, 8, blade); R(-1, -9, 1, 8, bladeL); R(-2, -1, 4, 1, gold); R(-1, 0, 2, 3, wood); break;
    case 'spear': R(0, -26, 1, 34, wood); R(-1, -26, 1, 34, woodL); R(-2, -31, 4, 5, blade); R(-1, -33, 2, 2, blade); R(-2, -31, 1, 5, bladeL); R(-2, -26, 4, 1, gold); R(-2, -25, 1, 3, '#c83a3a'); R(1, -25, 1, 3, '#a82a2a'); break;
    case 'axe': R(0, -16, 2, 22, wood); R(0, -16, 1, 22, woodL); R(2, -17, 5, 8, blade); R(6, -18, 2, 10, bladeL); R(2, -10, 5, 1, bladeD); R(-2, -15, 2, 5, bladeD); break;
    case 'hammer': R(0, -13, 2, 19, wood); R(0, -13, 1, 19, woodL); R(-4, -19, 10, 7, '#9aa0ae'); R(-4, -19, 10, 1, '#c8cedc'); R(-4, -13, 10, 1, '#6a7080'); R(-4, -19, 1, 7, '#b8bece'); break;
    case 'staff': R(0, -24, 2, 32, wood); R(0, -24, 1, 32, woodL); g.fillStyle = 'rgba(140,220,255,.35)'; g.beginPath(); g.arc(1, -27, 5, 0, Math.PI * 2); g.fill(); R(-1, -30, 4, 5, '#6ad0ff'); R(0, -30, 1, 2, '#ffffff'); R(-1, -25, 4, 1, gold); break;
    case 'rod': R(0, -16, 2, 22, '#d8d0b0'); R(0, -16, 1, 22, '#f0e8d0'); R(-2, -21, 6, 5, gold); g.fillStyle = 'rgba(255,120,180,.35)'; g.beginPath(); g.arc(1, -19, 4, 0, Math.PI * 2); g.fill(); R(-1, -20, 4, 3, '#ff6aa8'); R(0, -20, 1, 1, '#fff'); break;
    case 'bow': g.strokeStyle = wood; g.lineWidth = 2; g.beginPath(); g.arc(-6, -6, 12, -1.15, 1.15); g.stroke(); g.strokeStyle = woodL; g.lineWidth = 1; g.beginPath(); g.arc(-6, -6, 12, -1.0, -0.2); g.stroke(); R(-1, -16, 1, 21, '#e8e8e8'); break;
    case 'crossbow': R(-6, -2, 13, 2, wood); R(-6, -2, 13, 1, woodL); R(-1, -7, 2, 10, '#6a6a72'); R(-7, -3, 1, 4, '#4a4a52'); R(6, -3, 1, 4, '#4a4a52'); break;
    case 'gun': R(-1, -3, 9, 3, '#5a5a66'); R(-1, -3, 9, 1, '#8a8a96'); R(7, -2, 2, 1, '#2a2a30'); R(-1, 0, 3, 4, wood); R(2, 0, 1, 2, '#3a3a42'); break;
    case 'book': R(-4, -6, 8, 9, '#7a2a2a'); R(-4, -6, 8, 1, '#9a4a4a'); R(-3, -5, 6, 7, '#f0e8d0'); R(-1, -5, 2, 7, gold); R(-4, 2, 8, 1, '#5a1a1a'); break;
    case 'harp': R(-1, -14, 2, 14, gold); R(-1, -14, 1, 14, '#f8e08a'); R(1, -14, 6, 2, gold); R(5, -12, 2, 11, goldD); for (let k = 0; k < 3; k++) R(1 + k * 2, -12, 1, 10, '#f0f0f0'); break;
    case 'claw': R(-2, -2, 5, 4, '#9aa0ae'); R(-2, -2, 5, 1, '#c8cedc'); R(-2, -5, 1, 3, bladeL); R(0, -6, 1, 4, bladeL); R(2, -5, 1, 3, bladeL); break;
    case 'fan': g.fillStyle = '#e04a7a'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 9, -2.5, -0.6); g.closePath(); g.fill(); g.strokeStyle = '#ffd0e0'; g.lineWidth = 1; for (let a = -2.4; a < -0.6; a += 0.35) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); g.stroke(); } R(-1, 0, 2, 3, wood); break;
    case 'whip': g.strokeStyle = '#6a3a1a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(10, -4, 4, -12); g.quadraticCurveTo(0, -18, 7, -21); g.stroke(); R(-1, 0, 2, 4, '#3a2010'); break;
    default: break;
  }
  g.restore();
}

// a one-pixel dark outline around everything drawn, like hand-made pixel art
function outline(src) {
  const c = mk(W, H), g = c.getContext('2d');
  const sil = mk(W, H), sg = sil.getContext('2d');
  sg.drawImage(src, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = OUT; sg.fillRect(0, 0, W, H);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(sil, dx, dy);
  g.drawImage(src, 0, 0);
  return c;
}
