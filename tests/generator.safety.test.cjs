"use strict";
// Issue #70: `scripts/apply-skin-system.cjs` is the only writer of the shipped
// bundle, and the bundle is symlinked into a live profile. A half-written file
// is not "the build failed", it is "Failed to load plugins" on every reload.
//
// These cases run the real generator in a throwaway copy of the repo and break
// the write halfway, then check what was left behind. They are behavioural, not
// textual: revert `writeBundleSync()` to a bare `fs.writeFileSync(CLIENT, …)`
// and every assertion below goes red.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const REPO = path.join(__dirname, "..");
const GENERATOR = path.join("scripts", "apply-skin-system.cjs");

/** A throwaway checkout containing everything the generator needs, minus deps. */
function makeWorktree(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `dsh-gen-${name}-`));
  for (const entry of ["lib", "scripts"]) {
    fs.cpSync(path.join(REPO, entry), path.join(dir, entry), { recursive: true });
  }
  return dir;
}

/** Run the generator in `cwd` with `preload` injected (-r), return the result. */
function runGenerator(cwd, { preload, expectThrow = true } = {}) {
  const args = preload ? ["-r", preload, path.join(cwd, GENERATOR)] : [path.join(cwd, GENERATOR)];
  const res = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
  if (expectThrow) assert.notEqual(res.status, 0, "a broken write must exit non-zero");
  return res;
}

const clientAt = (cwd) => path.join(cwd, "lib", "client.js");
const bytesAt = (cwd) => fs.statSync(clientAt(cwd)).size;

test("a write that dies halfway leaves the previous bundle byte-for-byte intact", () => {
  // ENOSPC / Ctrl-C / a locked file all look like this: some bytes landed, the
  // rest never did. The parser must reject the partial file before rename.
  const cwd = makeWorktree("halfway");
  try {
    const before = fs.readFileSync(clientAt(cwd));
    const sizeBefore = before.length;

    const hook = path.join(cwd, "halfway-hook.cjs");
    fs.writeFileSync(
      hook,
      [
        'const fs = require("node:fs");',
        "module.exports = function (tmp) {",
        "  // Simulate a write that died halfway: some bytes landed, the rest never",
        "  // did. This MUST use the `tmp` argument.",
        "  //",
        "  // The generator calls the hook AFTER its own write, so monkey-patching",
        "  // fs.writeFileSync here can only affect writes that happen later — and",
        "  // there are none. An fs-patching hook is therefore dead on arrival: it",
        "  // never fires, the run exits 0, and the assertions below pass without",
        "  // the write path ever being exercised. (That was this case's actual",
        "  // bug: it aborted because the hook module exported nothing, not because",
        "  // a write failed.) The stderr assertion below makes that unrepresentable.",
        '  fs.writeFileSync(tmp, "const SKINS = [", "utf8");',
        '  throw new Error("simulated ENOSPC halfway");',
        "};"
      ].join("\n")
    );

    const env = { ...process.env, DSH_DREAM_SKIN_WRITE_HOOK: hook };
    const res = spawnSync(process.execPath, [path.join(cwd, GENERATOR)], { cwd, encoding: "utf8", env });
    assert.notEqual(res.status, 0, "generator must exit non-zero after a failed write");
    // The run must abort because OUR simulated disk failure propagated. Without
    // this, a hook that never fires still satisfies every assertion below — a
    // green gate proving nothing.
    assert.ok(
      /simulated ENOSPC halfway/.test(res.stderr),
      `the injected write failure is what aborted the run, got: ${res.stderr}`
    );

    assert.equal(bytesAt(cwd), sizeBefore, "lib/client.js is the same size as before the run");
    assert.ok(fs.readFileSync(clientAt(cwd)).equals(before), "lib/client.js is byte-identical");

    // No temp file left to rot next to the bundle.
    const stray = fs.readdirSync(path.join(cwd, "lib")).filter((f) => f.includes(".tmp-"));
    assert.deepEqual(stray, [], "the failed write cleaned up its temp file");
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test("a generated bundle that does not parse never reaches lib/client.js", () => {
  // Stronger than the byte check: the replacement is fully written and IS what
  // the design system produced, but it is not valid JS. Only a post-write
  // parse check catches this — the generator itself is happy with it.
  const cwd = makeWorktree("unparsable");
  try {
    const before = fs.readFileSync(clientAt(cwd));

    const hook = path.join(cwd, "corrupt-hook.cjs");
    fs.writeFileSync(
      hook,
      [
        'const fs = require("node:fs");',
        "module.exports = function (tmp) {",
        '  fs.appendFileSync(tmp, "\\nthis is not javascript at all<<<\\n");',
        "};"
      ].join("\n")
    );

    const env = { ...process.env, DSH_DREAM_SKIN_WRITE_HOOK: hook };
    const res = spawnSync(process.execPath, [path.join(cwd, GENERATOR)], { cwd, encoding: "utf8", env });
    assert.notEqual(res.status, 0, "unparsable output must fail the run");
    assert.ok(/does not parse/.test(res.stderr), `failure explains itself, got: ${res.stderr}`);
    assert.ok(fs.readFileSync(clientAt(cwd)).equals(before), "original bundle untouched");
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test("a clean run replaces the bundle atomically and leaves it parseable", () => {
  // The control case: when nothing is broken the bundle still ends up correct.
  // Without the happy path here a generator that simply refuses to write would
  // "pass" the two cases above.
  const cwd = makeWorktree("clean");
  try {
    const res = runGenerator(cwd, { expectThrow: false });
    assert.equal(res.status, 0, `clean run succeeds: ${res.stderr}`);
    execFileSync(process.execPath, ["--check", clientAt(cwd)], { stdio: "pipe" });
    const stray = fs.readdirSync(path.join(cwd, "lib")).filter((f) => f.includes(".tmp-"));
    assert.deepEqual(stray, [], "no temp file survives a clean run");
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
