# Builds tmp-drive.html: the real game plus a script that clicks through it to a given stage and records errors in the title.
# python tools/drive.py; then open tmp-drive.html?stage=N (1 title, 2 world, 3 dialogue, 4 formation, 5 battle, 6 party screen)
import os, re
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(here, 'index.html'), encoding='utf-8').read()
pre = """<script>window.__errs = []; addEventListener('error', (e) => window.__errs.push(e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno)); addEventListener('unhandledrejection', (e) => window.__errs.push('rej ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));</script>
"""
drv = """<script type="module">
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const stage = +(new URLSearchParams(location.search).get('stage') || 1);
const key = (k) => dispatchEvent(new KeyboardEvent('keydown', { key: k }));
const clickText = (t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t)); if (b) b.click(); return !!b; };
const report = (m) => { document.title = m + ' | errs: ' + window.__errs.join(' || '); };
try {
  await wait(800);
  if ((stage >= 8 && stage < 15) || stage >= 18) {
    const st = await import('./js/state.js'), un = await import('./js/core/unit.js');
    const S = st.newGame('Ren'); S.ch = 2; S.node = 'saltreach'; S.gold = 20000; S.visited = ['aldmoor', 'greystone', 'saltreach', 'heronmoor'];
    for (const [j, who, n] of [['cleric', 'sylla', ['希兒', 'Sylla']], ['thief', 'rowena', ['洛溫娜', 'Rowena']], ['monk', 'bram', ['布倫', 'Bram']], ['corsair', 'marlow', ['瑪洛', 'Marlow']]]) { const u = un.makeUnit({ who, name: n, job: j, lv: 14 }); un.dressFoe(u, 3, Math.random); un.gainJp(u, 900, j); S.roster.push(u); }
    S.roster[0].lv = 15; un.gainJp(S.roster[0], 1200, 'sellsword');
    for (const id of ['sword4', 'sword5_keen', 'greatsword4', 'heavy4', 'helm4', 'shield4', 'boots_move', 'ring_atk', 'axe5', 'potion', 'hipotion']) st.bagAdd(id, 2);
    const story = await import('./js/data/story.js'); for (const e of story.EVENTS) { if (e.id === 'c2_5') break; S.done[e.id] = true; }
    st.setS(S);
    window.__ss.world(); await wait(800);
    if (stage >= 18 && stage <= 20) { clickText('記錄'); await wait(500); const tb = (t) => { const b = [...document.querySelectorAll('.tabs button')].find((x) => x.textContent.includes(t)); if (b) b.click(); }; if (stage === 19) tb('對話'); if (stage === 20) tb('人物'); await wait(400); report('journal ' + stage); }
    const tab = (t) => { const b = [...document.querySelectorAll('.tabs button')].find((x) => x.textContent.includes(t)); if (b) b.click(); };
    if (stage >= 18 && stage <= 20) { }
    else if (stage === 21) { clickText('隊伍'); await wait(500); [...document.querySelectorAll('.item')].find((x) => x.textContent.includes('希兒')).click(); await wait(400); report('bio'); }
    else if (stage === 8) { report('world2'); }
    else if (stage <= 12) {
      clickText('隊伍'); await wait(500);
      if (stage === 10) { tab('裝備'); await wait(300); const it = document.querySelector('.item'); [...document.querySelectorAll('.panel .item')].find((x) => x.textContent.includes('武器')).click(); await wait(500); }
      if (stage === 11) { tab('職業'); await wait(300); }
      if (stage === 12) { tab('技能'); await wait(300); }
      report('party ' + stage);
    } else {
      [...document.querySelectorAll('button')].find((b) => b.textContent.includes('進入城鎮')).click(); await wait(600);
      if (stage === 14) { tab('酒館'); await wait(300); }
      report('town ' + stage);
    }
  } else if (stage === 1) { report('title'); } else {
    clickText('新的遊戲') || clickText('New Game'); await wait(300);
    clickText('決定') || clickText('OK'); await wait(400);
    document.querySelector('.chaptercard') && document.querySelector('.chaptercard').click(); await wait(500);
    if (stage === 2) { key('Escape'); await wait(400); clickText('出擊'); await wait(1500); report('battle-direct'); }
    else if (stage === 6) { report('party'); }
    else {
      await wait(600);
      if (stage === 3) report('dialogue');
      else {
        key('Escape'); await wait(500);
        if (stage === 4) report('formation');
        else if (stage === 17) {
          clickText('出擊'); await wait(2000);
          const out = [];
          for (let k = 0; k < 60 && !document.querySelector('.cmd .menu'); k++) { if (document.querySelector('.dialog')) key('Escape'); await wait(250); }
          for (let turn = 0; turn < 3; turn++) {
            for (let k = 0; k < 80 && !document.querySelector('.cmd .menu'); k++) { if (document.querySelector('.dialog')) key('Escape'); await wait(250); }
            const B = window.__B, u = B.turn; if (!u) { out.push('no turn'); break; }
            // stand next to a foe (from the side), then Act → Attack → confirm
            const f = B.units.find((o) => o.side === 'foe' && !o.dead && !o.gone);
            const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [f.x + dx, f.y + dy]).find(([x, y]) => { const t = B.map.tiles[y * B.map.w + x]; return t && !t.block && !t.obj && !B.units.some((o) => !o.gone && o.x === x && o.y === y) && Math.abs(t.h - B.map.tiles[f.y * B.map.w + f.x].h) <= 3; });
            if (spot) { u.x = spot[0]; u.y = spot[1]; }
            const act = [...document.querySelectorAll('.cmd .menu button')].find((b) => b.textContent.includes('行動')); act.click(); await wait(300);
            const atk = [...document.querySelectorAll('.cmd .menu button')].find((b) => b.textContent.includes('攻擊')); atk.click(); await wait(400);
            key('Enter'); await wait(3000);
            out.push(`turn${turn} foeHP ${f.hp}/${f.s.hp} acted=${u.acted}`);
            report('attack ' + out.join(' ; ')); if (window.__errs.length) break;
            const wb = [...document.querySelectorAll('.cmd .menu button')].find((b) => b.textContent.includes('待機')); if (wb) { wb.click(); await wait(300); key('Enter'); await wait(500); }
          }
          report('attack ' + out.join(' ; '));
        }
        else if (stage === 16) {
          const m = document.querySelector('.modal'); const had = !!m;
          if (m) m.dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait(400);
          const still = !!document.querySelector('.modal');
          clickText('返回'); await wait(800);
          const ev = [...document.querySelectorAll('button')].find((b) => b.textContent.startsWith('▶')); if (ev) ev.click(); await wait(1200);
          report(`formation=${had} afterOutsideClick=${still} reenter: dialog=${!!document.querySelector('.dialog')} formation=${!!document.querySelector('.modal')}`);
        }
        else if (stage === 15) {
          clickText('出擊'); await wait(2500);
          const out = [];
          for (let turn = 0; turn < 4; turn++) {
            for (let k = 0; k < 60 && !document.querySelector('.cmd .menu'); k++) { if (document.querySelector('.dialog')) key('Escape'); await wait(250); }
            const B = window.__B, u = B.turn; if (!u) { out.push('no turn'); break; }
            const before = [u.x, u.y];
            key('Enter'); await wait(300);
            for (const k of ['ArrowUp', 'ArrowUp', 'ArrowRight']) { key(k); await wait(80); }
            key('Enter'); await wait(2500);
            const others = B.units.filter((o) => o !== u && !o.gone && o.x === u.x && o.y === u.y);
            out.push(`${before}->${u.x},${u.y}${others.length ? ' OVERLAP' : ''}`);
            for (let k = 0; k < 6 && document.querySelector('.cmd .menu'); k++) { const wb = [...document.querySelectorAll('.cmd .menu button')].find((b) => b.textContent.includes('待機')); if (wb) { wb.click(); await wait(300); key('Enter'); await wait(300); break; } key('Escape'); await wait(200); }
          }
          await wait(2000);
          const bad = window.__B.units.filter((a) => !a.gone && window.__B.units.some((b) => b !== a && !b.gone && b.x === a.x && b.y === a.y));
          report('moves ' + out.join(' ; ') + ' overlaps ' + bad.length);
        }
        else if (stage === 5) { clickText('出擊'); await wait(2500); report('battle ' + (document.querySelector('.goal') || {}).textContent); }
        else {
          clickText('出擊'); await wait(2500);
          const log = [];
          for (let turn = 0; turn < 3; turn++) {
            for (let k = 0; k < 40 && !document.querySelector('.cmd .menu'); k++) await wait(250);
            if (!document.querySelector('.cmd .menu')) { log.push('no menu'); break; }
            key('Enter'); await wait(300); key('ArrowUp'); await wait(100); key('Enter'); await wait(1200);
            key('ArrowDown'); key('Enter'); await wait(300); key('Enter'); await wait(300); key('Enter'); await wait(1500);
            if (document.querySelector('.cmd .menu')) { const items = [...document.querySelectorAll('.cmd .menu button')].map((b) => b.textContent); log.push(items.join('/')); }
            for (let k = 0; k < 5 && document.querySelector('.cmd .menu'); k++) { key('Escape'); await wait(150); }
            const wb = [...document.querySelectorAll('.cmd .menu button')].find((b) => b.textContent.includes('待機')); if (wb) { wb.click(); await wait(300); key('Enter'); await wait(300); }
            log.push('turn ' + turn);
          }
          await wait(3000);
          report('played ' + log.join(' ; '));
        }
      }
    }
  }
} catch (e) { report('ERR ' + e.stack); }
</script>"""
s = s.replace('<script type="importmap">', pre + '<script type="importmap">', 1)
s = s.replace('<script src="/hub.js" data-pos="top-left" defer></script>', drv)
open(os.path.join(here, 'tmp-drive.html'), 'w', encoding='utf-8').write(s)
print('ok')
