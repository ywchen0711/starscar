// The building blocks every other table uses: elements, status effects, weapon kinds, equipment slots, stats.

export const ELEMENTS = {
  fire: ['火', 'Fire', '#ff7a3a'], ice: ['冰', 'Ice', '#8ad8ff'], bolt: ['雷', 'Lightning', '#ffe14a'], wind: ['風', 'Wind', '#9af0a0'],
  earth: ['土', 'Earth', '#c8a060'], water: ['水', 'Water', '#4a9aff'], holy: ['聖', 'Holy', '#fff2b0'], dark: ['闇', 'Dark', '#b07aff'],
};

// statuses: good ones (buff) and bad ones; dur is in the unit's own turns
export const STATUS = {
  poison:  { name: ['中毒', 'Poison'], bad: true, col: '#7adf5a', desc: ['每回合損失最大 HP 的 1/10。', 'Loses 1/10 of max HP each turn.'] },
  regen:   { name: ['再生', 'Regen'], col: '#8affc8', desc: ['每回合回復最大 HP 的 1/10。', 'Regains 1/10 of max HP each turn.'] },
  haste:   { name: ['加速', 'Haste'], col: '#ffd24a', desc: ['速度 ×1.5。', 'Speed ×1.5.'] },
  slow:    { name: ['緩速', 'Slow'], bad: true, col: '#7a8aff', desc: ['速度 ×0.5。', 'Speed ×0.5.'] },
  stop:    { name: ['停止', 'Stop'], bad: true, col: '#c0c0d8', desc: ['無法行動，也無法閃避。', 'Cannot act or evade.'] },
  sleep:   { name: ['睡眠', 'Sleep'], bad: true, col: '#b0a0ff', desc: ['無法行動，受到攻擊就會醒來。', 'Cannot act; wakes when hit.'] },
  silence: { name: ['沉默', 'Silence'], bad: true, col: '#d0d0d0', desc: ['無法使用魔法。', 'Cannot cast spells.'] },
  blind:   { name: ['失明', 'Blind'], bad: true, col: '#606070', desc: ['物理命中率大減。', 'Physical hit rate falls sharply.'] },
  protect: { name: ['護盾', 'Protect'], col: '#a0c8ff', desc: ['受到的物理傷害 ×2/3。', 'Physical damage taken ×2/3.'] },
  shell:   { name: ['魔障', 'Shell'], col: '#e0a0ff', desc: ['受到的魔法傷害 ×2/3。', 'Magic damage taken ×2/3.'] },
  berserk: { name: ['狂暴', 'Berserk'], bad: true, col: '#ff5a5a', desc: ['攻擊力 ×1.5，但只會自己攻擊。', 'Attack ×1.5, but fights on its own.'] },
  doom:    { name: ['死亡宣告', 'Doom'], bad: true, col: '#5a2a6a', desc: ['倒數結束時倒下。', 'Falls when the count runs out.'] },
  stun:    { name: ['暈眩', 'Stun'], bad: true, col: '#ffb070', desc: ['下一回合無法行動。', 'Loses its next turn.'] },
  charm:   { name: ['魅惑', 'Charm'], bad: true, col: '#ff8ad8', desc: ['暫時為敵方而戰。', 'Fights for the other side for a while.'] },
  float:   { name: ['浮空', 'Float'], col: '#c8f0ff', desc: ['不受土屬性與地形影響。', 'Immune to earth and terrain.'] },
  reflect: { name: ['反射', 'Reflect'], col: '#f0f0ff', desc: ['反彈單體魔法。', 'Bounces single-target spells.'] },
};

// stat buffs and debuffs carried as numbers on the unit: atk, def, mag, res, spd, eva (percent)
export const STATS = { hp: ['HP', 'HP'], mp: ['MP', 'MP'], atk: ['攻擊', 'ATK'], def: ['防禦', 'DEF'], mag: ['魔力', 'MAG'], res: ['魔防', 'RES'], spd: ['速度', 'SPD'], mov: ['移動', 'Move'], jmp: ['跳躍', 'Jump'], eva: ['迴避', 'Evade'] };

// weapon kinds: how far they reach, what stat drives them, and how they hit
// range: [min, max]; arc: shoots over heads (bows); fixed: damage ignores the wielder's attack (guns)
export const WEAPONS = {
  sword:   { name: ['劍', 'Sword'], range: [1, 1], stat: 'atk', icon: 'sword' },
  greatsword: { name: ['騎士劍', 'Knight Sword'], range: [1, 1], stat: 'atk', icon: 'greatsword', two: true },
  katana:  { name: ['刀', 'Katana'], range: [1, 1], stat: 'atk', icon: 'katana' },
  knife:   { name: ['短刀', 'Knife'], range: [1, 1], stat: 'atk', icon: 'knife', spd: true },
  ninjato: { name: ['忍刀', 'Ninja Blade'], range: [1, 1], stat: 'atk', icon: 'ninjato', spd: true },
  spear:   { name: ['槍', 'Spear'], range: [1, 2], stat: 'atk', icon: 'spear', line: true },
  axe:     { name: ['斧', 'Axe'], range: [1, 1], stat: 'atk', icon: 'axe', swing: true },
  hammer:  { name: ['錘', 'Hammer'], range: [1, 1], stat: 'atk', icon: 'hammer', swing: true },
  staff:   { name: ['杖', 'Staff'], range: [1, 1], stat: 'mag', icon: 'staff' },
  rod:     { name: ['魔杖', 'Rod'], range: [1, 1], stat: 'mag', icon: 'rod' },
  bow:     { name: ['弓', 'Bow'], range: [2, 5], stat: 'atk', icon: 'bow', arc: true, two: true },
  crossbow:{ name: ['弩', 'Crossbow'], range: [2, 4], stat: 'atk', icon: 'crossbow', two: true },
  gun:     { name: ['槍械', 'Gun'], range: [2, 7], stat: 'fix', icon: 'gun' },
  book:    { name: ['魔典', 'Tome'], range: [1, 3], stat: 'mag', icon: 'book' },
  harp:    { name: ['樂器', 'Instrument'], range: [1, 3], stat: 'mag', icon: 'harp', two: true },
  claw:    { name: ['拳套', 'Knuckles'], range: [1, 1], stat: 'atk', icon: 'claw' },
  fan:     { name: ['舞扇', 'Fan'], range: [1, 2], stat: 'atk', icon: 'fan' },
  whip:    { name: ['鞭', 'Whip'], range: [1, 2], stat: 'atk', icon: 'whip' },
};

// equipment slots and the kinds of armour that go in them
export const SLOTS = { w: ['武器', 'Weapon'], s: ['副手', 'Off-hand'], h: ['頭部', 'Head'], b: ['身體', 'Body'], a: ['飾品', 'Accessory'] };
export const ARMOURS = {
  shield: { name: ['盾', 'Shield'], slot: 's' }, helm: { name: ['頭盔', 'Helm'], slot: 'h' }, hat: { name: ['帽子', 'Hat'], slot: 'h' },
  heavy: { name: ['鎧甲', 'Armour'], slot: 'b' }, light: { name: ['衣服', 'Clothes'], slot: 'b' }, robe: { name: ['法衣', 'Robe'], slot: 'b' },
  acc: { name: ['飾品', 'Accessory'], slot: 'a' },
};

// terrain on battle maps: colours for the top and the sides, whether you can stand on it, what it costs to cross
export const TERRAIN = {
  grass: { name: ['草地', 'Grass'], top: '#7c8c44', side: '#7a5434', el: 'wind' }, dirt: { name: ['泥土', 'Dirt'], top: '#a8885a', side: '#6e4a2c', el: 'earth' },
  stone: { name: ['石地', 'Stone'], top: '#9e9684', side: '#6e6658', el: 'earth' }, sand: { name: ['沙地', 'Sand'], top: '#d8bf84', side: '#a88a5a', el: 'wind', cost: 2 },
  snow: { name: ['雪地', 'Snow'], top: '#e8eef2', side: '#a8b4c4', el: 'ice', cost: 2 }, water: { name: ['淺水', 'Shallows'], top: '#4282b0', side: '#2e5e86', el: 'water', cost: 2, low: true },
  deep: { name: ['深水', 'Deep water'], top: '#2f6488', side: '#1e4466', el: 'water', block: true }, swamp: { name: ['沼澤', 'Swamp'], top: '#5a7050', side: '#3e4c32', el: 'water', cost: 2, poison: true },
  lava: { name: ['熔岩', 'Lava'], top: '#e0501a', side: '#7a1a0a', el: 'fire', block: true }, wood: { name: ['木板', 'Planks'], top: '#a87a48', side: '#6a4a28', el: 'earth' },
  roof: { name: ['屋頂', 'Roof'], top: '#a8442e', side: '#d8c49a', el: 'wind' }, brick: { name: ['磚道', 'Cobbles'], top: '#b4a484', side: '#7e6e56', el: 'earth' },
  marble: { name: ['大理石', 'Marble'], top: '#ece4d4', side: '#b0a490', el: 'holy' }, moss: { name: ['苔蘚', 'Moss'], top: '#5e7a3e', side: '#4a4632', el: 'earth' },
  crystal: { name: ['星晶', 'Star crystal'], top: '#8ab0ff', side: '#4a5ab0', el: 'holy' }, ash: { name: ['灰燼', 'Ash'], top: '#6a625a', side: '#4a443e', el: 'dark' },
  cloud: { name: ['雲海', 'Cloudsea'], top: '#f0f4ff', side: '#c8d4f0', el: 'wind' }, void: { name: ['虛空', 'Void'], top: '#2a1a3a', side: '#140a20', el: 'dark' },
  tree: { name: ['樹木', 'Tree'], top: '#647a38', side: '#6a4a28', el: 'wind', block: true, obj: 'tree' }, rock: { name: ['岩石', 'Boulder'], top: '#8e8676', side: '#6a6458', el: 'earth', block: true, obj: 'rock' },
};
