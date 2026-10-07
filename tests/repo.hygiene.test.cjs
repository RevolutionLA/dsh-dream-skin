/**
 * dsh-dream-skin — repository hygiene gates (issue #82).
 *
 * Why this file exists
 * --------------------
 * `npm run skin:check` compares the shipped `SKINS` block against a fresh build
 * of the design system. That is the ONLY gate watching byte/format hygiene —
 * `tests/skin.quality.test.cjs` watches the same block by VALUE, through the
 * JS parser, and a re-quoted or re-indented bundle is invisible to it.
 *
 * The two are complementary, and the failure this file fixes is that the byte
 * gate was red for a reason that had nothing to do with either:
 *
 *   the repo was developed on Windows with `core.autocrlf=true`. The index and
 *   CI store LF; that working tree held CRLF. Any raw byte comparison reports
 *   drift on every file, forever. A gate that is red for content-free reasons
 *   is a gate people learn to ignore.
 *
 * The order the issue insists on is respected here: normalise checkouts FIRST
 * (`.gitattributes` + one pass of `scripts/normalize-eol.cjs`), THEN wire the
 * gate into CI. Doing it the other way adds a permanently red step.
 *
 * Every case below is paired with something that must be able to redden it:
 *   - the attrs case pins the exact rules AND asks git to confirm them;
 *   - the tree case runs the detector against a scratch tree it corrupts on
 *     purpose, so the detector is proven to fire without dirtying this repo;
 *   - the CI case asserts ORDER inside the job, not mere presence;
 *   - the last case is the issue's acceptance criterion, run for real.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const { trackedFiles, textFiles, offenders } = require("../scripts/normalize-eol.cjs");
const { findBlock, renderBlock } = require("../scripts/apply-skin-system.cjs");
const { extractSkins } = require("../scripts/skin-audit.cjs");
const { buildAll } = require("../scripts/skin-system.cjs");

const ROOT = path.join(__dirname, "..");
const REL_CLIENT = path.join("lib", "client.js");
const GENERATOR = path.join("scripts", "apply-skin-system.cjs");

const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trimEnd();

// ---------------------------------------------------------------------------
// 1. The declaration itself
// ---------------------------------------------------------------------------

test("#82: .gitattributes pins the bytes every checkout hands to the byte gates", () => {
  const attrs = fs.readFileSync(path.join(ROOT, ".gitattributes"), "utf8");

  // The catch-all is load-bearing: without it, the first new text extension
  // someone adds comes back as CRLF and the byte gate goes red again.
  assert.match(
    attrs,
    /^\*\s+text=auto\s+eol=lf\s*$/m,
    ".gitattributes must keep the `* text=auto eol=lf` catch-all — it is what makes a NEW file type safe"
  );

  // Every text type this repo actually ships or generates.
  for (const ext of ["js", "cjs", "mjs", "json", "ts", "md", "yml", "yaml", "css", "html", "svg"]) {
    assert.match(
      attrs,
      new RegExp(`^\\*\\.${ext}\\s+text\\s+eol=lf\\s*$`, "m"),
      `.gitattributes must declare \`*.${ext} text eol=lf\``
    );
  }

  // Binary assets must be excluded from conversion: a line-ending pass that
  // rewrites a PNG is data loss, not hygiene.
  for (const ext of ["png", "jpg", "jpeg", "webp", "ico", "woff2"]) {
    assert.match(attrs, new RegExp(`^\\*\\.${ext}\\s+binary\\s*$`, "m"), `\`*.${ext}\` must be declared binary`);
  }

  // And git's own reading of the rules — the pattern text above could be right
  // while an earlier rule shadows it. `text: set` + `eol: lf` is what makes
  // `normalize-eol.cjs` treat a file as text and what makes the byte gate's
  // comparison meaningful.
  assert.equal(
    git(["check-attr", "text", "eol", "--", REL_CLIENT.replace(/\\/g, "/")]),
    `${REL_CLIENT.replace(/\\/g, "/")}: text: set\n${REL_CLIENT.replace(/\\/g, "/")}: eol: lf`
  );
  assert.match(git(["check-attr", "text", "--", "docs/previews/ivory.png"]), /text: unset$/);
});

// ---------------------------------------------------------------------------
// 2. The tree it applies to
// ---------------------------------------------------------------------------

test("#82: every text file in the tree is already LF, so the byte gate cannot lie", () => {
  const files = textFiles(trackedFiles());
  assert.ok(files.length >= 50, `expected the repo to have plenty of text files, saw ${files.length}`);

  const { crlf, loneCR } = offenders(ROOT, files);
  assert.deepEqual(
    crlf,
    [],
    `${crlf.length} text file(s) are CRLF in this working tree. The byte gate compares\n` +
      "content, but a mixed tree makes every diff unreadable and hides real changes. Fix with:\n" +
      "  node scripts/normalize-eol.cjs"
  );
  assert.deepEqual(loneCR, [], `lone CR character(s) found — a line ending is CRLF or LF: ${loneCR.join(", ")}`);
});

test("#82: the detector reddens on a tree that is actually wrong", () => {
  // The case above is a "nothing found" assertion, which a detector that never
  // matches anything would also satisfy. Corrupt a scratch tree and require the
  // detector to name exactly the bad file.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-eol-"));
  try {
    fs.writeFileSync(path.join(dir, "ok.cjs"), "const a = 1;\nconst b = 2;\n");
    fs.writeFileSync(path.join(dir, "bad.cjs"), "const a = 1;\r\nconst b = 2;\r\n");
    fs.writeFileSync(path.join(dir, "half.cjs"), "const a = 1;\r\nconst b = 2;\n"); // mixed
    fs.writeFileSync(path.join(dir, "lone-cr.cjs"), "const a = 1;\rconst b = 2;\n");
    fs.writeFileSync(path.join(dir, "blob.txt"), Buffer.from([0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x00, 0x1a]));

    const { crlf, loneCR } = offenders(dir, ["ok.cjs", "bad.cjs", "half.cjs", "lone-cr.cjs", "blob.txt"]);

    assert.deepEqual(crlf, ["bad.cjs", "half.cjs"], "CRLF and mixed files are reported by name, in order");
    assert.deepEqual(loneCR, ["lone-cr.cjs (1)"], "a lone CR is reported separately, never silently rewritten");
    assert.ok(!crlf.includes("lone-cr.cjs"), "a lone CR is not a CRLF, so there is nothing safe to rewrite");
    assert.ok(!crlf.includes("blob.txt"), "a file with NUL bytes is left alone even if git called it text");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 3. CI wiring — normalisation first, then the gate, before the value gate
// ---------------------------------------------------------------------------

test("#82: CI runs the byte gate before the value gate, in that order", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.equal(
    pkg.scripts["skin:check"],
    "node scripts/apply-skin-system.cjs --check",
    "`npm run skin:check` must be the drift check, not the writer"
  );
  assert.equal(pkg.scripts["repo:eol"], "node scripts/normalize-eol.cjs", "the repair command must be published");
  assert.equal(pkg.scripts.test, "node --test tests/*.test.cjs", "the test glob must cover tests/, including this file");

  const ci = fs.readFileSync(path.join(ROOT, ".github", "workflows", "ci.yml"), "utf8");
  // Only the `test` job matters; the `typecheck` job is separate.
  const testJob = ci.slice(ci.indexOf("jobs:"), ci.indexOf("\n  typecheck:"));
  assert.ok(testJob.length > 0, "the test job must exist");

  const byteGate = testJob.indexOf("run: npm run skin:check");
  const valueGate = testJob.indexOf("run: npm test");
  assert.notEqual(byteGate, -1, "CI must run `npm run skin:check` — a gate nothing calls is documentation, not a gate");
  assert.notEqual(valueGate, -1, "CI must still run `npm test`");
  assert.ok(
    byteGate < valueGate,
    "`skin:check` must come BEFORE `npm test`: run the byte gate first so a formatting-only diff reports as\n" +
      "formatting, instead of as a mysterious token mismatch buried in the test output"
  );
  assert.ok(
    testJob.indexOf("actions/checkout") < byteGate,
    "the gate needs a checkout first"
  );
});

// ---------------------------------------------------------------------------
// 4. The acceptance criterion, run for real
// ---------------------------------------------------------------------------

/** A throwaway tree with everything the generator needs. */
function makeWorktree(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `dsh-hyg-${name}-`));
  for (const entry of ["lib", "scripts"]) {
    fs.cpSync(path.join(ROOT, entry), path.join(dir, entry), { recursive: true });
  }
  return dir;
}

const checkAt = (cwd) => spawnSync(process.execPath, [GENERATOR, "--check"], { cwd, encoding: "utf8" });

/**
 * Re-quote the generated object literal: `"id": "ivory"` -> `'id': 'ivory'`.
 * Same program, same values, different bytes. This is the mutation the issue
 * asks for — "只改 bundle 的引号/格式风格（不改值）".
 */
function requote(block) {
  return block
    .split("\n")
    .map((line) => {
      let m = /^(\s*)"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"(,?)$/.exec(line);
      if (m) return `${m[1]}'${m[2]}': '${m[3]}'${m[4]}`;
      m = /^(\s*)([A-Za-z_$][\w$]*):\s*"((?:[^"\\]|\\.)*)"(,?)$/.exec(line);
      if (m) return `${m[1]}${m[2]}: '${m[3]}'${m[4]}`;
      return line;
    })
    .join("\n");
}

test("#82: the byte gate and the value gate disagree on purpose, and that is the point", () => {
  const cwd = makeWorktree("complement");
  try {
    const file = path.join(cwd, REL_CLIENT);
    // Read LF-normalised so THIS case does not depend on the tree-wide case
    // above having passed — the CRLF tree is mutation B's job, below.
    const pristine = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    fs.writeFileSync(file, pristine, "utf8");

    // Control: untouched, both gates are green. Without this the case below
    // would pass on a generator that simply always exits 1.
    const before = checkAt(cwd);
    assert.equal(before.status, 0, `an untouched bundle must be in sync: ${before.stderr}`);

    // ── mutation A: formatting only ────────────────────────────────────────
    const { start, end } = findBlock(pristine);
    const reformatted = requote(pristine.slice(start, end));
    assert.notEqual(reformatted, pristine.slice(start, end), "the mutation must actually change bytes");
    const reformattedSource = pristine.slice(0, start) + reformatted + pristine.slice(end);
    fs.writeFileSync(file, reformattedSource, "utf8");

    const afterFormat = checkAt(cwd);
    assert.equal(
      afterFormat.status,
      1,
      "a re-quoted bundle IS drift: `skin:check` exists to catch exactly this, hand-edits that keep the values"
    );
    assert.match(afterFormat.stderr, /OUT OF SYNC/, "and it says so");

    // …while the value gate — the assertion `tests/skin.quality.test.cjs`
    // makes — stays green, because every token still parses to the same string.
    const shipped = extractSkins(reformattedSource);
    const built = buildAll();
    assert.equal(shipped.length, built.length, "the re-quoted block still defines every skin");
    for (const skin of built) {
      const got = shipped.find((s) => s.id === skin.id);
      assert.ok(got, `skin "${skin.id}" still parses after the reformat`);
      assert.deepEqual(got.tokens, skin.tokens, `${skin.id}: values survive a formatting-only change`);
      assert.equal(got.glow, skin.glow);
      assert.deepEqual(got.defaults, skin.defaults);
    }

    // ── mutation B: a CRLF checkout ────────────────────────────────────────
    // The original failure. `core.autocrlf=true` on Windows produces this tree
    // from a perfectly good commit; `--check` must not call it content drift.
    fs.writeFileSync(file, pristine.replace(/\n/g, "\r\n"), "utf8");
    assert.ok(fs.readFileSync(file, "utf8").includes("\r\n"), "the CRLF tree is really CRLF");
    const afterCRLF = checkAt(cwd);
    assert.equal(
      afterCRLF.status,
      0,
      "a CRLF working tree is not content drift — `--check` compares after normalising line endings.\n" +
        "Remove the `normalize()` call in scripts/apply-skin-system.cjs and this case goes red."
    );
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
