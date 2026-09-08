// Golden-file (snapshot) tests: render the fixed corpus under
// test/fixtures/inputs through the cast and SVG renderers and compare
// byte-for-byte against the checked-in snapshots under
// test/fixtures/golden. These exist alongside the unit tests in
// cast.test.mjs / svg.test.mjs to catch any change — intended or not — to
// output format, escaping or timing math across a broader, realistic body
// of input than a couple of inline strings can cover.
//
// If a change intentionally alters cast/SVG output, regenerate the
// snapshots with `node scripts/update-golden.mjs` and review the diff.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateFrames } from "../src/engine.js";
import { framesToCast } from "../src/cast.js";
import { framesToSvg } from "../src/svg.js";
import { resolveTheme, THEMES } from "../src/themes.js";
import { TIMING_PROFILES } from "../src/timing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const INPUTS_DIR = path.join(FIXTURES_DIR, "inputs");
const GOLDEN_DIR = path.join(FIXTURES_DIR, "golden");

const SPEEDS = Object.keys(TIMING_PROFILES);
const THEME_SWEEP_INPUT = "plain.txt";

function readGolden(...segments) {
  return readFileSync(path.join(GOLDEN_DIR, ...segments), "utf8");
}

const inputFiles = readdirSync(INPUTS_DIR)
  .filter((name) => name.endsWith(".txt"))
  .sort();

test("fixture corpus has more than one sample input", () => {
  assert.ok(inputFiles.length >= 3, "expected at least 3 fixture inputs");
});

for (const inputFile of inputFiles) {
  const text = readFileSync(path.join(INPUTS_DIR, inputFile), "utf8");
  const base = inputFile.replace(/\.txt$/, "");

  for (const speed of SPEEDS) {
    test(`golden cast: ${base} @ ${speed} matches snapshot`, () => {
      const frames = generateFrames(text, speed);
      const cast = framesToCast(frames);
      assert.equal(cast, readGolden("cast", `${base}.${speed}.cast`));
    });

    test(`golden svg: ${base} @ ${speed} (dark theme) matches snapshot`, () => {
      const frames = generateFrames(text, speed);
      const theme = resolveTheme("dark");
      const svg = framesToSvg(frames, {
        background: theme.background,
        foreground: theme.foreground,
      });
      assert.equal(svg, readGolden("svg", `${base}.${speed}.svg`));
    });
  }
}

test("theme registry matches the snapshotted theme sweep", () => {
  assert.deepEqual(Object.keys(THEMES).sort(), ["dark", "dracula", "light", "solarized"]);
});

for (const name of Object.keys(THEMES)) {
  test(`golden svg: theme sweep "${name}" matches snapshot`, () => {
    const text = readFileSync(path.join(INPUTS_DIR, THEME_SWEEP_INPUT), "utf8");
    const frames = generateFrames(text, "steady");
    const theme = resolveTheme(name);
    const svg = framesToSvg(frames, {
      background: theme.background,
      foreground: theme.foreground,
    });
    assert.equal(svg, readGolden("svg", `theme-${name}.svg`));
  });
}

test("golden cast output distinguishes different fixture inputs", () => {
  const [first, second] = inputFiles;
  const firstText = readFileSync(path.join(INPUTS_DIR, first), "utf8");
  const secondText = readFileSync(path.join(INPUTS_DIR, second), "utf8");
  assert.notEqual(
    framesToCast(generateFrames(firstText, "steady")),
    framesToCast(generateFrames(secondText, "steady"))
  );
});
