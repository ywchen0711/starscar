// Builders for jobs and abilities, shared by the two job tables.
// An active ability: r range ('w' = the weapon's), a area radius ('line' / 'all'), t target ('foe' 'ally' 'any' 'self'),
// mp cost, ct charge time (0 = at once), d damage [stat, power, element], h heal [stat, power], rev revive (fraction of HP),
// st statuses [[id, chance %, turns]], cure [ids], buf [[stat, percent, turns]], steal slot, brk slot, drain, mpd (MP damage), hit (fixed chance %)
export const act = (id, zh, en, jp, o = {}) => ({ id, name: [zh, en], k: 'act', jp, r: 1, a: 0, t: 'foe', mp: 0, ct: 0, ...o });
export const mag = (id, zh, en, jp, o = {}) => act(id, zh, en, jp, { magic: true, ...o });
// a reaction: on 'phys' / 'magic' / 'any' hit, with chance p (percent) or strength
export const rea = (id, zh, en, jp, rx) => ({ id, name: [zh, en], k: 'react', jp, rx });
// a support: always on while set
export const sup = (id, zh, en, jp, sp) => ({ id, name: [zh, en], k: 'sup', jp, sp });
// a movement ability: always on while set
export const mov = (id, zh, en, jp, mv) => ({ id, name: [zh, en], k: 'move', jp, mv });
// a job: st = growth multipliers [hp, mp, atk, def, mag, res, spd]; eq = weapon and armour kinds; req = job levels needed
export const job = (id, zh, en, o, abilities) => ({ id, name: [zh, en], tier: 0, req: {}, mov: 4, jmp: 3, eva: 5, unique: false, ...o, abilities: abilities.map((a) => ({ ...a, job: id })) });
