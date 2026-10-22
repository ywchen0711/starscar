// The battle screen: drives the rules in core/battle.js, plays every event back on the map,
// and gives the player menus for moving, acting and facing.
import { T, EN } from '../i18n.js';
import { el, clear, $ui, menu, pushKeys, bar, wait } from './dom.js';
import { IsoView, elColour } from './iso.js';
import { portrait } from './sprites.js';
import { JOBS, ABILITIES, describe } from '../data/jobs.js';
import { ITEMS, CONSUMABLES } from '../data/items.js';
import { STATUS, STATS } from '../data/core.js';
import { MONSTERS } from '../data/monsters.js';
import { createBattle, advance, beginTurn, endTurn, reachable, moveTo, targetTiles, areaOf, victims, calc, statusChance, perform, plan, canUse, mpCost, forecast, alive, sideOf, ATTACK, itemAction, useItem, checkEnd, live, tileAt, unitAt } from '../core/battle.js';
import { jobLv } from '../core/unit.js';
import { sfx, music } from '../audio.js';

const nameOf = (u) => (typeof u.u.name === 'string' ? u.u.name : T(u.u.name));
let FAST = false;
const W = (ms) => wait(FAST ? ms * 0.35 : ms);

export async function runBattle(spec) {
  const cv = document.getElementById('view'), ui = clear();
  const view = new IsoView(cv);
  const resize = () => { const r = devicePixelRatio || 1; cv.width = innerWidth * Math.min(r, 2); cv.height = innerHeight * Math.min(r, 2); if (view.map) view.fit(); };
  addEventListener('resize', resize); resize();
  const B = createBattle(spec);
  view.setMap(B.map); view.units = B.units; view.treasure = B.treasure;
  view.showLoot = B.units.some((u) => u.side === 'ally' && u.s.flags.find);
  // the frame loop
  let alive2 = true, last = performance.now();
  const frame = (t) => { if (!alive2) return; view.draw(Math.min(0.05, (t - last) / 1000)); last = t; requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  // HUD
  const hud = {
    goal: el('div', { class: 'panel goal' }, goalText(spec.goal)),
    turns: el('div', { class: 'panel turnlist' }),
    card: el('div', { class: 'panel unitcard', style: { display: 'none' } }),
    hover: el('div', { class: 'panel unitcard right', style: { display: 'none' } }),
    cmd: el('div', { class: 'cmd' }),
    help: el('div', { class: 'helpline' }, T('點地圖選擇 · Q/E 旋轉視角 · Z/Enter 確定 · X/Esc 取消', 'Tap the map · Q/E rotate · Z/Enter confirm · X/Esc back')),
  };
  const cam = el('div', { class: 'cambtns' },
    el('button', { class: 'btn', title: 'Q', onclick: () => view.rotate(-1) }, '⟲'), el('button', { class: 'btn', title: 'E', onclick: () => view.rotate(1) }, '⟳'),
    el('button', { class: 'btn', onclick: () => { view.zoomK = (view.zoomK || 1) >= 1.4 ? 0.8 : (view.zoomK || 1) + 0.3; view.fit(); } }, '🔍'),
    el('button', { class: 'btn', onclick: (e) => { FAST = !FAST; e.target.textContent = FAST ? '▶▶' : '▶'; } }, FAST ? '▶▶' : '▶'));
  ui.append(hud.goal, hud.turns, hud.card, hud.hover, hud.cmd, cam, hud.help);
  const refreshTurns = () => { clear(hud.turns).append(el('div', { class: 'title small' }, T('行動順序', 'Turn order')), ...forecast(B, 9).map((u) => el('div', { class: 't' }, el('i', { style: { background: u.side === 'foe' ? '#ff6a5a' : u.side === 'guest' ? '#7adf8a' : '#6aa0ff' } }), nameOf(u)))); };
  // pointer: hover shows a unit's card; clicks go to whoever is listening
  let onTile = null, hoverTile = null;
  const pt = (e) => { const r = cv.getBoundingClientRect(); return view.pick((e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height); };
  const move = (e) => { const t = pt(e); hoverTile = t; if (onHover) onHover(t); else view.cursor = t; showHover(t); };
  let onHover = null;
  cv.addEventListener('mousemove', move);
  cv.addEventListener('click', (e) => { const t = pt(e); if (t && onTile) onTile(t); else if (t) showHover(t); });
  const showHover = (t) => { const u = t && unitAt(B, t[0], t[1]); if (u && u !== B.turn) { hud.hover.style.display = ''; fillCard(hud.hover, u); } else hud.hover.style.display = 'none'; };
  const offKeys = pushKeys((k) => { if (k === 'rotl') view.rotate(-1); else if (k === 'rotr') view.rotate(1); else if (keyTarget) keyTarget(k); });
  let keyTarget = null;

  // ---------------------------------------------------------------- playing events back
  let ev0 = 0;
  async function play() {
    while (ev0 < B.events.length) {
      const e = B.events[ev0++], u = e.u;
      switch (e.t) {
        case 'move': {
          const an = { pose: 'walk0' }; view.anim.set(u.id, an);
          if (e.path.length === 2 && Math.abs(e.path[0][0] - e.path[1][0]) + Math.abs(e.path[0][1] - e.path[1][1]) > 1) { await W(200); view.anim.delete(u.id); break; }
          for (let i = 1; i < e.path.length; i++) {
            const [px, py] = e.path[i - 1], [nx, ny] = e.path[i], ft = tileAt(B, px, py), nt = tileAt(B, nx, ny);
            const realX = u.x, realY = u.y; u.x = nx; u.y = ny;
            an.from = [px, py, ft.h]; an.hop = Math.abs(nt.h - ft.h) > 0 ? 2 : 0; an.dir = dirOf(px, py, nx, ny);
            for (let k = 0; k <= 1; k += 0.25) { an.k = k; an.pose = k < 0.5 ? 'walk0' : 'walk1'; await W(30); }
            if (i === e.path.length - 1) { u.x = realX; u.y = realY; }
          }
          view.anim.delete(u.id); break;
        }
        case 'act': {
          const a = e.a;
          view.anim.set(u.id, { pose: 'act' });
          if (!a.basic) banner(T(a.name), a.k === 'item' ? '#7adf8a' : a.magic ? '#c8a0ff' : '#ffe9a8');
          sfx(a.magic ? 'magic' : a.basic ? 'hit' : 'skill');
          const tiles = a.a === 'all' ? [] : areaOf(B, u, a, e.tx, e.ty);
          const col = elColour(a.d && a.d[2]) || '#ffffff';
          if (a.a === 'all') for (const v of B.units.filter(alive)) view.ring(v.x, v.y, col, 0.6); else for (const [x, y] of tiles) view.ring(x, y, a.h ? '#7adf8a' : col, a.a ? 1 : 0.7);
          await W(a.basic ? 220 : 520); view.anim.delete(u.id); break;
        }
        case 'dmg': view.pop(u, String(e.n), e.el ? elColour(e.el) : '#ffffff', e.n >= 100); view.anim.set(u.id, { pose: 'hurt', flash: 1 }); sfx('hurt'); await W(260); view.anim.delete(u.id); break;
        case 'heal': if (e.n) { view.pop(u, '+' + e.n, '#7adf8a'); await W(220); } break;
        case 'mp': if (e.n) { view.pop(u, (e.n > 0 ? '+' : '') + e.n + ' MP', '#7ab0ff'); await W(200); } break;
        case 'miss': view.pop(u, 'MISS', '#c0c0c0'); await W(260); break;
        case 'crit': view.pop(u, T('會心！', 'Critical!'), '#ffd040', true); await W(160); break;
        case 'status': if (e.on) { view.pop(u, T(STATUS[e.id].name), STATUS[e.id].col); await W(260); } break;
        case 'buff': view.pop(u, `${T(...STATS[e.k])}${e.p > 0 ? '↑' : '↓'}`, e.p > 0 ? '#ffe9a8' : '#ff9a8a'); await W(180); break;
        case 'die': sfx('die'); await W(320); break;
        case 'vanish': view.pop(u, T('消失了…', 'Gone…'), '#a0a0b0'); await W(200); break;
        case 'retreat': banner(T(`${nameOf(u)} 撤退了！`, `${nameOf(u)} falls back!`), '#ffe9a8'); await W(900); break;
        case 'revive': view.pop(u, T('復活！', 'Revived!'), '#7adf8a', true); await W(300); break;
        case 'treasure': sfx('treasure'); banner(T(`發現了 ${itemName(e.item)}！`, `Found ${itemName(e.item)}!`), '#ffe08a'); await W(900); break;
        case 'steal': sfx('treasure'); banner(T(`偷到了 ${itemName(e.item)}！`, `Stole ${itemName(e.item)}!`), '#7adf8a'); await W(800); break;
        case 'break': banner(T(`${itemName(e.item)} 被破壞了！`, `${itemName(e.item)} shattered!`), '#ff9a8a'); await W(800); break;
        case 'recruit': banner(T(`${nameOf(u)} 加入了隊伍！`, `${nameOf(u)} joins you!`), '#7adf8a'); sfx('levelup'); await W(900); break;
        case 'levelup': view.pop(u, 'LV UP!', '#ffd040', true); sfx('levelup'); await W(400); break;
        case 'joblevel': view.pop(u, T('職業等級提升！', 'Job LV up!'), '#c8a0ff'); await W(300); break;
        case 'react': if (e.a) { view.pop(u, T(e.a.name), '#8ad8ff'); await W(300); } break;
        case 'charge': view.pop(u, T('詠唱中…', 'Charging…'), '#c8a0ff'); await W(250); break;
        case 'jumpup': sfx('jump'); await W(260); break;
        case 'land': sfx('hit'); await W(160); break;
        case 'text': view.pop(u || B.turn, T(...e.msg), '#ffffff'); await W(300); break;
        case 'count': view.pop(u, String(e.n), '#c080ff', true); await W(300); break;
        case 'gold': view.pop(u, `+${e.n} G`, '#ffe08a'); await W(220); break;
        default: break;
      }
    }
  }
  const bannerEl = el('div', { class: 'banner', style: { display: 'none' } }); ui.append(bannerEl);
  let bannerT = 0;
  function banner(text, col = '#ffe9a8') { bannerEl.textContent = text; bannerEl.style.color = col; bannerEl.style.display = ''; clearTimeout(bannerT); bannerT = setTimeout(() => { bannerEl.style.display = 'none'; }, FAST ? 500 : 1100); }

  // ---------------------------------------------------------------- the opening words, if any
  if (spec.intro) await spec.intro();
  music(spec.music || 'battle');

  // ---------------------------------------------------------------- the main loop
  while (!B.over) {
    refreshTurns();
    const r = advance(B);
    await play();
    if (r.type !== 'turn') { refreshTurns(); continue; }
    const u = r.unit;
    view.cursor = [u.x, u.y];
    hud.card.style.display = ''; fillCard(hud.card, u);
    if (!beginTurn(B, u)) { await play(); checkEnd(B); continue; }
    await play();
    if (B.over) break;
    if (u.ai || u.st.berserk || u.st.charm) await aiTurn(u); else await playerTurn(u);
    checkEnd(B); await play();
    if (spec.onTurn) await spec.onTurn(B);
  }
  await play();
  // ---------------------------------------------------------------- the end
  alive2 = false; offKeys(); removeEventListener('resize', resize);
  banner(B.over === 'win' ? T('勝利！', 'Victory!') : T('戰敗……', 'Defeat…'), B.over === 'win' ? '#ffe08a' : '#ff9a8a');
  sfx(B.over === 'win' ? 'win' : 'lose');
  await wait(1400);
  return B;

  // ---------------------------------------------------------------- enemy (and guest) turns
  async function aiTurn(u) {
    await W(220);
    const p = plan(B, u);
    if (p.x !== u.x || p.y !== u.y) { moveTo(B, u, p.x, p.y, p.path); await play(); }
    if (p.a && alive(u) && !B.over) {
      // aim the cursor so you can see what's coming
      view.cursor = [p.tx, p.ty]; await W(240);
      if (p.a.k === 'item') useItem(B, u, p.a.item, p.tx, p.ty); else perform(B, u, p.a, p.tx, p.ty);
      await play();
    }
    if (alive(u) && B.turn === u) endTurn(B, u, faceNearest(u));
    else if (B.turn === u) endTurn(B, u, u.dir);
  }
  function faceNearest(u) {
    const f = B.units.filter((o) => alive(o) && sideOf(o) !== sideOf(u)).sort((a, b) => Math.abs(a.x - u.x) + Math.abs(a.y - u.y) - (Math.abs(b.x - u.x) + Math.abs(b.y - u.y)))[0];
    return f ? dirOf(u.x, u.y, f.x, f.y) : u.dir;
  }

  // ---------------------------------------------------------------- your turns
  async function playerTurn(u) {
    let startPos = null;
    sfx('turn');
    for (;;) {
      if (B.over) return;
      fillCard(hud.card, u); clearMarks();
      const items = [
        { label: T('移動', 'Move'), disabled: u.moved },
        { label: T('行動', 'Act'), disabled: u.acted },
        { label: T('待機', 'Wait') },
        { label: T('取消移動', 'Undo move'), disabled: !u.moved || u.acted || !startPos },
        { label: T('查看狀態', 'Status') },
      ];
      keyTarget = null;
      const i = await menu(clear(hud.cmd), items, { title: nameOf(u), cancel: false });
      if (i === 0) { const moved = await chooseMove(u); if (moved) startPos = moved; }
      else if (i === 1) { await chooseAct(u); }
      else if (i === 2) { const d = await chooseFacing(u); if (d != null) { endTurn(B, u, d); clear(hud.cmd); return; } }
      else if (i === 3) { u.x = startPos[0]; u.y = startPos[1]; u.moved = false; u.dir = startPos[2]; startPos = null; }
      else if (i === 4) { await statusModal(u); }
    }
  }
  function clearMarks() { view.marks.clear(); onTile = null; onHover = null; }
  // pick a tile from a set: arrow keys move the cursor among them, a click or OK picks
  function pickTile(tiles, { col, onhover, start } = {}) {
    return new Promise((resolve) => {
      const set = new Map(tiles.map(([x, y]) => [`${x},${y}`, [x, y]]));
      for (const k of set.keys()) view.marks.set(k, col);
      let cur = start || tiles[0];
      const show = (t) => { view.cursor = t; if (onhover) onhover(t && set.has(`${t[0]},${t[1]}`) ? t : null); };
      show(cur);
      onHover = (t) => { cur = t || cur; show(t); };
      onTile = (t) => { if (set.has(`${t[0]},${t[1]}`)) finish(t); };
      keyTarget = (k) => {
        if (k === 'back') return finish(null);
        if (k === 'ok') { if (cur && set.has(`${cur[0]},${cur[1]}`)) finish(cur); return; }
        const idx = { right: 0, down: 1, left: 2, up: 3 }[k]; if (idx == null) return;
        const g = GRID[(idx - view.rot + 4) % 4];
        const nx = clamp0((cur || [0, 0])[0] + g[0], B.map.w), ny = clamp0((cur || [0, 0])[1] + g[1], B.map.h); cur = [nx, ny]; show(cur);
      };
      const back = el('button', { class: 'btn', onclick: () => finish(null) }, T('返回', 'Back'));
      clear(hud.cmd).append(el('div', { class: 'panel' }, el('div', { class: 'small dim' }, T('選擇位置', 'Choose a tile')), back));
      function finish(t) { keyTarget = null; clearMarks(); clear(hud.cmd); resolve(t); }
    });
  }
  async function chooseMove(u) {
    const reach = reachable(B, u), tiles = [...reach.values()].map((n) => [n.x, n.y]);
    const t = await pickTile(tiles, { col: 'rgba(80,150,255,.42)', start: [u.x, u.y] });
    if (!t || (t[0] === u.x && t[1] === u.y)) return null;
    const from = [u.x, u.y, u.dir], n = reach.get(`${t[0]},${t[1]}`);
    moveTo(B, u, t[0], t[1], n.path); await play();
    return from;
  }
  async function chooseAct(u) {
    for (;;) {
      const kit = u.kit, sets = kit.sets, bagItems = Object.keys(B.bag).filter((k) => CONSUMABLES[k] && B.bag[k] > 0);
      const items = [{ label: T('攻擊', 'Attack'), v: 'attack' }, ...sets.map(([j, list]) => ({ label: T(...JOBS[j].skill), v: j, disabled: !list.length })), { label: T('道具', 'Items'), v: 'item', disabled: !bagItems.length }];
      const i = await menu(clear(hud.cmd), items, { title: T('行動', 'Act') });
      if (i < 0) return;
      const v = items[i].v;
      if (v === 'attack') { if (await aimAndDo(u, ATTACK)) return; continue; }
      if (v === 'item') {
        const list = bagItems.map((k) => ({ label: T(CONSUMABLES[k].name), right: `×${B.bag[k]}`, k }));
        const j = await menu(clear(hud.cmd), list, { title: T('道具', 'Items') });
        if (j < 0) continue;
        const a = itemAction(list[j].k);
        if (await aimAndDo(u, a, () => useItem(B, u, a.item, ...lastAim))) return; continue;
      }
      const set = sets.find(([j]) => j === v)[1];
      let descBox = null;
      const list = set.map((a) => ({ label: T(a.name), right: a.mp ? `MP ${mpCost(u, a)}` : a.ct ? '⌛' : '', disabled: !canUse(B, u, a), a }));
      const j = await menu(clear(hud.cmd), list, { title: T(...JOBS[v].skill), onmove: (it) => { if (descBox) descBox.remove(); descBox = el('div', { class: 'panel small', style: { marginTop: '6px', maxWidth: '320px' } }, describe(it.a).join(' · ')); hud.cmd.append(descBox); } });
      if (descBox) descBox.remove();
      if (j < 0) continue;
      if (await aimAndDo(u, list[j].a)) return;
    }
  }
  let lastAim = [0, 0];
  async function aimAndDo(u, a, doIt) {
    const tiles = targetTiles(B, u, a);
    let prev = null;
    const t = await pickTile(tiles, { col: a.t === 'ally' || a.h || a.rev ? 'rgba(90,220,140,.4)' : 'rgba(255,90,80,.4)', start: tiles.find(([x, y]) => { const o = unitAt(B, x, y); return o && (a.t === 'foe' ? sideOf(o) !== sideOf(u) : sideOf(o) === sideOf(u)); }) || tiles[0],
      onhover: (tt) => { for (const k of view.marks.keys()) if (view.marks.get(k) === 'rgba(255,220,90,.55)') view.marks.delete(k); if (prev) prev.remove(); prev = null; if (!tt) return; for (const [x, y] of areaOf(B, u, a, tt[0], tt[1])) view.marks.set(`${x},${y}`, 'rgba(255,220,90,.55)'); prev = previewBox(u, a, tt); ui.append(prev); } });
    if (prev) prev.remove();
    if (!t) return false;
    lastAim = t;
    if (doIt) doIt(); else perform(B, u, a, t[0], t[1]);
    await play();
    return true;
  }
  function previewBox(u, a, [tx, ty]) {
    const vs = victims(B, u, a, tx, ty), box = el('div', { class: 'panel preview' }, el('div', { class: 'title small' }, T(a.name)));
    if (a.ct) box.append(el('div', { class: 'small dim' }, T(`詠唱時間 ${a.ct}：發動前目標可能會移動`, `Charge ${a.ct}: targets may move before it lands`)));
    if (!vs.length) box.append(el('div', { class: 'small dim' }, T('範圍內沒有目標', 'No one in range')));
    for (const v of vs.slice(0, 6)) {
      const c = calc(B, u, v, a), parts = [];
      if (c.dmg) parts.push(T(`傷害 ${c.dmg}`, `DMG ${c.dmg}`)); if (c.heal) parts.push(T(`回復 ${c.heal}`, `Heal ${c.heal}`));
      if (a.d || a.steal || a.invite || a.hit) parts.push(T(`成功率 ${c.hit}%`, `Hit ${c.hit}%`));
      for (const [id, ch] of a.st || []) parts.push(`${T(STATUS[id].name)} ${statusChance(B, u, v, id, ch)}%`);
      if (c.face && c.face !== 'front') parts.push(c.face === 'back' ? T('背擊', 'Back') : T('側擊', 'Flank'));
      box.append(el('div', { class: 'row small', style: { justifyContent: 'space-between' } }, el('span', { style: { color: v.side === 'foe' ? '#ff9a8a' : '#9ac8ff' } }, nameOf(v)), el('span', {}, parts.join(' · '))));
    }
    return box;
  }
  async function chooseFacing(u) {
    const arrows = ['↘', '↙', '↖', '↗'];
    const items = arrows.map((a, k) => ({ label: `${a}  ${[T('右下', 'down-right'), T('左下', 'down-left'), T('左上', 'up-left'), T('右上', 'up-right')][k]}`, d: (k - view.rot + 4) % 4 }));
    const cur = items.findIndex((it) => it.d === u.dir);
    const i = await menu(clear(hud.cmd), items, { title: T('面向哪裡？', 'Face which way?'), onmove: (it) => { u.dir = it.d; } });
    if (i < 0) { if (cur >= 0) u.dir = items[cur].d; return null; }
    return items[i].d;
  }
  async function statusModal(u) {
    const { modal } = await import('./dom.js');
    await modal(unitDetail(u), [T('關閉', 'Close')]);
  }
  function fillCard(box, u) {
    const c = portrait(u.u, 52), cnv = el('canvas', { width: 52, height: 52 }); cnv.getContext('2d').drawImage(c, 0, 0);
    const job = u.u.mon ? T(MONSTERS[u.u.mon].name) : T(JOBS[u.u.job].name);
    const sts = Object.keys(u.st).filter((k) => u.st[k] < 90 || ['protect', 'shell', 'regen', 'haste', 'float', 'reflect'].includes(k));
    clear(box).append(
      el('div', { class: 'head' }, cnv, el('div', { style: { flex: 1, minWidth: 0 } }, el('div', { class: 'nm' }, nameOf(u)), el('div', { class: 'small dim' }, `${job} · Lv ${u.u.lv}${u.u.mon ? '' : ` · ${T('職業', 'Job')} Lv ${jobLv(u.u)}`}`))),
      el('div', { class: 'row small', style: { marginTop: '6px', justifyContent: 'space-between' } }, el('span', {}, `HP ${u.hp}/${u.s.hp}`), el('span', { class: 'dim' }, `MP ${u.mp}/${u.s.mp}`), el('span', { class: 'dim' }, `CT ${Math.max(0, Math.floor(u.ct))}`)),
      bar(u.hp, u.s.hp, u.hp / u.s.hp > 0.5 ? '#5ad06a' : u.hp / u.s.hp > 0.25 ? '#e0c040' : '#e05a4a'), el('div', { style: { height: '3px' } }), bar(u.mp, u.s.mp || 1, '#4a8aff'),
      sts.length ? el('div', { class: 'row', style: { marginTop: '5px', gap: '4px' } }, sts.map((k) => el('span', { class: 'tag', style: { color: STATUS[k].col, borderColor: STATUS[k].col } }, T(STATUS[k].name)))) : null,
    );
  }
  function unitDetail(u) {
    const s = u.s, rows = [['atk', Math.round(live(u, 'atk')) + (s.wpn ? `+${s.wpn}` : '')], ['def', Math.round(live(u, 'def'))], ['mag', Math.round(live(u, 'mag'))], ['res', Math.round(live(u, 'res'))], ['spd', live(u, 'spd').toFixed(1)], ['mov', s.mov], ['jmp', s.jmp], ['eva', s.eva + '%']];
    const eq = u.u.mon ? [] : Object.entries(u.u.eq).filter(([, id]) => id).map(([, id]) => el('div', { class: 'small' }, itemName(id)));
    const acts = u.kit.acts.map((a) => T(a.name)).join(T('、', ', '));
    return el('div', {}, el('div', { class: 'title' }, `${nameOf(u)}　Lv ${u.u.lv}`),
      el('div', { class: 'statgrid' }, rows.map(([k, v]) => el('div', {}, el('b', {}, T(...STATS[k])), v))),
      eq.length ? el('div', { style: { marginTop: '8px' } }, el('div', { class: 'title small' }, T('裝備', 'Equipment')), eq) : null,
      el('div', { style: { marginTop: '8px' } }, el('div', { class: 'title small' }, T('技能', 'Abilities')), el('div', { class: 'small' }, acts || '—')),
      u.kit.react ? el('div', { class: 'small dim', style: { marginTop: '4px' } }, T('反應：', 'Reaction: ') + T(u.kit.react.name)) : null,
      u.u.mon ? el('div', { class: 'small dim', style: { marginTop: '4px' } }, T('弱點：', 'Weak to: ') + (MONSTERS[u.u.mon].weak.join(', ') || '—')) : null);
  }
}
// screen arrows: right = down-right, down = down-left, left = up-left, up = up-right (before turning the camera)
const GRID = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const clamp0 = (v, n) => Math.max(0, Math.min(n - 1, v));
const dirOf = (x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0; return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 2) : (dy >= 0 ? 1 : 3); };
export const itemName = (id) => (ITEMS[id] ? T(ITEMS[id].name) : CONSUMABLES[id] ? T(CONSUMABLES[id].name) : id);
function goalText(g = { type: 'rout' }) {
  if (g.type === 'boss') return T(`勝利條件：打倒 ${g.name ? T(g.name) : '敵將'}`, `Goal: defeat ${g.name ? T(g.name) : 'the commander'}`);
  if (g.type === 'protect') return T(`勝利條件：全滅敵人　敗北條件：${g.name ? T(g.name) : '護衛對象'}倒下`, `Goal: rout the enemy · Lose if ${g.name ? T(g.name) : 'your charge'} falls`);
  if (g.type === 'survive') return T(`勝利條件：撐過 ${g.turns} 回合`, `Goal: hold out for ${g.turns} rounds`);
  return T('勝利條件：全滅敵人', 'Goal: defeat all enemies');
}
