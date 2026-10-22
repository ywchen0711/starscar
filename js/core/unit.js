// Units: the people (and the odd monster) in your company, how strong they are, what they wear and what they know.
import { JOBS, ABILITIES, jobLevel, jobOpen } from '../data/jobs.js';
import { ITEMS, GEAR } from '../data/items.js';
import { MONSTERS, MSKILLS, MREACT } from '../data/monsters.js';
import { WEAPONS } from '../data/core.js';
import { r0, pick, seeded, clamp } from '../util.js';

export const MAX_LV = 99;
const BASE = { hp: [42, 9], mp: [14, 3], atk: [7, 1.7], def: [6, 1.4], mag: [7, 1.7], res: [6, 1.4], spd: [8, 0.12] };
const ORDER = ['hp', 'mp', 'atk', 'def', 'mag', 'res', 'spd'];
let UID = 1;
export const setUid = (n) => { UID = Math.max(UID, n); };

// a fresh unit: who is a story character's id (or null for a recruit)
export function makeUnit({ who = null, name, job = 'sellsword', lv = 1, look = {}, sex = 'm', uid } = {}) {
  const u = { uid: uid || UID++, who, name, sex, job, lv, exp: 0, jp: {}, learned: [], sec: null, react: null, sup: null, move: null, eq: { w: null, s: null, h: null, b: null, a: null }, look, kills: 0 };
  if (uid) setUid(uid + 1);
  u.jp[job] = { cur: 0, total: 0 };
  return u;
}
export const jpOf = (u, job) => (u.jp[job] = u.jp[job] || { cur: 0, total: 0 });
export const jobLv = (u, job = u.job) => jobLevel((u.jp[job] && u.jp[job].total) || 0);

// ---------------------------------------------------------------- stats
const supportsOf = (u) => [u.sup && ABILITIES[u.sup], u.move && ABILITIES[u.move]].filter(Boolean);
const gearOf = (u) => Object.values(u.eq).map((id) => id && ITEMS[id]).filter(Boolean);
// the numbers a unit fights with, before statuses and buffs
export function stats(u) {
  const mon = u.mon && MONSTERS[u.mon];
  const mult = mon ? mon.st : JOBS[u.job].st;
  const s = {};
  ORDER.forEach((k, i) => { const [b, g] = BASE[k]; s[k] = (b + g * (u.lv - 1)) * mult[i] * (1 + ((u.var && u.var[i]) || 0)); });
  s.hp = r0(s.hp); s.mp = r0(s.mp); s.atk = r0(s.atk); s.def = r0(s.def); s.mag = r0(s.mag); s.res = r0(s.res); s.spd = r0(s.spd * 10) / 10;
  const j = mon || JOBS[u.job];
  s.mov = j.mov; s.jmp = j.jmp; s.eva = j.eva || 5; s.crit = 5; s.wpn = 0; s.wmag = 0; s.range = [1, 1]; s.el = null; s.wtype = null; s.two = false;
  s.resist = new Set(mon ? mon.resist : []); s.weak = new Set(mon ? mon.weak : []); s.absorb = new Set(); s.immune = new Set(); s.auto = new Set();
  s.flags = {};
  for (const g of gearOf(u)) {
    if (g.slot === 'w' || (g.slot === 's' && g.atk && !g.def)) {
      if (g.slot === 'w' || !s.wtype) { s.wpn = g.atk || 0; s.wmag = g.mag || 0; s.wtype = g.type; s.range = [...WEAPONS[g.type].range]; s.el = g.el || null; s.two = !!g.two; s.onhit = g.onhit; s.wfx = g.fx; }
      else { s.offhand = { atk: g.atk, el: g.el, type: g.type }; }
      if (g.crit) s.crit += g.crit; if (g.range) s.range[1] += g.range;
    } else { s.def += g.def || 0; }
    s.hp += g.hp || 0; s.mp += g.mp || 0; s.eva += g.eva || 0;
    for (const [k, v] of Object.entries(g.bonus || {})) s[k] += v;
    s.mov += g.mov || 0; s.jmp += g.jmp || 0;
    for (const e of g.resist || []) s.resist.add(e); for (const e of g.absorb || []) s.absorb.add(e); for (const e of g.immune || []) s.immune.add(e);
    if (g.auto) s.auto.add(g.auto);
    for (const k of ['drain', 'undying', 'dual', 'halfmp', 'steal', 'jpup', 'expup', 'ctdown', 'healpow', 'songpow', 'counter', 'invite', 'drainup']) if (g[k]) s.flags[k] = (s.flags[k] || 0) + g[k];
  }
  for (const a of supportsOf(u)) {
    const p = a.sp || a.mv;
    if (p.stat) s[p.stat] = r0(s[p.stat] * (1 + p.p / 100)); if (p.stat2) s[p.stat2] = r0(s[p.stat2] * (1 + p.p2 / 100));
    if (p.mov) s.mov += p.mov; if (p.jmp) s.jmp += p.jmp; if (p.crit) s.crit += p.crit;
    if (p.immune) for (const e of p.immune) s.immune.add(e); if (p.float) s.auto.add('float');
    if (p.range && s.range[1] > 1) s.range[1] += p.range;
    for (const k of ['dual', 'halfmp', 'steal', 'jp', 'exp', 'hit', 'ct', 'itemr', 'itempow', 'status', 'gold', 'invite', 'drain', 'healpow', 'songpow', 'lowhp', 'unarmed', 'vsbeast', 'twohand', 'tele', 'ign', 'find', 'water', 'terrain', 'hp', 'mp']) if (p[k]) s.flags[k] = (s.flags[k] || 0) + (p[k] === true ? 1 : p[k]);
    if (p.el) s.el = s.el || p.el; if (p.elpow) s.flags['el_' + p.elpow] = (s.flags['el_' + p.elpow] || 0) + p.p; if (p.wpow) { s.flags['w_' + p.wpow] = p.p; if (p.wpow2) s.flags['w_' + p.wpow2] = p.p; }
  }
  if (!s.wtype && !mon) { s.wpn = r0(s.atk * 0.25 * (1 + (s.flags.unarmed || 0) / 100)); s.wtype = 'fist'; }
  if (mon) { s.wpn = r0(s.atk * 0.35); s.wtype = 'monster'; }
  if (s.twohand && s.wtype && !s.two && !u.eq.s) s.wpn = r0(s.wpn * 1.5);
  return s;
}

// ---------------------------------------------------------------- equipment
// can this unit wear this item in this slot right now?
export function canEquip(u, item, slot = item.slot) {
  if (!item || u.mon) return false;
  const j = JOBS[u.job], st = stats(u), extra = new Set(supportsOf(u).map((a) => a.sp && a.sp.eq).filter(Boolean));
  if (item.type === 'acc') return slot === 'a';
  const ok = j.eq.includes(item.type) || extra.has(item.type);
  if (!ok) return false;
  if (slot === 's') {
    if (item.slot === 's') { const w = u.eq.w && ITEMS[u.eq.w]; return !(w && w.two); }
    // a second weapon in the off hand needs Dual Wield
    return item.slot === 'w' && !item.two && (st.flags.dual > 0) && ['sword', 'knife', 'ninjato', 'katana', 'axe', 'claw', 'hammer'].includes(item.type);
  }
  return item.slot === slot;
}
// put on an item (from the bag); returns what came off
export function equip(u, slot, id) {
  const off = []; const item = ITEMS[id];
  if (u.eq[slot]) off.push(u.eq[slot]);
  u.eq[slot] = id;
  if (slot === 'w' && item && item.two && u.eq.s) { off.push(u.eq.s); u.eq.s = null; }
  return off;
}
// after a job change: take off whatever the new job can't use, and drop abilities that no longer fit
export function fitToJob(u) {
  const off = [];
  for (const slot of ['w', 's', 'h', 'b', 'a']) { const id = u.eq[slot]; if (id && !canEquip(u, ITEMS[id], slot)) { off.push(id); u.eq[slot] = null; } }
  if (u.sec === u.job) u.sec = null;
  return off;
}
export function changeJob(u, job) { u.job = job; jpOf(u, job); return fitToJob(u); }

// ---------------------------------------------------------------- abilities
export const learnedIn = (u, job) => JOBS[job].abilities.filter((a) => u.learned.includes(a.id));
export function canLearn(u, id) { const a = ABILITIES[id]; return a && !u.learned.includes(id) && jpOf(u, a.job).cur >= a.jp; }
export function learn(u, id) { const a = ABILITIES[id]; if (!canLearn(u, id)) return false; jpOf(u, a.job).cur -= a.jp; u.learned.push(id); return true; }
// what the unit can do in battle: its own job's actions, its secondary job's actions, and set passives
export function battleKit(u) {
  if (u.mon) { const m = MONSTERS[u.mon]; return { acts: m.skills.map((s) => MSKILLS[s]), react: m.react ? MREACT[m.react] : null, sets: [] }; }
  const own = learnedIn(u, u.job).filter((a) => a.k === 'act');
  const sec = u.sec ? learnedIn(u, u.sec).filter((a) => a.k === 'act') : [];
  return { sets: [[u.job, own], ...(u.sec ? [[u.sec, sec]] : [])], acts: [...own, ...sec], react: u.react ? ABILITIES[u.react] : null };
}

// ---------------------------------------------------------------- experience and JP
export const EXP_PER_LV = 100;
export function gainExp(u, n) { const ups = []; u.exp += n; while (u.exp >= EXP_PER_LV && u.lv < MAX_LV) { u.exp -= EXP_PER_LV; u.lv++; ups.push(u.lv); } if (u.lv >= MAX_LV) u.exp = 0; return ups; }
export function gainJp(u, n, job = u.job) { const j = jpOf(u, job), before = jobLevel(j.total); j.cur += n; j.total += n; return jobLevel(j.total) > before ? jobLevel(j.total) : 0; }

// ---------------------------------------------------------------- enemy units
// a human foe: a job, a level, gear of the battle's tier, and a few abilities from the job (and maybe a second job)
export function makeFoe(job, lv, tier, rnd = Math.random, o = {}) {
  const u = makeUnit({ job, lv, name: o.name || JOBS[job].name, look: o.look || { hair: pick(HAIR, rnd), skin: pick(SKIN, rnd) }, sex: rnd() < 0.5 ? 'm' : 'f' });
  u.var = [0, 0, 0, 0, 0, 0, 0].map(() => (rnd() - 0.5) * 0.08);
  const j = JOBS[job], acts = j.abilities.filter((a) => a.k === 'act');
  // learns the abilities it can afford at this level, roughly in the order they cost
  const budget = 80 + lv * 45;
  let spent = 0; for (const a of [...acts].sort((x, y) => x.jp - y.jp)) { if (spent + a.jp > budget) break; u.learned.push(a.id); spent += a.jp; }
  const passives = j.abilities.filter((a) => a.k !== 'act' && a.jp <= budget * 0.6 && !(a.sp && a.sp.eq));
  for (const a of passives) { if (a.k === 'react' && !u.react) { u.react = a.id; u.learned.push(a.id); } else if (a.k === 'sup' && !u.sup) { u.sup = a.id; u.learned.push(a.id); } else if (a.k === 'move' && !u.move) { u.move = a.id; u.learned.push(a.id); } }
  if (lv >= 12 && o.sec !== false) {
    const secs = Object.values(JOBS).filter((x) => x.tier <= Math.min(2, j.tier + 1) && x.id !== job && !x.unique && !x.hidden && x.abilities.some((a) => a.k === 'act' && a.magic) !== !!acts.some((a) => a.magic));
    const s = pick(secs, rnd); if (s) { u.sec = s.id; for (const a of s.abilities.filter((a) => a.k === 'act' && a.jp <= lv * 15).slice(0, 3)) u.learned.push(a.id); }
  }
  dressFoe(u, tier, rnd, o.rich);
  return u;
}
// gear of the tier for each slot the job can fill; sometimes a variant (which is why stealing pays)
export function dressFoe(u, tier, rnd = Math.random, rich = 0) {
  const j = JOBS[u.job], t = clamp(tier, 1, 10);
  const choose = (slot, types) => {
    const pool = GEAR.filter((g) => !g.legend && g.slot === slot && types.includes(g.type) && g.tier <= t && g.tier >= t - 1);
    if (!pool.length) return null;
    const fancy = pool.filter((g) => g.variant), plain = pool.filter((g) => !g.variant);
    return pick(rnd() < 0.18 + rich ? (fancy.length ? fancy : plain) : (plain.length ? plain : fancy), rnd).id;
  };
  const weapons = j.eq.filter((e) => WEAPONS[e]);
  const w = weapons.length ? choose('w', [pick(weapons, rnd)]) : null;
  u.eq.w = w;
  if (j.eq.includes('shield') && !(w && ITEMS[w].two) && rnd() < 0.8) u.eq.s = choose('s', ['shield']);
  const head = ['helm', 'hat'].filter((x) => j.eq.includes(x)); if (head.length) u.eq.h = choose('h', [head[0]]);
  const body = ['heavy', 'light', 'robe'].filter((x) => j.eq.includes(x)); if (body.length) u.eq.b = choose('b', [body[0]]);
  if (rnd() < 0.35 + rich) u.eq.a = choose('a', ['acc']);
  return u;
}
export function makeMonster(id, lv, rnd = Math.random) {
  const m = MONSTERS[id];
  const u = makeUnit({ job: 'sellsword', lv, name: m.name, look: { col: m.col } });
  u.mon = id; u.var = [0, 0, 0, 0, 0, 0, 0].map(() => (rnd() - 0.5) * 0.06);
  return u;
}
export const HAIR = ['#2a1a10', '#5a3a1a', '#8a5a2a', '#c8a050', '#e8d8a0', '#a03a1a', '#3a3a4a', '#d0d0d8', '#6a2a5a', '#2a4a7a'];
export const SKIN = ['#f4d8c0', '#ecc8a8', '#d8a880', '#b07850', '#8a5a3a'];
export { jobOpen };
