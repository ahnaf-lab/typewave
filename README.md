# typewave

A zero-dependency CLI that transforms any text or command-output file into a
deterministic typing/reveal animation. Point it at a file and it produces the
frame-by-frame timing data that a typing animation is made of — the same
input always produces the exact same frames, so demo output is reproducible
and diffable instead of a fresh recording every time.

This is an early milestone: text turns into frames, and frames can now be
rendered as an asciinema-compatible cast or as a self-contained animated SVG
you can embed directly in a README.

## Install

```
git clone <this-repository-url>
cd typewave
npm install
npm link
```

`npm install` has nothing to fetch — the project has zero runtime
dependencies — but it wires up the `typewave` binary from `bin/typewave.js`.

## Usage

```
typewave render <input-file> [options]
```

Run `typewave --help` for the list of commands, or `typewave render --help`
for the full option list.

- `<input-file>` — a plain text file, or the captured output of any command.
- `--speed, -s` — the timing profile to use: `steady` (constant delay
  between characters) or `natural` (seeded jitter plus longer pauses after
  punctuation and newlines). Defaults to `steady`.
- `--theme, -t` — a named color theme for `svg` output: `dark`, `light`,
  `dracula`, or `solarized`. Defaults to `dark`. Ignored for `frames` and
  `cast` output, which carry no color information of their own.
- `--out, -o` — the output format: `frames` (raw JSON frame list), `cast`
  (an asciinema v2 cast), or `svg` (a self-contained animated SVG). Defaults
  to `frames`.
- `--width`, `--height` — terminal size, in columns/rows. Used to size the
  cast header or the SVG canvas. Only used with `--out cast` or `--out svg`.
  Default: `80x24`.
- `--title` — an optional title recorded in the cast header, or rendered as
  an SVG `<title>` element. Only used with `--out cast` or `--out svg`.
- `--font-size` — SVG font size in pixels. Only used with `--out svg`.
  Default: `16`.
- `--no-loop` — render the SVG animation to play once and hold on the final
  frame, instead of looping forever. Only used with `--out svg`.
- `--background`, `--foreground` — CSS colors for the SVG canvas and text,
  overriding whichever `--theme` is in effect. Only used with `--out svg`.
- `--help, -h` — show help for the top-level CLI or for `render`.

Every option value is validated up front — an unknown speed, theme, output
format, or a non-positive `--width`/`--height`/`--font-size` fails with a
specific error message instead of a confusing downstream crash.

### `frames` format

A JSON array of frames on stdout, one per character:

```
typewave render README.md --speed natural
```

```json
[
  { "content": "#", "delayMs": 0 },
  { "content": "# ", "delayMs": 63 },
  { "content": "# t", "delayMs": 51 }
]
```

Each frame's `content` is the fully revealed text up to that point, and
`delayMs` is how long to hold the previous frame before showing this one.
Because timing jitter comes from a seeded generator rather than
`Math.random()`, running the same file through the same profile always
produces byte-for-byte identical frames.

### `cast` format

An [asciinema v2 cast](https://docs.asciinema.org/manual/asciicast/v2/):
a header line followed by one `[time, "o", data]` event line per write,
playable with `asciinema play` or any compatible viewer/converter:

```
typewave render README.md --out cast > demo.cast
asciinema play demo.cast
```

```
{"version":2,"width":80,"height":24,"timestamp":0}
[0,"o","#"]
[0.063,"o"," "]
[0.114,"o","t"]
```

Each event's time is the running total of every `delayMs` up to that
character, in seconds. The cast's `timestamp` is always `0`, and the times
are derived directly from the same seeded frame timings as the `frames`
format, so the same input and profile always produce a byte-for-byte
identical cast.

### `svg` format

A single self-contained `.svg` file — markup plus a `<style>` block, no
external references — that you can commit and embed straight into a README:

```
typewave render README.md --out svg --theme dracula > demo.svg
```

```markdown
![demo](demo.svg)
```

Every character in the input gets its own tiny CSS `@keyframes` rule that
flips it from invisible to visible at the exact percentage of one animation
cycle that its frame timing works out to, so the SVG "types" out in the
browser with no JavaScript involved. By default the animation loops forever
with a pause on the finished text; pass `--no-loop` to play once and hold.
Because the percentages come from the same seeded frame timings as the
`cast` format, the same input, profile and options always produce a
byte-for-byte identical SVG.

## Status

This project is built and updated autonomously, gated on a passing test
suite before any change ships.
