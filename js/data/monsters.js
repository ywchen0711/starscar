// Monsters: sixteen families with three ranks each, their own skills, and what they leave behind.
// Human foes are made from the jobs instead (see core/unit.js).
import { act, mag, rea } from './jobdefs.js';

// monster skills use the same fields as job abilities
export const MSKILLS = Object.fromEntries([
  act('m_bite', '撕咬', 'Bite', 0, { d: ['atk', 1.1] }),
  act('m_claw', '利爪', 'Rend', 0, { d: ['atk', 1.2] }),
  act('m_howl', '嚎叫', 'Howl', 0, { r: 0, a: 2, t: 'ally', buf: [['atk', 20, 3]] }),
  act('m_pounce', '飛撲', 'Pounce', 0, { r: 3, d: ['atk', 1.0] }),
  act('m_goo', '黏液', 'Goo', 0, { r: 2, d: ['atk', 0.7, 'water'], st: [['slow', 40, 2]] }),
  act('m_split', '酸液', 'Acid Spit', 0, { r: 3, d: ['mag', 0.9, 'water'], buf: [['def', -20, 3]] }),
  act('m_club', '棍擊', 'Club', 0, { d: ['atk', 1.15], st: [['stun', 15, 1]] }),
  act('m_steal', '搶奪', 'Snatch', 0, { hit: 50, steal: 'item' }),
  act('m_bonecut', '骨刃', 'Bone Blade', 0, { d: ['atk', 1.1, 'dark'] }),
  act('m_curse', '詛咒', 'Curse', 0, { r: 3, st: [['silence', 40, 3], ['blind', 30, 3]], magic: true, mp: 4 }),
  act('m_wail', '哀號', 'Wail', 0, { r: 0, a: 2, st: [['sleep', 30, 2]], magic: true, mp: 6 }),
  act('m_touch', '冥觸', 'Chill Touch', 0, { d: ['mag', 1.0, 'dark'], drain: 1, magic: true }),
  act('m_peck', '啄擊', 'Peck', 0, { d: ['atk', 1.0] }),
  act('m_gale', '振翅', 'Wingbeat', 0, { r: 3, a: 1, d: ['atk', 0.8, 'wind'] }),
  act('m_tail', '尾擊', 'Tail Lash', 0, { r: 1, a: 1, d: ['atk', 0.9] }),
  act('m_spear', '蜥人槍', 'Saurian Spear', 0, { r: 2, d: ['atk', 1.1] }),
  act('m_regenerate', '再生', 'Regenerate', 0, { r: 0, t: 'self', h: ['pct', 0.25] }),
  act('m_smash', '巨力', 'Smash', 0, { d: ['atk', 1.5], ct: 1 }),
  act('m_flame', '火焰', 'Flame', 0, { r: 3, a: 1, d: ['mag', 1.1, 'fire'], magic: true, mp: 6 }),
  act('m_firebreath', '火焰吐息', 'Fire Breath', 0, { r: 3, a: 'line', d: ['mag', 1.3, 'fire'] }),
  act('m_icebreath', '冰霜吐息', 'Frost Breath', 0, { r: 3, a: 'line', d: ['mag', 1.3, 'ice'] }),
  act('m_boltbreath', '雷電吐息', 'Storm Breath', 0, { r: 3, a: 'line', d: ['mag', 1.3, 'bolt'] }),
  act('m_stonegaze', '石化凝視', 'Stone Gaze', 0, { r: 3, st: [['stop', 35, 2]], magic: true, mp: 8 }),
  act('m_web', '蛛網', 'Web', 0, { r: 3, a: 1, st: [['slow', 50, 3]] }),
  act('m_venom', '毒牙', 'Venom Fang', 0, { d: ['atk', 0.9], st: [['poison', 60, 4]] }),
  act('m_constrict', '纏繞', 'Constrict', 0, { d: ['atk', 1.0], st: [['stop', 25, 1]] }),
  act('m_root', '根縛', 'Root Snare', 0, { r: 3, st: [['stop', 30, 2]], d: ['atk', 0.5, 'earth'] }),
  act('m_spore', '孢子', 'Spores', 0, { r: 0, a: 2, st: [['sleep', 35, 2], ['poison', 35, 3]] }),
  act('m_quake', '震地', 'Quake', 0, { r: 0, a: 2, d: ['atk', 1.0, 'earth'] }),
  act('m_crystal', '星晶光', 'Crystal Ray', 0, { r: 5, a: 'line', d: ['mag', 1.3, 'holy'], magic: true, mp: 8 }),
  act('m_explode', '自爆', 'Self-Destruct', 0, { r: 0, a: 1, d: ['pct', 0.6], suicide: 1 }),
  act('m_sting', '尾針', 'Sting', 0, { d: ['atk', 1.0], st: [['poison', 50, 3]] }),
  act('m_judgement', '天之審判', 'Heavenly Judgement', 0, { r: 5, a: 1, d: ['mag', 1.6, 'holy'], ct: 2, magic: true, mp: 12 }),
  act('m_halo', '光輪', 'Halo Ring', 0, { r: 0, a: 2, d: ['mag', 1.2, 'holy'], magic: true, mp: 10 }),
  act('m_bless', '天之祝福', 'Blessing', 0, { r: 3, a: 1, t: 'ally', h: ['mag', 1.3], magic: true, mp: 8 }),
  act('m_darkflare', '暗黑焰', 'Dark Flare', 0, { r: 4, a: 1, d: ['mag', 1.4, 'dark'], magic: true, mp: 10 }),
  act('m_terror', '恐懼', 'Terror', 0, { r: 0, a: 3, buf: [['atk', -20, 3], ['spd', -10, 3]] }),
  act('m_meteor', '流星雨', 'Meteor Shower', 0, { r: 6, a: 2, d: ['mag', 1.8], ct: 3, magic: true, mp: 20 }),
  act('m_timeflux', '時間扭曲', 'Time Flux', 0, { r: 0, a: 'all', st: [['slow', 40, 2]], magic: true, mp: 16 }),
  act('m_annihilate', '湮滅', 'Annihilation', 0, { r: 5, a: 3, d: ['mag', 2.2, 'dark'], ct: 4, magic: true, mp: 30 }),
].map((a) => [a.id, a]));
export const MREACT = {
  m_counter: rea('m_counter', '反擊', 'Counter', 0, { on: 'phys', fx: 'counter', p: 30 }),
  m_thick: rea('m_thick', '硬皮', 'Thick Hide', 0, { on: 'phys', fx: 'dmgcut', p: 30 }),
  m_regen: rea('m_regen', '自癒', 'Mending', 0, { on: 'any', fx: 'regen', p: 40 }),
  m_reflect: rea('m_reflect', '魔力反射', 'Spell Mirror', 0, { on: 'magic', fx: 'magcounter', p: 40 }),
};

// families: [id, look, ranks [[中文, English, colours]], growth [hp, mp, atk, def, mag, res, spd], move, jump, skills, weak, resist, reaction, flying]
const FAM = [
  ['wolf', 'wolf', [['灰狼', 'Grey Wolf', ['#8a8a96', '#d0d0e0']], ['戰狼', 'War Wolf', ['#6a5a4a', '#e0c890']], ['冥狼', 'Hellhound', ['#2a1a2a', '#ff5a3a']]], [0.95, 0.3, 1.1, 0.8, 0.4, 0.7, 1.25], 5, 3, ['m_bite', 'm_pounce', 'm_howl'], ['fire'], [], 'm_counter'],
  ['ooze', 'ooze', [['軟泥怪', 'Ooze', ['#5aaa5a', '#b0f0a0']], ['酸泥怪', 'Acid Ooze', ['#aaaa3a', '#f0f080']], ['熔岩泥', 'Magma Ooze', ['#c84a1a', '#ffb060']]], [1.1, 0.5, 0.85, 1.1, 0.8, 0.9, 0.7], 3, 2, ['m_goo', 'm_split', 'm_explode'], ['fire', 'bolt'], ['water'], 'm_regen'],
  ['goblin', 'goblin', [['小鬼', 'Goblin', ['#6a8a3a', '#a07848']], ['小鬼頭目', 'Goblin Chief', ['#4a6a2a', '#c84a3a']], ['妖鬼王', 'Hobgoblin King', ['#3a4a2a', '#e0c040']]], [0.9, 0.3, 1.0, 0.85, 0.3, 0.7, 1.1], 4, 3, ['m_club', 'm_steal', 'm_bite'], ['holy'], [], 'm_counter'],
  ['skeleton', 'skeleton', [['骷髏兵', 'Skeleton', ['#e0dcc8', '#6a5a4a']], ['骷髏騎士', 'Bone Knight', ['#d8d0b8', '#4a2a6a']], ['骸骨王', 'Lich Lord', ['#c8c0a8', '#8a2aaa']]], [1.0, 0.6, 1.05, 1.05, 0.7, 0.8, 0.9], 4, 3, ['m_bonecut', 'm_curse', 'm_club'], ['holy', 'fire'], ['dark', 'ice'], 'm_counter', false, true],
  ['wraith', 'wraith', [['幽魂', 'Wraith', ['#8a9ac8', '#e0e8ff']], ['怨靈', 'Banshee', ['#6a4a8a', '#ffd0f0']], ['冥王之影', 'Shade of the Pit', ['#2a1a3a', '#a07aff']]], [0.8, 1.2, 0.6, 0.7, 1.2, 1.2, 1.1], 4, 5, ['m_touch', 'm_wail', 'm_curse'], ['holy'], ['dark', 'earth'], null, true, true],
  ['gryphon', 'gryphon', [['獅鷲', 'Gryphon', ['#c8a050', '#f0f0e0']], ['風暴獅鷲', 'Storm Gryphon', ['#5a7a9a', '#e0f0ff']], ['天空獅鷲', 'Sky Gryphon', ['#f0f0ff', '#ffd040']]], [1.0, 0.5, 1.1, 0.9, 0.6, 0.9, 1.25], 6, 6, ['m_peck', 'm_gale', 'm_claw'], ['bolt'], ['wind', 'earth'], null, true],
  ['lizard', 'lizard', [['蜥人', 'Lizardman', ['#4a8a5a', '#d0c080']], ['蜥人戰士', 'Saurian Warrior', ['#2a6a4a', '#e05a3a']], ['龍人', 'Drakeling', ['#6a3a2a', '#ffb040']]], [1.05, 0.4, 1.1, 1.0, 0.5, 0.8, 1.0], 4, 3, ['m_spear', 'm_tail', 'm_bite'], ['ice'], ['water'], 'm_counter'],
  ['troll', 'troll', [['巨魔', 'Troll', ['#7a8a6a', '#4a3a2a']], ['石巨魔', 'Rock Troll', ['#8a8a8a', '#5a4a3a']], ['冰巨魔', 'Frost Troll', ['#a0c0e0', '#4a6a8a']]], [1.5, 0.3, 1.25, 1.1, 0.3, 0.7, 0.75], 3, 2, ['m_smash', 'm_club', 'm_regenerate'], ['fire'], ['earth'], 'm_regen'],
  ['fiend', 'fiend', [['炎魔', 'Flame Fiend', ['#e04a1a', '#ffd040']], ['冰魔', 'Frost Fiend', ['#3a7ad0', '#d0f0ff']], ['雷魔', 'Storm Fiend', ['#8a6ad0', '#fff080']]], [1.0, 1.2, 0.9, 0.9, 1.25, 1.1, 1.0], 4, 4, ['m_flame', 'm_claw', 'm_darkflare'], ['water'], ['fire'], 'm_reflect', true],
  ['gargoyle', 'gargoyle', [['石像鬼', 'Gargoyle', ['#7a7a82', '#c8c8d0']], ['黑曜像', 'Obsidian Gargoyle', ['#2a2a32', '#8a5aaa']], ['聖堂守衛', 'Cathedral Warden', ['#e0dcd0', '#ffd040']]], [1.1, 0.6, 1.05, 1.35, 0.7, 1.0, 0.85], 4, 5, ['m_claw', 'm_stonegaze', 'm_gale'], ['bolt'], ['earth', 'dark'], 'm_thick', true],
  ['spider', 'spider', [['巨蛛', 'Giant Spider', ['#4a3a3a', '#c84a4a']], ['毒蛛', 'Venom Spider', ['#3a4a2a', '#7aff5a']], ['蛛后', 'Spider Queen', ['#2a1a2a', '#e0c040']]], [0.95, 0.5, 1.0, 0.9, 0.6, 0.8, 1.15], 5, 4, ['m_venom', 'm_web', 'm_bite'], ['fire'], ['earth'], null],
  ['serpent', 'serpent', [['大蛇', 'Serpent', ['#4a7a3a', '#e0e080']], ['海蛇', 'Sea Serpent', ['#2a5a8a', '#8ad8ff']], ['九頭蛇', 'Hydra', ['#5a2a4a', '#ff7a5a']]], [1.15, 0.6, 1.05, 0.95, 0.8, 0.9, 1.0], 4, 3, ['m_constrict', 'm_venom', 'm_icebreath'], ['bolt'], ['water'], 'm_regen'],
  ['treant', 'treant', [['樹精', 'Treant', ['#5a7a3a', '#8a6a3a']], ['蕈人', 'Myconid', ['#a07a8a', '#f0e0c0']], ['古樹', 'Elder Treant', ['#3a5a2a', '#e0c080']]], [1.35, 0.8, 1.0, 1.1, 0.9, 1.0, 0.6], 3, 2, ['m_root', 'm_spore', 'm_quake'], ['fire'], ['water', 'earth'], 'm_regen'],
  ['dragon', 'dragon', [['幼龍', 'Drake', ['#3a8a5a', '#f0d070']], ['火龍', 'Fire Dragon', ['#c83a1a', '#ffd040']], ['星龍', 'Star Dragon', ['#3a4a9a', '#c8e0ff']]], [1.45, 1.0, 1.3, 1.25, 1.1, 1.1, 1.0], 4, 5, ['m_firebreath', 'm_tail', 'm_claw', 'm_boltbreath'], ['ice'], ['fire'], 'm_thick', true],
  ['golem', 'golem', [['星晶魔像', 'Crystal Golem', ['#8ab0ff', '#e0f0ff']], ['鐵魔像', 'Iron Golem', ['#6a6a7a', '#e05a3a']], ['星痕魔像', 'Starscar Colossus', ['#3a3a6a', '#8ad8ff']]], [1.6, 0.5, 1.2, 1.5, 0.8, 1.2, 0.6], 3, 2, ['m_smash', 'm_crystal', 'm_quake'], ['bolt'], ['holy', 'earth'], 'm_thick'],
  ['celestial', 'celestial', [['天兵', 'Celestial Soldier', ['#f0f0ff', '#ffd040']], ['座天使', 'Throne', ['#fff0d0', '#ff9a40']], ['熾天使', 'Seraphim', ['#ffffff', '#ff5a8a']]], [1.2, 1.3, 1.15, 1.15, 1.3, 1.3, 1.15], 5, 6, ['m_judgement', 'm_halo', 'm_bless'], ['dark'], ['holy'], 'm_reflect', true],
];
export const MONSTERS = {};
for (const [fam, look, ranks, st, mv, jp, skills, weak, resist, react, fly, undead] of FAM) {
  ranks.forEach(([zh, en, col], i) => {
    const id = `${fam}${i + 1}`;
    MONSTERS[id] = { id, fam, look, rank: i + 1, name: [zh, en], col, st: st.map((x, k) => (k === 6 ? x : x * (1 + i * 0.12))), mov: mv, jmp: jp,
      skills: skills.slice(0, 2 + Math.min(i, skills.length - 2)), weak, resist, react, fly: !!fly, undead: !!undead };
  });
}
// the story's own monsters and the labyrinth guardians
export const BOSSES = {
  astraal:  { id: 'astraal', fam: 'celestial', look: 'celestial', name: ['天神 阿斯特拉爾', 'Astraal, the Celestial'], col: ['#ffffff', '#8ad8ff'], st: [6, 3, 2.0, 1.8, 2.2, 2.0, 1.25], mov: 4, jmp: 8, skills: ['m_judgement', 'm_halo', 'm_meteor', 'm_timeflux', 'm_bless'], weak: [], resist: ['holy'], react: 'm_reflect', fly: true, boss: true, size: 1.5 },
  astraal2: { id: 'astraal2', fam: 'celestial', look: 'celestial', name: ['墮天 阿斯特拉爾', 'Astraal, the Fallen Star'], col: ['#1a1a3a', '#ff5a8a'], st: [9, 4, 2.3, 2.0, 2.6, 2.2, 1.3], mov: 5, jmp: 8, skills: ['m_annihilate', 'm_meteor', 'm_darkflare', 'm_timeflux', 'm_terror'], weak: ['holy'], resist: ['dark'], react: 'm_reflect', fly: true, boss: true, size: 1.8 },
  firstking:{ id: 'firstking', fam: 'skeleton', look: 'skeleton', name: ['古王 瓦爾德蘭', 'Valdran, the First King'], col: ['#e8e0c8', '#ffd040'], st: [8, 2, 2.4, 2.2, 1.4, 1.8, 1.15], mov: 4, jmp: 4, skills: ['m_bonecut', 'm_terror', 'm_smash', 'm_curse', 'm_quake'], weak: ['holy'], resist: ['dark', 'ice'], react: 'm_counter', boss: true, size: 1.6 },
  godhead:  { id: 'godhead', fam: 'celestial', look: 'celestial', name: ['天神之首 伊瑟', 'Ithe, Head of the Celestials'], col: ['#ffe8a0', '#ffffff'], st: [12, 5, 2.6, 2.4, 2.8, 2.6, 1.35], mov: 5, jmp: 9, skills: ['m_annihilate', 'm_judgement', 'm_meteor', 'm_timeflux', 'm_halo', 'm_bless'], weak: [], resist: ['holy', 'fire', 'ice', 'bolt'], react: 'm_reflect', fly: true, boss: true, size: 2.0 },
  stardragon:{ id: 'stardragon', fam: 'dragon', look: 'dragon', name: ['星龍王 歐菲斯', 'Ophis, the Star Wyrm'], col: ['#1a2a6a', '#ffe08a'], st: [10, 3, 2.4, 2.2, 2.2, 2.0, 1.2], mov: 4, jmp: 6, skills: ['m_firebreath', 'm_icebreath', 'm_boltbreath', 'm_meteor', 'm_tail'], weak: [], resist: ['fire', 'ice', 'bolt'], react: 'm_thick', fly: true, boss: true, size: 1.9 },
  colossus: { id: 'colossus', fam: 'golem', look: 'golem', name: ['星痕巨像', 'The Starscar Colossus'], col: ['#2a2a5a', '#8ad8ff'], st: [9, 2, 2.0, 2.6, 1.6, 2.0, 0.8], mov: 3, jmp: 3, skills: ['m_crystal', 'm_quake', 'm_smash', 'm_meteor'], weak: ['bolt'], resist: ['holy', 'earth', 'fire'], react: 'm_thick', boss: true, size: 1.8 },
};
Object.assign(MONSTERS, BOSSES);
// what a monster family tends to drop besides gear (consumables) — gear comes from the battle's tier
export const MDROP = { wolf: 'potion', ooze: 'antidote', goblin: 'potion', skeleton: 'holywater', wraith: 'echo', gryphon: 'phoenix', lizard: 'hipotion', troll: 'hipotion', fiend: 'ether', gargoyle: 'remedy', spider: 'antidote', serpent: 'eyedrops', treant: 'ether', dragon: 'xpotion', golem: 'hiether', celestial: 'elixir' };
