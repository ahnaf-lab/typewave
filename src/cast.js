// Renders deterministic reveal frames (see src/engine.js) as an
// asciinema v2 cast: a header JSON object followed by one JSON-array
// event per line, playable in any standard asciinema-compatible player.
//
// Format reference: https://docs.asciinema.org/manual/asciicast/v2/
//
// Frames carry the *full* revealed text so far plus a delay; a cast event
// carries only the *newly written* chunk plus an absolute timestamp. This
// module does that conversion. The header omits `env` and pins
// `timestamp` to 0 so the same frames always produce byte-for-byte
// identical cast output, matching the rest of this project.

const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 24;

function frameOutputChunk(frames, index) {
  const previous = index === 0 ? "" : frames[index - 1].content;
  const current = frames[index].content;
  return current.slice(previous.length);
}

// Convert frames into asciinema "o" (stdout) events: [timeSeconds, "o", data].
// Frames that reveal no new characters (delayMs-only, empty chunk) are
// skipped since asciinema events must carry output.
export function framesToCastEvents(frames) {
  let elapsedMs = 0;
  const events = [];
  for (let i = 0; i < frames.length; i++) {
    elapsedMs += frames[i].delayMs;
    const chunk = frameOutputChunk(frames, i);
    if (chunk.length === 0) continue;
    events.push([elapsedMs / 1000, "o", chunk]);
  }
  return events;
}

// Render frames as a full asciinema v2 cast document (newline-delimited
// JSON: one header object, then one event array per line).
export function framesToCast(frames, options = {}) {
  if (!Array.isArray(frames)) {
    throw new TypeError("frames must be an array");
  }

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  if (!Number.isInteger(width) || width <= 0) {
    throw new RangeError("width must be a positive integer");
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new RangeError("height must be a positive integer");
  }

  const header = {
    version: 2,
    width,
    height,
    timestamp: 0,
  };
  if (options.title) {
    header.title = String(options.title);
  }

  const lines = [JSON.stringify(header)];
  for (const event of framesToCastEvents(frames)) {
    lines.push(JSON.stringify(event));
  }
  return lines.join("\n") + "\n";
}
