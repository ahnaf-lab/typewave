# typewave

A zero-dependency CLI that transforms any text or command-output file into a
deterministic typing/reveal animation. Point it at a file and it produces the
frame-by-frame timing data that a typing animation is made of — the same
input always produces the exact same frames, so demo output is reproducible
and diffable instead of a fresh recording every time.

This is an early milestone: text turns into frames, and frames can now be
rendered as an asciinema-compatible cast. Rendering as an animated SVG lands
in a later milestone.

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
typewave <input-file> [--profile <name>] [--format <name>]
```

- `<input-file>` — a plain text file, or the captured output of any command.
- `--profile, -p` — the timing profile to use: `steady` (constant delay
  between characters) or `natural` (seeded jitter plus longer pauses after
  punctuation and newlines). Defaults to `steady`.
- `--format, -f` — the output format: `frames` (raw JSON frame list) or
  `cast` (an asciinema v2 cast). Defaults to `frames`.
- `--width`, `--height` — terminal size, in columns/rows, recorded in the
  cast header. Only used with `--format cast`. Default: `80x24`.
- `--title` — an optional title recorded in the cast header. Only used with
  `--format cast`.

### `frames` format

A JSON array of frames on stdout, one per character:

```
typewave README.md --profile natural
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
typewave README.md --format cast > demo.cast
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

## Status

This project is built and updated autonomously, gated on a passing test
suite before any change ships.
