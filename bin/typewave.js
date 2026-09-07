#!/usr/bin/env node
// CLI: read a text file, run it through the animation engine, and print the
// resulting frames as raw JSON, an asciinema-compatible cast, or a
// self-contained animated SVG.
import { readFileSync } from "node:fs";
import { generateFrames } from "../src/engine.js";
import { TIMING_PROFILES } from "../src/timing.js";
import { framesToCast } from "../src/cast.js";
import { framesToSvg } from "../src/svg.js";

const FORMATS = new Set(["frames", "cast", "svg"]);

function parseArgs(argv) {
  const args = {
    profile: "steady",
    input: null,
    help: false,
    format: "frames",
    width: 80,
    height: 24,
    title: null,
    fontSize: 16,
    loop: true,
    background: null,
    foreground: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--profile" || arg === "-p") {
      args.profile = argv[i + 1];
      i++;
    } else if (arg === "--format" || arg === "-f") {
      args.format = argv[i + 1];
      i++;
    } else if (arg === "--width" || arg === "--cols") {
      args.width = Number(argv[i + 1]);
      i++;
    } else if (arg === "--height" || arg === "--rows") {
      args.height = Number(argv[i + 1]);
      i++;
    } else if (arg === "--title") {
      args.title = argv[i + 1];
      i++;
    } else if (arg === "--font-size") {
      args.fontSize = Number(argv[i + 1]);
      i++;
    } else if (arg === "--no-loop") {
      args.loop = false;
    } else if (arg === "--background") {
      args.background = argv[i + 1];
      i++;
    } else if (arg === "--foreground") {
      args.foreground = argv[i + 1];
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
  const formats = [...FORMATS].join(", ");
  process.stdout.write(
    `typewave - deterministic typing/reveal animation frame generator

Usage:
  typewave <input-file> [--profile <name>] [--format <name>]

Options:
  --profile, -p   Timing profile to use (${profiles}). Default: steady
  --format,  -f   Output format (${formats}). Default: frames
  --width         Terminal width in columns. Default: 80 (cast, svg)
  --height        Terminal height in rows. Default: 24 (cast, svg)
  --title         Optional title, recorded in the cast header or <title>
                  element (cast, svg)
  --font-size     Font size in pixels. Default: 16 (svg only)
  --no-loop       Play once instead of looping forever (svg only)
  --background    CSS color for the canvas background (svg only)
  --foreground    CSS color for the text (svg only)
  --help, -h      Show this help

Output:
  frames  A JSON array of frames on stdout: [{ content, delayMs }, ...]
  cast    An asciinema v2 cast: a header line, then one event line per
          write, playable with "asciinema play" or any compatible viewer
  svg     A self-contained animated SVG, safe to embed directly in a
          README with an <img> tag
`
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  if (!FORMATS.has(args.format)) {
    const formats = [...FORMATS].join(", ");
    process.stderr.write(`typewave: unknown format "${args.format}" (known: ${formats})\n`);
    process.exit(1);
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

  if (args.format === "cast") {
    let cast;
    try {
      cast = framesToCast(frames, {
        width: args.width,
        height: args.height,
        title: args.title ?? undefined,
      });
    } catch (err) {
      process.stderr.write(`typewave: ${err.message}\n`);
      process.exit(1);
    }
    process.stdout.write(cast);
    return;
  }

  if (args.format === "svg") {
    let svg;
    try {
      svg = framesToSvg(frames, {
        width: args.width,
        height: args.height,
        title: args.title ?? undefined,
        fontSize: args.fontSize,
        loop: args.loop,
        background: args.background ?? undefined,
        foreground: args.foreground ?? undefined,
      });
    } catch (err) {
      process.stderr.write(`typewave: ${err.message}\n`);
      process.exit(1);
    }
    process.stdout.write(svg);
    return;
  }

  process.stdout.write(JSON.stringify(frames, null, 2) + "\n");
}

main();
