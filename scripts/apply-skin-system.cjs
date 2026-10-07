#!/usr/bin/env node
// dsh-dream-skin — write the design-system output into the shipped bundle.
//
// The presets in `lib/client.js` are GENERATED from `scripts/skin-system.cjs`.
// This is the only writer, so the bundle and the design system cannot drift:
// `tests/skin.quality.test.cjs` fails if `lib/client.js` disagrees with a
// fresh build.
//
//   node scripts/apply-skin-system.cjs            # rewrite the SKINS block
//   node scripts/apply-skin-system.cjs --check    # exit 1 when out of date

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { buildAll } = require("./skin-system.cjs");
const { DEFAULT_FIELDS } = require("./lib/skin-defaults.cjs");

const ROOT = path.join(__dirname, "..");
const CLIENT = path.join(ROOT, "lib", "client.js");

/**
 * `lib/client.js` is symlinked into a live DSH profile, so a half-written file
 * is a white screen, not a failed build (issue #70). Every write therefore goes
 * tmp -> parse-check -> atomic rename, and never leaves the original touched
 * unless the replacement already parsed.
 */
const WRITE_HOOK = process.env.DSH_DREAM_SKIN_WRITE_HOOK;
function writeBundleSync(next) {
  const source = fs.readFileSync(CLIENT, "utf8");
  const { start, end } = findBlock(source);
  const out = source.slice(0, start) + next + source.slice(end);
  // `.cjs` on purpose: `node --check` infers module type from the nearest
  // package.json, and a checkout without one would read this as ESM.
  const tmp = `${CLIENT}.tmp-${process.pid}.cjs`;
  fs.rmSync(tmp, { force: true });
  try {
    fs.writeFileSync(tmp, out, "utf8");
    if (WRITE_HOOK) require(WRITE_HOOK)(tmp, out);
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw new Error(
      `generated bundle does not parse — aborted, lib/client.js untouched: ${e && e.message}`
    );
  }
  fs.renameSync(tmp, CLIENT);
}

/** Render one skin as the object literal that goes into the bundle. */
function renderSkin(skin, isLast) {
  const lines = [];
  lines.push("\t\t\t{");
  lines.push(`\t\t\t\tid: ${JSON.stringify(skin.id)},`);
  lines.push(`\t\t\t\tcolorScheme: ${JSON.stringify(skin.colorScheme)},`);
  lines.push("\t\t\t\ttokens: {");
  const entries = Object.entries(skin.tokens);
  entries.forEach(([key, value], i) => {
    const comma = i === entries.length - 1 ? "" : ",";
    lines.push(`\t\t\t\t\t${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`);
  });
  lines.push("\t\t\t\t},");
  lines.push(`\t\t\t\tglow: ${JSON.stringify(skin.glow)},`);
  lines.push("\t\t\t\tdefaults: {");
  const d = skin.defaults;
  // Field order and membership come from the domain table, so a new default
  // cannot reach the bundle without one (issue #73).
  const dkeys = DEFAULT_FIELDS;
  dkeys.forEach((k, i) => {
    const comma = i === dkeys.length - 1 ? "" : ",";
    lines.push(`\t\t\t\t\t${k}: ${JSON.stringify(d[k])}${comma}`);
  });
  lines.push("\t\t\t\t}");
  lines.push(isLast ? "\t\t\t}" : "\t\t\t},");
  return lines.join("\n");
}

function render() {
  const skins = buildAll();
  const body = skins.map((s, i) => renderSkin(s, i === skins.length - 1)).join("\n");
  return `\t\tconst SKINS = [\n${body}\n\t\t];`;
}

/** Locate the `const SKINS = [ ... ];` region in the bundle. */
function findBlock(source) {
  const marker = "\t\tconst SKINS = [";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("SKINS block not found");
  const open = start + marker.length - 1;
  let depth = 0;
  let i = open;
  let inStr = null;
  while (i < source.length) {
    const ch = source[i];
    if (inStr) {
      if (ch === "\\") i += 2;
      else if (ch === inStr) inStr = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; i += 1; continue; }
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
    i += 1;
  }
  // Consume the closing `;`.
  let end = i + 1;
  if (source[end] === ";") end += 1;
  return { start, end };
}

/**
 * Compare after line-ending normalisation.
 *
 * `core.autocrlf=true` gives a CRLF working tree on Windows while index and CI
 * are LF. Comparing raw strings there reports "drift" for every file, forever,
 * and a gate that is red for content-free reasons gets ignored (issue #82).
 */
const normalize = (s) => s.replace(/\r\n/g, "\n");

function main() {
  const argv = process.argv.slice(2);
  const source = fs.readFileSync(CLIENT, "utf8");
  const { start, end } = findBlock(source);
  const next = render();
  if (argv.includes("--check")) {
    if (normalize(source.slice(start, end)) === normalize(next)) {
      console.log("lib/client.js SKINS block is in sync with scripts/skin-system.cjs");
      return;
    }
    console.error("lib/client.js SKINS block is OUT OF SYNC — run: node scripts/apply-skin-system.cjs");
    process.exitCode = 1;
    return;
  }
  writeBundleSync(next);
  console.log(`lib/client.js SKINS block regenerated (${buildAll().length} skins).`);
}

// Exported for `tests/repo.hygiene.test.cjs` and `tests/generator.safety.test.cjs`,
// which need the block boundaries to mutate the generated literal without
// re-deriving them (a second scanner would be a second thing to keep in sync).
module.exports = { findBlock, renderBlock: render, writeBundleSync, CLIENT };

if (require.main === module) main();
