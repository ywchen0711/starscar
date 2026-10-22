// Your company: stats, equipment, jobs and abilities for each member, and choosing who fights.
import { T, EN } from '../i18n.js';
import { el, clear, $ui, modal, toast, pushKeys, bar, sheet } from './dom.js';
import { portrait } from './sprites.js';
import { JOBS, JOB_LIST, ABILITIES, describe, jobLevel, JOB_LV, KIND_NAME } from '../data/jobs.js';
import { ITEMS, CONSUMABLES } from '../data/items.js';
import { STATS, SLOTS, ELEMENTS, STATUS } from '../data/core.js';
import { stats, canEquip, equip, changeJob, jpOf, jobLv, canLearn, learn, jobOpen, learnedIn } from '../core/unit.js';
import { S, bagAdd, bagTake, save } from '../state.js';
import { sfx } from '../audio.js';

export const uname = (u) => (u.who === 'ren' ? S.name : typeof u.name === 'string' ? u.name : T(u.name));
const pcanvas = (u, n = 36) => { const c = el('canvas', { width: n, height: n }); c.getContext('2d').drawImage(portrait(u, n), 0, 0); return c; };
export const itemLabel = (id) => (ITEMS[id] ? T(ITEMS[id].name) : CONSUMABLES[id] ? T(CONSUMABLES[id].name) : id);
// a short line about a piece of gear
export function gearLine(it) {
  const p = [];
  if (it.atk) p.push(`${T('攻', 'ATK')}${it.atk}`); if (it.mag) p.push(`${T('魔', 'MAG')}${it.mag}`); if (it.def) p.push(`${T('防', 'DEF')}${it.def}`);
  if (it.hp) p.push(`HP+${it.hp}`); if (it.mp) p.push(`MP+${it.mp}`); if (it.eva) p.push(`${T('迴避', 'EVA')}+${it.eva}`);
  for (const [k, v] of Object.entries(it.bonus || {})) p.push(`${T(...STATS[k])}+${v}`);
  if (it.mov) p.push(`${T('移動', 'Move')}+${it.mov}`); if (it.jmp) p.push(`${T('跳躍', 'Jump')}+${it.jmp}`);
  if (it.el) p.push(T(...ELEMENTS[it.el].slice(0, 2))); if (it.auto) p.push(T('自動', 'Auto-') + T(STATUS[it.auto].name));
  if (it.resist) p.push(T('抗', 'Resist ') + it.resist.map((e) => T(...ELEMENTS[e].slice(0, 2))).join('')); if (it.absorb) p.push(T('吸收', 'Absorb ') + it.absorb.map((e) => T(...ELEMENTS[e].slice(0, 2))).join(''));
  if (it.immune) p.push(T('免疫', 'Immune') + `×${it.immune.length}`); if (it.onhit) p.push(`${T(STATUS[it.onhit[0]].name)}${it.onhit[1]}%`);
  if (it.crit) p.push(`${T('會心', 'Crit')}+${it.crit}`); if (it.fx === 'drain' || it.drain) p.push(T('吸血', 'Drain'));
  if (it.jpup) p.push(`JP+${it.jpup}%`); if (it.expup) p.push(`EXP+${it.expup}%`); if (it.dual) p.push(T('二刀流', 'Dual wield')); if (it.halfmp) p.push(T('MP減半', 'Half MP'));
  if (it.undying) p.push(T('不死', 'Undying')); if (it.steal) p.push(`${T('偷竊', 'Steal')}+${it.steal}`); if (it.range) p.push(`${T('射程', 'Range')}+${it.range}`);
  return p.join(' ');
}

// ---------------------------------------------------------------- the party screen
export function partyScreen(onBack, start = 0) {
  let sel = Math.min(start, S.roster.length - 1), tab = 'status';
  const ui = clear(), scr = el('div', { class: 'screen', style: { background: 'radial-gradient(ellipse at 30% 0%, #23264a, #0c0d18 70%)' } });
  const top = el('div', { class: 'topbar' }, el('span', { class: 'title' }, T('隊伍', 'Company')), el('span', { class: 'sp' }), el('span', { class: 'gold' }, `${S.gold} G`), el('button', { class: 'btn', onclick: () => { off(); save(); onBack(); } }, T('返回', 'Back')));
  const left = el('div', { class: 'panel scroll', style: { width: 'min(280px, 100%)' } }), right = el('div', { class: 'panel scroll', style: { flex: 1, minWidth: 0 } });
  scr.append(top, el('div', { class: 'cols' }, left, right)); ui.append(scr);
  const off = pushKeys((k) => { if (k === 'back') { off(); save(); onBack(); } else if (k === 'up') { sel = (sel - 1 + S.roster.length) % S.roster.length; draw(); } else if (k === 'down') { sel = (sel + 1) % S.roster.length; draw(); } });
  function draw() {
    clear(left).append(el('div', { class: 'title small', style: { marginBottom: '6px' } }, T(`成員 ${S.roster.length}/20`, `Members ${S.roster.length}/20`)),
      el('div', { class: 'list' }, S.roster.map((u, i) => el('div', { class: 'item' + (i === sel ? ' sel' : ''), onclick: () => { sel = i; draw(); } }, pcanvas(u), el('div', { class: 'grow' }, el('div', { class: 'nm' }, uname(u)), el('div', { class: 'small dim' }, `${u.mon ? '' : T(JOBS[u.job].name)} Lv ${u.lv}`))))));
    const u = S.roster[sel];
    const tabs = el('div', { class: 'tabs' }, [['status', T('狀態', 'Status')], ['equip', T('裝備', 'Equipment')], ['job', T('職業', 'Job')], ['skill', T('技能', 'Abilities')]].map(([k, l]) => el('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; draw(); } }, l)));
    clear(right).append(el('div', { class: 'row', style: { marginBottom: '8px' } }, pcanvas(u, 56), el('div', {}, el('div', { class: 'title', style: { fontSize: '20px' } }, uname(u)), el('div', { class: 'small dim' }, `${u.mon ? '' : T(JOBS[u.job].name) + ' · '}Lv ${u.lv} · EXP ${u.exp}/100${u.mon ? '' : ` · ${T('職業等級', 'Job Lv')} ${jobLv(u)} · JP ${jpOf(u, u.job).cur}`}`))), u.mon ? null : tabs);
    if (tab === 'status' || u.mon) right.append(statusTab(u)); else if (tab === 'equip') right.append(equipTab(u, draw)); else if (tab === 'job') right.append(jobTab(u, draw)); else right.append(skillTab(u, draw));
    if (!u.who && S.roster.length > 1) right.append(el('div', { style: { marginTop: '16px' } }, el('button', { class: 'btn', onclick: async () => { if (await modal(el('div', {}, T(`要讓 ${uname(u)} 離開隊伍嗎？裝備會放回背包。`, `Let ${uname(u)} leave? Their gear returns to the bag.`)), [T('離開', 'Dismiss'), T('取消', 'Cancel')]) === 0) { for (const id of Object.values(u.eq)) if (id) bagAdd(id); S.roster.splice(sel, 1); sel = 0; draw(); } } }, T('解雇', 'Dismiss'))));
  }
  draw();
}
function statusTab(u) {
  const s = stats(u), rows = ['hp', 'mp', 'atk', 'def', 'mag', 'res', 'spd', 'mov', 'jmp', 'eva'];
  const box = el('div', {}, el('div', { class: 'statgrid', style: { gridTemplateColumns: 'repeat(5, 1fr)', fontSize: '14px' } }, rows.map((k) => el('div', {}, el('b', {}, T(...STATS[k])), k === 'atk' && s.wpn ? `${s[k]}+${s.wpn}` : k === 'eva' ? `${s[k]}%` : s[k]))));
  if (u.mon) return box;
  const jobs = JOB_LIST.filter((j) => u.jp[j.id] && u.jp[j.id].total > 0);
  box.append(el('div', { class: 'title small', style: { marginTop: '12px' } }, T('職業等級', 'Job levels')), el('div', { class: 'row small' }, jobs.map((j) => el('span', { class: 'tag' }, `${T(j.name)} Lv${jobLevel(u.jp[j.id].total)} · ${u.jp[j.id].cur}JP`))));
  const set = [['sec', T('第二技能', 'Secondary')], ['react', T('反應', 'Reaction')], ['sup', T('輔助', 'Support')], ['move', T('移動', 'Movement')]];
  box.append(el('div', { class: 'title small', style: { marginTop: '12px' } }, T('設定中的能力', 'Set abilities')), el('div', { class: 'small' }, set.map(([k, l]) => el('div', {}, `${l}：`, u[k] ? (k === 'sec' ? T(...JOBS[u[k]].skill) : T(ABILITIES[u[k]].name)) : '—'))));
  box.append(el('div', { class: 'small dim', style: { marginTop: '10px' } }, T(`擊倒數 ${u.kills || 0}`, `Foes felled: ${u.kills || 0}`)));
  return box;
}
function equipTab(u, redraw) {
  const box = el('div', {}), s0 = stats(u);
  const slotRow = (slot) => {
    const id = u.eq[slot], it = id && ITEMS[id];
    return el('div', { class: 'item', onclick: () => pickGear(u, slot, redraw) }, el('span', { class: 'tag', style: { minWidth: '52px', textAlign: 'center' } }, T(...SLOTS[slot])), el('div', { class: 'grow' }, el('div', { class: 'nm' }, it ? T(it.name) : '—'), it ? el('div', { class: 'small dim' }, gearLine(it)) : null));
  };
  box.append(el('div', { class: 'list' }, ['w', 's', 'h', 'b', 'a'].map(slotRow)));
  box.append(el('div', { class: 'row', style: { marginTop: '10px' } }, el('button', { class: 'btn', onclick: () => { optimise(u); redraw(); toast(T('已換上最強的裝備', 'Best gear equipped')); } }, T('最佳化', 'Optimise')), el('button', { class: 'btn', onclick: () => { for (const k of ['w', 's', 'h', 'b', 'a']) if (u.eq[k]) { bagAdd(u.eq[k]); u.eq[k] = null; } redraw(); } }, T('全部卸下', 'Remove all'))));
  box.append(el('div', { class: 'small dim', style: { marginTop: '8px' } }, `${T('攻擊', 'ATK')} ${s0.atk}+${s0.wpn} · ${T('防禦', 'DEF')} ${s0.def} · ${T('魔力', 'MAG')} ${s0.mag} · ${T('魔防', 'RES')} ${s0.res} · ${T('速度', 'SPD')} ${s0.spd} · ${T('迴避', 'EVA')} ${s0.eva}%`));
  return box;
}
const score = (s) => s.atk + s.wpn * 1.3 + s.def + s.mag + (s.wmag || 0) + s.res + s.hp / 5 + s.spd * 6 + s.eva / 2;
function optimise(u) {
  for (const slot of ['w', 's', 'h', 'b', 'a']) {
    let best = u.eq[slot], bestS = score(stats(u));
    for (const id of Object.keys(S.bag)) {
      const it = ITEMS[id]; if (!it || !canEquip(u, it, slot)) continue;
      const keep = { ...u.eq }; u.eq[slot] = id; if (slot === 'w' && it.two) u.eq.s = null;
      const sc = score(stats(u)); u.eq = keep;
      if (sc > bestS + 0.5) { best = id; bestS = sc; }
    }
    if (best && best !== u.eq[slot]) { bagTake(best); for (const offId of equip(u, slot, best)) bagAdd(offId); }
  }
}
function pickGear(u, slot, redraw) {
  const s0 = stats(u), opts = Object.keys(S.bag).filter((id) => ITEMS[id] && canEquip(u, ITEMS[id], slot)).sort((a, b) => (ITEMS[b].tier || 0) - (ITEMS[a].tier || 0));
  const diff = (id) => {
    const keep = { ...u.eq }; u.eq[slot] = id; if (id && slot === 'w' && ITEMS[id].two) u.eq.s = null; const s1 = stats(u); u.eq = keep;
    return [['atk', s1.atk + s1.wpn - s0.atk - s0.wpn], ['def', s1.def - s0.def], ['mag', s1.mag + (s1.wmag || 0) - s0.mag - (s0.wmag || 0)], ['res', s1.res - s0.res], ['spd', +(s1.spd - s0.spd).toFixed(1)], ['hp', s1.hp - s0.hp]].filter(([, v]) => v);
  };
  const choose = (id) => {
    close();
    if (id) { bagTake(id); for (const offId of equip(u, slot, id)) bagAdd(offId); sfx('ok'); } else if (u.eq[slot]) { bagAdd(u.eq[slot]); u.eq[slot] = null; }
    redraw();
  };
  const list = el('div', { class: 'list scroll', style: { maxHeight: '60vh' } });
  const row = (id) => el('div', { class: 'item', onclick: () => choose(id) }, el('div', { class: 'grow' }, el('div', { class: 'nm' }, id ? `${itemLabel(id)} ×${S.bag[id]}` : T('（卸下）', '(remove)')), id ? el('div', { class: 'small dim' }, gearLine(ITEMS[id])) : null),
    el('div', { class: 'small' }, diff(id).map(([k, v]) => el('span', { class: 'diff ' + (v > 0 ? 'up' : 'down'), style: { marginLeft: '6px' } }, `${T(...STATS[k])}${v > 0 ? '+' : ''}${v}`))));
  if (u.eq[slot]) list.append(row(null));
  for (const id of opts) list.append(row(id));
  if (!opts.length) list.append(el('div', { class: 'dim small' }, T('背包裡沒有可以裝備的東西。', 'Nothing in the bag fits.')));
  const close = sheet(el('div', {}, el('div', { class: 'row' }, el('div', { class: 'title', style: { flex: 1 } }, `${T(...SLOTS[slot])}：${uname(u)}`), el('button', { class: 'btn', onclick: () => close() }, T('取消', 'Cancel'))), list));
}
function jobTab(u, redraw) {
  const grid = el('div', { class: 'jobgrid' });
  for (const j of JOB_LIST) {
    if ((j.unique && j.unique !== u.who) || ((j.hidden || j.unique) && !jobOpen(u, j.id, S.flags) && !S.flags['seen_' + j.id])) continue;
    const open = jobOpen(u, j.id, S.flags), lv = u.jp[j.id] ? jobLevel(u.jp[j.id].total) : 0;
    const req = Object.entries(j.req).map(([k, l]) => `${T(JOBS[k].name)}${l}`).join(' ');
    grid.append(el('button', { class: (j.id === u.job ? 'cur ' : '') + (open ? 'on' : ''), disabled: !open || j.id === u.job || null, title: T(j.desc), onclick: () => doChange(j) },
      el('div', { class: 'nm' }, T(j.name)), open ? el('div', { class: 'lv' }, lv ? `Lv ${lv}` : 'NEW') : el('div', { class: 'small dim' }, j.hidden ? '???' : req)));
  }
  async function doChange(j) {
    const r = await modal(el('div', {}, el('div', { class: 'title' }, T(j.name)), el('div', { style: { margin: '6px 0' } }, T(j.desc)), el('div', { class: 'small dim' }, T('可裝備：', 'Equips: ') + j.eq.join(', '))), [T('轉職', 'Change job'), T('取消', 'Cancel')]);
    if (r !== 0) return;
    for (const id of changeJob(u, j.id)) bagAdd(id);
    sfx('levelup'); redraw();
  }
  return el('div', {}, el('div', { class: 'small dim', style: { marginBottom: '8px' } }, T('職業等級靠在該職業下戰鬥獲得的 JP 提升。達到條件就能轉職成新的職業。', 'Job levels rise with the JP earned in that job. Meet the levels shown to open a new job.')), grid);
}
function skillTab(u, redraw) {
  let jobSel = u._skillJob && u.jp[u._skillJob] ? u._skillJob : u.job;
  const box = el('div', {});
  const jobs = JOB_LIST.filter((j) => (u.jp[j.id] && (u.jp[j.id].total > 0 || j.id === u.job)) || learnedIn(u, j.id).length);
  box.append(el('div', { class: 'tabs' }, jobs.map((j) => el('button', { class: j.id === jobSel ? 'on' : '', onclick: () => { u._skillJob = j.id; redraw(); } }, `${T(j.name)} ${jpOf(u, j.id).cur}JP`))));
  const j = JOBS[jobSel];
  box.append(el('div', { class: 'list' }, j.abilities.map((a) => {
    const have = u.learned.includes(a.id), can = canLearn(u, a.id);
    return el('div', { class: 'item' + (have ? '' : can ? '' : ' off') }, el('span', { class: 'tag' }, T(...KIND_NAME[a.k])), el('div', { class: 'grow' }, el('div', { class: 'nm' }, T(a.name)), el('div', { class: 'small dim' }, describe(a).join(' · '))),
      have ? el('span', { class: 'small', style: { color: '#7adf8a' } }, T('已習得', 'Learned')) : el('button', { class: 'btn', disabled: !can || null, onclick: () => { learn(u, a.id); sfx('levelup'); redraw(); } }, `${a.jp} JP`));
  })));
  // what is set
  const pick = (kind, cur, label, setter) => {
    const opts = u.learned.map((id) => ABILITIES[id]).filter((a) => a && a.k === kind);
    const s = el('select', { class: 'btn', onchange: (e) => { setter(e.target.value || null); redraw(); } }, el('option', { value: '' }, '—'), opts.map((a) => el('option', { value: a.id, selected: a.id === cur || null }, T(a.name))));
    return el('label', { class: 'row small' }, el('span', { style: { minWidth: '70px' } }, label), s);
  };
  const secOpts = JOB_LIST.filter((x) => x.id !== u.job && learnedIn(u, x.id).some((a) => a.k === 'act'));
  const secSel = el('select', { class: 'btn', onchange: (e) => { u.sec = e.target.value || null; redraw(); } }, el('option', { value: '' }, '—'), secOpts.map((x) => el('option', { value: x.id, selected: x.id === u.sec || null }, T(...x.skill))));
  box.append(el('div', { class: 'title small', style: { marginTop: '12px' } }, T('設定', 'Set')), el('div', { class: 'list', style: { gap: '6px' } },
    el('label', { class: 'row small' }, el('span', { style: { minWidth: '70px' } }, T('第二技能', 'Secondary')), secSel),
    pick('react', u.react, T('反應', 'Reaction'), (v) => { u.react = v; }), pick('sup', u.sup, T('輔助', 'Support'), (v) => { u.sup = v; for (const id of Object.values(u.eq)) void id; }), pick('move', u.move, T('移動', 'Movement'), (v) => { u.move = v; })));
  return box;
}

// ---------------------------------------------------------------- who goes into battle
export function formation(max, required = [], note) {
  return new Promise((resolve) => {
    const chosen = new Set(S.roster.filter((u) => required.includes(u.who)).map((u) => u.uid));
    for (const u of S.roster) { if (chosen.size >= Math.min(max, S.roster.length)) break; chosen.add(u.uid); }
    const list = el('div', { class: 'list scroll', style: { maxHeight: '55vh' } });
    const count = el('span', { class: 'gold' });
    const draw = () => {
      clear(list).append(...S.roster.map((u) => {
        const on = chosen.has(u.uid), req = required.includes(u.who);
        return el('div', { class: 'item' + (on ? ' sel' : ''), onclick: () => { if (req) return; if (on) chosen.delete(u.uid); else if (chosen.size < max) chosen.add(u.uid); draw(); } }, pcanvas(u), el('div', { class: 'grow' }, el('div', { class: 'nm' }, uname(u) + (req ? T('（必須）', ' (required)') : '')), el('div', { class: 'small dim' }, `${u.mon ? '' : T(JOBS[u.job].name)} Lv ${u.lv}`)), on ? '✔' : '');
      }));
      count.textContent = `${chosen.size}/${max}`;
    };
    draw();
    const go = () => { close(); resolve(chosen.size ? S.roster.filter((u) => chosen.has(u.uid)) : null); };
    const content = el('div', {}, el('div', { class: 'row' }, el('div', { class: 'title' }, T('出擊隊伍', 'Deployment')), el('span', { style: { flex: 1 } }), count), note ? el('div', { class: 'small dim' }, note) : null, list,
      el('div', { class: 'row', style: { marginTop: '10px', justifyContent: 'flex-end' } },
        el('button', { class: 'btn', onclick: () => { close(); partyScreen(() => resolve('again')); } }, T('整理隊伍', 'Manage company')),
        el('button', { class: 'btn', onclick: () => { close(); resolve(null); } }, T('返回', 'Back')),
        el('button', { class: 'btn primary', onclick: go }, T('出擊！', 'Deploy!'))));
    const close = sheet(content, { onBack: () => resolve(null), outside: false });
  });
}
