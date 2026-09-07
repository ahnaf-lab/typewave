// A small, deterministic pseudo-random number generator (mulberry32).
//
// Frame timing needs jitter that *looks* random but must reproduce byte-for-byte
// on every run given the same seed, so `Math.random()` (unseeded, non-reproducible)
// is never used anywhere in this project.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
