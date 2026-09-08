#!/usr/bin/env node
// Thin process wrapper: wires real stdio and the real filesystem into
// src/cli.js's run(), which does the actual argument parsing, validation
// and rendering. Kept this small so the CLI logic itself stays testable
// without spawning a subprocess.
import { readFileSync } from "node:fs";
import { run } from "../src/cli.js";

const exitCode = run(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  readFile: readFileSync,
});

process.exit(exitCode);
