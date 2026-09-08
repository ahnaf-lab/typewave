// The CLI surface: argument parsing, validation, help text and the command
// dispatch that ties the engine and renderers together. Kept separate from
// bin/typewave.js so it can be exercised directly in tests without spawning
// a subprocess.
import { generateFrames } from "./engine.js";
import { TIMING_PROFILES } from "./timing.js";
import { framesToCast } from "./cast.js";
import { framesToSvg } from "./svg.js";
import { THEMES, resolveTheme } from "./themes.js";

export const COMMANDS = new Set(["render"]);
export const OUT_FORMATS = new Set(["frames", "cast", "svg"]);
export const SPEEDS = new Set(Object.keys(TIMING_PROFILES));
export const THEME_NAMES = new Set(Object.keys(THEMES));

export class CliError extends Error {}

const DEFAULT_OPTIONS = {
  help: false,
  input: null,
  speed: "steady",
  theme: "dark",
  out: "frames",
  width: 80,
  height: 24,
  title: null,
  fontSize: 16,
  loop: true,
  background: null,
  foreground: null,
};

// Flags that take a value, mapped to the option key they populate and an
// optional coercion function.
const VALUE_FLAGS = {
  "--speed": ["speed", String],
  "-s": ["speed", String],
  "--theme": ["theme", String],
  "-t": ["theme", String],
  "--out": ["out", String],
  "-o": ["out", String],
  "--width": ["width", Number],
  "--cols": ["width", Number],
  "--height": ["height", Number],
  "--rows": ["height", Number],
  "--title": ["title", String],
  "--font-size": ["fontSize", Number],
  "--background": ["background", String],
  "--foreground": ["foreground", String],
};

// Parse argv (already stripped of `node script.js`) into a command name and
// an options object. Throws CliError on anything it doesn't recognise, so
// the caller never has to guess whether an unknown flag was silently
// ignored.
export function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };
  let command = null;
  let i = 0;

  if (argv.length > 0 && !argv[0].startsWith("-")) {
    command = argv[0];
    i = 1;
  }

  for (; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--no-loop") {
      options.loop = false;
      continue;
    }

    const mapping = VALUE_FLAGS[arg];
    if (mapping) {
      const [key, coerce] = mapping;
      const raw = argv[i + 1];
      if (raw === undefined) {
        throw new CliError(`option "${arg}" requires a value`);
      }
      options[key] = coerce(raw);
      i++;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new CliError(`unknown option "${arg}"`);
    }

    if (options.input !== null) {
      throw new CliError(`unexpected extra argument "${arg}"`);
    }
    options.input = arg;
  }

  return { command, options };
}

// Check option *values* (as opposed to parseArgs, which checks option
// *shape*). Only called once a command is known, since some checks
// (input required) only make sense for "render".
export function validateOptions(command, options) {
  if (command !== null && !COMMANDS.has(command)) {
    const known = [...COMMANDS].join(", ");
    throw new CliError(`unknown command "${command}" (expected: ${known})`);
  }

  if (options.help) return;

  if (command === "render" && !options.input) {
    throw new CliError('render requires an input file, e.g. "typewave render demo.txt"');
  }

  if (!SPEEDS.has(options.speed)) {
    const known = [...SPEEDS].join(", ");
    throw new CliError(`unknown speed "${options.speed}" (known: ${known})`);
  }

  if (!THEME_NAMES.has(options.theme)) {
    const known = [...THEME_NAMES].join(", ");
    throw new CliError(`unknown theme "${options.theme}" (known: ${known})`);
  }

  if (!OUT_FORMATS.has(options.out)) {
    const known = [...OUT_FORMATS].join(", ");
    throw new CliError(`unknown output format "${options.out}" (known: ${known})`);
  }

  if (!Number.isInteger(options.width) || options.width <= 0) {
    throw new CliError("--width must be a positive integer");
  }

  if (!Number.isInteger(options.height) || options.height <= 0) {
    throw new CliError("--height must be a positive integer");
  }

  if (typeof options.fontSize !== "number" || !(options.fontSize > 0) || Number.isNaN(options.fontSize)) {
    throw new CliError("--font-size must be a positive number");
  }

  if (options.background !== null && options.background.trim() === "") {
    throw new CliError("--background must not be empty");
  }

  if (options.foreground !== null && options.foreground.trim() === "") {
    throw new CliError("--foreground must not be empty");
  }
}

function readInputFile(readFileFn, input) {
  try {
    return readFileFn(input, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new CliError(`input file not found: ${input}`);
    }
    if (err.code === "EISDIR") {
      throw new CliError(`input path is a directory, not a file: ${input}`);
    }
    throw new CliError(`cannot read input file: ${input} (${err.message})`);
  }
}

export function topLevelHelp() {
  const commands = [...COMMANDS].join(", ");
  return `typewave - deterministic typing/reveal animation generator

Usage:
  typewave <command> [options]

Commands:
  render <input-file>   Render an input file as an animation
                        (known commands: ${commands})

Run "typewave render --help" for render options.
`;
}

export function renderHelp() {
  const speeds = [...SPEEDS].join(", ");
  const themes = [...THEME_NAMES].join(", ");
  const formats = [...OUT_FORMATS].join(", ");
  return `typewave render - turn a text file into a typing animation

Usage:
  typewave render <input-file> [options]

Options:
  --speed, -s     Timing profile (${speeds}). Default: steady
  --theme, -t     Color theme for svg output (${themes}). Default: dark
  --out, -o       Output format (${formats}). Default: frames
  --width         Terminal width in columns. Default: 80 (cast, svg)
  --height        Terminal height in rows. Default: 24 (cast, svg)
  --title         Optional title, recorded in the cast header or <title>
                  element (cast, svg)
  --font-size     Font size in pixels. Default: 16 (svg only)
  --no-loop       Play once instead of looping forever (svg only)
  --background    CSS color for the canvas background (svg only,
                   overrides --theme)
  --foreground    CSS color for the text (svg only, overrides --theme)
  --help, -h      Show this help

Output:
  frames  A JSON array of frames on stdout: [{ content, delayMs }, ...]
  cast    An asciinema v2 cast: a header line, then one event line per
          write, playable with "asciinema play" or any compatible viewer
  svg     A self-contained animated SVG, safe to embed directly in a
          README with an <img> tag
`;
}

// Run the CLI end to end against injected I/O, so tests can exercise it
// without touching the real filesystem or process streams. Returns the
// process exit code; never calls process.exit itself.
export function run(argv, io) {
  const { stdout, stderr, readFile } = io;

  let command, options;
  try {
    ({ command, options } = parseArgs(argv));
  } catch (err) {
    stderr.write(`typewave: ${err.message}\n`);
    return 1;
  }

  if (options.help || command === "help") {
    stdout.write(command === "render" ? renderHelp() : topLevelHelp());
    return 0;
  }

  if (!command) {
    stdout.write(topLevelHelp());
    return argv.length === 0 ? 0 : 1;
  }

  try {
    validateOptions(command, options);
  } catch (err) {
    stderr.write(`typewave: ${err.message}\n`);
    return 1;
  }

  let text;
  try {
    text = readInputFile(readFile, options.input);
  } catch (err) {
    stderr.write(`typewave: ${err.message}\n`);
    return 1;
  }

  let frames;
  try {
    frames = generateFrames(text, options.speed);
  } catch (err) {
    stderr.write(`typewave: ${err.message}\n`);
    return 1;
  }

  const theme = resolveTheme(options.theme);
  const background = options.background ?? theme.background;
  const foreground = options.foreground ?? theme.foreground;

  try {
    if (options.out === "cast") {
      stdout.write(
        framesToCast(frames, {
          width: options.width,
          height: options.height,
          title: options.title ?? undefined,
        })
      );
    } else if (options.out === "svg") {
      stdout.write(
        framesToSvg(frames, {
          width: options.width,
          height: options.height,
          title: options.title ?? undefined,
          fontSize: options.fontSize,
          loop: options.loop,
          background,
          foreground,
        })
      );
    } else {
      stdout.write(JSON.stringify(frames, null, 2) + "\n");
    }
  } catch (err) {
    stderr.write(`typewave: ${err.message}\n`);
    return 1;
  }

  return 0;
}
