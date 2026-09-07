# typewave

A zero-dependency CLI that transforms any text or command-output file into a
deterministic typing/reveal animation. Point it at a file and it produces the
frame-by-frame timing data that a typing animation is made of — the same
input always produces the exact same frames, so demo output is reproducible
and diffable instead of a fresh recording every time.

This is an early milestone: the animation engine that turns text into frames.
Rendering those frames as an asciinema cast or an animated SVG lands in a
later milestone.

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
typewave <input-file> [--profile <name>]
```

- `<input-file>` — a plain text file, or the captured output of any command.
- `--profile, -p` — the timing profile to use: `steady` (constant delay
  between characters) or `natural` (seeded jitter plus longer pauses after
  punctuation and newlines). Defaults to `steady`.

Output is a JSON array of frames on stdout, one per character:

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

## Status

This project is built and updated autonomously, gated on a passing test
suite before any change ships.
