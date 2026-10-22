// The game: title, the world map, towns, the story, battles and the hidden labyrinths.
import { T, EN, LANG, setLang } from './i18n.js';
import { el, clear, $ui, menu, modal, toast, pushKeys, wait, sheet } from './ui/dom.js';
import { runBattle } from './ui/battleui.js';
import { playLines, chapterCard, rollEnding } from './ui/scene.js';
import { partyScreen, formation, uname, itemLabel, gearLine } from './ui/party.js';
import { portrait, person, SPR_W, SPR_H, SPR_SCALE } from './ui/sprites.js';
import { S, setS, save, load, newGame, initCloud, bagAdd, bagTake, flag, setFlag } from './state.js';
import { EVENTS, EVENT, CHAPTERS, CAST, ENDING, nextEvent, RECRUIT_NAMES } from './data/story.js';
import { NODES, LINKS, OPEN_BY_CH, LABYRINTHS, QUESTS } from './data/world.js';
import { JOBS, JOB_LIST, ABILITIES } from './data/jobs.js';
import { ITEMS, CONSUMABLES, GEAR, shopStock, consumablesFor } from './data/items.js';
import { MONSTERS } from './data/monsters.js';
import { makeMap } from './core/mapgen.js';
import { makeUnit, makeFoe, makeMonster, dressFoe, stats, jpOf, gainJp, HAIR, SKIN } from './core/unit.js';
import { music, sfx, toggleMute, isMuted, unlock } from './audio.js';
import { makeOne, castUnit, rollTreasure as roll, tierFor } from './core/build.js';
import { journal, objective } from './ui/journal.js';
import { seeded, pick, clamp, r0, hashStr, shuffle } from './util.js';

const cv = document.getElementById('view');
const MAX_ROSTER = 20;
let busy = false;

// ---------------------------------------------------------------- small helpers
const avgLv = () => { const r = S.roster.filter((u) => !u.mon); const top = [...r].sort((a, b) => b.lv - a.lv).slice(0, 5); return top.reduce((s, u) => s + u.lv, 0) / Math.max(1, top.length); };
const opened = () => { const out = new Set(); for (let c = 0; c <= Math.min(S.ch, OPEN_BY_CH.length - 1); c++) for (const id of OPEN_BY_CH[c]) out.add(id); for (const [id, n] of Object.entries(NODES)) if (n.kind === 'hidden' && flag(n.unlock)) out.add(id); for (const id of S.visited || []) out.add(id); out.add(S.node); return out; };
const neighbours = (id) => LINKS.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));
// legendary pieces that are only found as buried treasure
const RESERVED = new Set([...QUESTS.flatMap((q) => q.reward.items || []), ...Object.values(LABYRINTHS).flatMap((l) => l.prize.items || []), ...EVENTS.flatMap((e) => [...((e.give && e.give.items) || []), ...((e.battle && e.battle.foes) || []).flatMap((f) => f.drops || [])])]);
const LEG_POOL = GEAR.filter((g) => g.legend && !RESERVED.has(g.id)).map((g) => g.id);

// ---------------------------------------------------------------- the canvas behind menus: stars and a slow drift
let bgOn = true;
function backdrop() {
  const g = cv.getContext('2d'); let t = 0;
  const loop = () => {
    if (!bgOn) return;
    cv.width = innerWidth; cv.height = innerHeight; t += 0.016;
    const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, '#0a0b1a'); gr.addColorStop(1, '#22234a'); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < 120; i++) { const x = (i * 137.5 + t * 4) % cv.width, y = (i * 59.3) % (cv.height * 0.8); g.fillStyle = `rgba(255,255,240,${0.3 + 0.5 * Math.abs(Math.sin(t + i))})`; g.fillRect(x, y, 2, 2); }
    // the scar in the sky
    g.strokeStyle = 'rgba(140,200,255,.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cv.width * 0.62, 0); g.quadraticCurveTo(cv.width * 0.55, cv.height * 0.3, cv.width * 0.4, cv.height * 0.55); g.stroke();
    requestAnimationFrame(loop);
  };
  bgOn = true; loop();
}
const stopBackdrop = () => { bgOn = false; };

// ---------------------------------------------------------------- title
function title() {
  backdrop(); music('title');
  const ui = clear(), has = load();
  const scr = el('div', { class: 'screen title-screen' }, el('div', { class: 'logo' }, T('星痕戰旗', 'STARSCAR')), el('div', { class: 'sub' }, T('STARSCAR TACTICS', 'T A C T I C S')));
  const box = el('div', {}); scr.append(box); ui.append(scr);
  const items = [...(has ? [{ label: T('繼續', 'Continue'), v: 'cont', right: `${has.name} · ${T(CHAPTERS[Math.min(has.ch, CHAPTERS.length - 1)].title).split(/[　:]/)[0]}` }] : []), { label: T('新的遊戲', 'New Game'), v: 'new' }, { label: EN ? '中文' : 'English', v: 'lang' }, { label: T('音樂：', 'Music: ') + (isMuted() ? T('關', 'off') : T('開', 'on')), v: 'mute' }];
  menu(box, items, { cancel: false }).then(async (i) => {
    unlock();
    const v = items[i].v;
    if (v === 'lang') return setLang(EN ? 'zh' : 'en');
    if (v === 'mute') { toggleMute(); return title(); }
    if (v === 'cont') { setS(has); return world(); }
    if (has && await modal(el('div', {}, T('開始新的遊戲？目前的存檔會被覆蓋。', 'Start a new game? Your save will be overwritten.')), [T('開始', 'Start'), T('取消', 'Cancel')]) !== 0) return title();
    const name = await askName();
    setS(newGame(name)); save();
    await chapterCard(CHAPTERS[0]);
    S.node = EVENTS[0].at;
    playEvent(EVENTS[0]);
  });
}
function askName() {
  return new Promise((resolve) => {
    const inp = el('input', { value: T('雷恩', 'Ren'), maxlength: 10, style: { font: 'inherit', fontSize: '18px', padding: '6px 10px', background: '#1a1a2e', color: '#fff', border: '1px solid #6a5a3a', borderRadius: '4px', width: '100%' } });
    const close = sheet(el('div', {}, el('div', { class: 'title' }, T('主角的名字', 'Name your hero')), el('div', { class: 'small dim', style: { margin: '4px 0 8px' } }, T('一個沒有星紋的傭兵。', 'A sellsword without a star-mark.')), inp,
      el('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '10px' } }, el('button', { class: 'btn primary', onclick: () => done() }, T('決定', 'OK')))), { onBack: () => resolve(T('雷恩', 'Ren')), outside: false });
    const done = () => { close(); resolve((inp.value || '').trim().slice(0, 10) || T('雷恩', 'Ren')); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
    setTimeout(() => { inp.focus(); inp.select(); }, 50);
  });
}

// ---------------------------------------------------------------- the world map
function world() {
  stopBackdrop(); busy = false; music('world');
  const ui = clear(), open = opened(), next = nextEvent(S.done);
  S.visited = [...new Set([...(S.visited || []), S.node])];
  let selected = S.node;
  const scr = el('div', { class: 'screen' });
  const chapter = CHAPTERS[Math.min(S.ch, CHAPTERS.length - 1)];
  const top = el('div', { class: 'topbar' }, el('span', { class: 'title' }, T(chapter.title)), el('span', { class: 'small', style: { color: '#ffe9a8', cursor: 'pointer' }, onclick: () => go(() => journal(world)) }, objective()), el('span', { class: 'sp' }), el('span', { class: 'gold' }, `${S.gold} G`),
    el('button', { class: 'btn', onclick: () => go(() => partyScreen(world)) }, T('隊伍', 'Company')), el('button', { class: 'btn', onclick: () => go(() => journal(world)) }, T('記錄', 'Journal')), el('button', { class: 'btn', onclick: () => go(() => bagScreen()) }, T('背包', 'Bag')),
    el('button', { class: 'btn', onclick: () => { save(); toast(T('已存檔', 'Saved')); } }, T('存檔', 'Save')), el('button', { class: 'btn', onclick: () => go(() => title()) }, T('標題', 'Title')));
  const mapBox = el('div', { class: 'worldmap' }), info = el('div', { class: 'panel nodeinfo' });
  scr.append(top, mapBox); mapBox.append(info); ui.append(scr);
  const g = cv.getContext('2d');
  let alive = true, t = 0, landCache = null;
  // walking along a road: { a, b, k (0-1), route (the places still ahead) }; dust left behind
  let walk = null, dust = [], flash = 0;
  const go = (fn) => { alive = false; off(); fn(); };
  const off = pushKeys((k) => { if (k === 'back') go(() => partyScreen(world)); });
  // layout: the 1000 × 700 world scaled into the map area
  const box = () => { const r = mapBox.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const P = (n) => { const b = box(), s = Math.min(b.w / 1040, b.h / 740); return [b.x + (b.w - 1000 * s) / 2 + n.x * s, b.y + (b.h - 700 * s) / 2 + n.y * s, s]; };
  const draw = () => {
    if (!alive) return;
    t += 0.016; cv.width = innerWidth; cv.height = innerHeight;
    g.fillStyle = '#10223a'; g.fillRect(0, 0, cv.width, cv.height);
    // the land, drawn once per size: blurred patches of each place's ground, then fog over places not yet reached
    const b = box(), s = Math.min(b.w / 1040, b.h / 740);
    if (!landCache || landCache.w !== cv.width || landCache.h !== cv.height || landCache.n !== open.size) landCache = paintLand(P, s, open);
    g.drawImage(landCache.c, 0, 0);
    // roads
    for (const [a, c] of LINKS) {
      const A = NODES[a], C = NODES[c]; if (!open.has(a) && !open.has(c)) continue;
      const [x1, y1] = P(A), [x2, y2] = P(C), both = open.has(a) && open.has(c);
      g.strokeStyle = both ? 'rgba(240,220,160,.85)' : 'rgba(240,220,160,.25)'; g.lineWidth = 3; g.setLineDash(both ? [] : [6, 6]);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]);
    }
    // places
    for (const [id, n] of Object.entries(NODES)) {
      if (!open.has(id)) continue;
      const [x, y] = P(n), r = 9 + (n.kind === 'town' ? 3 : 0);
      g.fillStyle = n.kind === 'town' ? '#e8c46a' : n.kind === 'hidden' ? '#c080ff' : n.kind === 'site' ? '#8ad8ff' : '#7adf8a';
      g.strokeStyle = '#000'; g.lineWidth = 2;
      if (n.kind === 'town') { g.fillRect(x - r, y - r, r * 2, r * 2); g.strokeRect(x - r, y - r, r * 2, r * 2); }
      else if (n.kind === 'hidden') { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.5 : r * 1.3; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); }
      else { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke(); }
      if (id === selected) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r + 6 + Math.sin(t * 4) * 2, 0, Math.PI * 2); g.stroke(); }
      g.font = `bold ${Math.max(11, 13 * s * 1.2)}px "DotGothic16", sans-serif`; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillText(T(n.name), x + 1, y + r + 15); g.fillStyle = '#f4ecd8'; g.fillText(T(n.name), x, y + r + 14);
      if (next && next.at === id) { g.fillStyle = '#ff5a4a'; g.font = 'bold 22px sans-serif'; g.fillText('!', x, y - r - 8 + Math.sin(t * 5) * 3); }
      g.textAlign = 'left';
    }
    // the road still ahead glows while walking
    if (walk && walk.route.length) {
      g.strokeStyle = `rgba(255,230,140,${0.55 + Math.sin(t * 6) * 0.25})`; g.lineWidth = 4; g.setLineDash([10, 8]); g.lineDashOffset = -t * 40;
      g.beginPath(); const [sx, sy] = here(); g.moveTo(sx, sy); for (const id of walk.route) { const [rx, ry] = P(NODES[id]); g.lineTo(rx, ry); } g.stroke(); g.setLineDash([]);
    }
    // the company: the hero walking, the banner beside, dust behind
    const [px, py] = here(), moving = !!walk;
    if (moving && Math.random() < 0.5) dust.push({ x: px + (Math.random() - 0.5) * 8, y: py + 2, t: 0 });
    for (const d of dust) { d.t += 0.016; g.fillStyle = `rgba(220,200,160,${Math.max(0, 0.5 - d.t)})`; g.beginPath(); g.arc(d.x, d.y - d.t * 10, 3 + d.t * 8, 0, Math.PI * 2); g.fill(); }
    dust = dust.filter((d) => d.t < 0.5);
    const hero = S.roster.find((u) => u.who === 'ren') || S.roster[0];
    const dx = walk ? P(NODES[walk.b])[0] - P(NODES[walk.a])[0] : 1, dy = walk ? P(NODES[walk.b])[1] - P(NODES[walk.a])[1] : 1;
    const back = moving && dy < -Math.abs(dx) * 0.6, flip = dx > 0;
    const pose = moving ? (Math.floor(t * 8) % 2 ? 'walk0' : 'walk1') : (Math.floor(t * 2) % 2 ? 'idle0' : 'idle1');
    const img = person(hero, back, pose), sc = SPR_SCALE * 1.15, w = SPR_W * sc, h = SPR_H * sc, hop = moving ? Math.abs(Math.sin(t * 16)) * 3 : 0;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(px, py + 1, 12, 4, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.imageSmoothingEnabled = false; g.translate(px, py - hop); if (flip) g.scale(-1, 1); g.drawImage(img, -w / 2, -h + 4, w, h); g.restore();
    const fx = px + (flip ? -16 : 16), fy = py - hop;
    g.fillStyle = '#5a3a1a'; g.fillRect(fx - 1, fy - 52, 3, 46); g.fillStyle = '#3a5aa0'; g.beginPath(); g.moveTo(fx + 2, fy - 52); g.lineTo(fx + 24, fy - 46 + Math.sin(t * (moving ? 9 : 3)) * 3); g.lineTo(fx + 2, fy - 38); g.fill(); g.strokeStyle = '#d8e8ff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(fx + 5, fy - 49); g.lineTo(fx + 16, fy - 43); g.stroke();
    // an ambush: the screen flashes red
    if (flash > 0) { flash = Math.max(0, flash - 0.016); g.fillStyle = `rgba(200,30,30,${flash * 0.9})`; g.fillRect(0, 0, cv.width, cv.height); }
    requestAnimationFrame(draw);
  };
  // where the company stands right now (between two places while walking)
  function here() {
    if (!walk) return P(NODES[S.node]);
    const [ax, ay] = P(NODES[walk.a]), [bx, by] = P(NODES[walk.b]), k = walk.k, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    return [ax + (bx - ax) * e, ay + (by - ay) * e];
  }
  draw();
  const pickNode = (e) => { let best = null, bd = 30; for (const [id, n] of Object.entries(NODES)) { if (!open.has(id)) continue; const [x, y] = P(n), d = Math.hypot(e.clientX - x, e.clientY - y); if (d < bd) { bd = d; best = id; } } return best; };
  mapBox.addEventListener('click', (e) => { if (e.target !== mapBox || walk) return; const id = pickNode(e); if (id) { selected = id; showInfo(); } });
  function showInfo() {
    const n = NODES[selected], here = selected === S.node;
    const acts = [];
    if (!here) acts.push(el('button', { class: 'btn primary', onclick: () => travel(selected) }, T('前往', 'Travel here')));
    else {
      if (next && next.at === selected) acts.push(el('button', { class: 'btn primary', onclick: () => go(() => playEvent(next)) }, T(`▶ ${T(next.name)}`, `▶ ${T(next.name)}`)));
      if (n.kind === 'town') acts.push(el('button', { class: 'btn', onclick: () => go(() => town(selected)) }, T('進入城鎮', 'Enter town')));
      if (n.kind === 'field') acts.push(el('button', { class: 'btn', onclick: () => go(() => patrol(selected)) }, T('巡邏（遭遇戰）', 'Patrol (skirmish)')));
      if (n.kind === 'hidden') acts.push(el('button', { class: 'btn primary', onclick: () => go(() => labyrinth(n.lab)) }, T('進入迷宮', 'Enter the labyrinth')));
    }
    const lab = n.kind === 'hidden' && LABYRINTHS[n.lab];
    clear(info).append(el('div', { class: 'title' }, T(n.name)), n.desc ? el('div', { class: 'small', style: { margin: '4px 0' } }, T(n.desc)) : lab ? el('div', { class: 'small', style: { margin: '4px 0' } }, T(lab.desc)) : null,
      n.lv ? el('div', { class: 'small dim' }, T(`敵人等級 約 ${Math.max(n.lv, Math.round(avgLv() - 1))}`, `Foes around Lv ${Math.max(n.lv, Math.round(avgLv() - 1))}`)) : null,
      lab ? el('div', { class: 'small dim' }, T(`已到達 ${S.labyrinth[n.lab] || 0} / ${lab.floors} 層`, `Reached floor ${S.labyrinth[n.lab] || 0} / ${lab.floors}`)) : null,
      next && next.at === selected && !here ? el('div', { class: 'small', style: { color: '#ff9a8a' } }, T('劇情在這裡繼續', 'The story continues here')) : null,
      el('div', { class: 'row', style: { marginTop: '8px' } }, acts));
  }
  showInfo();
  window.__travel = (id) => travel(id);
  // walk the roads one place at a time; wild places may jump you on the way
  async function travel(dest) {
    const prev = new Map([[S.node, null]]), q = [S.node];
    while (q.length) { const c = q.shift(); for (const nb of neighbours(c)) if (open.has(nb) && !prev.has(nb)) { prev.set(nb, c); q.push(nb); } }
    if (!prev.has(dest)) return toast(T('還去不了那裡。', 'You can\'t get there yet.'));
    const path = []; for (let c = dest; c; c = prev.get(c)) path.unshift(c);
    clear(info).append(el('div', { class: 'title' }, T(`前往 ${T(NODES[dest].name)}…`, `Travelling to ${T(NODES[dest].name)}…`)));
    for (let i = 1; i < path.length; i++) {
      // walk the road: longer roads take a little longer
      const [ax, ay] = P(NODES[path[i - 1]]), [bx, by] = P(NODES[path[i]]), ms = Math.max(380, Math.min(950, Math.hypot(bx - ax, by - ay) * 4));
      walk = { a: path[i - 1], b: path[i], k: 0, route: path.slice(i) };
      const t0 = performance.now();
      while (walk.k < 1) { await wait(16); if (!alive) return; walk.k = Math.min(1, (performance.now() - t0) / ms); }
      S.node = path[i]; S.visited = [...new Set([...(S.visited || []), S.node])]; sfx('turn');
      walk = path[i + 1] ? { a: path[i], b: path[i + 1], k: 0, route: path.slice(i + 1) } : null;
      const n = NODES[S.node];
      if (i < path.length - 1 && n.kind === 'field' && Math.random() < 0.22) {
        walk = null; flash = 0.8; sfx('hurt'); save(); await wait(700);
        return go(() => patrol(S.node, true));
      }
    }
    walk = null;
    save(); selected = S.node; showInfo();
  }
}

const BIOME = { desert: '#b89a5a', snow: '#c8d4e8', swamp: '#4a5a3a', crystal: '#5a6aa8', sky: '#8a9ad0', volcano: '#7a3a22', mine: '#7a6a5a', ruins: '#6a6a50', church: '#8a8a7a', forest: '#2f5a2f', cave: '#5a5048', bridge: '#4a6a3a', castle: '#6a7050' };
function paintLand(P, s, open) {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const g = c.getContext('2d');
  g.fillStyle = '#12284a'; g.fillRect(0, 0, c.width, c.height);
  // waves
  g.strokeStyle = 'rgba(120,170,220,.08)'; for (let y = 10; y < c.height; y += 18) { g.beginPath(); for (let x = 0; x < c.width; x += 12) g.lineTo(x, y + Math.sin(x * 0.03 + y) * 3); g.stroke(); }
  g.filter = 'blur(14px)';
  for (const n of Object.values(NODES)) { const [x, y] = P(n); g.fillStyle = '#3e5a32'; g.beginPath(); g.arc(x, y, 120 * s, 0, Math.PI * 2); g.fill(); }
  for (const n of Object.values(NODES)) { const [x, y] = P(n); g.fillStyle = BIOME[n.theme] || (n.kind === 'town' ? '#5a7a42' : '#4e7038'); g.beginPath(); g.arc(x, y, 70 * s, 0, Math.PI * 2); g.fill(); }
  g.filter = 'none';
  // a coastline glow and a little texture
  for (let i = 0; i < 900; i++) { const x = (i * 97.3) % c.width, y = (i * 53.7 + (i % 7) * 31) % c.height; g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(x, y, 2, 2); }
  // mountains near the high places
  for (const n of Object.values(NODES)) if (['snow', 'crystal', 'volcano', 'ruins'].includes(n.theme)) { const [x, y] = P(n); for (let k = -1; k <= 1; k++) { const mx = x + k * 26 * s - 30 * s, my = y - 26 * s; g.fillStyle = 'rgba(40,40,50,.55)'; g.beginPath(); g.moveTo(mx - 12 * s, my + 12 * s); g.lineTo(mx, my - 10 * s); g.lineTo(mx + 12 * s, my + 12 * s); g.fill(); g.fillStyle = 'rgba(240,240,250,.6)'; g.beginPath(); g.moveTo(mx - 4 * s, my - 3 * s); g.lineTo(mx, my - 10 * s); g.lineTo(mx + 4 * s, my - 3 * s); g.fill(); } }
  // fog over the unknown
  for (const [id, n] of Object.entries(NODES)) if (!open.has(id)) { const [x, y] = P(n); const gr = g.createRadialGradient(x, y, 0, x, y, 110 * s); gr.addColorStop(0, 'rgba(8,10,20,.82)'); gr.addColorStop(1, 'rgba(8,10,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 110 * s, 0, Math.PI * 2); g.fill(); }
  return { c, w: cv.width, h: cv.height, n: open.size };
}
// ---------------------------------------------------------------- the bag
function bagScreen() {
  const ui = clear(), list = el('div', { class: 'list' });
  const ids = Object.keys(S.bag).sort((a, b) => (ITEMS[a] ? 1 : 0) - (ITEMS[b] ? 1 : 0) || ((ITEMS[b] && ITEMS[b].tier) || 0) - ((ITEMS[a] && ITEMS[a].tier) || 0));
  for (const id of ids) list.append(el('div', { class: 'item' }, el('div', { class: 'grow' }, el('div', { class: 'nm' }, `${itemLabel(id)} ×${S.bag[id]}`), ITEMS[id] ? el('div', { class: 'small dim' }, gearLine(ITEMS[id]) + (ITEMS[id].note ? ' — ' + T(ITEMS[id].note) : '')) : null)));
  const scr = el('div', { class: 'screen', style: { background: '#0c0d18' } }, el('div', { class: 'topbar' }, el('span', { class: 'title' }, T('背包', 'Bag')), el('span', { class: 'sp' }), el('span', { class: 'gold' }, `${S.gold} G`), el('button', { class: 'btn', onclick: () => { off(); world(); } }, T('返回', 'Back'))), el('div', { class: 'cols' }, el('div', { class: 'panel scroll', style: { flex: 1 } }, ids.length ? list : el('div', { class: 'dim' }, T('空空如也', 'Empty')))));
  ui.append(scr); const off = pushKeys((k) => { if (k === 'back') { off(); world(); } });
}

// ---------------------------------------------------------------- towns: shop and tavern
function town(id) {
  const n = NODES[id], ui = clear(); music('town');
  const tier = clamp(Math.max(n.tier || 1, S.ch * 2), 1, 10);
  let tab = 'buy', cat = 'w';
  const scr = el('div', { class: 'screen', style: { background: 'radial-gradient(ellipse at 50% 0%, #3a2a1a, #0c0d18 70%)' } });
  const gold = el('span', { class: 'gold' });
  const top = el('div', { class: 'topbar' }, el('span', { class: 'title' }, T(n.name)), el('span', { class: 'sp' }), gold, el('button', { class: 'btn', onclick: () => { off(); partyScreen(() => town(id)); } }, T('隊伍', 'Company')), el('button', { class: 'btn', onclick: () => { off(); save(); world(); } }, T('離開', 'Leave')));
  const body = el('div', { class: 'panel scroll', style: { flex: 1, minWidth: 0 } });
  scr.append(top, el('div', { class: 'cols' }, body)); ui.append(scr);
  const off = pushKeys((k) => { if (k === 'back') { off(); save(); world(); } });
  const draw = () => {
    gold.textContent = `${S.gold} G`;
    const tabs = el('div', { class: 'tabs' }, [['buy', T('購買', 'Buy')], ['sell', T('販賣', 'Sell')], ['tavern', T('酒館', 'Tavern')]].map(([k, l]) => el('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; draw(); } }, l)));
    clear(body).append(tabs);
    if (tab === 'buy') {
      const cats = [['w', T('武器', 'Weapons')], ['b', T('防具', 'Armour')], ['a', T('飾品', 'Accessories')], ['i', T('道具', 'Items')]];
      body.append(el('div', { class: 'tabs' }, cats.map(([k, l]) => el('button', { class: cat === k ? 'on' : '', onclick: () => { cat = k; draw(); } }, l))));
      const stock = cat === 'i' ? consumablesFor(tier).map((c) => c.id) : shopStock(tier).filter((g) => (cat === 'w' ? g.slot === 'w' : cat === 'a' ? g.slot === 'a' : ['s', 'h', 'b'].includes(g.slot))).sort((a, b) => a.type.localeCompare(b.type) || a.tier - b.tier).map((g) => g.id);
      body.append(el('div', { class: 'list' }, stock.map((sid) => {
        const it = ITEMS[sid] || CONSUMABLES[sid], price = it.price;
        const who = ITEMS[sid] ? S.roster.filter((u) => !u.mon && (JOBS[u.job].eq.includes(it.type) || it.type === 'acc')).length : null;
        return el('div', { class: 'item' }, el('div', { class: 'grow' }, el('div', { class: 'nm' }, T(it.name) + (S.bag[sid] ? ` (${T('持有', 'have')} ${S.bag[sid]})` : '')), el('div', { class: 'small dim' }, ITEMS[sid] ? `${gearLine(it)}${who != null ? T(` · 目前職業可裝備 ${who} 人`, ` · ${who} can equip now`) : ''}` : describeConsumable(it))),
          el('button', { class: 'btn', disabled: S.gold < price || null, onclick: () => { S.gold -= price; bagAdd(sid); sfx('ok'); draw(); } }, `${price} G`));
      })));
    } else if (tab === 'sell') {
      const ids = Object.keys(S.bag).filter((k) => (ITEMS[k] && ITEMS[k].price) || (CONSUMABLES[k] && CONSUMABLES[k].price));
      body.append(el('div', { class: 'list' }, ids.length ? ids.map((sid) => { const it = ITEMS[sid] || CONSUMABLES[sid], p = Math.floor(it.price / 2); return el('div', { class: 'item' }, el('div', { class: 'grow' }, el('div', { class: 'nm' }, `${T(it.name)} ×${S.bag[sid]}`)), el('button', { class: 'btn', onclick: () => { bagTake(sid); S.gold += p; sfx('ok'); draw(); } }, `${T('賣', 'Sell')} ${p} G`)); }) : el('div', { class: 'dim' }, T('沒有可以賣的東西。', 'Nothing to sell.'))));
    } else tavern(id, body, draw);
  };
  draw();
}
const describeConsumable = (c) => [c.h ? (c.h[0] === 'pct' ? T('完全回復 HP', 'Fully heals HP') : T(`回復 ${c.h[1]} HP`, `Restores ${c.h[1]} HP`)) : '', c.mph ? T(`回復 ${c.mph >= 999 ? '全部' : c.mph} MP`, `Restores ${c.mph >= 999 ? 'all' : c.mph} MP`) : '', c.rev ? T('使倒下的同伴復活', 'Revives a fallen ally') : '', c.cure ? T('解除異常狀態', 'Cures ailments') : ''].filter(Boolean).join(' · ');
// a tavern: hire hands, take jobs, hear rumours
function tavern(id, body, redraw) {
  const avg = avgLv(), seed = hashStr(id) + (S.battles || 0) * 7, rnd = seeded(seed);
  S.hired = S.hired || {};
  const pool = JOB_LIST.filter((j) => !j.unique && !j.hidden && j.tier <= (S.ch >= 3 ? 2 : S.ch >= 1 ? 1 : 0));
  const recruits = [0, 1, 2].map((k) => {
    const job = pick(pool, rnd).id, sex = rnd() < 0.5 ? 'm' : 'f', nm = pick(RECRUIT_NAMES[sex], rnd), lv = Math.max(1, Math.round(avg - 1 - rnd() * 2));
    return { key: `${seed}_${k}`, job, sex, name: nm, lv, price: 400 + lv * 90, look: { hair: pick(HAIR, rnd), skin: pick(SKIN, rnd) } };
  }).filter((r) => !S.hired[r.key]);
  body.append(el('div', { class: 'title small' }, T('招募', 'For hire')), el('div', { class: 'list' }, recruits.length ? recruits.map((r) => el('div', { class: 'item' }, el('div', { class: 'grow' }, el('div', { class: 'nm' }, T(r.name)), el('div', { class: 'small dim' }, `${T(JOBS[r.job].name)} Lv ${r.lv}`)),
    el('button', { class: 'btn', disabled: S.gold < r.price || S.roster.length >= MAX_ROSTER || null, onclick: () => { S.gold -= r.price; S.hired[r.key] = 1; S.roster.push(hire(r)); sfx('levelup'); toast(T(`${T(r.name)} 加入了隊伍！`, `${T(r.name)} joins the company!`)); redraw(); } }, `${r.price} G`))) : el('div', { class: 'dim small' }, T('今天沒有人想當傭兵。打一場仗後再來看看。', 'No one is looking for work today. Come back after a battle.'))));
  // jobs posted on the board
  const quests = QUESTS.filter((q) => q.at === id && q.ch <= S.ch && !S.done[q.id] && (!q.reward.needs || flag(q.reward.needs)));
  body.append(el('div', { class: 'title small', style: { marginTop: '14px' } }, T('委託', 'Jobs on the board')), el('div', { class: 'list' }, quests.length ? quests.map((q) => el('div', { class: 'item' }, el('div', { class: 'grow' }, el('div', { class: 'nm' }, T(q.name)), el('div', { class: 'small dim' }, T(`敵人等級 約 ${Math.max(q.lv, Math.round(avg - 1))} · 報酬 ${q.reward.gold} G${(q.reward.items || []).length ? ' ＋ 物品' : ''}`, `Foes ~Lv ${Math.max(q.lv, Math.round(avg - 1))} · ${q.reward.gold} G${(q.reward.items || []).length ? ' + items' : ''}`))),
    el('button', { class: 'btn primary', onclick: () => doQuest(q, id) }, T('接受', 'Take it')))) : el('div', { class: 'dim small' }, T('目前沒有委託。', 'No jobs right now.'))));
  // rumours
  const rumours = [
    !flag('lab_kings') && T('「古王陵的深處有一扇打不開的門……王都的酒館說，古戰場的亡靈跟它有關係。」', '"There\'s a door in the depths of Kingsbarrow no one can open… they say in the capital it has something to do with the ghosts of the Old Battlefield."'),
    !flag('lab_phantom') && T('「霧谷的湖會映出不存在的人。卡斯特礦山迷路的礦工說，他在坑道裡看到了同樣的鏡子。」', '"The lake in Mistvale reflects people who aren\'t there. A miner lost in Karst swears he saw the same mirror in the shafts."'),
    !flag('lab_dragon') && T('「日沙沙漠的蜥人在守護什麼東西。據說是龍死後回去的地方。」', '"The saurians of the Sundune guard something. They say it\'s where dragons go to die."'),
    T('「有些職業的人走過的地方，會發現地上埋著寶物。斥候就很會找。」', '"Some folk can spot treasure buried in the ground as they walk. Scouts are good at it."'),
    T('「盜賊能從敵人身上偷走裝備，有時候偷到的比店裡賣的還好。」', '"A thief can lift gear right off the enemy, and sometimes it\'s better than anything in the shops."'),
    T('「馴獸師能說服魔物加入。據說連龍都能。」', '"A beastmaster can talk monsters into joining. Even dragons, they say."'),
  ].filter(Boolean);
  body.append(el('div', { class: 'title small', style: { marginTop: '14px' } }, T('傳聞', 'Rumours')), el('div', { class: 'small', style: { lineHeight: '1.8' } }, pick(rumours, Math.random)));
}
function hire(r) {
  const u = makeUnit({ name: r.name, job: r.job, lv: r.lv, sex: r.sex, look: r.look });
  dressFoe(u, tierFor(r.lv), Math.random);
  gainJp(u, 60 + r.lv * 25, r.job);
  // a recruit knows the cheapest moves of their job already
  for (const a of JOBS[r.job].abilities.filter((a) => a.k === 'act').sort((a, b) => a.jp - b.jp).slice(0, 2)) u.learned.push(a.id);
  return u;
}

// the first battle's lessons
const TIPS = [
  [null, '【戰鬥的基本】輪到自己的角色時，選「移動」「行動」，最後「待機」並決定面向。移動和行動的順序可以對調。', '[Basics] On your unit’s turn, choose Move and Act, then Wait and pick a facing. You may move and act in either order.'],
  [null, '【面向與背擊】從背後攻擊，敵人無法閃避，傷害也更高。結束回合時，記得面向敵人。', '[Facing] Strike from behind and the foe can’t dodge and takes more damage. End your turn facing the enemy.'],
  [null, '【高低差】站在高處攻擊，傷害更高；弓箭也能射得更遠。Q/E 或左上角的按鈕可以旋轉視角。', '[Height] Attacks from high ground hit harder, and arrows fly farther. Q/E or the buttons at top left turn the camera.'],
  [null, '【行動順序】右上角是接下來的行動順序。速度越快，越常輪到。詠唱型的魔法要等一段時間才會發動。', '[Turn order] The order of upcoming turns is at top right. Faster units act more often. Charged spells take time to go off.'],
  [null, '【勝利條件】畫面上方是勝利條件。雷恩倒下並不會馬上輸，但全隊倒下就會失敗。', '[Goals] The victory condition is at the top. You only lose if your whole company falls.'],
];
// ---------------------------------------------------------------- building and fighting a battle
// spec: { theme, seed, w, h, lv, foes: [{ k, n, lv, name, who, boss, noDrop, retreat, drops, eq }], guests, goal, music, max, required, treasures }
async function fight(spec) {
  for (;;) {
    const party = await formation(spec.max || 5, spec.required || ['ren'], spec.note);
    if (party === 'again') continue;
    if (!party) return null;
    const rnd = Math.random, lv = spec.lv, tier = tierFor(lv);
    const foes = [];
    for (const f of spec.foes) for (let i = 0; i < (f.n || 1); i++) foes.push(makeOne(f, lv, tier, rnd, party));
    // story companions fighting beside you are veterans: a few levels above the battle
    const guests = (spec.guests || []).map((who) => castUnit(who, Math.max(lv, Math.round(avgLv())) + 3, tier));
    const map = makeMap({ theme: spec.theme || 'plains', w: spec.w || 12, h: spec.h || 12, seed: spec.seed || Math.floor(rnd() * 1e6), players: party.length + guests.length, foes: foes.length, treasures: spec.treasures ?? 2 });
    const units = [];
    const starts = [...map.starts];
    for (const u of party) { const [x, y] = starts.shift(); units.push({ unit: u, side: 'ally', x, y, leader: u.who === 'ren' }); }
    for (const u of guests) { const [x, y] = starts.shift() || map.starts[0]; units.push({ unit: u, side: 'guest', x, y }); }
    foes.forEach((f, i) => { const [x, y] = map.foeStarts[i % map.foeStarts.length]; units.push({ unit: f.u, side: 'foe', x, y, boss: !!f.boss, named: !!f.named, noDrop: !!f.noDrop, retreat: f.retreat || 0 }); });
    // treasure under the ground
    const leg = LEG_POOL.filter((id) => !S.bag[id] && !S.roster.some((u) => Object.values(u.eq).includes(id)));
    const treasure = map.treasure.map(([x, y]) => ({ x, y, item: roll(tier, rnd, leg) }));
    // the company's gear comes home whatever happens (an enemy thief's haul is returned after the fight)
    const keep = party.map((u) => [u, { ...u.eq }]);
    stopBackdrop();
    const B = await runBattle({ map, units, goal: spec.goal || { type: 'rout' }, tier, rnd, gold: S.gold, bag: S.bag, flags: S.flags, treasure, music: spec.music, intro: spec.tutorial && !flag('tutorial_seen') ? async () => { setFlag('tutorial_seen'); await playLines(TIPS, { bg: 'rgba(0,0,0,.15)' }); } : null });
    for (const [u, eq] of keep) u.eq = eq;
    S.gold = Math.max(0, B.gold) + B.goldWon;
    S.battles = (S.battles || 0) + 1;
    const loot = [...B.spoils, ...B.found];
    for (const id of loot) bagAdd(id);
    const recruits = B.over === 'win' ? B.recruits.filter(() => S.roster.length < MAX_ROSTER) : [];
    for (const r of recruits) { if (S.roster.length >= MAX_ROSTER) break; delete r.var; r.drops = undefined; S.roster.push(r); }
    await results(B, party, loot, recruits);
    save();
    return B;
  }
}
// after the fight: who grew, what was found
function results(B, party, loot, recruits) {
  return new Promise((resolve) => {
    music(B.over === 'win' ? 'world' : 'sad');
    const rows = party.map((u) => { const L = B.expLog[u.uid] || { exp: 0, jp: 0, lv: [], jlv: [] }; return el('div', { class: 'item' }, el('div', { class: 'grow' }, el('div', { class: 'nm' }, uname(u)), el('div', { class: 'small dim' }, `EXP +${L.exp} · JP +${L.jp}`)), L.lv.length ? el('span', { class: 'gold' }, `Lv ${u.lv}!`) : null, L.jlv.length ? el('span', { class: 'tag', style: { color: '#c8a0ff' } }, T(`職業 Lv ${L.jlv[L.jlv.length - 1]}`, `Job Lv ${L.jlv[L.jlv.length - 1]}`)) : null); });
    const counts = {}; for (const id of loot) counts[id] = (counts[id] || 0) + 1;
    const content = el('div', {}, el('div', { class: 'title', style: { fontSize: '22px' } }, B.over === 'win' ? T('勝利', 'Victory') : T('敗北', 'Defeat')),
      el('div', { class: 'list scroll', style: { maxHeight: '32vh', margin: '8px 0' } }, rows),
      el('div', { class: 'title small' }, T('戰利品', 'Spoils')), el('div', { class: 'small' }, `+${B.goldWon} G　`, Object.entries(counts).map(([id, n]) => el('span', { class: 'tag', style: { margin: '2px', color: ITEMS[id] && ITEMS[id].legend ? '#ffd040' : null } }, `${itemLabel(id)}${n > 1 ? ' ×' + n : ''}`))),
      recruits.length ? el('div', { class: 'small', style: { marginTop: '6px', color: '#7adf8a' } }, T('加入隊伍：', 'Joined: ') + recruits.map((u) => uname(u)).join(T('、', ', '))) : null);
    const close = sheet(content, { onBack: () => resolve(), outside: false });
    content.append(el('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '10px' } }, el('button', { class: 'btn primary', onclick: () => { close(); resolve(); } }, T('繼續', 'Continue'))));
  });
}

// ---------------------------------------------------------------- the story
async function playEvent(e) {
  busy = true;
  const chStart = !EVENTS.some((x) => x.ch === e.ch && S.done[x.id]);
  if (chStart && e.ch > 0 && S.ch < e.ch) { S.ch = e.ch; await chapterCard(CHAPTERS[e.ch]); }
  backdrop(); music(e.music || (e.battle && e.battle.music === 'boss' ? 'boss' : 'sad'));
  clear();
  // the opening scene plays once; backing out of the deployment and coming back goes straight to it
  S.seenPre = S.seenPre || {};
  if (!S.seenPre[e.id]) { await playLines(e.pre); S.seenPre[e.id] = true; save(); }
  if (e.battle) {
    for (;;) {
      const b = e.battle, avg = avgLv();
      const spec = { ...b, lv: Math.max(b.lv, Math.round(avg) - 2), required: ['ren'], max: b.max || 5, note: T(`敵人等級 約 ${Math.max(b.lv, Math.round(avg) - 2)}`, `Foes around Lv ${Math.max(b.lv, Math.round(avg) - 2)}`) };
      const B = await fight(spec);
      if (!B) { busy = false; return world(); }
      if (B.over === 'win') break;
      backdrop();
      const r = await modal(el('div', {}, T('戰鬥失敗了……要再挑戰一次嗎？', 'The battle was lost… try again?')), [T('再挑戰', 'Retry'), T('回到地圖', 'Back to the map')]);
      if (r !== 0) { busy = false; return world(); }
    }
  }
  backdrop(); clear();
  if (e.music === 'sad') music('sad');
  await playLines(e.post);
  // joins, gifts, flags
  for (const who of e.join || []) joinCast(who);
  if (e.give) { if (e.give.gold) S.gold += e.give.gold; for (const id of e.give.items || []) bagAdd(id); if ((e.give.items || []).length || e.give.gold) toast(T('得到了：', 'Received: ') + [...(e.give.items || []).map(itemLabel), e.give.gold ? `${e.give.gold} G` : ''].filter(Boolean).join(T('、', ', ')), 2600); }
  for (const f of e.flags || []) setFlag(f);
  S.done[e.id] = true;
  if (e.flags && e.flags.includes('ending')) return ending();
  // the next chapter opens when the last event of this one is done
  const nx = nextEvent(S.done);
  if (nx && nx.ch > S.ch) { S.ch = nx.ch; save(); await chapterCard(CHAPTERS[nx.ch]); }
  save(); busy = false; world();
}
function joinCast(who) {
  if (S.roster.some((u) => u.who === who)) return;
  const c = CAST[who], lv = Math.max(1, Math.round(avgLv()));
  const u = makeUnit({ who, name: c.name, job: c.job, lv, sex: c.sex, look: c.look });
  dressFoe(u, tierFor(lv), Math.random);
  gainJp(u, 100 + lv * 40, c.job);
  for (const a of JOBS[c.job].abilities.filter((a) => a.k === 'act').sort((a, b) => a.jp - b.jp).slice(0, 3)) u.learned.push(a.id);
  if (who === 'gordon') { gainJp(u, 900, 'knight'); u.learned.push('rendarmor', 'rendweapon', 'parry'); u.react = 'parry'; }
  if (S.roster.length >= MAX_ROSTER) { const out = S.roster.findIndex((x) => !x.who); if (out >= 0) S.roster.splice(out, 1); }
  S.roster.push(u);
  toast(T(`${T(c.name)} 加入了隊伍！`, `${T(c.name)} joins the company!`), 2400);
}
async function ending() {
  await rollEnding(ENDING);
  setFlag('lab_celestial'); setFlag('cleared'); S.ch = 5; S.node = 'citadel';
  save();
  await modal(el('div', {}, el('div', { class: 'title' }, T('感謝遊玩！', 'Thank you for playing!')), el('div', { style: { marginTop: '6px' } }, T('你可以繼續冒險：完成委託、挑戰四座隱藏迷宮、讓每個人學會所有的職業。天神迷宮已經在天上城開啟。', 'You can keep adventuring: finish the jobs on the boards, take on the four hidden labyrinths, and master every job. The Celestial Labyrinth has opened at the citadel.'))), [T('繼續', 'Continue')]);
  world();
}

// ---------------------------------------------------------------- skirmishes and tavern jobs
async function patrol(id, ambush = false) {
  const n = NODES[id], lv = Math.max(n.lv || 1, Math.round(avgLv() - 1)), rnd = Math.random, count = 4 + Math.floor(rnd() * 3);
  backdrop(); clear();
  if (ambush) await modal(el('div', {}, T(`在${T(n.name)}遭遇了敵人！`, `Ambushed in ${T(n.name)}!`)), [T('迎戰', 'Fight')]);
  const foes = []; for (let i = 0; i < count; i++) foes.push({ k: pick(n.foes, rnd), n: 1, lv: Math.floor(rnd() * 3) - 1 });
  const B = await fight({ theme: n.theme, lv, foes, seed: Math.floor(rnd() * 1e6), treasures: 1 + Math.floor(rnd() * 3), max: 5, required: [] });
  world(); void B;
}
async function doQuest(q, at) {
  const lv = Math.max(q.lv, Math.round(avgLv() - 1));
  const B = await fight({ theme: q.theme, lv, foes: q.foes.map((k, i) => ({ k, n: 1, boss: i === q.foes.length - 1 && !MONSTERS[k] })), seed: hashStr(q.id), treasures: 2, max: 5, required: [] });
  if (B && B.over === 'win') {
    S.done[q.id] = true; S.gold += q.reward.gold; for (const id of q.reward.items || []) bagAdd(id); if (q.reward.flag) setFlag(q.reward.flag);
    await modal(el('div', {}, el('div', { class: 'title' }, T('委託完成', 'Job done')), el('div', {}, `+${q.reward.gold} G　`, (q.reward.items || []).map((id) => el('span', { class: 'tag', style: { color: ITEMS[id] && ITEMS[id].legend ? '#ffd040' : null } }, itemLabel(id)))),
      q.reward.flag && q.reward.flag.startsWith('lab_') ? el('div', { style: { marginTop: '8px', color: '#c8a0ff' } }, T(`隱藏的地方出現在地圖上了：${T(Object.values(NODES).find((n) => n.unlock === q.reward.flag).name)}`, `A hidden place has appeared on the map: ${T(Object.values(NODES).find((n) => n.unlock === q.reward.flag).name)}`)) : null), [T('好', 'OK')]);
    save();
  }
  town(at);
}

// ---------------------------------------------------------------- the hidden labyrinths
async function labyrinth(id) {
  const L = LABYRINTHS[id];
  S.labyrinth = S.labyrinth || {};
  backdrop();
  for (;;) {
    const floor = Math.min(L.floors, (S.labyrinth[id] || 0) + 1);
    const done = (S.labyrinth[id] || 0) >= L.floors;
    const r = await modal(el('div', {}, el('div', { class: 'title' }, T(L.name)), el('div', { class: 'small', style: { margin: '6px 0' } }, T(L.desc)), el('div', {}, done ? T('已經走到了最深處。可以再次挑戰最後一層。', 'You have reached the bottom. You may fight the last floor again.') : T(`下一層：第 ${floor} 層（共 ${L.floors} 層）`, `Next: floor ${floor} of ${L.floors}`))), [done ? T('再戰最深處', 'Fight the bottom again') : T(`挑戰第 ${floor} 層`, `Fight floor ${floor}`), T('離開', 'Leave')]);
    if (r !== 0) return world();
    const lv = Math.round(L.lv + (floor - 1) * L.step), rnd = Math.random, gd = L.guardians[floor];
    const foes = [];
    if (L.mirror) { for (let i = 0; i < 4; i++) foes.push({ k: 'mirror', n: 1 }); foes.push({ k: pick(L.foes, rnd), n: 1 }); }
    else for (let i = 0; i < 4 + (floor % 3); i++) foes.push({ k: pick(L.foes, rnd), n: 1, lv: Math.floor(rnd() * 3) - 1 });
    if (gd) foes.push({ k: gd.mon, n: 1, boss: true, name: gd.name, lv: MONSTERS[gd.mon] && MONSTERS[gd.mon].boss ? 2 : 4 });
    const B = await fight({ theme: L.themes[floor % L.themes.length], lv, foes, seed: hashStr(id) + floor * 101, treasures: 2 + (floor % 2), max: 5, required: [], goal: gd ? { type: 'boss', name: gd.name || MONSTERS[gd.mon].name } : { type: 'rout' }, music: gd ? 'boss' : 'battle' });
    backdrop();
    if (!B) return world();
    if (B.over !== 'win') { toast(T('被趕出了迷宮……', 'Driven out of the labyrinth…'), 2200); return world(); }
    S.labyrinth[id] = Math.max(S.labyrinth[id] || 0, floor);
    // a chest on every floor
    const t = tierFor(lv), chest = GEAR.filter((g) => !g.legend && g.tier === Math.min(10, t + 1) && g.variant);
    const got = [pick(chest, rnd).id, rnd() < 0.5 ? 'hipotion' : 'hiether'];
    if (floor === L.floors) { for (const it of L.prize.items) got.push(it); if (L.prize.flag) { setFlag(L.prize.flag); setFlag('seen_' + L.prize.flag.slice(4)); } }
    for (const it of got) bagAdd(it);
    S.gold += 200 * floor;
    await modal(el('div', {}, el('div', { class: 'title' }, T(`第 ${floor} 層 突破`, `Floor ${floor} cleared`)), el('div', {}, T('寶箱裡有：', 'In the chest: '), got.map((g) => el('span', { class: 'tag', style: { color: ITEMS[g] && ITEMS[g].legend ? '#ffd040' : null, margin: '2px' } }, itemLabel(g)))),
      floor === L.floors && L.prize.flag ? el('div', { style: { color: '#c8a0ff', marginTop: '8px' } }, T(`隱藏職業「${T(JOBS[L.prize.flag.slice(4)].name)}」解放了！`, `The hidden job "${T(JOBS[L.prize.flag.slice(4)].name)}" is now open!`)) : null), [T('繼續', 'Continue')]);
    save();
  }
}

// ---------------------------------------------------------------- boot
import('./ui/battleui.js').then(({ reportError }) => { addEventListener('error', (e) => reportError(e.error || e.message)); addEventListener('unhandledrejection', (e) => reportError(e.reason)); });
addEventListener('pointerdown', unlock, { once: true });
initCloud(() => { if (!S) title(); });
title();
window.__ss = { get S() { return S; }, world, title, fight };
