// The whole story in order, and a few helpers for finding where you are in it.
import { CAST, CHAPTERS, EVENTS1, F } from './story1.js';
import { EVENTS2 } from './story2.js';
import { EVENTS3 } from './story3.js';
import { EVENTS4, ENDING } from './story4.js';

export { CAST, CHAPTERS, ENDING, F };
export const EVENTS = [...EVENTS1, ...EVENTS2, ...EVENTS3, ...EVENTS4];
export const EVENT = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
// the next story event (each one needs the one before it)
export const nextEvent = (done) => EVENTS.find((e) => !done[e.id]) || null;
// the Starscar blade comes when the Sky Key is whole
EVENT.c4_6.give = { items: ['ex_starscar'] };
// recruits: names for the people you hire at taverns
export const RECRUIT_NAMES = {
  m: [['亞瑟', 'Arthur'], ['卡洛', 'Carlo'], ['法蘭克', 'Frank'], ['葛溫', 'Gwyn'], ['伊凡', 'Ivan'], ['凱爾', 'Kyle'], ['馬可', 'Marco'], ['奧圖', 'Otto'], ['昆恩', 'Quinn'], ['山姆', 'Sam'], ['烏爾', 'Ulric'], ['威爾', 'Will'], ['塞拉斯', 'Silas'], ['德瑞克', 'Derek'], ['羅蘭', 'Roland'], ['班恩', 'Ben'], ['托比', 'Toby'], ['雷夫', 'Ralf'], ['哈洛', 'Harold'], ['尼爾', 'Neil']],
  f: [['貝拉', 'Bella'], ['黛安', 'Diane'], ['海倫', 'Helen'], ['茱莉', 'Julie'], ['莉莉', 'Lily'], ['妮娜', 'Nina'], ['佩琪', 'Peggy'], ['蘿絲', 'Rose'], ['提娜', 'Tina'], ['薇拉', 'Vera'], ['珊德拉', 'Sandra'], ['艾琳', 'Irene'], ['瑪莎', 'Martha'], ['克蕾兒', 'Claire'], ['諾拉', 'Nora'], ['葛蕾絲', 'Grace'], ['艾瑪', 'Emma'], ['芙蘿', 'Flo'], ['妲莉亞', 'Dahlia'], ['蜜拉', 'Myra']],
};
