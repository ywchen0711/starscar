// The continent of Veldran: towns, roads, wild places, and the four hidden labyrinths.
// x, y are on a 1000 × 700 map. kind: town (shops, tavern), field (random battles), site (story only), hidden (labyrinth).
export const NODES = {
  aldmoor:   { name: ['艾德摩爾', 'Aldmoor'], x: 200, y: 470, kind: 'town', tier: 1, desc: ['傭兵的城鎮。葛雷傭兵團的根據地。', 'A town of sellswords, home of Gray\'s free company.'] },
  oldroad:   { name: ['舊街道', 'Old Road'], x: 280, y: 520, kind: 'field', theme: 'plains', lv: 2, foes: ['wolf1', 'goblin1', 'sellsword', 'hunter'] },
  whitewood: { name: ['白樺林', 'Whitebirch Wood'], x: 140, y: 380, kind: 'field', theme: 'forest', lv: 3, foes: ['wolf1', 'spider1', 'treant1', 'hunter'] },
  greystone: { name: ['灰石村', 'Greystone'], x: 330, y: 400, kind: 'town', tier: 2, desc: ['無紋者的農村。這裡的人身上沒有星紋。', 'A farming village of the Unmarked: none here bear a star-mark.'] },
  mistvale:  { name: ['霧谷', 'Mistvale'], x: 250, y: 300, kind: 'field', theme: 'swamp', lv: 5, foes: ['wraith1', 'ooze1', 'spider1', 'hexer'] },
  blackwood: { name: ['黑森林', 'Blackwood'], x: 420, y: 300, kind: 'field', theme: 'forest', lv: 7, foes: ['wolf2', 'treant1', 'goblin2', 'thief', 'monk'] },
  lothar:    { name: ['洛薩城', 'Lothar Keep'], x: 100, y: 230, kind: 'town', tier: 3, desc: ['歐斯華德公爵的居城。高牆上飄著獅子旗。', 'Duke Oswald\'s seat; the lion banner flies on its high walls.'] },
  karst:     { name: ['卡斯特礦山', 'Karst Mines'], x: 470, y: 180, kind: 'field', theme: 'mine', lv: 9, foes: ['golem1', 'ooze2', 'goblin2', 'alchemist'] },
  oldbridge: { name: ['古橋', 'The Old Bridge'], x: 360, y: 220, kind: 'site', theme: 'bridge' },
  saltreach: { name: ['鹽港', 'Saltreach'], x: 560, y: 560, kind: 'town', tier: 4, desc: ['海盜與商人的港口。什麼都買得到。', 'A port of pirates and traders, where anything can be bought.'] },
  heronmoor: { name: ['白鷺城', 'Heronmoor'], x: 700, y: 430, kind: 'town', tier: 5, desc: ['伊莎蓓爾公主的城堡，建在湖中央的白色城堡。', 'Princess Isabel\'s white castle in the middle of a lake.'] },
  frostgate: { name: ['霜門要塞', 'Frostgate'], x: 640, y: 110, kind: 'field', theme: 'snow', lv: 15, foes: ['troll3', 'wolf2', 'knight', 'skylancer', 'fiend2'] },
  abbey:     { name: ['聖維修道院', 'Abbey of St. Vey'], x: 560, y: 320, kind: 'field', theme: 'church', lv: 14, foes: ['wraith2', 'cleric', 'templar', 'gargoyle1'] },
  battlefield:{ name: ['古戰場', 'Old Battlefield'], x: 760, y: 280, kind: 'field', theme: 'ruins', lv: 17, foes: ['skeleton2', 'wraith2', 'darkknight', 'necromancer'] },
  kingsbarrow:{ name: ['古王陵', 'Kingsbarrow'], x: 860, y: 200, kind: 'field', theme: 'ruins', lv: 20, foes: ['skeleton2', 'gargoyle2', 'golem2', 'wraith2'] },
  eldhaven:  { name: ['王都 艾爾德', 'Eldhaven'], x: 820, y: 400, kind: 'town', tier: 6, desc: ['艾爾德蘭王國的王都。王冠就在這裡。', 'The royal capital of Eldran, where the crown is kept.'] },
  sundune:   { name: ['日沙沙漠', 'Sundune'], x: 900, y: 560, kind: 'field', theme: 'desert', lv: 22, foes: ['lizard2', 'serpent2', 'spider2', 'corsair', 'dragon1'] },
  lumeria:   { name: ['聖都 盧梅利亞', 'Lumeria'], x: 640, y: 640, kind: 'town', tier: 7, desc: ['白燈教會的聖都。大聖堂的白燈從不熄滅。', 'The holy city of the White Lamp, whose cathedral lamp never goes out.'] },
  catacombs: { name: ['聖都地下墓穴', 'Lumerian Catacombs'], x: 560, y: 660, kind: 'field', theme: 'cave', lv: 26, foes: ['skeleton3', 'wraith3', 'necromancer', 'gargoyle2'] },
  crater:    { name: ['星痕之地', 'The Starscar'], x: 380, y: 70, kind: 'field', theme: 'crystal', lv: 30, foes: ['golem2', 'fiend3', 'gryphon2', 'astromancer'] },
  volcano:   { name: ['赤焰山', 'Mount Ember'], x: 960, y: 330, kind: 'field', theme: 'volcano', lv: 34, foes: ['fiend1', 'dragon2', 'golem2', 'troll3'] },
  heavensgate:{ name: ['天門', 'Heaven\'s Gate'], x: 520, y: 30, kind: 'site', theme: 'sky' },
  citadel:   { name: ['天上城', 'The Celestial Citadel'], x: 640, y: 20, kind: 'site', theme: 'sky' },
  // the hidden labyrinths
  kingslab:  { name: ['王者迷宮', 'King\'s Labyrinth'], x: 900, y: 160, kind: 'hidden', lab: 'kings', unlock: 'lab_kings' },
  celestlab: { name: ['天神迷宮', 'Celestial Labyrinth'], x: 700, y: 50, kind: 'hidden', lab: 'celestial', unlock: 'lab_celestial' },
  phantomlab:{ name: ['幻影迴廊', 'Phantom Gallery'], x: 190, y: 250, kind: 'hidden', lab: 'phantom', unlock: 'lab_phantom' },
  dragonlab: { name: ['龍之墓所', 'Dragon\'s Grave'], x: 960, y: 620, kind: 'hidden', lab: 'dragon', unlock: 'lab_dragon' },
};
export const LINKS = [
  ['aldmoor', 'oldroad'], ['aldmoor', 'whitewood'], ['oldroad', 'greystone'], ['whitewood', 'greystone'], ['whitewood', 'mistvale'], ['greystone', 'blackwood'], ['mistvale', 'lothar'],
  ['blackwood', 'karst'], ['blackwood', 'oldbridge'], ['lothar', 'oldbridge'], ['oldbridge', 'karst'], ['oldroad', 'saltreach'], ['greystone', 'abbey'], ['saltreach', 'heronmoor'],
  ['abbey', 'heronmoor'], ['karst', 'frostgate'], ['abbey', 'battlefield'], ['heronmoor', 'battlefield'], ['battlefield', 'kingsbarrow'], ['frostgate', 'kingsbarrow'], ['heronmoor', 'eldhaven'],
  ['battlefield', 'eldhaven'], ['eldhaven', 'sundune'], ['saltreach', 'lumeria'], ['lumeria', 'catacombs'], ['eldhaven', 'lumeria'], ['karst', 'crater'], ['frostgate', 'crater'], ['eldhaven', 'volcano'],
  ['crater', 'heavensgate'], ['heavensgate', 'citadel'], ['kingsbarrow', 'kingslab'], ['citadel', 'celestlab'], ['mistvale', 'phantomlab'], ['sundune', 'dragonlab'], ['kingsbarrow', 'volcano'],
];
// which places each chapter opens (you can always go back to where you've been)
export const OPEN_BY_CH = [
  ['aldmoor', 'oldroad', 'whitewood'],
  ['greystone', 'mistvale', 'blackwood', 'lothar', 'karst', 'oldbridge'],
  ['saltreach', 'heronmoor', 'frostgate', 'abbey', 'battlefield', 'kingsbarrow', 'eldhaven', 'sundune'],
  ['lumeria', 'catacombs', 'crater'],
  ['volcano', 'heavensgate'],
  ['citadel'],
];

// ---------------------------------------------------------------- the hidden labyrinths
// floors: how deep; lv: level of the first floor (each floor deeper adds a little); themes; foes; guardians on certain floors; prize at the bottom
export const LABYRINTHS = {
  kings: { name: ['王者迷宮', 'King\'s Labyrinth'], floors: 30, lv: 30, step: 1.2, themes: ['ruins', 'castle', 'cave', 'fortress'], foes: ['skeleton2', 'skeleton3', 'gargoyle2', 'golem2', 'knight', 'paladin', 'darkknight', 'templar', 'swordmaster', 'bulwark'],
    guardians: { 10: { mon: 'golem3', name: ['王陵守衛', 'Barrow Warden'] }, 20: { mon: 'skeleton3', name: ['古王近衛', 'Royal Guard of Old'] }, 30: { mon: 'firstking' } },
    prize: { flag: 'job_sovereign', items: ['ex_kingsword', 'ex_kingsmail', 'ex_crown', 'ex_kingshield', 'ex_kingring', 'ex_sovereignseal'] },
    desc: ['古王瓦爾德蘭沉睡的地底迷宮。打倒古王的人，可以繼承「王者」之道。', 'The barrow-labyrinth where the First King Valdran sleeps. Whoever defeats him inherits the way of the Sovereign.'] },
  celestial: { name: ['天神迷宮', 'Celestial Labyrinth'], floors: 50, lv: 45, step: 1.1, themes: ['sky', 'void', 'crystal', 'church'], foes: ['celestial1', 'celestial2', 'celestial3', 'gryphon3', 'fiend3', 'dragon3', 'golem3', 'archmage', 'timewalker', 'seraph'],
    guardians: { 10: { mon: 'celestial2', name: ['第一座天使', 'First Throne'] }, 25: { mon: 'stardragon' }, 40: { mon: 'celestial3', name: ['熾天使長', 'Arch-Seraphim'] }, 50: { mon: 'godhead' } },
    prize: { flag: 'job_seraph', items: ['ex_celestial', 'ex_seraphrobe', 'ex_halo', 'ex_celestialorb', 'ex_genesis', 'ex_voidblade', 'ex_ragnarok', 'ex_angelring'] },
    desc: ['天上城裂開的地方，向下延伸到星之海的迷宮。最深處有天神之首。', 'Where the Celestial Citadel broke open, a labyrinth reaching down into the sea of stars. The Head of the Celestials waits at the bottom.'] },
  phantom: { name: ['幻影迴廊', 'Phantom Gallery'], floors: 20, lv: 18, step: 1.4, mirror: true, themes: ['void', 'church', 'crystal'], foes: ['wraith2', 'wraith3', 'gargoyle2'],
    guardians: { 20: { mon: 'wraith3', name: ['鏡中的自己', 'Your Reflection'], mirrorBoss: true } },
    prize: { items: ['ex_shadowgarb', 'ex_mirrormail', 'ex_whisper', 'ex_nightfang', 'ex_ribbon'] },
    desc: ['霧谷的鏡湖底下，映出你們自己的迴廊。敵人是你們的倒影。', 'A gallery beneath Mistvale\'s mirror lake that reflects your own company; the foes are your reflections.'] },
  dragon: { name: ['龍之墓所', 'Dragon\'s Grave'], floors: 20, lv: 36, step: 1.3, themes: ['volcano', 'desert', 'cave', 'crystal'], foes: ['dragon1', 'dragon2', 'dragon3', 'lizard3', 'serpent3', 'skylancer'],
    guardians: { 10: { mon: 'dragon3', name: ['守墓之龍', 'Grave Wyrm'] }, 20: { mon: 'stardragon' } },
    prize: { items: ['ex_dragonmail', 'ex_dragonhelm', 'ex_dragoncannon', 'ex_dragoneye', 'ex_worldsplitter', 'ex_flameshield', 'ex_iceshield'] },
    desc: ['日沙沙漠深處，龍死後回歸的地方。星龍王守護著龍的寶藏。', 'Deep in the Sundune, where dragons go to die. The Star Wyrm guards their hoard.'] },
};

// ---------------------------------------------------------------- tavern jobs (side quests): unlocked by chapter, fought once
// [id, chapter, place, 中文, English, lv, theme, foes, reward]
export const QUESTS = [
  ['q_rats', 0, 'aldmoor', '倉庫的老鼠', 'Rats in the Cellar', 2, 'cave', ['ooze1', 'ooze1', 'goblin1', 'goblin1'], { gold: 300, items: ['potion', 'potion'] }],
  ['q_wolves', 0, 'aldmoor', '狼群出沒', 'The Wolf Pack', 3, 'forest', ['wolf1', 'wolf1', 'wolf1', 'wolf2'], { gold: 400, items: ['boots_move'] }],
  ['q_escort', 1, 'greystone', '收成護衛', 'Guarding the Harvest', 6, 'plains', ['goblin2', 'goblin1', 'thief', 'hunter', 'goblin1'], { gold: 700, items: ['ex_mercbadge'] }],
  ['q_ghost', 1, 'greystone', '霧谷的哭聲', 'Weeping in the Mist', 7, 'swamp', ['wraith1', 'wraith1', 'wraith2', 'ooze2'], { gold: 800, items: ['hipotion', 'holywater'] }],
  ['q_duel', 1, 'lothar', '騎士的決鬥', 'A Knight\'s Duel', 9, 'castle', ['knight', 'knight', 'lancer', 'cleric'], { gold: 1000, items: ['ex_thiefgloves'] }],
  ['q_mine', 1, 'lothar', '迷路的礦工', 'The Lost Miners', 10, 'mine', ['golem1', 'spider2', 'spider1', 'ooze2'], { gold: 1100, items: ['ether', 'ether'], flag: 'clue_phantom1' }],
  ['q_smugglers', 2, 'saltreach', '走私船', 'The Smugglers', 13, 'bridge', ['corsair', 'corsair', 'thief', 'machinist', 'ninja'], { gold: 1600, items: ['gun5'] }],
  ['q_kraken', 2, 'saltreach', '海蛇', 'Serpent of the Bay', 14, 'river', ['serpent2', 'serpent1', 'serpent1', 'lizard2'], { gold: 1800, items: ['ex_rowenaknife'] }],
  ['q_tourney', 2, 'heronmoor', '湖上的比武大會', 'The Lake Tourney', 15, 'castle', ['samurai', 'paladin', 'skylancer', 'cavalier', 'spellblade'], { gold: 2400, items: ['ex_lionshield'] }],
  ['q_witch', 2, 'heronmoor', '森林的魔女', 'The Witch in the Wood', 16, 'forest', ['hexer', 'hexer', 'treant2', 'treant2', 'necromancer'], { gold: 2200, items: ['ex_witchhat'] }],
  ['q_bones', 2, 'eldhaven', '古戰場的亡靈', 'Dead of the Old Field', 18, 'ruins', ['skeleton2', 'skeleton2', 'wraith2', 'darkknight', 'necromancer'], { gold: 2600, items: ['holywater', 'holywater'], flag: 'clue_kings' }],
  ['q_assassins', 2, 'eldhaven', '暗殺者公會', 'The Guild of Knives', 19, 'town', ['assassin', 'ninja', 'ninja', 'thief', 'phantomthief'], { gold: 3000, items: ['ex_genjishield'] }],
  ['q_sandworm', 2, 'eldhaven', '日沙的蜥人', 'Saurians of the Sundune', 21, 'desert', ['lizard3', 'lizard2', 'lizard2', 'serpent2', 'spider2'], { gold: 3200, items: ['ex_bloodrose'], flag: 'clue_dragon' }],
  ['q_mirror', 2, 'heronmoor', '鏡湖的傳說', 'The Mirror Lake', 20, 'swamp', ['wraith3', 'wraith2', 'gargoyle2', 'hexer'], { gold: 2000, items: ['ex_lampcharm'], flag: 'lab_phantom', needs: 'clue_phantom1' }],
  ['q_kingskey', 2, 'eldhaven', '王陵的鑰匙', 'Key to the Barrow', 22, 'ruins', ['gargoyle2', 'golem2', 'skeleton3', 'templar'], { gold: 3000, items: ['ex_graysword'], flag: 'lab_kings', needs: 'clue_kings' }],
  ['q_heretics', 3, 'lumeria', '異端審判', 'The Heresy Trial', 25, 'church', ['templar', 'templar', 'cleric', 'witchhunter', 'paladin'], { gold: 4000, items: ['ex_judgehammer'] }],
  ['q_scholar', 3, 'lumeria', '被禁止的書', 'The Forbidden Book', 27, 'cave', ['necromancer', 'wraith3', 'skeleton3', 'archmage'], { gold: 4200, items: ['ex_necronomicon'] }],
  ['q_gryphon', 3, 'saltreach', '天空獅鷲', 'The Sky Gryphon', 29, 'hills', ['gryphon3', 'gryphon2', 'gryphon2', 'sharpshooter'], { gold: 4500, items: ['ex_skybow'] }],
  ['q_dragonbone', 3, 'eldhaven', '龍骨', 'Dragonbone', 31, 'desert', ['dragon2', 'lizard3', 'lizard3', 'serpent3'], { gold: 5000, items: ['ex_phoenixfan'], flag: 'lab_dragon', needs: 'clue_dragon' }],
  ['q_thief', 3, 'saltreach', '怪盜的預告信', 'The Calling Card', 30, 'town', ['phantomthief', 'assassin', 'ninja', 'dancer', 'thief'], { gold: 4800, items: ['ex_featherboots'] }],
  ['q_monk', 3, 'heronmoor', '山中的仙人', 'Hermit of the Peaks', 32, 'hills', ['grandmaster', 'monk', 'monk', 'monk', 'geomancer'], { gold: 5000, items: ['ex_monkgi', 'ex_godhand'] }],
  ['q_alchemy', 3, 'lumeria', '賢者之石', 'The Philosopher\'s Stone', 34, 'mine', ['alchemist', 'alchemist', 'golem3', 'machinist', 'sage'], { gold: 5500, items: ['ex_sagestone'] }],
  ['q_ember', 4, 'eldhaven', '赤焰山的炎魔', 'Fiends of Mount Ember', 38, 'volcano', ['fiend1', 'fiend1', 'fiend2', 'fiend3', 'dragon2'], { gold: 6000, items: ['ex_flameshield'] }],
  ['q_samurai', 4, 'heronmoor', '劍聖的試煉', 'The Sword Saint\'s Trial', 40, 'castle', ['swordmaster', 'samurai', 'samurai', 'ninja', 'assassin'], { gold: 7000, items: ['ex_masamune'] }],
  ['q_diva', 4, 'saltreach', '最後的演唱會', 'The Last Concert', 39, 'town', ['diva', 'bard', 'dancer', 'dancer', 'tactician'], { gold: 6500, items: ['ex_heavenharp', 'ex_divashroud'] }],
  ['q_lancer', 4, 'eldhaven', '天槍騎士團', 'Order of the Skyspear', 41, 'hills', ['skylancer', 'skylancer', 'cavalier', 'cavalier', 'templar'], { gold: 7000, items: ['ex_hermes'] }],
  ['q_chrono', 4, 'lumeria', '停止的時鐘', 'The Stopped Clock', 43, 'void', ['timewalker', 'chronomancer', 'chronomancer', 'astromancer', 'sage'], { gold: 7500, items: ['ex_chronos'] }],
  ['q_mage', 4, 'heronmoor', '大魔導士的塔', 'The Archmage\'s Tower', 44, 'ruins', ['archmage', 'archmage', 'sage', 'summoner', 'necromancer'], { gold: 8000, items: ['ex_mageamulet', 'ex_starrod'] }],
  ['q_cursed', 4, 'saltreach', '詛咒之戒', 'The Cursed Ring', 42, 'cave', ['necromancer', 'wraith3', 'skeleton3', 'darkknight', 'hexer'], { gold: 6000, items: ['ex_cursedring'] }],
  ['q_twin', 4, 'eldhaven', '雙刀的傳承', 'The Twin Blades', 45, 'fortress', ['assassin', 'ninja', 'swordmaster', 'runeknight', 'witchhunter'], { gold: 8000, items: ['ex_genjiglove', 'ex_serpentlash'] }],
].map(([id, ch, at, zh, en, lv, theme, foes, reward]) => ({ id, ch, at, name: [zh, en], lv, theme, foes, reward }));
