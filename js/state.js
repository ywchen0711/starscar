// The saved game: your company, your bag, your gold, where you are in the story, and everything you've found.
import { makeUnit, setUid } from './core/unit.js';

export const KEY = 'ss.save.v1', GAME = 'starscar';
export let S = null;
export const setS = (v) => { S = v; if (S) setUid(1 + Math.max(0, ...S.roster.map((u) => u.uid), S.uidTop || 0)); };
let cloud = null;
export async function initCloud(onPulled) { try { cloud = await import('/save.js'); if (await cloud.pull(GAME, KEY) && onPulled) onPulled(); } catch (e) { cloud = null; } }
export function save() { if (!S) return; try { S.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } if (cloud) try { cloud.touch(GAME, KEY); } catch (e) { /* ignore */ } }
export function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); return d && d.v === 1 ? d : null; } catch (e) { return null; } }
export function newGame(name) {
  const ren = makeUnit({ who: 'ren', name, job: 'sellsword', lv: 1, sex: 'm', look: { hair: '#3a2a1a', skin: '#f0d0b0' } });
  ren.eq = { w: 'sword1', s: 'shield1', h: 'hat1', b: 'light1', a: null };
  S = { v: 1, name, ch: 0, node: 'aldmoor', flags: {}, roster: [ren], bag: { potion: 4, phoenix: 1, antidote: 2 }, gold: 400, done: {}, time: 0, kills: 0, battles: 0, labyrinth: {}, seen: {}, uidTop: ren.uid };
  return S;
}
// the bag holds gear and consumables by id
export const bagAdd = (id, n = 1) => { S.bag[id] = (S.bag[id] || 0) + n; };
export const bagTake = (id, n = 1) => { if ((S.bag[id] || 0) < n) return false; S.bag[id] -= n; if (!S.bag[id]) delete S.bag[id]; return true; };
export const flag = (k) => !!(S && S.flags[k]);
export const setFlag = (k, v = true) => { S.flags[k] = v; };
export const unitByWho = (who) => S.roster.find((u) => u.who === who);
