// The animation engine: turns input text into a deterministic sequence of
// reveal frames, one per character, each carrying how long to wait before it
// appears. Everything downstream (asciinema cast, animated SVG) consumes this
// same frame list, so it is the one place timing logic lives.
import { mulberry32 } from "./prng.js";
import { resolveProfile } from "./timing.js";

const PAUSE_AFTER = new Set([".", "!", "?", ","]);

// Produce the ordered list of reveal frames for `text` under `profileInput`
// (a profile name from TIMING_PROFILES, or a partial override object merged
// onto the "steady" defaults).
export function generateFrames(text, profileInput = "steady") {
  if (typeof text !== "string") {
    throw new TypeError("text must be a string");
  }

  const profile = resolveProfile(profileInput);
  const nextRandom = mulberry32(profile.seed ?? 1);

  const frames = [];
  let revealed = "";
  let previousChar = null;

  for (const char of text) {
    let delayMs = 0;
    if (frames.length > 0) {
      delayMs = profile.baseDelayMs;
      if (profile.jitterMs > 0) {
        delayMs += Math.round(nextRandom() * profile.jitterMs);
      }
      if (previousChar !== null && PAUSE_AFTER.has(previousChar)) {
        delayMs += profile.punctuationPauseMs;
      }
      if (previousChar === "\n") {
        delayMs += profile.newlinePauseMs;
      }
    }

    revealed += char;
    frames.push({ content: revealed, delayMs });
    previousChar = char;
  }

  return frames;
}

// Sum of every frame's delay: the total wall-clock time the animation takes
// to fully reveal the text.
export function totalDurationMs(frames) {
  return frames.reduce((sum, frame) => sum + frame.delayMs, 0);
}
