import test from "node:test";
import assert from "node:assert/strict";
import { generateFrames, totalDurationMs } from "../src/engine.js";
import { mulberry32 } from "../src/prng.js";
import { TIMING_PROFILES } from "../src/timing.js";

test("empty input yields no frames", () => {
  assert.deepEqual(generateFrames("", "steady"), []);
});

test("steady profile: golden frames for a short string", () => {
  const frames = generateFrames("Hi!", "steady");
  assert.deepEqual(frames, [
    { content: "H", delayMs: 0 },
    { content: "Hi", delayMs: 40 },
    { content: "Hi!", delayMs: 40 },
  ]);
});

test("steady profile never adds punctuation or newline pauses", () => {
  const frames = generateFrames("a.\nb", "steady");
  assert.deepEqual(
    frames.map((frame) => frame.delayMs),
    [0, 40, 40, 40]
  );
});

test("natural profile reproduces exact seeded jitter", () => {
  const profile = TIMING_PROFILES.natural;
  const nextRandom = mulberry32(profile.seed);
  const expectedFirstJitter = Math.round(nextRandom() * profile.jitterMs);

  const frames = generateFrames("ab", "natural");
  assert.equal(frames[0].delayMs, 0);
  assert.equal(frames[1].delayMs, profile.baseDelayMs + expectedFirstJitter);
});

test("natural profile adds a pause after punctuation", () => {
  const frames = generateFrames("a.b", "natural");
  const delayForB = frames[2].delayMs;
  assert.ok(delayForB >= TIMING_PROFILES.natural.punctuationPauseMs);
});

test("natural profile adds a pause after newline", () => {
  const frames = generateFrames("a\nb", "natural");
  const delayForB = frames[2].delayMs;
  assert.ok(delayForB >= TIMING_PROFILES.natural.newlinePauseMs);
});

test("generateFrames is deterministic across repeated calls", () => {
  const first = generateFrames("Hello, world!\nSecond line.", "natural");
  const second = generateFrames("Hello, world!\nSecond line.", "natural");
  assert.deepEqual(first, second);
});

test("totalDurationMs sums all frame delays", () => {
  const frames = generateFrames("Hi!", "steady");
  assert.equal(totalDurationMs(frames), 80);
});

test("unknown profile name throws", () => {
  assert.throws(() => generateFrames("x", "does-not-exist"));
});

test("custom profile object overrides steady defaults", () => {
  const frames = generateFrames("ab", { baseDelayMs: 100 });
  assert.equal(frames[1].delayMs, 100);
});

test("non-string input is rejected", () => {
  assert.throws(() => generateFrames(42, "steady"), TypeError);
});
