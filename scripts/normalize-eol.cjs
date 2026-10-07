#!/usr/bin/env node
// dsh-dream-skin — rewrite tracked text files to the line endings `.gitattributes` declares.
//
// Issue #82. The repo was developed on Windows with `core.autocrlf=true`: the
// index and CI hold LF, that machine's working tree held CRLF, and every
// byte-comparison gate (`npm run skin:check`, the preview fingerprints in #83)
// reported drift for reasons that had nothing to do with content.
//
// `.gitattributes` fixes checkouts from now on, but it does not rewrite a tree
// that is already wrong — and the usual advice (`git add --renormalize .`) only
// fixes the INDEX, leaving the working tree CRLF while claiming success. This
// script does the working tree, and it asks git itself which files are text so
// the normaliser and `.gitattributes` cannot drift apart.
//
//   node scripts/normalize-eol.cjs           # rewrite CRLF -> LF, report what changed
//   node scripts/normalize-eol.cjs --check   # report only, exit 1 when not normalised
//
// Only `\r\n` is rewritten. A lone `\r` is left alone and reported: it is either
// a real character in the content or a corrupted checkout, and neither is fixed
// by guessing.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");

/**
 * Files that would end up in a checkout: tracked, plus untracked files git is
 * not ignoring. Untracked ones matter locally — a brand-new script written by a
 * CRLF editor is exactly the file that comes back as CRLF after `git add`, and
 * `git add` normalising the blob does NOT rewrite the working copy.
 *
 * Ignored paths (node_modules, previews scratch, the review notes) are left
 * alone: they are not shipped and not compared by any gate.
 */
function trackedFiles(root = ROOT) {
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: root,
    maxBuffer: 1 << 28
  });
  return out.toString("utf8").split("\0").filter(Boolean);
}

/**
 * Ask git which of these files are text, using `.gitattributes` — rather than a
 * hardcoded extension list here, which is exactly the kind of duplicate that
 * goes stale the first time someone adds a `.toml`. Works for untracked paths
 * too; attributes are matched on the path, not on the index.
 */
function textFiles(files, root = ROOT) {
  if (files.length === 0) return [];
  const out = execFileSync("git", ["check-attr", "-z", "--stdin", "text"], {
    cwd: root,
    input: files.join("\0") + "\0",
    maxBuffer: 1 << 28
  });
  const fields = out.toString("utf8").split("\0");
  const text = new Set();
  // `-z` emits `<path>\0<attr>\0<value>\0` triples; `unset`/`unspecified` mean
  // git will not convert the file (binary, or no rule matched).
  for (let i = 0; i + 2 < fields.length; i += 3) {
    const value = fields[i + 2];
    if (fields[i + 1] !== "text") continue;
    if (value === "unset" || value === "unspecified") continue;
    text.add(fields[i]);
  }
  return files.filter((f) => text.has(f));
}

/**
 * Which of `files` are not LF, and which carry a lone CR.
 *
 * Exported so `tests/repo.hygiene.test.cjs` can prove the detector fires on a
 * tree it deliberately corrupts, without corrupting this one.
 */
function offenders(root, files) {
  const crlf = [];
  const loneCR = [];
  for (const rel of files) {
    let bytes;
    try {
      bytes = fs.readFileSync(path.join(root, rel));
    } catch {
      continue; // deleted-but-still-in-index; not this script's business
    }
    if (bytes.includes(0)) continue; // binary that git called text; leave it be
    const src = bytes.toString("utf8");
    if (!src.includes("\r")) continue;
    const stripped = src.replace(/\r\n/g, "\n");
    const remaining = (stripped.match(/\r/g) || []).length;
    if (remaining > 0) loneCR.push(`${rel} (${remaining})`);
    if (stripped !== src) crlf.push(rel);
  }
  return { crlf, loneCR };
}

function main() {
  const check = process.argv.slice(2).includes("--check");
  const files = textFiles(trackedFiles());
  const { crlf, loneCR } = offenders(ROOT, files);

  if (!check) {
    for (const rel of crlf) {
      const abs = path.join(ROOT, rel);
      fs.writeFileSync(abs, fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n"), "utf8");
    }
  }

  if (loneCR.length > 0) {
    console.error(`lone CR (not a line ending) in ${loneCR.length} file(s) — inspect by hand:`);
    for (const f of loneCR) console.error(`  ${f}`);
  }

  if (crlf.length === 0) {
    console.log(`${files.length} text file(s) in this working tree, all LF.`);
  } else if (check) {
    console.error(`${crlf.length} text file(s) are not LF — run: node scripts/normalize-eol.cjs`);
    for (const f of crlf) console.error(`  ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`${crlf.length} file(s) rewritten to LF:`);
    for (const f of crlf) console.log(`  ${f}`);
  }

  if (loneCR.length > 0) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { trackedFiles, textFiles, offenders, ROOT };
