// AI against AI: run whole battles with nobody at the controls to make sure the rules never get stuck.
// node tools/sim.mjs [battles]
import { makeMap } from '../js/core/mapgen.js';
import { makeFoe, makeMonster } from '../js/core/unit.js';
import { createBattle, advance, beginTurn, plan, moveTo, perform, endTurn, alive, checkEnd } from '../js/core/battle.js';
import { seeded, pick } from '../js/util.js';
import { JOB_LIST } from '../js/data/jobs.js';
import { MONSTERS } from '../js/data/monsters.js';

export function runBattle(seed, lv, opts = {}) {
  const rnd = seeded(seed), map = makeMap({ theme: pick(['plains', 'forest', 'hills', 'town', 'castle', 'cave', 'river', 'desert'], rnd), seed, w: 12, h: 12 });
  const jobs = JOB_LIST.filter((j) => !j.unique);
  const units = [];
  map.starts.slice(0, 5).forEach(([x, y]) => units.push({ unit: makeFoe(pick(jobs, rnd).id, lv, Math.ceil(lv / 8), rnd), side: 'ally', x, y, ai: true }));
  map.foeStarts.slice(0, 5).forEach(([x, y], i) => units.push({ unit: i % 2 && opts.monsters !== false ? makeMonster(pick(Object.keys(MONSTERS).filter((k) => !MONSTERS[k].boss), rnd), lv, rnd) : makeFoe(pick(jobs, rnd).id, lv, Math.ceil(lv / 8), rnd), side: 'foe', x, y }));
  const B = createBattle({ map, units, rnd, tier: Math.ceil(lv / 8), treasure: map.treasure.map(([x, y]) => ({ x, y, item: 'potion' })) });
  let turns = 0;
  while (!B.over && turns < 400) {
    const r = advance(B);
    if (r.type !== 'turn') continue;
    const u = r.unit; turns++;
    if (!beginTurn(B, u)) { checkEnd(B); continue; }
    const p = plan(B, u);
    if (p.x !== u.x || p.y !== u.y) moveTo(B, u, p.x, p.y, p.path);
    if (p.a) perform(B, u, p.a, p.tx, p.ty);
    if (!B.over && alive(u)) endTurn(B, u, u.dir); else if (B.turn) endTurn(B, u, u.dir);
    checkEnd(B);
  }
  return { B, turns };
}
if (process.argv[1] && process.argv[1].endsWith('sim.mjs')) {
  const n = +(process.argv[2] || 20); let wins = 0, stuck = 0, total = 0;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const lv = 1 + (i * 7) % 60;
    const { B, turns } = runBattle(1000 + i, lv);
    total += turns; if (B.over === 'win') wins++; if (!B.over) stuck++;
    if (i < 6) console.log(`battle ${i} lv ${lv}: ${B.over || 'unfinished'} in ${turns} turns, ${B.events.length} events, spoils ${B.spoils.length}, gold ${B.goldWon}, treasure ${B.found.length}`);
  }
  console.log(`${n} battles: allies won ${wins}, unfinished ${stuck}, avg ${(total / n).toFixed(0)} turns, ${(Date.now() - t0)} ms`);
}
