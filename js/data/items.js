// Every piece of equipment (a thousand of them) and every item you can use.
// Gear is built from fixed tables, so an id always means the same thing (saves stay good between versions):
// 18 weapon kinds × 30, 6 armour kinds × 40, 160 accessories, and 60 legendary pieces made by hand.
import { WEAPONS } from './core.js';
import { r0 } from '../util.js';

export const ITEMS = {};
const add = (it) => { if (ITEMS[it.id]) throw new Error('item id twice: ' + it.id); ITEMS[it.id] = it; return it; };

// ---------------------------------------------------------------- materials, by tier 1-10
const METAL = [null, ['青銅', 'Bronze'], ['鐵', 'Iron'], ['鋼', 'Steel'], ['白銀', 'Silver'], ['秘銀', 'Mythril'], ['黑曜', 'Obsidian'], ['龍骨', 'Dragonbone'], ['星鋼', 'Starsteel'], ['日輝', 'Sunforged'], ['星晶', 'Starcrystal']];
const WOOD = [null, ['橡木', 'Oak'], ['樺木', 'Birch'], ['紫杉', 'Yew'], ['月桂', 'Laurel'], ['鐵木', 'Ironwood'], ['銀樺', 'Silverbirch'], ['龍木', 'Dragonwood'], ['星木', 'Starwood'], ['聖樹', 'Holywood'], ['世界樹', 'World Tree']];
const CLOTH = [null, ['麻', 'Hemp'], ['棉', 'Cotton'], ['絲', 'Silk'], ['天鵝絨', 'Velvet'], ['月光絲', 'Moonsilk'], ['魔織', 'Spellweave'], ['龍鱗織', 'Wyrmweave'], ['星紗', 'Stargauze'], ['天衣', 'Heavencloth'], ['星晶織', 'Starthread']];
const HIDE = [null, ['皮革', 'Leather'], ['硬皮', 'Hardhide'], ['獸皮', 'Beasthide'], ['狼皮', 'Wolfhide'], ['蜥蜴皮', 'Lizardskin'], ['影皮', 'Shadowhide'], ['龍皮', 'Dragonhide'], ['獅鷲皮', 'Gryphonhide'], ['天馬皮', 'Pegasus Hide'], ['星獸皮', 'Starbeast Hide']];
const PAPER = [null, ['羊皮', 'Vellum'], ['手抄', 'Scribed'], ['古', 'Old'], ['祕', 'Arcane'], ['禁斷', 'Forbidden'], ['賢者', 'Sage\'s'], ['龍語', 'Draconic'], ['星辰', 'Starlit'], ['天啟', 'Revealed'], ['星痕', 'Starscar']];
// how strong each tier is, and roughly what it costs
const POW = [0, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78];
const PRICE = [0, 80, 200, 450, 900, 1600, 2700, 4200, 6500, 9800, 15000];

// ---------------------------------------------------------------- weapons: 18 kinds × (10 plain + 20 variants)
// [material set, nouns [zh, en] (one per third of the tiers), attack ×, magic ×, extras]
const WKIND = {
  sword:    [METAL, [['劍', 'Sword'], ['長劍', 'Longsword'], ['闊劍', 'Broadsword']], 1.0, 0],
  greatsword: [METAL, [['騎士劍', 'Knight Sword'], ['巨劍', 'Greatsword'], ['聖騎劍', 'Paladin Blade']], 1.25, 0],
  katana:   [METAL, [['刀', 'Katana'], ['太刀', 'Tachi'], ['大太刀', 'Odachi']], 1.12, 0],
  knife:    [METAL, [['短刀', 'Knife'], ['匕首', 'Dagger'], ['短劍', 'Dirk']], 0.8, 0, { spd: 1 }],
  ninjato:  [METAL, [['忍刀', 'Ninja Blade'], ['苦無', 'Kunai'], ['影刀', 'Shadowblade']], 0.95, 0, { eva: 5 }],
  spear:    [METAL, [['槍', 'Spear'], ['長槍', 'Pike'], ['戟', 'Halberd']], 1.05, 0],
  axe:      [METAL, [['斧', 'Axe'], ['戰斧', 'Battleaxe'], ['巨斧', 'Greataxe']], 1.18, 0],
  hammer:   [METAL, [['錘', 'Mace'], ['戰錘', 'Warhammer'], ['破城錘', 'Maul']], 1.2, 0],
  staff:    [WOOD, [['杖', 'Staff'], ['法杖', 'Wizard Staff'], ['神杖', 'Holy Staff']], 0.55, 0.6],
  rod:      [WOOD, [['魔杖', 'Rod'], ['權杖', 'Sceptre'], ['魔導杖', 'Arcane Rod']], 0.45, 0.75],
  bow:      [WOOD, [['弓', 'Bow'], ['長弓', 'Longbow'], ['複合弓', 'Composite Bow']], 0.95, 0],
  crossbow: [METAL, [['弩', 'Crossbow'], ['重弩', 'Arbalest'], ['連弩', 'Repeater']], 1.0, 0],
  gun:      [METAL, [['火槍', 'Musket'], ['短銃', 'Pistol'], ['魔導銃', 'Spellgun']], 0.7, 0],
  book:     [PAPER, [['書', 'Tome'], ['典籍', 'Codex'], ['聖典', 'Scripture']], 0.6, 0.5],
  harp:     [WOOD, [['豎琴', 'Harp'], ['魯特琴', 'Lute'], ['里拉琴', 'Lyre']], 0.55, 0.55],
  claw:     [METAL, [['拳套', 'Knuckles'], ['鐵爪', 'Claws'], ['拳刃', 'Katars']], 0.92, 0],
  fan:      [CLOTH, [['舞扇', 'Fan'], ['鐵扇', 'War Fan'], ['羽扇', 'Feather Fan']], 0.85, 0.2, { eva: 3 }],
  whip:     [HIDE, [['鞭', 'Whip'], ['長鞭', 'Lash'], ['鎖鞭', 'Chain Whip']], 0.88, 0],
};
// the twenty variants every weapon kind gets: [id, 中文, English, first tier, what it changes]
const WVAR = [
  ['fire', '火焰', 'Flame', 2, (w) => { w.el = 'fire'; }], ['ice', '冰霜', 'Frost', 2, (w) => { w.el = 'ice'; }], ['bolt', '雷霆', 'Storm', 3, (w) => { w.el = 'bolt'; }],
  ['wind', '疾風', 'Gale', 3, (w) => { w.el = 'wind'; }], ['earth', '大地', 'Terra', 4, (w) => { w.el = 'earth'; }], ['water', '海潮', 'Tide', 4, (w) => { w.el = 'water'; }],
  ['holy', '聖光', 'Holy', 6, (w) => { w.el = 'holy'; }], ['dark', '暗影', 'Shadow', 6, (w) => { w.el = 'dark'; }],
  ['keen', '鋒利', 'Keen', 2, (w) => { w.atk = r0(w.atk * 1.15); }], ['swift', '迅捷', 'Swift', 3, (w) => { w.bonus = { spd: 1 + (w.tier >> 2) }; }],
  ['guard', '守護', 'Guarding', 3, (w) => { w.bonus = { def: 2 + w.tier }; }], ['sage', '睿智', 'Sagely', 4, (w) => { w.bonus = { mag: 2 + w.tier }; }],
  ['vamp', '吸血', 'Vampiric', 5, (w) => { w.fx = 'drain'; }], ['venom', '劇毒', 'Venomous', 3, (w) => { w.onhit = ['poison', 25]; }],
  ['sleep', '催眠', 'Slumbering', 4, (w) => { w.onhit = ['sleep', 15]; }], ['mute', '封口', 'Silencing', 5, (w) => { w.onhit = ['silence', 20]; }],
  ['crit', '必殺', 'Deadly', 5, (w) => { w.crit = 10; }], ['hero', '勇者', 'Valiant', 7, (w) => { w.atk = r0(w.atk * 1.1); w.bonus = { atk: w.tier, def: w.tier }; }],
  ['royal', '王家', 'Royal', 8, (w) => { w.atk = r0(w.atk * 1.2); w.bonus = { spd: 1 }; }], ['star', '星辰', 'Starlit', 9, (w) => { w.atk = r0(w.atk * 1.25); w.el = 'holy'; w.bonus = { mag: 5 }; }],
];
for (const [kind, [mats, nouns, am, mm, extra = {}]] of Object.entries(WKIND)) {
  const make = (t, v) => {
    const noun = nouns[Math.min(2, Math.floor((t - 1) / 4))], mat = mats[t];
    const w = { id: `${kind}${t}${v ? '_' + v[0] : ''}`, slot: 'w', type: kind, tier: t, atk: Math.max(1, r0(POW[t] * am)), price: r0(PRICE[t] * (v ? 1.5 : 1)), two: !!WEAPONS[kind].two };
    if (mm) w.mag = Math.max(1, r0(POW[t] * mm));
    if (extra.spd) w.bonus = { spd: 1 }; if (extra.eva) w.eva = extra.eva;
    w.name = v ? [`${v[1]}${mat[0]}${noun[0]}`, `${v[2]} ${mat[1]} ${noun[1]}`] : [`${mat[0]}${noun[0]}`, `${mat[1]} ${noun[1]}`];
    if (v) { v[4](w); w.variant = v[0]; }
    return add(w);
  };
  for (let t = 1; t <= 10; t++) make(t, null);
  // each variant appears at a tier between its first tier and 10, spread so every kind has a different mix
  WVAR.forEach((v, i) => { const t = Math.min(10, v[3] + ((i * 7 + kind.length * 3) % (11 - v[3]))); make(t, v); });
}

// ---------------------------------------------------------------- armour: 6 kinds × 40 (10 plain + 30 variants)
const AKIND = {
  heavy:  [METAL, [['鎧', 'Mail'], ['板甲', 'Plate'], ['重鎧', 'Full Plate']], 'b', { def: 1.0, hp: 1.0 }],
  light:  [HIDE, [['皮甲', 'Jerkin'], ['戰衣', 'Brigandine'], ['輕鎧', 'Cuirass']], 'b', { def: 0.7, hp: 0.6, eva: 1 }],
  robe:   [CLOTH, [['法衣', 'Robe'], ['長袍', 'Vestment'], ['魔導袍', 'Arcane Robe']], 'b', { def: 0.45, hp: 0.4, res: 0.6, mag: 0.3, mp: 1 }],
  shield: [METAL, [['盾', 'Shield'], ['鳶盾', 'Kite Shield'], ['塔盾', 'Tower Shield']], 's', { def: 0.4, eva: 2 }],
  helm:   [METAL, [['頭盔', 'Helm'], ['戰盔', 'Armet'], ['巨盔', 'Greathelm']], 'h', { def: 0.5, hp: 0.5 }],
  hat:    [CLOTH, [['帽', 'Cap'], ['頭巾', 'Hood'], ['冠', 'Circlet']], 'h', { def: 0.3, res: 0.3, mag: 0.2 }],
};
const AVAR = [
  ['fireward', '耐火', 'Flameproof', 2, (a) => { a.resist = ['fire']; }], ['iceward', '耐寒', 'Frostproof', 2, (a) => { a.resist = ['ice']; }], ['boltward', '絕緣', 'Insulated', 3, (a) => { a.resist = ['bolt']; }],
  ['windward', '避風', 'Windproof', 3, (a) => { a.resist = ['wind']; }], ['earthward', '岩紋', 'Stoneward', 3, (a) => { a.resist = ['earth']; }], ['waterward', '防水', 'Watertight', 3, (a) => { a.resist = ['water']; }],
  ['holyward', '聖紋', 'Hallowed', 6, (a) => { a.resist = ['holy']; }], ['darkward', '闇紋', 'Shaded', 6, (a) => { a.resist = ['dark']; }],
  ['sturdy', '堅固', 'Sturdy', 2, (a) => { a.def = r0(a.def * 1.2); }], ['light2', '輕盈', 'Featherlight', 2, (a) => { a.bonus = { spd: 1 }; }],
  ['vigor', '活力', 'Vigorous', 3, (a) => { a.hp = (a.hp || 0) + 10 * a.tier; }], ['mana', '魔力', 'Mana-laced', 3, (a) => { a.mp = (a.mp || 0) + 5 * a.tier; }],
  ['might', '力量', 'Mighty', 4, (a) => { a.bonus = { atk: 1 + a.tier }; }], ['wisdom', '智慧', 'Wise', 4, (a) => { a.bonus = { mag: 1 + a.tier }; }],
  ['ward', '魔防', 'Warded', 4, (a) => { a.bonus = { res: 2 + a.tier }; }], ['nimble', '靈巧', 'Nimble', 4, (a) => { a.eva = (a.eva || 0) + 5; }],
  ['antipoison', '防毒', 'Antivenom', 2, (a) => { a.immune = ['poison']; }], ['antiblind', '明眼', 'Clear-eyed', 3, (a) => { a.immune = ['blind']; }],
  ['antisilence', '清音', 'Clear-voiced', 4, (a) => { a.immune = ['silence']; }], ['antisleep', '清醒', 'Wakeful', 4, (a) => { a.immune = ['sleep']; }],
  ['antistop', '流轉', 'Unstoppable', 7, (a) => { a.immune = ['stop', 'slow']; }], ['anticharm', '堅心', 'Steadfast', 6, (a) => { a.immune = ['charm', 'berserk']; }],
  ['regen', '再生', 'Regenerating', 6, (a) => { a.auto = 'regen'; }], ['protect', '守護', 'Guardian', 5, (a) => { a.auto = 'protect'; }],
  ['shell', '屏障', 'Shielding', 5, (a) => { a.auto = 'shell'; }], ['haste', '神速', 'Quicksilver', 8, (a) => { a.auto = 'haste'; }],
  ['float', '浮空', 'Buoyant', 5, (a) => { a.auto = 'float'; }], ['jp', '修行', 'Ascetic', 3, (a) => { a.jpup = 20; }],
  ['royal', '王家', 'Royal', 8, (a) => { a.def = r0(a.def * 1.25); a.hp = (a.hp || 0) + 50; }], ['star', '星辰', 'Starlit', 9, (a) => { a.def = r0(a.def * 1.3); a.bonus = { mag: 6, res: 6 }; a.resist = ['holy', 'dark']; }],
];
for (const [kind, [mats, nouns, slot, f]] of Object.entries(AKIND)) {
  const make = (t, v) => {
    const noun = nouns[Math.min(2, Math.floor((t - 1) / 4))], mat = mats[t];
    const a = { id: `${kind}${t}${v ? '_' + v[0] : ''}`, slot, type: kind, tier: t, def: Math.max(1, r0(POW[t] * f.def)), price: r0(PRICE[t] * 0.8 * (v ? 1.5 : 1)) };
    if (f.hp) a.hp = r0(POW[t] * 2 * f.hp); if (f.res) a.bonus = { res: r0(POW[t] * f.res) }; if (f.mag) a.bonus = { ...a.bonus, mag: r0(POW[t] * f.mag) };
    if (f.mp) a.mp = 4 * t; if (f.eva) a.eva = f.eva * (kind === 'shield' ? 5 + t : 2 + (t >> 1));
    a.name = v ? [`${v[1]}${mat[0]}${noun[0]}`, `${v[2]} ${mat[1]} ${noun[1]}`] : [`${mat[0]}${noun[0]}`, `${mat[1]} ${noun[1]}`];
    if (v) { const keep = a.bonus; v[4](a); if (keep && a.bonus !== keep) a.bonus = { ...keep, ...a.bonus }; a.variant = v[0]; }
    return add(a);
  };
  for (let t = 1; t <= 10; t++) make(t, null);
  AVAR.forEach((v, i) => { const t = Math.min(10, v[3] + ((i * 5 + kind.length * 2) % (11 - v[3]))); make(t, v); });
}

// ---------------------------------------------------------------- accessories: 8 kinds × 20
const ACC = [
  ['ring', ['戒指', 'Ring']], ['amulet', ['護符', 'Amulet']], ['boots', ['靴', 'Boots']], ['cloak', ['斗篷', 'Cloak']],
  ['gloves', ['手套', 'Gloves']], ['bracer', ['手環', 'Bracer']], ['earring', ['耳環', 'Earring']], ['charm', ['御守', 'Charm']],
];
// [id, 中文, English, what it does at tier t]
const AEFF = [
  ['atk', '力量', 'Power', (a, t) => { a.bonus = { atk: 2 + t * 2 }; }], ['mag', '魔力', 'Magic', (a, t) => { a.bonus = { mag: 2 + t * 2 }; }],
  ['def', '守護', 'Guard', (a, t) => { a.bonus = { def: 2 + t * 2 }; }], ['res', '魔防', 'Ward', (a, t) => { a.bonus = { res: 2 + t * 2 }; }],
  ['spd', '迅速', 'Speed', (a, t) => { a.bonus = { spd: 1 + (t >> 2) }; }], ['hp', '生命', 'Life', (a, t) => { a.hp = 20 + t * 25; }],
  ['mp', '靈魂', 'Spirit', (a, t) => { a.mp = 10 + t * 8; }], ['eva', '幻影', 'Phantom', (a, t) => { a.eva = 5 + t * 2; }],
  ['move', '疾行', 'Strider', (a, t) => { a.mov = t >= 6 ? 2 : 1; }], ['jump', '跳躍', 'Leaping', (a, t) => { a.jmp = t >= 6 ? 2 : 1; }],
  ['regen', '再生', 'Renewal', (a) => { a.auto = 'regen'; }], ['protect', '守護靈', 'Warding', (a) => { a.auto = 'protect'; }],
  ['shell', '魔障', 'Spellguard', (a) => { a.auto = 'shell'; }], ['haste', '神速', 'Quickening', (a) => { a.auto = 'haste'; }],
  ['float', '羽毛', 'Feather', (a) => { a.auto = 'float'; }], ['reflect', '鏡面', 'Mirror', (a) => { a.auto = 'reflect'; }],
  ['immune', '淨化', 'Purity', (a, t) => { a.immune = t >= 6 ? ['poison', 'blind', 'silence', 'sleep', 'stop', 'slow', 'berserk', 'charm', 'doom'] : ['poison', 'blind', 'silence']; }],
  ['absorbfire', '吸火', 'Fireeater', (a) => { a.absorb = ['fire']; }], ['jp', '修行', 'Learner', (a, t) => { a.jpup = 10 + t * 3; }], ['exp', '經驗', 'Veteran', (a, t) => { a.expup = 10 + t * 3; }],
];
ACC.forEach(([kind, noun], ki) => AEFF.forEach(([eid, zh, en, f], ei) => {
  const t = 1 + ((ei * 3 + ki * 2) % 10), mat = (kind === 'cloak' || kind === 'gloves' || kind === 'charm' ? CLOTH : kind === 'boots' ? HIDE : METAL)[t];
  const a = { id: `${kind}_${eid}`, slot: 'a', type: 'acc', kind, tier: t, price: r0(PRICE[t] * 0.9), name: [`${mat[0]}${zh}${noun[0]}`, `${mat[1]} ${noun[1]} of ${en}`] };
  f(a, t); add(a);
}));

// ---------------------------------------------------------------- the sixty legendary pieces (found, never sold)
// [id, slot/type, 中文, English, tier, stats]
const LEG = [
  ['ex_starscar', 'w:sword', '星痕之劍', 'Starscar Blade', 10, { atk: 95, el: 'holy', bonus: { mag: 20, spd: 2 }, note: ['雷恩的劍。據說是用墜落之星的碎片打成的。', 'Ren\'s blade, said to be forged from a shard of the fallen star.'] }],
  ['ex_kingsword', 'w:greatsword', '古王之劍', 'Blade of the First King', 10, { atk: 110, bonus: { def: 15 }, auto: 'protect', note: ['王者迷宮最深處，古王留下的劍。', 'The sword the first king left in the depths of his labyrinth.'] }],
  ['ex_celestial', 'w:spear', '天神之槍', 'Celestial Lance', 10, { atk: 102, el: 'holy', jmp: 2, note: ['從天神手中奪來的槍。', 'A lance wrested from a celestial\'s hand.'] }],
  ['ex_masamune', 'w:katana', '月詠', 'Tsukuyomi', 10, { atk: 98, crit: 15, auto: 'haste', note: ['映著月光的名刀，揮動時連時間都會變慢。', 'A famed blade that holds the moon; time itself slows as it swings.'] }],
  ['ex_nightfang', 'w:ninjato', '夜牙', 'Nightfang', 10, { atk: 80, eva: 15, onhit: ['stop', 20], note: ['刺客代代相傳的忍刀。', 'A ninja blade handed down through generations of assassins.'] }],
  ['ex_whisper', 'w:knife', '低語之刃', 'Whisperknife', 9, { atk: 62, bonus: { spd: 3 }, steal: 30, note: ['怪盜愛用的短刀，偷竊時手不會發抖。', 'A phantom thief\'s favourite; the hand never shakes on a lift.'] }],
  ['ex_worldsplitter', 'w:axe', '裂界斧', 'Worldsplitter', 10, { atk: 115, el: 'earth', note: ['據說能劈開大地的巨斧。', 'They say it can split the ground in two.'] }],
  ['ex_judgehammer', 'w:hammer', '審判之錘', 'Gavel of Judgement', 10, { atk: 112, el: 'holy', onhit: ['stun', 25], note: ['教會異端審判所的聖錘。', 'The holy maul of the church\'s inquisition.'] }],
  ['ex_lampstaff', 'w:staff', '白燈之杖', 'Staff of the White Lamp', 10, { atk: 40, mag: 70, healpow: 30, note: ['燈之巫女代代相傳的聖杖。', 'The holy staff of the lamp-maidens.'] }],
  ['ex_starrod', 'w:rod', '星辰權杖', 'Sceptre of Stars', 10, { atk: 35, mag: 80, el: 'holy', note: ['星術師的至寶，杖頭封著一顆小星星。', 'The astromancers\' treasure; a tiny star sleeps in its head.'] }],
  ['ex_skybow', 'w:bow', '天弓', 'Skybow', 10, { atk: 92, range: 1, el: 'wind', note: ['射出的箭會乘著風飛到天邊。', 'Its arrows ride the wind to the edge of the sky.'] }],
  ['ex_ballista', 'w:crossbow', '攻城弩', 'Siegebreaker', 10, { atk: 98, onhit: ['stun', 20], note: ['一個人扛得動的攻城武器。', 'A siege engine one person can carry.'] }],
  ['ex_dragoncannon', 'w:gun', '龍砲', 'Dragon Cannon', 10, { atk: 72, el: 'fire', note: ['用龍的骨頭做成的魔導銃。', 'A spellgun made from a dragon\'s bones.'] }],
  ['ex_necronomicon', 'w:book', '死者之書', 'Book of the Dead', 10, { atk: 50, mag: 72, el: 'dark', drainup: 30, note: ['寫滿死者名字的禁書。', 'A forbidden book filled with the names of the dead.'] }],
  ['ex_heavenharp', 'w:harp', '天籟豎琴', 'Harp of Heaven', 10, { atk: 45, mag: 70, songpow: 40, note: ['據說天使也曾彈過的豎琴。', 'They say angels once played it.'] }],
  ['ex_godhand', 'w:claw', '神之手', 'Hand of God', 10, { atk: 100, bonus: { spd: 2 }, note: ['拳聖留下的拳套。', 'The knuckles a grandmaster left behind.'] }],
  ['ex_phoenixfan', 'w:fan', '鳳凰扇', 'Phoenix Fan', 10, { atk: 82, el: 'fire', auto: 'regen', note: ['扇起的風帶著鳳凰的火。', 'Its breeze carries a phoenix\'s fire.'] }],
  ['ex_serpentlash', 'w:whip', '蛇王鞭', 'Serpent King\'s Lash', 10, { atk: 90, onhit: ['poison', 40], invite: 20, note: ['連魔物之王都會聽話的鞭子。', 'Even the king of beasts heeds it.'] }],
  ['ex_edwinblade', 'w:sword', '獅心劍', 'Lionheart', 8, { atk: 70, bonus: { atk: 10, def: 10 }, note: ['艾德溫的佩劍，鑲著公爵家的獅子紋章。', 'Edwin\'s sword, set with the ducal lion.'] }],
  ['ex_graysword', 'w:greatsword', '老兵之劍', 'Old Soldier\'s Blade', 4, { atk: 30, bonus: { def: 5 }, counter: 20, note: ['葛雷隊長用了三十年的劍。', 'The blade Captain Gray carried for thirty years.'] }],
  ['ex_rowenaknife', 'w:knife', '燕尾', 'Swallowtail', 6, { atk: 44, bonus: { spd: 2 }, eva: 10, note: ['洛溫娜的短刀，刀柄綁著一條紅繩。', 'Rowena\'s knife, a red cord tied round the grip.'] }],
  ['ex_voidblade', 'w:katana', '虛無', 'Nihil', 10, { atk: 105, el: 'dark', drain: 1, note: ['在天神迷宮最深處找到的黑刀。', 'A black blade found at the bottom of the Celestial Labyrinth.'] }],
  ['ex_genesis', 'w:staff', '創世之杖', 'Genesis Staff', 10, { atk: 50, mag: 90, auto: 'regen', note: ['據說世界就是用這根杖畫出來的。', 'They say the world was drawn with this staff.'] }],
  ['ex_ragnarok', 'w:greatsword', '終焉之劍', 'Ragnarok', 10, { atk: 120, el: 'fire', crit: 10, note: ['預言中結束一切的劍。', 'The sword foretold to end all things.'] }],
  // armour
  ['ex_kingsmail', 'b:heavy', '古王之鎧', 'Mail of the First King', 10, { def: 95, hp: 300, auto: 'protect', note: ['古王穿過的鎧甲。', 'Armour worn by the first king.'] }],
  ['ex_seraphrobe', 'b:robe', '天使之衣', 'Seraph\'s Raiment', 10, { def: 50, mp: 120, bonus: { mag: 25, res: 30 }, auto: 'regen', note: ['天使留下的羽衣。', 'A feathered robe an angel left behind.'] }],
  ['ex_shadowgarb', 'b:light', '影之衣', 'Shadowgarb', 10, { def: 60, eva: 20, bonus: { spd: 2 }, note: ['穿上就會溶進影子裡。', 'Put it on and you melt into the shadows.'] }],
  ['ex_lampvestment', 'b:robe', '白燈法衣', 'Vestment of the White Lamp', 8, { def: 38, mp: 80, bonus: { res: 25 }, immune: ['silence', 'charm'], note: ['燈之巫女的正式法衣。', 'The formal vestment of a lamp-maiden.'] }],
  ['ex_dragonmail', 'b:heavy', '龍王鎧', 'Dragon King\'s Mail', 10, { def: 100, hp: 250, resist: ['fire', 'ice', 'bolt'], note: ['用龍王的鱗打造的鎧甲。', 'Plate forged from the scales of the dragon king.'] }],
  ['ex_mirrormail', 'b:heavy', '明鏡鎧', 'Mirror Plate', 9, { def: 80, auto: 'reflect', note: ['能把魔法反射回去的鏡面鎧甲。', 'Polished to bounce spells back.'] }],
  ['ex_monkgi', 'b:light', '仙人道服', 'Hermit\'s Gi', 9, { def: 55, hp: 200, bonus: { atk: 15 }, note: ['山中仙人留下的道服。', 'Left behind by a hermit of the mountains.'] }],
  ['ex_divashroud', 'b:light', '星之舞衣', 'Starlight Dress', 9, { def: 50, eva: 15, songpow: 30, note: ['跳起舞來像星光一樣閃耀。', 'It glitters like starlight in the dance.'] }],
  ['ex_crown', 'h:helm', '古王之冠', 'Crown of the First King', 10, { def: 55, hp: 150, bonus: { atk: 10, mag: 10 }, immune: ['charm', 'berserk', 'stop'], note: ['古王的王冠。', 'The first king\'s crown.'] }],
  ['ex_halo', 'h:hat', '天使光環', 'Halo', 10, { def: 40, bonus: { mag: 20, res: 20 }, auto: 'regen', note: ['戴上會在頭上浮起一圈光。', 'A ring of light floats above the head.'] }],
  ['ex_dragonhelm', 'h:helm', '龍王盔', 'Dragon King\'s Helm', 10, { def: 58, hp: 120, resist: ['fire', 'ice', 'bolt'], note: ['龍王的頭骨打造的頭盔。', 'Made from the dragon king\'s skull.'] }],
  ['ex_witchhat', 'h:hat', '魔女的帽子', 'Witch\'s Hat', 9, { def: 30, mp: 60, bonus: { mag: 25 }, note: ['大魔女留下的帽子，還帶著淡淡的香味。', 'A great witch\'s hat; it still smells faintly of herbs.'] }],
  ['ex_genjishield', 'h:hat', '狐面', 'Fox Mask', 8, { def: 26, eva: 15, immune: ['blind', 'sleep'], note: ['祭典用的狐狸面具，戴上就看不見表情。', 'A festival fox mask that hides every expression.'] }],
  ['ex_aegis', 's:shield', '神盾', 'Aegis', 10, { def: 48, eva: 30, resist: ['holy', 'dark'], note: ['神話中的盾，一切攻擊都會被彈開。', 'The shield of legend; every blow glances away.'] }],
  ['ex_kingshield', 's:shield', '古王之盾', 'Shield of the First King', 10, { def: 52, eva: 25, auto: 'shell', note: ['古王的盾。', 'The first king\'s shield.'] }],
  ['ex_lionshield', 's:shield', '獅子盾', 'Lion Shield', 7, { def: 32, eva: 20, bonus: { atk: 5 }, note: ['公爵家的大盾。', 'The great shield of the ducal house.'] }],
  ['ex_flameshield', 's:shield', '炎之盾', 'Flame Shield', 8, { def: 36, eva: 18, absorb: ['fire'], note: ['會吸收火焰的盾。', 'It drinks fire.'] }],
  ['ex_iceshield', 's:shield', '冰之盾', 'Ice Shield', 8, { def: 36, eva: 18, absorb: ['ice'], note: ['會吸收寒氣的盾。', 'It drinks frost.'] }],
  // accessories
  ['ex_starstone', 'a:acc', '星之碎片', 'Star Shard', 10, { bonus: { atk: 15, mag: 15, spd: 2 }, auto: 'regen', note: ['墜落之星的碎片，摸起來是溫的。', 'A shard of the fallen star; it is warm to the touch.'] }],
  ['ex_kingring', 'a:acc', '王者之戒', 'Signet of Kings', 10, { bonus: { atk: 20, def: 20 }, mov: 1, note: ['古王一族的戒指。', 'The ring of the line of kings.'] }],
  ['ex_angelring', 'a:acc', '天使之戒', 'Angel Ring', 10, { auto: 'regen', undying: 1, note: ['戴著它的人只會倒下一次，然後再站起來。', 'Its wearer falls once, and rises again.'] }],
  ['ex_hermes', 'a:acc', '神速之靴', 'Winged Sandals', 10, { mov: 2, jmp: 2, auto: 'haste', note: ['穿上就像腳上長了翅膀。', 'Like wearing wings on your feet.'] }],
  ['ex_ribbon', 'a:acc', '緞帶', 'Ribbon', 9, { immune: ['poison', 'blind', 'silence', 'sleep', 'stop', 'slow', 'berserk', 'charm', 'doom', 'stun'], bonus: { res: 10 }, note: ['樸素的緞帶，卻能擋下所有詛咒。', 'A plain ribbon that turns aside every curse.'] }],
  ['ex_cursedring', 'a:acc', '詛咒之戒', 'Cursed Ring', 7, { bonus: { atk: 30, mag: 30 }, auto: 'doom', note: ['力量巨大，但戴上就會被死亡宣告。', 'Immense power, at the price of the death sentence.'] }],
  ['ex_lampcharm', 'a:acc', '白燈御守', 'White Lamp Charm', 6, { auto: 'regen', bonus: { res: 10 }, note: ['希兒親手縫的御守。', 'A charm Sylla sewed herself.'] }],
  ['ex_mercbadge', 'a:acc', '傭兵團徽章', 'Company Badge', 3, { bonus: { atk: 5, def: 5 }, jpup: 20, note: ['葛雷傭兵團的徽章。', 'The badge of Gray\'s free company.'] }],
  ['ex_genjiglove', 'a:acc', '雙刀手套', 'Twinblade Gauntlet', 9, { dual: 1, bonus: { atk: 10 }, note: ['戴上它的人可以雙手持武器。', 'Lets its wearer wield a weapon in each hand.'] }],
  ['ex_chronos', 'a:acc', '時之懷錶', 'Chronos Watch', 10, { auto: 'haste', bonus: { spd: 2 }, ctdown: 50, note: ['停在某個時刻的懷錶。', 'A pocket watch stopped at a single moment.'] }],
  ['ex_sagestone', 'a:acc', '賢者之石', 'Philosopher\'s Stone', 10, { mp: 150, halfmp: 1, bonus: { mag: 15 }, note: ['鍊金術士夢寐以求的石頭。', 'The stone every alchemist dreams of.'] }],
  ['ex_featherboots', 'a:acc', '天馬之靴', 'Pegasus Boots', 8, { mov: 1, jmp: 3, auto: 'float', note: ['跳起來就像在飛。', 'A jump is almost a flight.'] }],
  ['ex_thiefgloves', 'a:acc', '盜賊手套', 'Thief\'s Gloves', 5, { steal: 25, bonus: { spd: 1 }, note: ['偷東西時手指特別靈活。', 'Fingers go nimble when it\'s time to lift.'] }],
  ['ex_mageamulet', 'a:acc', '大魔導士護符', 'Archmage\'s Amulet', 9, { bonus: { mag: 30 }, ctdown: 30, note: ['大魔導士的遺物。', 'An archmage\'s keepsake.'] }],
  ['ex_bloodrose', 'a:acc', '血玫瑰', 'Blood Rose', 8, { drain: 1, bonus: { atk: 12 }, note: ['花瓣永遠不會枯萎的玫瑰。', 'A rose whose petals never wilt.'] }],
  ['ex_dragoneye', 'a:acc', '龍之眼', 'Dragon\'s Eye', 9, { crit: 20, bonus: { atk: 10 }, range: 1, note: ['據說能看穿一切的寶珠。', 'An orb said to see through anything.'] }],
  ['ex_sovereignseal', 'a:acc', '王者之印', 'Sovereign Seal', 10, { bonus: { atk: 15, def: 15, mag: 15, res: 15, spd: 1 }, note: ['只有古王承認的人才能戴上。', 'Only one the first king acknowledges may wear it.'] }],
  ['ex_celestialorb', 'a:acc', '天神寶珠', 'Celestial Orb', 10, { bonus: { mag: 25, res: 25 }, auto: 'shell', mp: 100, note: ['天神的心臟，還在微微跳動。', 'A celestial\'s heart, still faintly beating.'] }],
];
for (const [id, st, zh, en, tier, o] of LEG) {
  const [slot, type] = st.split(':'), it = { id, slot, type, tier, name: [zh, en], price: 0, legend: true, ...o };
  if (slot === 'w') it.two = !!WEAPONS[type].two;
  add(it);
}

// ---------------------------------------------------------------- things to use in battle
export const CONSUMABLES = {
  potion:   { name: ['回復藥', 'Potion'], price: 50, h: ['fix', 60], tier: 1 },
  hipotion: { name: ['高級回復藥', 'Hi-Potion'], price: 200, h: ['fix', 160], tier: 3 },
  xpotion:  { name: ['特級回復藥', 'X-Potion'], price: 700, h: ['fix', 450], tier: 6 },
  ether:    { name: ['魔力水', 'Ether'], price: 200, mph: 30, tier: 2 },
  hiether:  { name: ['高級魔力水', 'Hi-Ether'], price: 600, mph: 90, tier: 5 },
  phoenix:  { name: ['鳳凰之羽', 'Phoenix Down'], price: 300, rev: 0.25, dead: true, tier: 1 },
  antidote: { name: ['解毒劑', 'Antidote'], price: 30, cure: ['poison'], tier: 1 },
  eyedrops: { name: ['眼藥', 'Eye Drops'], price: 30, cure: ['blind'], tier: 1 },
  echo:     { name: ['回聲草', 'Echo Herb'], price: 60, cure: ['silence'], tier: 2 },
  remedy:   { name: ['萬能藥', 'Remedy'], price: 400, cure: ['poison', 'blind', 'silence', 'sleep', 'slow', 'stop', 'berserk', 'charm', 'stun'], tier: 4 },
  holywater:{ name: ['聖水', 'Holy Water'], price: 300, cure: ['doom'], tier: 3 },
  elixir:   { name: ['萬靈藥', 'Elixir'], price: 0, h: ['pct', 1], mph: 999, tier: 9 },
};
for (const [id, c] of Object.entries(CONSUMABLES)) { c.id = id; c.use = true; c.desc = c.desc || null; }

// ---------------------------------------------------------------- helpers
export const GEAR = Object.values(ITEMS);
export const gearOfTier = (t, filter = () => true) => GEAR.filter((g) => g.tier === t && !g.legend && filter(g));
// the plain pieces a shop at this tier sells
export const shopStock = (tier) => GEAR.filter((g) => !g.legend && !g.variant && g.tier <= tier && g.tier >= Math.max(1, tier - 2) && g.slot !== 'a').concat(GEAR.filter((g) => g.slot === 'a' && g.tier <= Math.max(1, tier - 1) && ['atk', 'mag', 'def', 'res', 'hp', 'immune', 'move', 'jump'].some((e) => g.id.endsWith('_' + e))));
export const consumablesFor = (tier) => Object.values(CONSUMABLES).filter((c) => c.price && c.tier <= tier);
