// The rules of a battle, with no drawing in them: turns, moving, every kind of action, and the enemy's thinking.
// Every change is also written to B.events so the screen can play it back.
import { ABILITIES } from '../data/jobs.js';
import { ITEMS, CONSUMABLES, GEAR } from '../data/items.js';
import { MONSTERS, MSKILLS, MDROP } from '../data/monsters.js';
import { TERRAIN, WEAPONS, STATUS } from '../data/core.js';
import { stats, battleKit, jobLv, gainJp, gainExp } from './unit.js';
import { clamp, r0, pick } from '../util.js';

export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const GOOD = new Set(['regen', 'haste', 'protect', 'shell', 'float', 'reflect']);
export const ATTACK = { id: 'attack', name: ['攻擊', 'Attack'], k: 'act', r: 'w', a: 0, t: 'foe', mp: 0, ct: 0, d: ['atk', 1.0], basic: true };

// ---------------------------------------------------------------- setting up
// side: 'ally' (yours), 'guest' (on your side, thinks for itself), 'foe'
export function createBattle({ map, units, goal = { type: 'rout' }, tier = 1, rnd = Math.random, gold = 0, bag = {}, flags = {}, treasure = [] }) {
  const B = { map, units: [], tick: 0, round: 0, events: [], pending: [], turn: null, over: null, goal, tier, rnd, gold, bag, flags, spoils: [], found: [], goldWon: 0, recruits: [], expLog: {}, turnCount: 0, treasure: treasure.map((t) => ({ ...t, taken: false })) };
  for (const e of units) addUnit(B, e);
  return B;
}
export function addUnit(B, { unit, side, x, y, dir, ai, boss = false, named = false, leader = false, noDrop = false, retreat = 0 }) {
  const s = stats(unit);
  const bu = { id: B.units.length + 1, u: unit, side, x, y, dir: dir ?? (side === 'foe' ? 1 : 3), hp: s.hp, mp: s.mp, s, ct: Math.floor(B.rnd() * 40), st: {}, buf: [], dead: false,
    ai: ai ?? side !== 'ally', boss, named, leader, noDrop, retreat, moved: false, acted: false, flags: {}, kit: battleKit(unit), undyingUsed: false };
  for (const a of s.auto) bu.st[a] = a === 'doom' ? 4 : 99;
  if (unit.mon && MONSTERS[unit.mon].fly) bu.st.float = 99;
  B.units.push(bu);
  return bu;
}
export const tileAt = (B, x, y) => (x >= 0 && y >= 0 && x < B.map.w && y < B.map.h ? B.map.tiles[y * B.map.w + x] : null);
export const unitAt = (B, x, y) => B.units.find((u) => u.x === x && u.y === y && !u.gone);
export const alive = (u) => !u.dead && !u.gone;
const ev = (B, e) => { B.events.push(e); return e; };
export const sideOf = (u) => (u.st.charm ? (u.side === 'foe' ? 'ally' : 'foe') : u.side === 'guest' ? 'ally' : u.side);
export const foesOf = (B, u) => B.units.filter((o) => alive(o) && sideOf(o) !== sideOf(u));
export const friendsOf = (B, u) => B.units.filter((o) => alive(o) && sideOf(o) === sideOf(u));

// ---------------------------------------------------------------- live numbers (stats with buffs and statuses)
const bufPct = (u, k) => u.buf.filter((b) => b.k === k).reduce((s, b) => s + b.p, 0);
export function live(u, k) {
  let v = u.s[k] ?? 0;
  const p = clamp(bufPct(u, k), -60, 100);
  if (k === 'spd') { v *= 1 + p / 100; if (u.st.haste) v *= 1.5; if (u.st.slow) v *= 0.5; return v; }
  if (k === 'eva') return clamp(v + p, 0, 80);
  v = v * (1 + p / 100);
  if (k === 'atk' && u.st.berserk) v *= 1.5;
  if (k === 'atk' && u.s.flags.lowhp && u.hp < u.s.hp / 4) v *= 1 + u.s.flags.lowhp / 100;
  return v;
}
const hasMagic = (a) => !!a.magic;
export const canUse = (B, u, a) => {
  if (!a) return false;
  if (a.magic && u.st.silence) return false;
  const cost = mpCost(u, a);
  if (cost > u.mp) return false;
  if (a.goldcost && B.gold < a.goldcost) return false;
  if (a.rangedOnly && !(u.s.range[1] > 1)) return false;
  return true;
};
export const mpCost = (u, a) => Math.ceil((a.mp || 0) * (u.s.flags.halfmp ? 0.5 : 1));

// ---------------------------------------------------------------- the clock
// run time forward until a unit's turn comes up or a charged action goes off
export function advance(B) {
  for (let guard = 0; guard < 5000; guard++) {
    // charged actions that are ready
    const ready = B.pending.filter((p) => p.ticks <= 0);
    if (ready.length) { const p = ready[0]; B.pending.splice(B.pending.indexOf(p), 1); resolveCharged(B, p); checkEnd(B); return { type: 'resolve', p }; }
    const up = B.units.filter((u) => alive(u) && !u.jumping && u.ct >= 100 && !u.charging).sort((a, b) => b.ct - a.ct || a.id - b.id)[0];
    if (up) { B.turn = up; return { type: 'turn', unit: up }; }
    B.tick++;
    for (const p of B.pending) p.ticks--;
    // a body not revived in time leaves the field (yours come back after the battle)
    for (const u of B.units) if (u.dead && !u.gone && u.deadAt != null && B.tick - u.deadAt > 260) { u.gone = true; ev(B, { t: 'vanish', u }); }
    for (const u of B.units) if (alive(u) && !u.st.stop && !u.charging && !u.jumping) u.ct += live(u, 'spd');
  }
  throw new Error('clock stuck');
}
// the order the next few turns will come in (for the turn list on screen)
export function forecast(B, n = 10) {
  const sim = B.units.filter((u) => alive(u) && !u.jumping).map((u) => ({ u, ct: u.ct, spd: u.st.stop ? 0 : live(u, 'spd') }));
  const out = [];
  for (let t = 0; t < 600 && out.length < n; t++) {
    const up = sim.filter((s) => s.ct >= 100).sort((a, b) => b.ct - a.ct)[0];
    if (up) { out.push(up.u); up.ct -= 100; continue; }
    for (const s of sim) s.ct += s.spd;
  }
  return out;
}

// ---------------------------------------------------------------- starting and ending a turn
// returns false if the unit loses this turn (asleep, stopped, stunned, felled by doom)
export function beginTurn(B, u) {
  u.moved = false; u.acted = false; B.turnCount++;
  if (u.leader || (B.turnCount % Math.max(1, B.units.filter(alive).length) === 0)) B.round++;
  if (u.st.poison) { const n = Math.max(1, r0(u.s.hp / 10)); hurt(B, u, n, null, { quiet: false, src: 'poison' }); }
  if (u.st.regen && alive(u)) heal(B, u, Math.max(1, r0(u.s.hp / 10)));
  const tile = tileAt(B, u.x, u.y);
  if (alive(u) && tile && TERRAIN[tile.t].poison && !u.st.float) hurt(B, u, Math.max(1, r0(u.s.hp / 16)), null, { src: 'swamp' });
  if (!alive(u)) return false;
  // statuses count down on their owner's turn
  let lose = false;
  for (const k of Object.keys(u.st)) {
    if (k === 'doom') { u.st.doom--; ev(B, { t: 'count', u, n: u.st.doom }); if (u.st.doom <= 0) { kill(B, u, null); return false; } continue; }
    if (['sleep', 'stop', 'stun'].includes(k)) lose = true;
    if (u.st[k] < 90) { u.st[k]--; if (u.st[k] <= 0) { delete u.st[k]; ev(B, { t: 'status', u, id: k, on: false }); } }
  }
  for (const b of u.buf) b.turns--; u.buf = u.buf.filter((b) => b.turns > 0);
  if (u.flags.taunted && --u.flags.tauntT <= 0) u.flags.taunted = 0;
  if (u.flags.rangeUp) u.flags.rangeUp--;
  if (lose) { endTurn(B, u, u.dir); return false; }
  return true;
}
// facing at the end: 0 east, 1 south, 2 west, 3 north
export function endTurn(B, u, dir) {
  if (dir != null) u.dir = dir;
  u.ct -= u.moved && u.acted ? 100 : u.moved || u.acted ? 80 : 60;
  if (u.quick) { u.ct = 100; u.quick = false; }
  B.turn = null;
}

// ---------------------------------------------------------------- moving
const moveCost = (u, t) => (u.st.float || u.s.flags.terrain ? 1 : TERRAIN[t.t].cost || 1);
// every tile the unit can reach this turn, with the path to it
export function reachable(B, u) {
  const mov = Math.max(1, r0(live(u, 'mov'))), jmp = live(u, 'jmp');
  const tele = u.s.flags.tele || u.flags.warp, ign = u.s.flags.ign;
  const start = tileAt(B, u.x, u.y), out = new Map();
  out.set(`${u.x},${u.y}`, { x: u.x, y: u.y, cost: 0, path: [[u.x, u.y]] });
  if (tele) {
    for (const t of B.map.tiles) {
      const d = Math.abs(t.x - u.x) + Math.abs(t.y - u.y);
      if (d <= mov + 1 && standable(B, u, t) && !unitAt(B, t.x, t.y)) out.set(`${t.x},${t.y}`, { x: t.x, y: t.y, cost: d, path: [[u.x, u.y], [t.x, t.y]], tele: true });
    }
    return out;
  }
  const q = [{ x: u.x, y: u.y, cost: 0, path: [[u.x, u.y]] }];
  while (q.length) {
    q.sort((a, b) => a.cost - b.cost);
    const c = q.shift(), ct = tileAt(B, c.x, c.y);
    for (const [dx, dy] of DIRS) {
      const nx = c.x + dx, ny = c.y + dy, nt = tileAt(B, nx, ny);
      if (!nt || !passable(B, u, nt)) continue;
      if (!ign && Math.abs(nt.h - ct.h) > jmp) continue;
      const other = unitAt(B, nx, ny);
      if (other && alive(other) && sideOf(other) !== sideOf(u)) continue;
      const cost = c.cost + moveCost(u, nt);
      if (cost > mov) continue;
      const k = `${nx},${ny}`, prev = out.get(k);
      if (prev && prev.cost <= cost) continue;
      const node = { x: nx, y: ny, cost, path: [...c.path, [nx, ny]] };
      out.set(k, node); q.push(node);
    }
  }
  // you can pass through friends and fallen bodies but not stop on them
  for (const [k, n] of out) { const o = unitAt(B, n.x, n.y); if (o && o !== u) out.delete(k); }
  return out;
}
function passable(B, u, t) {
  if (t.obj) return false;
  if (t.t === 'deep') return !!(u.s.flags.water || u.st.float);
  if (t.t === 'lava') return !!u.st.float;
  return !t.block || false;
}
const standable = (B, u, t) => passable(B, u, t);
export function moveTo(B, u, x, y, path) {
  const from = [u.x, u.y];
  if (x === u.x && y === u.y) return;
  u.x = x; u.y = y; u.moved = true;
  if (path && path.length > 1) { const [px, py] = path[path.length - 2]; u.dir = dirTo(px, py, x, y); }
  ev(B, { t: 'move', u, path: path || [from, [x, y]] });
  if (u.s.flags.hp) heal(B, u, r0(u.s.hp * u.s.flags.hp / 100), true);
  if (u.s.flags.mp) { u.mp = Math.min(u.s.mp, u.mp + r0(u.s.mp * u.s.flags.mp / 100)); }
  // buried treasure
  const tr = B.treasure.find((t) => t.x === x && t.y === y && !t.taken);
  if (tr && sideOf(u) === 'ally' && u.side !== 'guest') { tr.taken = true; B.found.push(tr.item); ev(B, { t: 'treasure', u, item: tr.item }); }
  u.flags.warp = 0;
}
export const dirTo = (x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0; return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 2) : (dy >= 0 ? 1 : 3); };

// ---------------------------------------------------------------- range and area
export function rangeOf(u, a) {
  if (a.r === 'w') { const r = [...u.s.range]; if (u.flags.rangeUp) r[1] += 2; return r; }
  if (a.r === 0) return [0, 0];
  const r = a.r + (a.k === 'item' && u.s.flags.itemr ? u.s.flags.itemr - 1 : 0);
  return [a.t === 'self' ? 0 : (a.minr ?? (a.t === 'foe' && !a.magic && a.r > 1 && a.rangedOnly ? 2 : 0)), r];
}
// tiles the unit could aim at from where it stands
export function targetTiles(B, u, a) {
  const [lo, hi] = rangeOf(u, a), here = tileAt(B, u.x, u.y), out = [];
  const wtype = a.r === 'w' ? u.s.wtype : null, arc = wtype && WEAPONS[wtype] && WEAPONS[wtype].arc, line = a.a === 'line';
  if (a.r === 0) return [[u.x, u.y]];
  for (let dy = -hi - 3; dy <= hi + 3; dy++) for (let dx = -hi - 3; dx <= hi + 3; dx++) {
    const x = u.x + dx, y = u.y + dy, t = tileAt(B, x, y); if (!t) continue;
    const d = Math.abs(dx) + Math.abs(dy), dh = here.h - t.h;
    // bows reach farther from up high
    const reach = hi + (arc ? clamp(Math.floor(dh / 2), -1, 3) : 0);
    if (d < lo || d > reach) continue;
    if (d === 0 && a.t === 'foe') continue;
    // melee can't reach far up or down; a spear's thrust and line skills go in straight lines
    if ((hi <= 1 || wtype === 'spear') && !a.magic && Math.abs(dh) > 3) continue;
    if ((line || wtype === 'spear') && dx !== 0 && dy !== 0) continue;
    out.push([x, y]);
  }
  return out;
}
// the tiles an action at (tx, ty) covers
export function areaOf(B, u, a, tx, ty) {
  if (a.a === 'all') return B.map.tiles.map((t) => [t.x, t.y]);
  if (a.a === 'line') {
    const d = dirTo(u.x, u.y, tx, ty), [dx, dy] = DIRS[d], out = [], len = typeof a.r === 'number' ? Math.max(a.r, 2) : 2;
    for (let i = 1; i <= len; i++) { const x = u.x + dx * i, y = u.y + dy * i; if (tileAt(B, x, y)) out.push([x, y]); }
    return out;
  }
  const r = a.a || 0, out = [], ct = tileAt(B, tx, ty); if (!ct) return out;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.abs(dx) + Math.abs(dy) > r) continue;
    const t = tileAt(B, tx + dx, ty + dy); if (!t) continue;
    if (Math.abs(t.h - ct.h) > (a.v ?? 3)) continue;
    out.push([t.x, t.y]);
  }
  return out;
}
// who an action would touch
export function victims(B, u, a, tx, ty) {
  const tiles = areaOf(B, u, a, tx, ty), out = [];
  for (const [x, y] of tiles) {
    const o = B.units.find((v) => v.x === x && v.y === y && !v.gone && !v.jumping);
    if (!o) continue;
    if (a.dead ? !o.dead : o.dead) continue;
    if (a.a === 'all' || a.foesOnly) { if (a.t === 'ally' ? sideOf(o) !== sideOf(u) : sideOf(o) === sideOf(u)) continue; }
    if (a.t === 'self' && o !== u) continue;
    out.push(o);
  }
  return out;
}

// ---------------------------------------------------------------- numbers: hit chance and damage
// where the attacker stands relative to the target's facing
export function facingOf(att, tgt) {
  const [fx, fy] = DIRS[tgt.dir], dx = att.x - tgt.x, dy = att.y - tgt.y, dot = dx * fx + dy * fy, cross = Math.abs(dx * fy - dy * fx);
  if (dot < 0 && -dot >= cross) return 'back';
  if (dot > 0 && dot >= cross) return 'front';
  return 'side';
}
function elementOf(B, u, a) {
  const el = a.d && a.d[2];
  if (el === 'terrain') { const t = tileAt(B, u.x, u.y); return TERRAIN[t.t].el; }
  if (a.basic) return u.s.el;
  return el || null;
}
// the expected outcome of u doing a to t: { dmg, heal, hit (0-100), crit, el }
export function calc(B, u, t, a, opt = {}) {
  const out = { dmg: 0, heal: 0, hit: 100, el: null, mult: 1 };
  if (a.d) {
    const [s, p] = a.d, el = elementOf(B, u, a);
    out.el = el;
    let A, D, magic = s === 'mag';
    if (s === 'atk') { A = live(u, 'atk') + u.s.wpn * 1.3; D = live(t, 'def'); if (a.basic && u.s.wtype === 'gun') { A = u.s.wpn * 3.2; } }
    else if (s === 'mag') { A = live(u, 'mag') + (u.s.wmag || 0); D = live(t, 'res'); }
    else if (s === 'hyb') { A = (live(u, 'atk') + live(u, 'mag')) / 2 + u.s.wpn; D = (live(t, 'def') + live(t, 'res')) / 2; }
    else if (s === 'fix') { A = (u.s.wtype === 'gun' ? u.s.wpn : u.s.wpn * 0.7) * 3.2; D = live(t, 'def') * 0.5; }
    else if (s === 'def') { A = live(u, 'def') * 0.9; D = live(t, 'def'); }
    else if (s === 'gold') { A = 40 + (u.u.lv * 4); D = 0; }
    let dmg;
    if (s === 'pct') dmg = t.s.hp * p * (t.boss ? 0.3 : 1);
    else dmg = A * p * 1.6 * A / Math.max(1, A + D);
    if (s === 'gold') dmg = A * p;
    // weapon and element mastery, beasts, the undead
    if (u.s.flags['w_' + u.s.wtype]) dmg *= 1 + u.s.flags['w_' + u.s.wtype] / 100;
    if (el && u.s.flags['el_' + el]) dmg *= 1 + u.s.flags['el_' + el] / 100;
    if (u.s.flags.vsbeast && t.u.mon) dmg *= 1 + u.s.flags.vsbeast / 100;
    if (a.vsdark && (t.s.resist.has('dark') || (t.u.mon && MONSTERS[t.u.mon].undead))) dmg *= 1.5;
    if (a.lowhpBonus) dmg *= 1 + (1 - u.hp / u.s.hp);
    if (a.k === 'act' && (a.a === 'all') && u.s.flags.songpow && !a.d[0].startsWith('pct')) dmg *= 1 + u.s.flags.songpow / 100;
    // height and facing (physical only)
    const physical = s === 'atk' || s === 'hyb' || s === 'fix' || s === 'def';
    const face = facingOf(u, t);
    if (physical) {
      const dh = tileAt(B, u.x, u.y).h - tileAt(B, t.x, t.y).h;
      dmg *= 1 + clamp(dh * 0.05, -0.2, 0.3);
      if (face === 'back') dmg *= 1.25 + (a.backBonus || 0); else if (face === 'side') dmg *= 1.1 + (a.backBonus || 0) / 3;
    }
    // elements
    if (el) {
      if (t.s.absorb.has(el)) { out.heal = r0(dmg * 0.5); dmg = 0; }
      else if (t.s.weak.has(el)) dmg *= 1.5;
      else if (t.s.resist.has(el)) dmg *= 0.5;
      if (el === 'earth' && t.st.float) dmg = 0;
    }
    if (t.st.protect && physical) dmg *= 2 / 3;
    if (t.st.shell && magic) dmg *= 2 / 3;
    if (a.hits) dmg *= a.hits;
    out.dmg = Math.max(dmg > 0 ? 1 : 0, r0(dmg));
    out.face = face;
    // to hit: physical attacks can be dodged, depending on facing; spells always land
    if (physical && !a.hit) {
      const eva = live(t, 'eva') * (face === 'back' ? 0 : face === 'side' ? 0.5 : 1);
      out.hit = clamp(r0(97 - eva + (u.s.flags.hit || 0) - (u.st.blind ? 45 : 0)), 5, 100);
      if (t.st.stop || t.st.sleep) out.hit = 100;
      out.crit = clamp(u.s.crit + (face === 'back' ? 10 : 0), 0, 60);
    }
  }
  if (a.h) {
    const [s, p] = a.h;
    let n = s === 'pct' ? t.s.hp * p : s === 'fix' ? p : (live(u, 'mag') + (u.s.wmag || 0)) * p * 1.4;
    if (a.k === 'item' && u.s.flags.itempow) n *= 1 + u.s.flags.itempow / 100;
    if (u.s.flags.healpow) n *= 1 + u.s.flags.healpow / 100;
    if (t.u.mon && MONSTERS[t.u.mon].undead && s !== 'pct') { out.dmg += r0(n); n = 0; }
    out.heal += r0(n);
  }
  if (a.hit) {
    let h = a.hit;
    if (a.steal || a.invite) { h += (live(u, 'spd') - live(t, 'spd')) * 2 + (facingOf(u, t) === 'back' ? 15 : 0) + (a.steal ? (u.s.flags.steal || 0) : (u.s.flags.invite || 0)); if (t.boss || t.named) h = a.steal ? h * 0.5 : 0; }
    out.hit = clamp(r0(h), 0, 100);
  }
  return out;
}
// chance a status sticks
export function statusChance(B, u, t, id, ch) {
  if (t.s.immune.has(id)) return 0;
  if (GOOD.has(id)) return 100;
  let c = ch * (1 + (u.s.flags.status || 0) / 100) * (1 - live(t, 'res') / (live(t, 'res') + 300));
  if (t.boss && ['doom', 'stop', 'charm', 'sleep', 'berserk', 'stun'].includes(id)) c *= 0.25;
  return clamp(r0(c), 0, 100);
}

// ---------------------------------------------------------------- doing things
// start an action; if it needs charging it goes into the queue instead
export function perform(B, u, a, tx, ty) {
  u.acted = true;
  u.dir = tx === u.x && ty === u.y ? u.dir : dirTo(u.x, u.y, tx, ty);
  if (a.k !== 'item') { const c = mpCost(u, a); u.mp -= c; if (a.goldcost) B.gold -= a.goldcost; }
  const ct = Math.round((a.ct || 0) * 12 * (1 - Math.min(80, (u.s.flags.ct || 0) + (u.s.flags.ctdown || 0)) / 100));
  if (ct > 0) {
    if (a.jump) { u.jumping = true; ev(B, { t: 'jumpup', u }); }
    else { u.charging = { a, tx, ty }; ev(B, { t: 'charge', u, a }); }
    B.pending.push({ u, a, tx, ty, ticks: ct });
    return;
  }
  resolve(B, u, a, tx, ty);
  checkEnd(B);
}
function resolveCharged(B, p) {
  const u = p.u;
  if (!alive(u) && !u.jumping) return;
  if (u.jumping) {
    u.jumping = false;
    // land on the target tile if it's free, else next to it
    const spot = [[p.tx, p.ty], ...DIRS.map(([dx, dy]) => [p.tx + dx, p.ty + dy])].find(([x, y]) => { const t = tileAt(B, x, y); const o = unitAt(B, x, y); return t && !t.block && !t.obj && (!o || o === u); });
    resolve(B, u, p.a, p.tx, p.ty);
    if (spot) { u.x = spot[0]; u.y = spot[1]; }
    ev(B, { t: 'land', u });
    return;
  }
  u.charging = null;
  if (p.a.magic && u.st.silence) { ev(B, { t: 'text', u, msg: ['詠唱被打斷了！', 'The spell fizzles!'] }); return; }
  resolve(B, u, p.a, p.tx, p.ty);
}
function resolve(B, u, a, tx, ty) {
  ev(B, { t: 'act', u, a, tx, ty });
  let hit = victims(B, u, a, tx, ty);
  // reflect: single-target spells bounce back
  if (a.magic && a.a === 0 && hit.length === 1 && hit[0].st.reflect && hit[0] !== u && a.t === 'foe') { ev(B, { t: 'text', u: hit[0], msg: ['反射！', 'Reflected!'] }); hit = [u]; }
  // a bodyguard takes the blow
  hit = hit.map((t) => { const g = t.flags.guardedBy && B.units.find((x) => x.id === t.flags.guardedBy); return g && alive(g) && a.t === 'foe' && Math.abs(g.x - t.x) + Math.abs(g.y - t.y) <= 3 && sideOf(g) === sideOf(t) ? g : t; });
  let anyDamage = 0;
  for (const t of hit) anyDamage += applyTo(B, u, t, a);
  if (a.self) { if (a.self.hp) hurt(B, u, r0(u.s.hp * -a.self.hp), null, { src: 'self' }); }
  if (a.selfst) for (const [id, , d] of a.selfst) addStatus(B, u, id, d);
  if (a.mph && a.r === 0 && a.t === 'self') u.mp = Math.min(u.s.mp, u.mp + a.mph);
  if (a.suicide) kill(B, u, u);
  if (a.rangeUp) u.flags.rangeUp = 3;
  // experience and JP for whoever acted
  if (u.side === 'ally' && !u.u.mon) reward(B, u, hit, a);
}
function reward(B, u, hit, a) {
  const tgt = hit.length ? Math.max(...hit.map((t) => t.u.lv)) : u.u.lv;
  const exp = clamp(10 + (tgt - u.u.lv) * 2, 4, 40) + (hit.some((t) => t.dead && sideOf(t) !== sideOf(u)) ? 15 : 0);
  const jp = 10 + jobLv(u.u) * 3 + (a.basic ? 0 : 6);
  const L = (B.expLog[u.u.uid] = B.expLog[u.u.uid] || { exp: 0, jp: 0, lv: [], jlv: [] });
  const e = r0(exp * (1 + ((u.s.flags.exp || 0) + (u.s.flags.expup || 0)) / 100)), j = r0(jp * (1 + ((u.s.flags.jp || 0) + (u.s.flags.jpup || 0)) / 100));
  L.exp += e; L.jp += j;
  const ups = gainExp(u.u, e), jl = gainJp(u.u, j);
  if (ups.length) { L.lv.push(...ups); ev(B, { t: 'levelup', u, lv: u.u.lv }); refreshStats(u); }
  if (jl) { L.jlv.push(jl); ev(B, { t: 'joblevel', u, lv: jl }); }
}
function refreshStats(u) { const hpR = u.hp / u.s.hp, mpR = u.s.mp ? u.mp / u.s.mp : 1; u.s = stats(u.u); u.hp = Math.max(1, r0(u.s.hp * hpR)); u.mp = r0(u.s.mp * mpR); }

// apply one action to one target; returns damage dealt
function applyTo(B, u, t, a) {
  const c = calc(B, u, t, a);
  // reactions that dodge come first
  const rx = t.kit.react && t.kit.react.rx, canReact = alive(t) && !t.st.stop && !t.st.sleep && t !== u && sideOf(t) !== sideOf(u);
  const isPhys = a.d && ['atk', 'hyb', 'fix', 'def'].includes(a.d[0]);
  const trig = (on) => rx && canReact && (rx.on === 'any' || (rx.on === 'phys' && isPhys) || (rx.on === 'magic' && a.magic)) && (!rx.ranged || Math.abs(u.x - t.x) + Math.abs(u.y - t.y) > 1) && B.rnd() * 100 < rx.p && on.includes(rx.fx);
  if (a.d || a.steal || a.invite || a.brk) {
    if (B.rnd() * 100 >= c.hit) { ev(B, { t: 'miss', u: t }); return 0; }
    if (sideOf(t) !== sideOf(u) && trig(['evade'])) { ev(B, { t: 'react', u: t, a: t.kit.react }); ev(B, { t: 'miss', u: t }); return 0; }
  }
  let dealt = 0;
  if (a.d && c.dmg > 0) {
    let n = c.dmg * (0.9 + B.rnd() * 0.2);
    if (c.crit && B.rnd() * 100 < c.crit) { n *= 1.5; ev(B, { t: 'crit', u: t }); }
    if (trig(['dmgcut', 'guard'])) { ev(B, { t: 'react', u: t, a: t.kit.react }); n *= 0.5; }
    n = Math.max(1, r0(n));
    if (trig(['mpshield']) && t.mp > 0) { ev(B, { t: 'react', u: t, a: t.kit.react }); const m = Math.min(t.mp, n); t.mp -= m; n -= m; ev(B, { t: 'mp', u: t, n: -m }); }
    if (n > 0) { dealt = hurt(B, t, n, u, { el: c.el, a }); }
    // weapon effects
    if (a.basic && u.s.onhit && alive(t)) { const [id, ch] = u.s.onhit; if (B.rnd() * 100 < statusChance(B, u, t, id, ch)) addStatus(B, t, id, 3); }
    if ((a.drain || (a.basic && (u.s.wfx === 'drain' || u.s.flags.drain))) && dealt > 0) heal(B, u, r0(dealt * (a.drain ? 1 : 0.3) * (1 + ((u.s.flags.drain || 0) > 1 ? u.s.flags.drain / 100 : 0))));
    if (a.execute && alive(t) && t.hp <= t.s.hp * a.execute && !t.boss) kill(B, t, u);
  }
  if (c.heal > 0 && alive(t)) heal(B, t, c.heal);
  if (a.mph && a.t !== 'self') { const n = Math.min(t.s.mp - t.mp, r0(a.mph * (a.k === 'item' && u.s.flags.itempow ? 1 + u.s.flags.itempow / 100 : 1))); t.mp += n; ev(B, { t: 'mp', u: t, n }); }
  if (a.mpd) { const n = Math.min(t.mp, r0(a.mpd * (1 + live(u, 'mag') / 200))); t.mp -= n; ev(B, { t: 'mp', u: t, n: -n }); if (a.mpdrain) { u.mp = Math.min(u.s.mp, u.mp + n); ev(B, { t: 'mp', u, n }); } }
  if (a.rev && t.dead) revive(B, t, a.rev);
  if (alive(t)) {
    for (const [id, ch, dur] of a.st || []) if (!(t.st[id] && !GOOD.has(id)) && B.rnd() * 100 < statusChance(B, u, t, id, ch)) addStatus(B, t, id, dur);
    for (const [k, p, turns] of a.buf || []) { if (p < 0 && sideOf(t) !== sideOf(u) && B.rnd() * 100 > statusChance(B, u, t, 'buf', 90)) continue; t.buf.push({ k, p, turns }); ev(B, { t: 'buff', u: t, k, p }); }
    if (a.cure) for (const id of a.cure) if (t.st[id]) { delete t.st[id]; ev(B, { t: 'status', u: t, id, on: false }); }
    if (a.strip) { for (const id of Object.keys(t.st)) if (GOOD.has(id) && t.st[id] < 90) delete t.st[id]; t.buf = t.buf.filter((b) => b.p < 0); ev(B, { t: 'text', u: t, msg: ['增益被解除了', 'Boons stripped'] }); }
    if (a.quick) { t.quick = true; t.ct = Math.max(t.ct, 100); if (t !== u) ev(B, { t: 'text', u: t, msg: ['立刻行動！', 'Acts at once!'] }); }
    if (a.taunt) { t.flags.taunted = u.id; t.flags.tauntT = 3; }
    if (a.guardian) { t.flags.guardedBy = u.id; }
    if (a.warpTo) { t.flags.warp = 1; ev(B, { t: 'text', u: t, msg: ['可以瞬間移動了', 'Can blink next turn'] }); }
    if (a.steal) doSteal(B, u, t, a.steal);
    if (a.brk) doBreak(B, t, a.brk);
    if (a.invite) doInvite(B, u, t);
    if (a.gold) { const g = t.u.lv * 30; B.goldWon += g; ev(B, { t: 'gold', u: t, n: g }); }
  }
  // reactions after being hit
  if (alive(t) && dealt > 0 && trig(['counter', 'heal', 'regen', 'haste', 'atkup', 'mpheal', 'magcounter', 'absorbmp'])) {
    ev(B, { t: 'react', u: t, a: t.kit.react });
    const fx = rx.fx;
    if (fx === 'counter') { if (inWeaponRange(B, t, u)) { const cc = calc(B, t, u, ATTACK); if (B.rnd() * 100 < cc.hit) hurt(B, u, Math.max(1, r0(cc.dmg * (0.9 + B.rnd() * 0.2))), t, { el: cc.el }); else ev(B, { t: 'miss', u }); } }
    else if (fx === 'heal') heal(B, t, r0(t.s.hp * (rx.amt || 0.15)));
    else if (fx === 'regen') addStatus(B, t, 'regen', 3);
    else if (fx === 'haste') addStatus(B, t, 'haste', 2);
    else if (fx === 'atkup') { t.buf.push({ k: 'atk', p: 10, turns: 3 }); ev(B, { t: 'buff', u: t, k: 'atk', p: 10 }); }
    else if (fx === 'mpheal') { const n = r0(t.s.mp * 0.12); t.mp = Math.min(t.s.mp, t.mp + n); ev(B, { t: 'mp', u: t, n }); }
    else if (fx === 'magcounter') hurt(B, u, Math.max(1, r0(calc(B, t, u, { d: ['mag', 1.0, null] }).dmg)), t, {});
    else if (fx === 'absorbmp') { const n = mpCost(u, a) || 10; t.mp = Math.min(t.s.mp, t.mp + n); ev(B, { t: 'mp', u: t, n }); }
  }
  if (t.st.sleep && dealt > 0) { delete t.st.sleep; ev(B, { t: 'status', u: t, id: 'sleep', on: false }); }
  return dealt;
}
const inWeaponRange = (B, u, t) => targetTiles(B, u, ATTACK).some(([x, y]) => x === t.x && y === t.y);
export function hurt(B, t, n, by, o = {}) {
  if (!alive(t)) return 0;
  // Undying: hang on at 1 HP once
  if (t.hp - n <= 0 && !t.undyingUsed && (t.s.flags.undying || (t.kit.react && t.kit.react.rx.fx === 'undying' && B.rnd() * 100 < t.kit.react.rx.p))) { t.undyingUsed = true; n = t.hp - 1; ev(B, { t: 'react', u: t, a: t.kit.react || { name: ['不死', 'Undying'] } }); }
  t.hp = Math.max(0, t.hp - n);
  ev(B, { t: 'dmg', u: t, n, el: o.el });
  if (t.hp <= 0) kill(B, t, by);
  // story foes who fall back when badly hurt (they count as beaten)
  else if (t.retreat && t.hp <= t.s.hp * t.retreat) { t.dead = true; t.gone = true; t.charging = null; B.pending = B.pending.filter((p) => p.u !== t); ev(B, { t: 'retreat', u: t }); if (t.side === 'foe' && !t.dropped) { t.dropped = true; B.goldWon += 50 + t.u.lv * 20; } }
  return n;
}
export function heal(B, t, n, quiet) { if (!alive(t) || n <= 0) return; const m = Math.min(t.s.hp - t.hp, n); t.hp += m; if (!quiet || m) ev(B, { t: 'heal', u: t, n: m }); }
function kill(B, t, by) {
  t.hp = 0; t.dead = true; t.deadAt = B.tick; t.st = {}; t.buf = []; t.charging = null;
  B.pending = B.pending.filter((p) => p.u !== t);
  ev(B, { t: 'die', u: t });
  if (by) by.u.kills = (by.u.kills || 0) + 1;
  if (t.side === 'foe' && !t.dropped) dropFrom(B, t);
}
function revive(B, t, frac) { t.deadAt = null; t.dead = false; t.hp = Math.max(1, r0(t.s.hp * frac)); t.ct = 0; ev(B, { t: 'revive', u: t }); }
export function addStatus(B, t, id, dur) {
  if (t.s.immune.has(id) && !GOOD.has(id)) return;
  if (id === 'haste') delete t.st.slow; if (id === 'slow') delete t.st.haste;
  t.st[id] = id === 'doom' ? 3 : Math.max(t.st[id] || 0, dur);
  if (id === 'stop' || id === 'sleep') t.charging = null, (B.pending = B.pending.filter((p) => p.u !== t || p.u.jumping));
  ev(B, { t: 'status', u: t, id, on: true });
}

// ---------------------------------------------------------------- stealing, breaking, recruiting, loot
function doSteal(B, u, t, what) {
  if (what === 'gold') { const g = 20 + t.u.lv * 25; B.goldWon += g; ev(B, { t: 'gold', u: t, n: g }); return; }
  if (what === 'exp') { const n = 20 + t.u.lv; const L = (B.expLog[u.u.uid] = B.expLog[u.u.uid] || { exp: 0, jp: 0, lv: [], jlv: [] }); L.exp += n; gainExp(u.u, n); ev(B, { t: 'text', u, msg: [`偷到 ${n} 經驗值`, `Stole ${n} EXP`] }); return; }
  if (what === 'item' || t.u.mon) { const it = t.u.mon ? (MDROP[MONSTERS[t.u.mon].fam] || 'potion') : pick(['potion', 'hipotion', 'ether', 'phoenix', 'remedy'], B.rnd); B.spoils.push(it); ev(B, { t: 'steal', u: t, item: it }); return; }
  const slots = what === 'any' ? ['w', 's', 'h', 'b', 'a'].filter((k) => t.u.eq[k]) : [what];
  const slot = slots.length ? pick(slots, B.rnd) : null;
  const id = slot && t.u.eq[slot];
  if (!id || (ITEMS[id] && ITEMS[id].legend && t.named)) { ev(B, { t: 'text', u: t, msg: ['什麼都沒有偷到', 'Nothing to steal'] }); return; }
  t.u.eq[slot] = null; B.spoils.push(id); refreshStats(t); t.kit = battleKit(t.u);
  ev(B, { t: 'steal', u: t, item: id });
}
function doBreak(B, t, slot) {
  const id = t.u.eq[slot];
  if (!id || (ITEMS[id] && ITEMS[id].legend)) { ev(B, { t: 'text', u: t, msg: ['沒有效果', 'No effect'] }); return; }
  t.u.eq[slot] = null; refreshStats(t); ev(B, { t: 'break', u: t, item: id });
}
function doInvite(B, u, t) {
  if (t.boss || t.named) { ev(B, { t: 'text', u: t, msg: ['不為所動。', 'Unmoved.'] }); return; }
  t.side = 'ally'; t.ai = false; t.recruited = true; t.dropped = true; delete t.st.charm;
  B.recruits.push(t.u); ev(B, { t: 'recruit', u: t });
}
// a fallen foe may leave something behind
function dropFrom(B, t) {
  t.dropped = true;
  if (t.noDrop) return;
  const fortune = 1 + Math.max(0, ...B.units.filter((u) => u.side === 'ally' && !u.dead).map((u) => u.s.flags.gold || 0)) / 100;
  B.goldWon += r0((10 + t.u.lv * 8) * (t.boss ? 5 : 1) * fortune);
  if (t.u.mon) {
    if (B.rnd() < 0.45 || t.boss) B.spoils.push(MDROP[MONSTERS[t.u.mon].fam] || 'potion');
    if (B.rnd() < 0.18 || t.boss) { const pool = GEAR.filter((g) => !g.legend && g.tier === clamp(B.tier + (t.boss ? 1 : 0), 1, 10)); if (pool.length) B.spoils.push(pick(pool, B.rnd).id); }
    if (t.u.drops) for (const id of t.u.drops) B.spoils.push(id);
    return;
  }
  const worn = Object.values(t.u.eq).filter((id) => id && !(ITEMS[id] && ITEMS[id].legend && t.named));
  if (worn.length && (B.rnd() < 0.3 || t.boss)) B.spoils.push(pick(worn, B.rnd));
  if (t.u.drops) for (const id of t.u.drops) B.spoils.push(id);
  if (B.rnd() < 0.2) B.spoils.push(pick(['potion', 'potion', 'hipotion', 'ether', 'phoenix', 'antidote'], B.rnd));
}

// ---------------------------------------------------------------- items as actions
export function itemAction(id) {
  const c = CONSUMABLES[id];
  return { id: 'item_' + id, item: id, name: c.name, k: 'item', r: 1, a: 0, t: 'ally', mp: 0, ct: 0, h: c.h, mph: c.mph, rev: c.rev, dead: c.dead, cure: c.cure };
}
export function useItem(B, u, id, tx, ty) {
  if (!B.bag[id]) return false;
  B.bag[id]--; if (!B.bag[id]) delete B.bag[id];
  perform(B, u, itemAction(id), tx, ty);
  return true;
}

// ---------------------------------------------------------------- winning and losing
export function checkEnd(B) {
  if (B.over) return B.over;
  const mine = B.units.filter((u) => u.side === 'ally' && !u.recruited), foes = B.units.filter((u) => u.side === 'foe' && !u.recruited);
  if (!mine.some(alive)) return (B.over = 'lose');
  if (B.goal.type === 'protect') { const g = B.units.find((u) => u.u.who === B.goal.who || u.u.uid === B.goal.uid); if (g && g.dead) return (B.over = 'lose'); }
  if (B.goal.type === 'boss') { const b = B.units.find((u) => u.boss); if (b && b.dead) return (B.over = 'win'); }
  if (B.goal.type === 'survive' && B.round >= B.goal.turns) return (B.over = 'win');
  if (!foes.some((u) => alive(u) && !u.st.charm)) return (B.over = 'win');
  return null;
}

// ---------------------------------------------------------------- the enemy's mind
// how many steps (by this unit's jump and the ground) every tile is from the nearest of the goals
export function stepsTo(B, u, goals) {
  const jmp = live(u, 'jmp'), ign = u.s.flags.ign || u.s.flags.tele, dist = new Map(), q = [];
  for (const g of goals) { const k = `${g.x},${g.y}`; dist.set(k, 0); q.push([g.x, g.y]); }
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i], t = tileAt(B, x, y), d = dist.get(`${x},${y}`);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, n = tileAt(B, nx, ny), k = `${nx},${ny}`;
      if (!n || dist.has(k) || !passable(B, u, n) || (!ign && Math.abs(n.h - t.h) > jmp)) continue;
      dist.set(k, d + 1); q.push([nx, ny]);
    }
  }
  return dist;
}
// look at every place it can stand and everything it can do from there; pick the best
export function plan(B, u) {
  const moves = u.moved ? [{ x: u.x, y: u.y, path: [[u.x, u.y]] }] : [...reachable(B, u).values()];
  const acts = u.acted ? [] : [ATTACK, ...u.kit.acts].filter((a) => canUse(B, u, a) && !(u.st.berserk && !a.basic));
  const foes = foesOf(B, u), friends = friendsOf(B, u), fallen = B.units.filter((o) => o.dead && !o.gone && sideOf(o) === sideOf(u));
  const ox = u.x, oy = u.y;
  let best = { score: -1e9 };
  const taunt = u.flags.taunted && B.units.find((x) => x.id === u.flags.taunted && alive(x));
  for (const m of moves) {
    u.x = m.x; u.y = m.y;
    const here = tileAt(B, m.x, m.y);
    // where it stands: higher ground is good; for frail casters, far from the enemy is good
    let posScore = here.h * 1.5;
    const near = foes.reduce((d, f) => Math.min(d, Math.abs(f.x - m.x) + Math.abs(f.y - m.y)), 99);
    const frail = u.s.def < u.s.mag && !u.u.mon;
    posScore += frail ? Math.min(near, 4) * 2 : -near * 0.5;
    if (taunt) posScore -= (Math.abs(taunt.x - m.x) + Math.abs(taunt.y - m.y)) * 3;
    for (const a of acts) {
      const tiles = targetTiles(B, u, a);
      for (const [tx, ty] of tiles) {
        // only aim where somebody is (or near somebody, for areas)
        if (!a.a && !unitAt(B, tx, ty)) continue;
        if (a.a && a.a !== 'all' && !B.units.some((o) => !o.gone && Math.abs(o.x - tx) + Math.abs(o.y - ty) <= (a.a === 'line' ? 6 : a.a))) continue;
        const sc = scoreAction(B, u, a, tx, ty, foes, friends, fallen, taunt);
        if (sc <= 0) continue;
        const total = sc + posScore, off = victims(B, u, a, tx, ty).some((v) => sideOf(v) !== sideOf(u)) || (a.rev && true);
        if (total > best.score) best = { score: total, x: m.x, y: m.y, path: m.path, a, tx, ty, off };
        if (a.a === 'all') break;
      }
    }
  }
  u.x = ox; u.y = oy;
  // only helping itself or a friend, with no foe in reach: close the distance first (keep a self-only action, done from the new spot)
  if (best.a && !best.off && !u.moved && foes.length) {
    const field = stepsTo(B, u, taunt ? [taunt] : foes), far = (m) => field.get(`${m.x},${m.y}`) ?? 999, d0 = far(u);
    let step = null; for (const m of moves) { const d = far(m); if (d < d0 - 1 && (!step || d < step.d)) step = { ...m, d }; }
    const healer = best.a.h || best.a.rev || best.a.cure;
    if (step && !healer) return { x: step.x, y: step.y, path: step.path, a: best.a.r === 0 ? best.a : null, tx: step.x, ty: step.y };
  }
  if (best.a) return best;
  // nothing to do: walk toward the nearest foe (or the one taunting it)
  if (!foes.length || u.moved) return { x: u.x, y: u.y, path: [[u.x, u.y]] };
  const field = stepsTo(B, u, taunt ? [taunt] : foes);
  let pick2 = { x: u.x, y: u.y, path: [[u.x, u.y]], d: (field.get(`${u.x},${u.y}`) ?? 999) };
  for (const m of moves) { const d = (field.get(`${m.x},${m.y}`) ?? 999) - tileAt(B, m.x, m.y).h * 0.05; if (d < pick2.d) pick2 = { ...m, d }; }
  return pick2;
}
function scoreAction(B, u, a, tx, ty, foes, friends, fallen, taunt) {
  const hit = victims(B, u, a, tx, ty);
  if (!hit.length) return 0;
  let s = 0;
  for (const t of hit) {
    const enemy = sideOf(t) !== sideOf(u);
    if (a.rev) { if (!enemy && t.dead) s += 140; continue; }
    const c = calc(B, u, t, a);
    if (a.d && c.dmg > 0) {
      const exp = Math.min(c.dmg, t.hp) * c.hit / 100;
      const v = exp / t.s.hp * 100 + (c.dmg >= t.hp ? 60 * c.hit / 100 : 0) + (t.boss ? 10 : 0) + (t.charging ? 15 : 0);
      s += enemy ? v + (taunt === t ? 30 : 0) : -v * 1.5;
    }
    if (c.heal > 0 && !enemy) { const missing = t.s.hp - t.hp; if (missing > t.s.hp * 0.25) s += Math.min(c.heal, missing) / t.s.hp * 120; }
    if (c.heal > 0 && enemy) s -= 20;
    for (const [id, ch] of a.st || []) {
      const good = GOOD.has(id), already = t.st[id];
      if (already) continue;
      const p = statusChance(B, u, t, id, ch) / 100;
      if (good && !enemy) s += 14 * p; else if (!good && enemy) s += (id === 'doom' || id === 'stop' || id === 'charm' ? 40 : 22) * p; else if (!good && !enemy) s -= 30 * p;
    }
    for (const [k, p] of a.buf || []) { const has = t.buf.some((b) => b.k === k && (b.p > 0) === (p > 0)); if (!has) s += (p > 0) === !enemy ? 6 : -6; }
    if (a.cure && !enemy && a.cure.some((id) => t.st[id])) s += 30;
    if (a.steal && enemy) s += 12 * c.hit / 100;
    if (a.mpd && enemy && t.mp > 0) s += 8;
    if (a.invite && enemy) s += 10 * c.hit / 100;
    if (a.quick && !enemy && t !== u) s += 25;
    if (a.taunt && enemy) s += 10;
  }
  if (a.ct) s *= 0.75;
  if (a.self && a.self.hp) s -= -a.self.hp * 60 * (1 - u.hp / u.s.hp + 0.3);
  if (a.mp) s -= a.mp * 0.15;
  if (a.suicide) s -= 40;
  return s;
}
