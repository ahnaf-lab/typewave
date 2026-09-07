import test from "node:test";
import assert from "node:assert/strict";
import { framesToCast, framesToCastEvents } from "../src/cast.js";
import { generateFrames } from "../src/engine.js";

test("framesToCastEvents emits one event per revealed character", () => {
  const frames = generateFrames("Hi!", "steady");
  const events = framesToCastEvents(frames);
  assert.deepEqual(events, [
    [0, "o", "H"],
    [0.04, "o", "i"],
    [0.08, "o", "!"],
  ]);
});

test("framesToCastEvents skips frames with no new output", () => {
  const events = framesToCastEvents([
    { content: "a", delayMs: 0 },
    { content: "a", delayMs: 50 },
    { content: "ab", delayMs: 10 },
  ]);
  assert.deepEqual(events, [
    [0, "o", "a"],
    [0.06, "o", "b"],
  ]);
});

test("framesToCastEvents accumulates elapsed time across frames", () => {
  const frames = generateFrames("abc", { baseDelayMs: 100 });
  const events = framesToCastEvents(frames);
  assert.deepEqual(
    events.map((event) => event[0]),
    [0, 0.1, 0.2]
  );
});

test("framesToCast starts with a valid asciinema v2 header", () => {
  const cast = framesToCast(generateFrames("Hi", "steady"));
  const [headerLine] = cast.trim().split("\n");
  const header = JSON.parse(headerLine);
  assert.equal(header.version, 2);
  assert.equal(header.width, 80);
  assert.equal(header.height, 24);
});

test("framesToCast honours custom width, height and title", () => {
  const cast = framesToCast(generateFrames("Hi", "steady"), {
    width: 120,
    height: 40,
    title: "demo",
  });
  const header = JSON.parse(cast.trim().split("\n")[0]);
  assert.equal(header.width, 120);
  assert.equal(header.height, 40);
  assert.equal(header.title, "demo");
});

test("framesToCast body lines are each a valid [time, 'o', data] event", () => {
  const cast = framesToCast(generateFrames("Hi!", "steady"));
  const lines = cast.trim().split("\n");
  assert.equal(lines.length, 1 + 3);
  for (const line of lines.slice(1)) {
    const event = JSON.parse(line);
    assert.equal(event.length, 3);
    assert.equal(typeof event[0], "number");
    assert.equal(event[1], "o");
    assert.equal(typeof event[2], "string");
  }
});

test("framesToCast output is deterministic across repeated calls", () => {
  const frames = generateFrames("Hello, world!\nSecond line.", "natural");
  assert.equal(framesToCast(frames), framesToCast(frames));
});

test("framesToCast rejects a non-array frames argument", () => {
  assert.throws(() => framesToCast("nope"), TypeError);
});

test("framesToCast rejects a non-positive width or height", () => {
  const frames = generateFrames("hi", "steady");
  assert.throws(() => framesToCast(frames, { width: 0 }), RangeError);
  assert.throws(() => framesToCast(frames, { height: -1 }), RangeError);
});

test("framesToCast on empty frames produces only a header line", () => {
  const cast = framesToCast([]);
  assert.equal(cast.trim().split("\n").length, 1);
});
