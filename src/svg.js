// Renders deterministic reveal frames (see src/engine.js) as a self-contained
// animated SVG: every character gets its own CSS @keyframes rule that flips
// its opacity from 0 to 1 at the exact millisecond it appears in the frame
// timeline, scaled into a percentage of one animation cycle. Because the
// percentages are derived directly from the same seeded frame timings as the
// cast renderer, the same input and profile always produce a byte-for-byte
// identical SVG document.
//
// The whole thing is one <svg> file: markup plus a <style> block, nothing
// external, safe to drop straight into a README as an <img src="demo.svg">.

import { totalDurationMs } from "./engine.js";

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_LOOP_PAUSE_MS = 1500;
const DEFAULT_BACKGROUND = "#0d1117";
const DEFAULT_FOREGROUND = "#c9d1d9";
const PADDING = 16;
const CHAR_WIDTH_RATIO = 0.6;
const LINE_HEIGHT_RATIO = 1.4;
const FONT_FAMILY =
  "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

// Escape text for safe use inside SVG element content AND attribute values
// (quoted with double quotes throughout this module), so nothing a caller
// passes in — title, colors, file content — can break out of its element or
// attribute and inject markup.
function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Format a 0-100 percentage with just enough precision to be exact for
// millisecond-resolution timing, trimming trailing zeros so the output stays
// compact and stable.
function formatPct(pct) {
  const clamped = Math.min(100, Math.max(0, pct));
  return String(Math.round(clamped * 1000) / 1000);
}

// Walk cumulative frames into a flat list of single-character placements,
// tracking cursor row/column so multi-line text wraps the way a terminal
// would. A frame's chunk (the newly revealed text since the previous frame)
// is normally exactly one character, but this handles longer or empty
// chunks too, so it tolerates any well-formed frame list, not just ones
// produced by generateFrames.
function layoutChars(frames) {
  const chars = [];
  let prevContent = "";
  let elapsedMs = 0;
  let row = 0;
  let col = 0;

  for (const frame of frames) {
    elapsedMs += frame.delayMs;
    const chunk = frame.content.slice(prevContent.length);
    prevContent = frame.content;
    if (chunk.length === 0) continue;

    for (const ch of chunk) {
      if (ch === "\n") {
        row++;
        col = 0;
        continue;
      }
      chars.push({ ch, row, col, startMs: elapsedMs });
      col++;
    }
  }

  return chars;
}

// Render frames as a full, self-contained animated SVG document.
export function framesToSvg(frames, options = {}) {
  if (!Array.isArray(frames)) {
    throw new TypeError("frames must be an array");
  }

  const cols = options.cols ?? options.width ?? DEFAULT_COLS;
  const rows = options.rows ?? options.height ?? DEFAULT_ROWS;
  if (!Number.isInteger(cols) || cols <= 0) {
    throw new RangeError("cols must be a positive integer");
  }
  if (!Number.isInteger(rows) || rows <= 0) {
    throw new RangeError("rows must be a positive integer");
  }

  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  if (!(typeof fontSize === "number") || !(fontSize > 0)) {
    throw new RangeError("fontSize must be a positive number");
  }

  const loop = options.loop ?? true;
  const loopPauseMs = options.loopPauseMs ?? DEFAULT_LOOP_PAUSE_MS;
  if (!Number.isInteger(loopPauseMs) || loopPauseMs < 0) {
    throw new RangeError("loopPauseMs must be a non-negative integer");
  }

  const background = options.background ?? DEFAULT_BACKGROUND;
  const foreground = options.foreground ?? DEFAULT_FOREGROUND;

  const charWidth = fontSize * CHAR_WIDTH_RATIO;
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  const canvasWidth = PADDING * 2 + cols * charWidth;
  const canvasHeight = PADDING * 2 + rows * lineHeight;

  const chars = layoutChars(frames);
  const typingMs = totalDurationMs(frames);
  const cycleMs = Math.max(1, typingMs + (loop ? loopPauseMs : 0));

  const styleLines = [];
  const tspanLines = [];

  chars.forEach((char, index) => {
    const startPct = formatPct((char.startMs / cycleMs) * 100);
    const className = `c${index}`;
    if (loop) {
      styleLines.push(
        `.${className}{animation:r${index} ${cycleMs}ms linear infinite}` +
          `@keyframes r${index}{0%,${startPct}%{opacity:0}${startPct}%,100%{opacity:1}}`
      );
    } else {
      styleLines.push(
        `.${className}{animation:r${index} ${cycleMs}ms linear 1 forwards}` +
          `@keyframes r${index}{0%,${startPct}%{opacity:0}${startPct}%{opacity:1}}`
      );
    }

    const x = PADDING + char.col * charWidth;
    const y = PADDING + char.row * lineHeight + fontSize;
    tspanLines.push(
      `<tspan class="${className}" x="${x}" y="${y}" opacity="0">${escapeXml(char.ch)}</tspan>`
    );
  });

  const titleTag = options.title
    ? `<title>${escapeXml(options.title)}</title>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" ` +
    `viewBox="0 0 ${canvasWidth} ${canvasHeight}">` +
    titleTag +
    `<style>text{font-family:${FONT_FAMILY};font-size:${fontSize}px}${styleLines.join("")}</style>` +
    `<rect width="100%" height="100%" fill="${escapeXml(background)}" rx="6"/>` +
    `<text fill="${escapeXml(foreground)}" xml:space="preserve">${tspanLines.join("")}</text>` +
    `</svg>\n`
  );
}
