// node tools/test.mjs — the numbers the game promises, the data hanging together, and every story battle fought by the AI on both sides.
import { JOB_LIST, JOBS, ABILITIES } from '../js/data/jobs.js';
import { ITEMS, GEAR, CONSUMABLES } from '../js/data/items.js';
import { MONSTERS, MSKILLS } from '../js/data/monsters.js';
import { STATUS, STATS, ELEMENTS, WEAPONS, ARMOURS } from '../js/data/core.js';
import { EVENTS, CAST } from '../js/data/story.js';
import { NODES, LINKS, QUESTS, LABYRINTHS } from '../js/data/world.js';
import { makeMap } from '../js/core/mapgen.js';
import { makeFoe } from '../js/core/unit.js';
import { makeOne, castUnit, tierFor } from '../js/core/build.js';
import { createBattle, advance, beginTurn, plan, moveTo, perform, endTurn, alive, checkEnd } from '../js/core/battle.js';
import { seeded, pick } from '../js/util.js';

let fails = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };

// ---------------------------------------------------------------- the promised numbers
ok('50 jobs', JOB_LIST.length === 50, JOB_LIST.length);
ok('500 abilities and spells', Object.keys(ABILITIES).length >= 500, Object.keys(ABILITIES).length);
ok('1000 pieces of equipment', GEAR.length >= 1000, GEAR.length);
ok('55 story battles', EVENTS.filter((e) => e.battle).length >= 55, EVENTS.length);
ok('4 hidden labyrinths', Object.keys(LABYRINTHS).length === 4, Object.values(LABYRINTHS).map((l) => l.floors).join('+') + ' floors');
ok('30 tavern jobs', QUESTS.length >= 30, QUESTS.length);

// ---------------------------------------------------------------- the data hangs together
const badAb = [];
for (const a of Object.values(ABILITIES)) {
  for (const [id] of a.st || []) if (!STATUS[id]) badAb.push(a.id + ':' + id);
  for (const [k] of a.buf || []) if (!STATS[k]) badAb.push(a.id + ':' + k);
  if (a.d && a.d[2] && !ELEMENTS[a.d[2]] && a.d[2] !== 'terrain') badAb.push(a.id + ':el');
  for (const id of a.cure || []) if (!STATUS[id]) badAb.push(a.id + ':cure ' + id);
  if (a.sp && a.sp.eq && !WEAPONS[a.sp.eq] && !ARMOURS[a.sp.eq]) badAb.push(a.id + ':eq');
}
ok('abilities use real statuses, stats and elements', !badAb.length, badAb.join(' '));
const kinds = new Set([...Object.keys(WEAPONS), ...Object.keys(ARMOURS)]);
ok('every job equips real kinds', JOB_LIST.every((j) => j.eq.every((k) => kinds.has(k))), JOB_LIST.filter((j) => !j.eq.every((k) => kinds.has(k))).map((j) => j.id).join(' '));
// every job can be reached from the starting five
const reach = new Set(JOB_LIST.filter((j) => j.tier === 0).map((j) => j.id));
for (let k = 0; k < 10; k++) for (const j of JOB_LIST) if (!j.unique && !j.hidden && Object.keys(j.req).every((r) => reach.has(r))) reach.add(j.id);
ok('every ordinary job can be reached', JOB_LIST.filter((j) => !j.unique && !j.hidden).every((j) => reach.has(j.id)), JOB_LIST.filter((j) => !j.unique && !j.hidden && !reach.has(j.id)).map((j) => j.id).join(' '));
ok('monster skills exist', Object.values(MONSTERS).every((m) => m.skills.every((s) => MSKILLS[s])));
const itemRefs = [...QUESTS.flatMap((q) => q.reward.items || []), ...Object.values(LABYRINTHS).flatMap((l) => l.prize.items), ...EVENTS.flatMap((e) => [...((e.give && e.give.items) || []), ...((e.battle && e.battle.foes) || []).flatMap((f) => [...(f.drops || []), ...Object.values(f.eq || {})])])];
ok('every reward is a real item', itemRefs.every((id) => ITEMS[id] || CONSUMABLES[id]), itemRefs.filter((id) => !ITEMS[id] && !CONSUMABLES[id]).join(' '));
ok('every story place and road exists', EVENTS.every((e) => NODES[e.at]) && LINKS.every(([a, b]) => NODES[a] && NODES[b]) && QUESTS.every((q) => NODES[q.at]));
ok('every field has foes that exist', Object.values(NODES).filter((n) => n.foes).every((n) => n.foes.every((k) => JOBS[k] || MONSTERS[k])));
ok('every labyrinth foe exists', Object.values(LABYRINTHS).every((l) => l.foes.every((k) => JOBS[k] || MONSTERS[k]) && Object.values(l.guardians).every((g) => MONSTERS[g.mon])));
ok('every quest foe exists', QUESTS.every((q) => q.foes.every((k) => JOBS[k] || MONSTERS[k])));
ok('every speaker has a portrait', EVENTS.every((e) => [...(e.pre || []), ...(e.post || [])].every((l) => !l[0] || Array.isArray(l[0]) || CAST[l[0]])));

// ---------------------------------------------------------------- every story battle, AI against AI
const PARTY = [
  ['sellsword', 'cleric', 'hunter', 'thief', 'apothecary'],
  ['knight', 'cleric', 'marksman', 'thief', 'monk'],
  ['knight', 'cleric', 'elementalist', 'monk', 'corsair', 'lancer'],
  ['paladin', 'sage', 'archmage', 'ninja', 'samurai'],
  ['templar', 'sage', 'archmage', 'assassin', 'swordmaster'],
  ['templar', 'sage', 'archmage', 'assassin', 'swordmaster'],
];
function fightOut(spec, partyJobs, partyLv, seed) {
  const rnd = seeded(seed), tier = tierFor(spec.lv);
  const party = partyJobs.slice(0, 5).map((j) => makeFoe(j, partyLv, Math.min(10, tier + 1), rnd));
  const foes = []; for (const f of spec.foes) for (let i = 0; i < (f.n || 1); i++) foes.push(makeOne(f, spec.lv, tier, rnd, party));
  const guests = (spec.guests || []).map((who) => castUnit(who, partyLv, tier, rnd));
  const map = makeMap({ theme: spec.theme, w: spec.w || 12, h: spec.h || 12, seed: spec.seed || seed, players: party.length + guests.length, foes: foes.length });
  const units = [], st = [...map.starts];
  for (const u of party) { const [x, y] = st.shift(); units.push({ unit: u, side: 'ally', x, y, ai: true }); }
  for (const u of guests) { const [x, y] = st.shift() || map.starts[0]; units.push({ unit: u, side: 'guest', x, y }); }
  foes.forEach((f, i) => { const [x, y] = map.foeStarts[i % map.foeStarts.length]; units.push({ unit: f.u, side: 'foe', x, y, boss: f.boss, named: f.named, noDrop: f.noDrop, retreat: f.retreat }); });
  const B = createBattle({ map, units, rnd, tier, goal: spec.goal || { type: 'rout' } });
  let turns = 0;
  while (!B.over && turns < 900) {
    const r = advance(B); if (r.type !== 'turn') continue;
    const u = r.unit; turns++;
    if (!beginTurn(B, u)) { checkEnd(B); continue; }
    const p = plan(B, u);
    if (p.x !== u.x || p.y !== u.y) moveTo(B, u, p.x, p.y, p.path);
    if (p.a && alive(u) && !B.over) perform(B, u, p.a, p.tx, p.ty);
    if (B.turn === u) endTurn(B, u, u.dir);
    checkEnd(B);
  }
  return { B, turns };
}
let wins = 0, total = 0, stuck = 0, errs = 0, slow = [];
const t0 = Date.now();
for (const e of EVENTS) {
  if (!e.battle) continue;
  const lv = e.battle.lv, partyLv = lv + 2;
  let w = 0;
  for (let k = 0; k < 3; k++) {
    try { const { B, turns } = fightOut(e.battle, PARTY[e.ch], partyLv, 77 + k * 1000 + lv); total++; if (B.over === 'win') { wins++; w++; } if (!B.over) stuck++; if (turns > 300) slow.push(e.id); }
    catch (err) { errs++; console.log('ERROR in', e.id, err.stack.split('\n').slice(0, 3).join(' | ')); }
  }
  if (w === 0) console.log(`  note: ${e.id} (${e.name[1]}) lost all 3 AI-vs-AI runs at party Lv ${partyLv}`);
}
ok('every story battle runs without errors', errs === 0, `${errs} errors`);
ok('every story battle ends', stuck === 0, `${stuck} unfinished`);
console.log(`     AI-vs-AI story battles: allies won ${wins}/${total} (${Math.round(wins / total * 100)}%) in ${Date.now() - t0} ms${slow.length ? ', long: ' + slow.join(' ') : ''}`);
// a few labyrinth floors and tavern jobs
let lerr = 0;
for (const [id, L] of Object.entries(LABYRINTHS)) for (const floor of [1, Math.ceil(L.floors / 2), L.floors]) {
  const lv = Math.round(L.lv + (floor - 1) * L.step), rnd = seeded(floor), foes = L.mirror ? [{ k: 'mirror' }, { k: 'mirror' }, { k: 'mirror' }] : [0, 1, 2, 3, 4].map(() => ({ k: pick(L.foes, rnd) }));
  const g = L.guardians[floor]; if (g) foes.push({ k: g.mon, boss: true, lv: 2 });
  try { const { B } = fightOut({ theme: L.themes[floor % L.themes.length], lv, foes, goal: g ? { type: 'boss' } : { type: 'rout' } }, PARTY[5], lv + 3, floor); if (!B.over) lerr++; } catch (err) { lerr++; console.log('ERROR in', id, floor, err.message); }
}
ok('labyrinth floors (first, middle, last) run', lerr === 0, `${lerr} problems`);
let qerr = 0;
for (const q of QUESTS.filter((_, i) => i % 3 === 0)) { try { const { B } = fightOut({ theme: q.theme, lv: q.lv, foes: q.foes.map((k) => ({ k })) }, PARTY[Math.min(5, q.ch + 1)], q.lv + 2, 5); if (!B.over) { qerr++; console.log('  unfinished quest', q.id, B.units.filter(alive).map((u) => u.side + ':' + (u.u.mon || u.u.job)).join(' ')); } } catch (err) { qerr++; console.log('ERROR in', q.id, err.message); } }
ok('tavern jobs run', qerr === 0, `${qerr} problems`);
// everyone stopped at once (Time Stop on the whole field) must not freeze time
{
  const rnd = seeded(9), map = makeMap({ theme: 'plains', seed: 9 }), units = [];
  map.starts.slice(0, 3).forEach(([x, y]) => units.push({ unit: makeFoe('knight', 10, 2, rnd), side: 'ally', x, y, ai: true }));
  map.foeStarts.slice(0, 3).forEach(([x, y]) => units.push({ unit: makeFoe('knight', 10, 2, rnd), side: 'foe', x, y }));
  const B = createBattle({ map, units, rnd, tier: 2 });
  for (const u of B.units) u.st.stop = 3;
  let threw = null, turns = 0;
  try { while (!B.over && turns < 900) { const r = advance(B); if (r.type !== 'turn') continue; const u = r.unit; turns++; if (!beginTurn(B, u)) { checkEnd(B); continue; } const p = plan(B, u); if (p.x !== u.x || p.y !== u.y) moveTo(B, u, p.x, p.y, p.path); if (p.a && alive(u) && !B.over) perform(B, u, p.a, p.tx, p.ty); if (B.turn === u) endTurn(B, u, u.dir); checkEnd(B); } } catch (e) { threw = e.message; }
  ok('Stop on everyone wears off and the battle goes on', !threw && !!B.over, threw || `${B.over} in ${turns} turns`);
}
// auto-battle orders: a thief told to steal goes for the enemy's gear
{
  const kinds = {};
  const count = (mode) => {
    let steals = 0;
    for (let k = 0; k < 4; k++) {
      const rnd = seeded(300 + k), map = makeMap({ theme: 'plains', seed: 300 + k }), units = [];
      const thief = makeFoe('thief', 12, 3, rnd); thief.learned.push('stealgold', 'stealhead', 'stealbody', 'stealweapon', 'stealacc'); thief.tactic = { mode };
      [thief, makeFoe('knight', 12, 3, rnd), makeFoe('cleric', 12, 3, rnd)].forEach((u, i) => units.push({ unit: u, side: 'ally', x: map.starts[i][0], y: map.starts[i][1], ai: true }));
      map.foeStarts.slice(0, 3).forEach(([x, y]) => units.push({ unit: makeFoe('knight', 10, 3, rnd), side: 'foe', x, y }));
      const B = createBattle({ map, units, rnd, tier: 3 });
      for (let turns = 0; !B.over && turns < 400;) { const r = advance(B); if (r.type !== 'turn') continue; const u = r.unit; turns++; if (!beginTurn(B, u)) { checkEnd(B); continue; } const p = plan(B, u); if (p.x !== u.x || p.y !== u.y) moveTo(B, u, p.x, p.y, p.path); if (p.a && alive(u) && !B.over) { if (u.u === thief && p.a.steal) { steals++; kinds[p.a.steal] = (kinds[p.a.steal] || 0) + 1; if (p.a.steal === "gold") { const tt = B.units.find((o) => o.x === p.tx && o.y === p.ty && !o.gone); if (tt && Object.values(tt.u.eq).some(Boolean)) kinds.goldWhileGear = (kinds.goldWhileGear || 0) + 1; } } perform(B, u, p.a, p.tx, p.ty); } if (B.turn === u) endTurn(B, u, u.dir); checkEnd(B); }
    }
    return steals;
  };
  const withOrders = count('steal'), without = count('balance');
  ok('a thief ordered to steal tries to steal', withOrders >= 6 && withOrders > without, `${withOrders} steal attempts with orders, ${without} without`);
  // and it weighs what it would take: gear first, coin only when nothing better is left
  const gear = ['w', 's', 'h', 'b', 'a'].reduce((n, k) => n + (kinds[k] || 0), 0);
  ok('a thief goes for valuable gear, not just gold', gear > (kinds.gold || 0), JSON.stringify(kinds));
}
console.log(fails ? `test: ${fails} FAILED` : 'test: all passed');
process.exit(fails ? 1 : 0);
