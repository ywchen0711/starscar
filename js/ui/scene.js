// Story scenes: chapter cards, conversations with portraits, and the ending.
import { T } from '../i18n.js';
import { el, clear, $ui, pushKeys, wait } from './dom.js';
import { portrait } from './sprites.js';
import { CAST } from '../data/story.js';
import { makeUnit } from '../core/unit.js';
import { S } from '../state.js';
import { music } from '../audio.js';

const fill = (s) => s.replace(/\{ren\}/g, S ? S.name : 'Ren');
const castUnit = (who) => { const c = CAST[who]; if (!c) return null; if (c.mon) return { mon: c.mon }; return makeUnit({ job: c.job, look: c.look, sex: c.sex }); };
const speakerName = (sp) => (sp === 'ren' ? (S ? S.name : 'Ren') : Array.isArray(sp) ? T(sp) : CAST[sp] && CAST[sp].name ? T(CAST[sp].name) : '');

// play a list of lines; tap or Enter to go on, Escape to skip the rest
export function playLines(lines, { bg } = {}) {
  return new Promise((resolve) => {
    if (!lines || !lines.length) return resolve();
    const ui = $ui(), box = el('div', { class: 'panel dialog' }), shade = el('div', { style: { position: 'absolute', inset: 0, background: bg || 'rgba(0,0,0,.35)' } });
    ui.append(shade, box);
    let i = 0, typing = null, full = '';
    const show = () => {
      const [sp, zh, en] = lines[i]; full = fill(T(zh, en));
      clear(box);
      const pu = sp && typeof sp === 'string' ? castUnit(sp) : null;
      if (pu) { const c = el('canvas', { width: 96, height: 96 }); c.getContext('2d').drawImage(portrait(pu, 96), 0, 0); box.append(c); }
      const txt = el('div', { class: 'text' + (sp ? '' : ' narration') });
      box.append(el('div', { style: { flex: 1, minWidth: 0 } }, sp ? el('div', { class: 'speaker' }, speakerName(sp)) : null, txt), el('span', { class: 'next' }, '▼'));
      let k = 0; clearInterval(typing);
      typing = setInterval(() => { k += 2; txt.textContent = full.slice(0, k); if (k >= full.length) { clearInterval(typing); typing = null; } }, 18);
      box._txt = txt;
    };
    const next = () => { if (typing) { clearInterval(typing); typing = null; box._txt.textContent = full; return; } i++; if (i >= lines.length) return done(); show(); };
    const done = () => { off(); clearInterval(typing); box.remove(); shade.remove(); resolve(); };
    box.addEventListener('click', next); shade.addEventListener('click', next);
    const off = pushKeys((k) => { if (k === 'ok') next(); else if (k === 'back') done(); });
    show();
  });
}
export function chapterCard(ch) {
  return new Promise((resolve) => {
    const c = ch.title ? ch : null;
    const card = el('div', { class: 'chaptercard' }, el('div', { class: 'k' }, T('— 星痕戰旗 —', '— STARSCAR TACTICS —')), el('div', { class: 't' }, T(c.title)), el('div', { class: 'd' }, fill(T(c.text)).split('\n').map((l) => el('div', {}, l))), el('div', { class: 'small dim', style: { marginTop: '28px' } }, T('點一下繼續', 'Tap to continue')));
    $ui().append(card); music('title');
    const go = () => { off(); card.remove(); resolve(); };
    card.addEventListener('click', go); const off = pushKeys((k) => { if (k === 'ok' || k === 'back') go(); });
  });
}
export async function rollEnding(lines) {
  const ui = clear(), box = el('div', { class: 'chaptercard', style: { justifyContent: 'flex-start', overflow: 'hidden' } }), inner = el('div', { style: { transform: 'translateY(100vh)', transition: 'none' } });
  for (const l of lines) inner.append(el('div', { class: 'd', style: { margin: '14px 0', fontSize: '18px' } }, l[0] ? fill(T(l[0], l[1] || l[0])) : ' '));
  box.append(inner); ui.append(box); music('title');
  await wait(100);
  const h = inner.scrollHeight + innerHeight;
  inner.style.transition = `transform ${Math.round(h / 34)}s linear`; inner.style.transform = `translateY(${-inner.scrollHeight}px)`;
  await new Promise((r) => { const off = pushKeys((k) => { if (k === 'ok' || k === 'back') { off(); r(); } }); box.addEventListener('click', () => { off(); r(); }); setTimeout(() => { off(); r(); }, Math.round(h / 34) * 1000 + 1500); });
  box.remove();
}
