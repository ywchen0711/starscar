// Small helpers shared by the rules and the screens.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const r0 = Math.round;
// a seeded random source (the same seed always makes the same map, the same shop, the same loot table)
export function seeded(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export const pick = (a, rnd = Math.random) => a[Math.floor(rnd() * a.length)];
export const shuffle = (a, rnd = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const range = (n) => Array.from({ length: n }, (_, i) => i);
