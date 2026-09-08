import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, validateOptions, run, CliError } from "../src/cli.js";

function fakeStream() {
  return {
    data: "",
    write(chunk) {
      this.data += chunk;
    },
  };
}

function fakeReadFile(files) {
  return (path) => {
    if (!(path in files)) {
      const err = new Error("no such file");
      err.code = "ENOENT";
      throw err;
    }
    return files[path];
  };
}

test("parseArgs reads the command and a positional input file", () => {
  const { command, options } = parseArgs(["render", "demo.txt"]);
  assert.equal(command, "render");
  assert.equal(options.input, "demo.txt");
});

test("parseArgs applies --speed, --theme and --out", () => {
  const { options } = parseArgs([
    "render",
    "demo.txt",
    "--speed",
    "natural",
    "--theme",
    "light",
    "--out",
    "svg",
  ]);
  assert.equal(options.speed, "natural");
  assert.equal(options.theme, "light");
  assert.equal(options.out, "svg");
});

test("parseArgs rejects an unknown option", () => {
  assert.throws(() => parseArgs(["render", "demo.txt", "--bogus"]), CliError);
});

test("parseArgs rejects a value flag with no value", () => {
  assert.throws(() => parseArgs(["render", "demo.txt", "--speed"]), CliError);
});

test("parseArgs rejects a second positional argument", () => {
  assert.throws(() => parseArgs(["render", "a.txt", "b.txt"]), CliError);
});

test("validateOptions rejects an unknown command", () => {
  const { command, options } = parseArgs(["bogus", "demo.txt"]);
  assert.throws(() => validateOptions(command, options), CliError);
});

test("validateOptions requires an input file for render", () => {
  const { command, options } = parseArgs(["render"]);
  assert.throws(() => validateOptions(command, options), /input file/);
});

test("validateOptions rejects an unknown speed, theme and out format", () => {
  assert.throws(
    () => validateOptions("render", { ...parseArgs(["render", "f"]).options, speed: "warp" }),
    /unknown speed/
  );
  assert.throws(
    () => validateOptions("render", { ...parseArgs(["render", "f"]).options, theme: "neon" }),
    /unknown theme/
  );
  assert.throws(
    () => validateOptions("render", { ...parseArgs(["render", "f"]).options, out: "gif" }),
    /unknown output format/
  );
});

test("validateOptions rejects a non-positive width or height", () => {
  assert.throws(
    () => validateOptions("render", { ...parseArgs(["render", "f"]).options, width: 0 }),
    /--width/
  );
  assert.throws(
    () => validateOptions("render", { ...parseArgs(["render", "f"]).options, height: -3 }),
    /--height/
  );
});

test("run renders frames JSON by default", () => {
  const stdout = fakeStream();
  const stderr = fakeStream();
  const code = run(["render", "demo.txt"], {
    stdout,
    stderr,
    readFile: fakeReadFile({ "demo.txt": "Hi" }),
  });
  assert.equal(code, 0);
  assert.equal(stderr.data, "");
  const frames = JSON.parse(stdout.data);
  assert.equal(frames.length, 2);
  assert.equal(frames[1].content, "Hi");
});

test("run --out cast produces an asciinema v2 header", () => {
  const stdout = fakeStream();
  const code = run(["render", "demo.txt", "--out", "cast"], {
    stdout,
    stderr: fakeStream(),
    readFile: fakeReadFile({ "demo.txt": "Hi" }),
  });
  assert.equal(code, 0);
  const header = JSON.parse(stdout.data.split("\n")[0]);
  assert.equal(header.version, 2);
});

test("run --out svg --theme light uses the light theme colors", () => {
  const stdout = fakeStream();
  const code = run(["render", "demo.txt", "--out", "svg", "--theme", "light"], {
    stdout,
    stderr: fakeStream(),
    readFile: fakeReadFile({ "demo.txt": "Hi" }),
  });
  assert.equal(code, 0);
  assert.match(stdout.data, /#ffffff/);
});

test("run --background overrides the theme", () => {
  const stdout = fakeStream();
  run(["render", "demo.txt", "--out", "svg", "--theme", "light", "--background", "#ff00ff"], {
    stdout,
    stderr: fakeStream(),
    readFile: fakeReadFile({ "demo.txt": "Hi" }),
  });
  assert.match(stdout.data, /#ff00ff/);
  assert.doesNotMatch(stdout.data, /#ffffff/);
});

test("run reports a missing input file and exits non-zero", () => {
  const stderr = fakeStream();
  const code = run(["render", "missing.txt"], {
    stdout: fakeStream(),
    stderr,
    readFile: fakeReadFile({}),
  });
  assert.equal(code, 1);
  assert.match(stderr.data, /input file not found/);
});

test("run rejects an unknown command", () => {
  const stderr = fakeStream();
  const code = run(["bogus", "demo.txt"], {
    stdout: fakeStream(),
    stderr,
    readFile: fakeReadFile({ "demo.txt": "Hi" }),
  });
  assert.equal(code, 1);
  assert.match(stderr.data, /unknown command/);
});

test("run with no arguments prints top-level help and exits 0", () => {
  const stdout = fakeStream();
  const code = run([], { stdout, stderr: fakeStream(), readFile: fakeReadFile({}) });
  assert.equal(code, 0);
  assert.match(stdout.data, /Usage:/);
});

test("run render --help prints render-specific help without touching the filesystem", () => {
  const stdout = fakeStream();
  const code = run(["render", "--help"], {
    stdout,
    stderr: fakeStream(),
    readFile: () => {
      throw new Error("should not read a file for --help");
    },
  });
  assert.equal(code, 0);
  assert.match(stdout.data, /--speed/);
  assert.match(stdout.data, /--theme/);
});
