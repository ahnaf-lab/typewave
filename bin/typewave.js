#!/usr/bin/env node
// CLI for milestone 1: read a text file, run it through the animation engine,
// and print the resulting frames as JSON. Cast/SVG rendering is a later
// milestone; this is the thin wiring that exercises the engine end to end.
import { readFileSync } from "node:fs";
import { generateFrames } from "../src/engine.js";
import { TIMING_PROFILES } from "../src/timing.js";

function parseArgs(argv) {
  const args = { profile: "steady", input: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--profile" || arg === "-p") {
      args.profile = argv[i + 1];
      i++;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (!arg.startsWith("-")) {
      args.input = arg;
    }
  }
  return args;
}

function printHelp() {
  const profiles = Object.keys(TIMING_PROFILES).join(", ");
  process.stdout.write(
    `typewave - deterministic typing/reveal animation frame generator

Usage:
  typewave <input-file> [--profile <name>]

Options:
  --profile, -p   Timing profile to use (${profiles}). Default: steady
  --help, -h      Show this help

Output:
  A JSON array of frames on stdout: [{ content, delayMs }, ...]
`
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  let text;
  try {
    text = readFileSync(args.input, "utf8");
  } catch {
    process.stderr.write(`typewave: cannot read input file: ${args.input}\n`);
    process.exit(1);
  }

  let frames;
  try {
    frames = generateFrames(text, args.profile);
  } catch (err) {
    process.stderr.write(`typewave: ${err.message}\n`);
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(frames, null, 2) + "\n");
}

main();
