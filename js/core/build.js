// Turning a battle description (from the story, a tavern job, a labyrinth floor) into real units and loot.
// Shared by the game and by the tests, so it has no screens in it.
import { JOBS } from '../data/jobs.js';
import { GEAR, consumablesFor } from '../data/items.js';
import { MONSTERS } from '../data/monsters.js';
import { CAST } from '../data/story.js';
import { makeFoe, makeMonster } from './unit.js';
import { clamp, pick } from '../util.js';
import { T } from '../i18n.js';

export const tierFor = (lv) => clamp(Math.ceil(lv / 6), 1, 10);
const nm = (u) => (typeof u.name === 'string' ? u.name : T(u.name));
// one foe from a description { k (job or monster or 'mirror'), lv, name, who, boss, noDrop, retreat, drops, eq }
export function makeOne(f, lv, tier, rnd, party = []) {
  const flv = Math.max(1, lv + (f.lv || 0));
  let u;
  if (f.k === 'mirror') {
    const src = party.length ? pick(party, rnd) : makeFoe('sellsword', flv, tier, rnd);
    u = JSON.parse(JSON.stringify(src)); u.uid = 900000 + Math.floor(rnd() * 99999); u.who = null; u.lv = Math.max(u.lv, flv);
    u.name = [`幻影・${nm(src)}`, `Phantom ${nm(src)}`]; u.look = { ...u.look, body: '#5a5a8a' };
  } else if (MONSTERS[f.k]) u = makeMonster(f.k, flv, rnd);
  else if (f.who) { const c = CAST[f.who]; u = makeFoe(f.k, flv, Math.min(10, tier + 1), rnd, { name: c.name, look: c.look, rich: 0.3 }); u.sex = c.sex; }
  else u = makeFoe(f.k, flv, tier, rnd, { name: f.name, rich: f.boss ? 0.3 : 0 });
  if (f.name && MONSTERS[f.k]) u.name = f.name;
  if (f.eq) Object.assign(u.eq, f.eq);
  if (f.drops) u.drops = [...f.drops];
  return { u, boss: !!f.boss, named: !!f.who || !!f.boss, noDrop: !!f.noDrop, retreat: f.retreat || 0 };
}
// a story character fighting beside you for one battle
export function castUnit(who, lv, tier, rnd = Math.random) {
  const c = CAST[who];
  const u = makeFoe(c.job, Math.max(lv, 2), tier, rnd, { name: c.name, look: c.look, sec: false });
  u.who = who; u.sex = c.sex;
  return u;
}
// what lies buried on a map: mostly supplies and gear of the tier, now and then a legend
export function rollTreasure(tier, rnd, legendPool = []) {
  const r = rnd();
  if (r < 0.5) return pick(consumablesFor(tier).filter((c) => c.price), rnd).id;
  if (r < 0.95 || !legendPool.length) { const pool = GEAR.filter((g) => !g.legend && g.tier >= tier && g.tier <= Math.min(10, tier + 1) && (g.variant || rnd() < 0.3)); return pick(pool, rnd).id; }
  return pick(legendPool, rnd);
}
export const isJobOrMonster = (k) => k === 'mirror' || !!JOBS[k] || !!MONSTERS[k];
