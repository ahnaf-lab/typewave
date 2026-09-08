#!/usr/bin/env node
// Regenerates the golden snapshot files under test/fixtures/golden from the
// fixed input corpus under test/fixtures/inputs. Run this deliberately after
// a reviewed, intentional change to cast/SVG output — never as a way to make
// a failing golden test pass without understanding why the output changed.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateFrames } from "../src/engine.js";
import { framesToCast } from "../src/cast.js";
import { framesToSvg } from "../src/svg.js";
import { resolveTheme, THEMES } from "../src/themes.js";
import { TIMING_PROFILES } from "../src/timing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "..", "test", "fixtures");
const INPUTS_DIR = path.join(FIXTURES_DIR, "inputs");
const GOLDEN_DIR = path.join(FIXTURES_DIR, "golden");
const CAST_DIR = path.join(GOLDEN_DIR, "cast");
const SVG_DIR = path.join(GOLDEN_DIR, "svg");

// The input this corpus uses to sweep every named theme. SVG themes only
// affect color, not layout or timing, so one representative input is enough
// to snapshot each theme without multiplying the corpus by every input.
const THEME_SWEEP_INPUT = "plain.txt";

mkdirSync(CAST_DIR, { recursive: true });
mkdirSync(SVG_DIR, { recursive: true });

const inputFiles = readdirSync(INPUTS_DIR)
  .filter((name) => name.endsWith(".txt"))
  .sort();

const speeds = Object.keys(TIMING_PROFILES);

for (const inputFile of inputFiles) {
  const text = readFileSync(path.join(INPUTS_DIR, inputFile), "utf8");
  const base = inputFile.replace(/\.txt$/, "");

  for (const speed of speeds) {
    const frames = generateFrames(text, speed);

    writeFileSync(path.join(CAST_DIR, `${base}.${speed}.cast`), framesToCast(frames));

    const theme = resolveTheme("dark");
    const svg = framesToSvg(frames, {
      background: theme.background,
      foreground: theme.foreground,
    });
    writeFileSync(path.join(SVG_DIR, `${base}.${speed}.svg`), svg);
  }
}

const themeSweepText = readFileSync(path.join(INPUTS_DIR, THEME_SWEEP_INPUT), "utf8");
const themeSweepFrames = generateFrames(themeSweepText, "steady");
for (const name of Object.keys(THEMES)) {
  const theme = resolveTheme(name);
  const svg = framesToSvg(themeSweepFrames, {
    background: theme.background,
    foreground: theme.foreground,
  });
  writeFileSync(path.join(SVG_DIR, `theme-${name}.svg`), svg);
}

console.log(
  `wrote golden files for ${inputFiles.length} inputs x ${speeds.length} speeds, ` +
    `plus ${Object.keys(THEMES).length} theme-sweep snapshots`
);
