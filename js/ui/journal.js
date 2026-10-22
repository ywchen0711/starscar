// The journal: the story so far, every conversation to read again, and the people you've met.
import { T } from '../i18n.js';
import { el, clear, pushKeys } from './dom.js';
import { portrait } from './sprites.js';
import { fill, castUnit, speakerName } from './scene.js';
import { EVENTS, CHAPTERS, CAST, nextEvent } from '../data/story.js';
import { NODES } from '../data/world.js';
import { SYNOPSIS, BIOS } from '../data/journal.js';
import { S } from '../state.js';

const face = (who, n = 40) => { const u = castUnit(who); if (!u) return null; const c = el('canvas', { width: n, height: n, style: { width: n + 'px', height: n + 'px', imageRendering: 'pixelated', borderRadius: '4px', border: '1px solid #6a5a3a', flex: 'none' } }); c.getContext('2d').drawImage(portrait(u, n), 0, 0); return c; };
const done = () => EVENTS.filter((e) => S.done[e.id]);
// the next thing to do, in a sentence
export function objective() {
  const nx = nextEvent(S.done);
  if (!nx) return T('故事已經結束。隱藏迷宮和委託還在等著你。', 'The story is over. The hidden labyrinths and the jobs on the boards still wait.');
  return T(`下一步：前往「${T(NODES[nx.at].name)}」——${T(nx.name)}`, `Next: go to ${T(NODES[nx.at].name)} — ${T(nx.name)}`);
}
// who you have met: anyone who has spoken or fought beside you in a finished event, and those who joined
function met() {
  const seen = new Set(['ren']);
  for (const e of done()) {
    for (const l of [...(e.pre || []), ...(e.post || [])]) if (typeof l[0] === 'string' && CAST[l[0]]) seen.add(l[0]);
    for (const g of (e.battle && e.battle.guests) || []) seen.add(g);
    for (const j of e.join || []) seen.add(j);
  }
  return Object.keys(BIOS).filter((k) => seen.has(k));
}

export function journal(onBack, start = 'story') {
  let tab = start, pick = null;
  const ui = clear(), scr = el('div', { class: 'screen', style: { background: 'radial-gradient(ellipse at 70% 0%, #2a2440, #0c0d18 70%)' } });
  const body = el('div', { class: 'panel scroll', style: { flex: 1, minWidth: 0 } });
  scr.append(el('div', { class: 'topbar' }, el('span', { class: 'title' }, T('記錄', 'Journal')), el('span', { class: 'sp' }), el('button', { class: 'btn', onclick: () => { off(); onBack(); } }, T('返回', 'Back'))), el('div', { class: 'cols' }, body));
  ui.append(scr);
  const off = pushKeys((k) => { if (k === 'back') { off(); onBack(); } });
  const draw = () => {
    clear(body).append(el('div', { class: 'tabs' }, [['story', T('劇情', 'The story')], ['talk', T('對話回顧', 'Conversations')], ['people', T('人物', 'People')]].map(([k, l]) => el('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; draw(); } }, l))));
    if (tab === 'story') storyTab(); else if (tab === 'talk') talkTab(); else peopleTab();
  };
  // ---------------------------------------------------------------- the story so far
  function storyTab() {
    body.append(el('div', { class: 'panel', style: { margin: '4px 0 12px', borderColor: '#e8c46a' } }, el('div', { class: 'pix', style: { color: '#ffe9a8' } }, objective())));
    for (let c = Math.min(S.ch, CHAPTERS.length - 1); c >= 0; c--) {
      const evs = EVENTS.filter((e) => e.ch === c && S.done[e.id]);
      if (c > S.ch || (c === S.ch && !evs.length && c > 0 && !S.flags[`ch${c - 1}_done`])) continue;
      const box = el('div', { style: { marginBottom: '18px' } }, el('div', { class: 'title', style: { fontSize: '19px' } }, T(CHAPTERS[c].title)),
        el('div', { class: 'small dim', style: { margin: '4px 0 8px', lineHeight: '1.8' } }, fill(T(CHAPTERS[c].text)).split('\n').map((l) => el('div', {}, l))));
      for (const e of evs) box.append(el('div', { class: 'item', style: { alignItems: 'flex-start' }, onclick: () => { pick = e.id; tab = 'talk'; draw(); } },
        el('span', { class: 'tag', style: { marginTop: '3px' } }, T(NODES[e.at].name)), el('div', { class: 'grow' }, el('div', { class: 'nm' }, T(e.name)), el('div', { class: 'small', style: { lineHeight: '1.7' } }, fill(T(...(SYNOPSIS[e.id] || ['', ''])))))));
      if (!evs.length) box.append(el('div', { class: 'small dim' }, T('（這一章才剛開始）', '(This chapter has only just begun.)')));
      body.append(box);
    }
  }
  // ---------------------------------------------------------------- reading conversations again
  function talkTab() {
    const evs = done();
    if (!evs.length) { body.append(el('div', { class: 'dim' }, T('還沒有可以回顧的對話。', 'Nothing to look back on yet.'))); return; }
    const cur = EVENTS.find((e) => e.id === pick) || evs[evs.length - 1];
    const list = el('div', { class: 'list scroll', style: { width: 'min(260px, 100%)', maxHeight: '70vh', flex: 'none' } });
    for (const e of [...evs].reverse()) list.append(el('div', { class: 'item' + (e === cur ? ' sel' : ''), onclick: () => { pick = e.id; draw(); } }, el('div', { class: 'grow' }, el('div', { class: 'nm small' }, T(e.name)), el('div', { class: 'small dim' }, T(CHAPTERS[e.ch].title).split(/[　:：]/)[0]))));
    const lines = el('div', { class: 'scroll', style: { flex: 1, minWidth: 0, maxHeight: '70vh', paddingRight: '6px' } });
    const block = (title, ls) => {
      if (!ls || !ls.length) return;
      lines.append(el('div', { class: 'title small', style: { margin: '10px 0 6px' } }, title));
      for (const [sp, zh, en] of ls) lines.append(el('div', { class: 'row', style: { alignItems: 'flex-start', flexWrap: 'nowrap', margin: '6px 0' } },
        sp && typeof sp === 'string' ? face(sp) : el('div', { style: { width: '40px', flex: 'none' } }),
        el('div', { style: { minWidth: 0 } }, sp ? el('div', { class: 'pix small', style: { color: '#e8c46a' } }, speakerName(sp)) : null, el('div', { class: sp ? '' : 'narration', style: { lineHeight: '1.7' } }, fill(T(zh, en))))));
    };
    lines.append(el('div', { class: 'title', style: { fontSize: '19px' } }, T(cur.name)), el('div', { class: 'small dim' }, `${T(CHAPTERS[cur.ch].title)} · ${T(NODES[cur.at].name)}`));
    block(T('戰鬥之前', 'Before the battle'), cur.pre); block(T('戰鬥之後', 'After the battle'), cur.post);
    body.append(el('div', { class: 'row', style: { alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' } }, list, lines));
  }
  // ---------------------------------------------------------------- the people
  function peopleTab() {
    const grid = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '10px' } });
    for (const who of met()) {
      const b = BIOS[who], name = who === 'ren' ? S.name : T(CAST[who].name);
      const inParty = S.roster.some((u) => u.who === who);
      const more = (b.more || []).filter(([id]) => S.done[id]).map(([, t]) => el('div', { class: 'small', style: { marginTop: '6px', lineHeight: '1.7', color: '#d8d0e8' } }, '▸ ' + fill(T(...t))));
      grid.append(el('div', { class: 'panel', style: { display: 'flex', gap: '12px', alignItems: 'flex-start' } }, face(who, 64),
        el('div', { style: { minWidth: 0 } }, el('div', { class: 'title' }, name), el('div', { class: 'small dim' }, T(...b.role) + (inParty ? T('・隊伍中', ' · in the company') : '')),
          el('div', { class: 'small', style: { marginTop: '6px', lineHeight: '1.7' } }, fill(T(...b.text))), more)));
    }
    body.append(grid);
  }
  draw();
}
export const bioOf = (who) => (BIOS[who] ? { role: T(...BIOS[who].role), text: fill(T(...BIOS[who].text)), more: (BIOS[who].more || []).filter(([id]) => S.done[id]).map(([, t]) => fill(T(...t))) } : null);
