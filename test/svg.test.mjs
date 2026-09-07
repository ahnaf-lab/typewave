import test from "node:test";
import assert from "node:assert/strict";
import { framesToSvg } from "../src/svg.js";
import { generateFrames } from "../src/engine.js";

test("framesToSvg produces a well-formed self-contained SVG document", () => {
  const svg = framesToSvg(generateFrames("Hi!", "steady"));
  assert.ok(svg.startsWith("<svg xmlns=\"http://www.w3.org/2000/svg\""));
  assert.ok(svg.trim().endsWith("</svg>"));
  assert.ok(svg.includes("<style>"));
});

test("framesToSvg emits one tspan per non-newline character", () => {
  const svg = framesToSvg(generateFrames("Hi!", "steady"));
  const matches = svg.match(/<tspan /g) ?? [];
  assert.equal(matches.length, 3);
});

test("framesToSvg does not emit a glyph for newline characters", () => {
  const svg = framesToSvg(generateFrames("a\nb", "steady"));
  const matches = svg.match(/<tspan /g) ?? [];
  assert.equal(matches.length, 2);
});

test("framesToSvg escapes XML-significant characters in the source text", () => {
  const svg = framesToSvg(generateFrames("<&>", "steady"));
  assert.ok(!svg.includes(">tspan>"));
  assert.ok(svg.includes(">&lt;<"));
  assert.ok(svg.includes(">&amp;<"));
  assert.ok(svg.includes(">&gt;<"));
});

test("framesToSvg output is deterministic across repeated calls", () => {
  const frames = generateFrames("Hello, world!\nSecond line.", "natural");
  assert.equal(framesToSvg(frames), framesToSvg(frames));
});

test("framesToSvg rejects a non-array frames argument", () => {
  assert.throws(() => framesToSvg("nope"), TypeError);
});

test("framesToSvg rejects a non-positive width or height", () => {
  const frames = generateFrames("hi", "steady");
  assert.throws(() => framesToSvg(frames, { width: 0 }), RangeError);
  assert.throws(() => framesToSvg(frames, { height: -1 }), RangeError);
});

test("framesToSvg rejects a non-positive font size", () => {
  const frames = generateFrames("hi", "steady");
  assert.throws(() => framesToSvg(frames, { fontSize: 0 }), RangeError);
});

test("framesToSvg honours custom title in a <title> element", () => {
  const svg = framesToSvg(generateFrames("Hi", "steady"), { title: "demo" });
  assert.ok(svg.includes("<title>demo</title>"));
});

test("framesToSvg canvas size scales with width and height in columns/rows", () => {
  const frames = generateFrames("Hi", "steady");
  const small = framesToSvg(frames, { width: 10, height: 5 });
  const large = framesToSvg(frames, { width: 100, height: 50 });
  const smallWidth = Number(small.match(/width="(\d+(\.\d+)?)"/)[1]);
  const largeWidth = Number(large.match(/width="(\d+(\.\d+)?)"/)[1]);
  assert.ok(largeWidth > smallWidth);
});

test("framesToSvg loops by default: keyframes reset opacity at 0%", () => {
  const svg = framesToSvg(generateFrames("Hi", "steady"));
  assert.ok(svg.includes("infinite"));
  assert.ok(/0%,[\d.]+%\{opacity:0\}/.test(svg));
});

test("framesToSvg with loop:false plays once and holds the final frame", () => {
  const svg = framesToSvg(generateFrames("Hi", "steady"), { loop: false });
  assert.ok(!svg.includes("infinite"));
  assert.ok(svg.includes(" 1 forwards"));
});

test("framesToSvg on empty frames still produces a valid, closed document", () => {
  const svg = framesToSvg([]);
  assert.ok(svg.includes("<svg"));
  assert.ok(svg.trim().endsWith("</svg>"));
  assert.ok(!svg.includes("<tspan"));
});
