/**
 * dsh-dream-skin — CRAFT audit (module / material / radius / layout).
 *
 * scripts/skin-audit.cjs proves the PALETTE: 40 tokens per skin, solved in
 * OKLCH, text legible, signals separated. That is necessary and not sufficient.
 * A skin is still ugly if the module that consumes the token paints a
 * scheme-blind white rim over it, or if an overlay squares off a rounded card.
 *
 * This file audits the CRAFT LAYER — the stylesheets the bundle injects into the
 * page, and the per-module token plumbing — against rules that can fail:
 *
 *   sheet-reconciliation  every stylesheet the bundle creates through
 *                         createElement('style') is read by this audit: the
 *                         count of such sites is compared with the sheets found,
 *                         so a NEW injection site reddens until it is registered
 *   css-fully-resolved    the stylesheet was reconstructed completely — no
 *                         expression was left unevaluated
 *   module-coverage       every module the plugin re-skins is painted by a rule
 *                         that consumes the audited token FOR THAT MODULE, and
 *                         every skin ships that token
 *   module-token-audited  nothing is painted with a token the palette audit
 *                         does not measure
 *   glass-scheme-aware    no literal white/black glass constant: a rim, glint
 *                         or outline must come from a per-scheme variable
 *   glass-scheme-pairs    those per-scheme variables are actually different, in
 *                         the direction the two schemes require (a white catch
 *                         light on paper must be STRONGER than on dark, an edge
 *                         outline on paper must be DARKER than on dark)
 *   radius-inherit        an overlay we create must inherit its host's radius
 *   layout-neutral        the plugin may not resize or reposition a host box
 *                         (two documented allowlisted exceptions)
 *   blur-derived          a hardcoded blur radius must be a documented material
 *                         constant
 *   wash-frame-flattened  under a wallpaper wash the frame rule must ALSO flatten
 *                         the host's content corner — through the host's own
 *                         variable, `!important` (the one cascade case no string
 *                         gate can see), and only while the wash marker is live
 *                         (issue #96) — and the caption row the frame paints
 *                         through its `::before` must be cleared by a rule of its
 *                         own, because a pseudo-element inherits no declaration
 *                         from its owning element's block. That rule is graded by
 *                         WHITELIST over every wash-gated pseudo block in the
 *                         sheet (exactly one declaration, and it must be the
 *                         `background` shorthand clearing the paint), not by a
 *                         property blacklist. Nothing in the sheet may declare
 *                         `-webkit-app-region`: the strip is how the
 *                         window is dragged, and dropping its paint must not drop
 *                         that (10.9.1)
 *   wash-fade-neutralised EVERY rule naming a `_fade` token, hash spelling
 *                         included, must be wash-gated, must travel with a
 *                         hash-free anchor in the same selector, and must
 *                         neutralise both the paint and the mask path
 *                         (issue #97 — the previous rule's hash had measured 0
 *                         hits on the two hosts this release was built against)
 *
 * Scope, stated so it cannot quietly overstate itself (issue #77): the two
 * stylesheets this audit reads are the ones in REGISTERED_SHEETS — the material
 * sheet and the nav-icon sheet. An earlier header said "the injected CSS" while
 * only the material sheet was parsed (issue #75 fixed that by adding the
 * reconciliation above). Narrowing the wording back to "material 主注入表" is no
 * longer the honest move — it would understate the nav-icon sheet that #75
 * brought in. What is genuinely OUT of scope: CSS that reaches the page without
 * a new `<style>` element (appended to an existing sheet, written to a
 * stylesheet rule, or set inline). The reconciliation cannot see those, because
 * it counts createElement('style') sites.
 *
 * Two failure modes this file has already had, both worth stating so they are
 * not reintroduced:
 *   - substring matching. `glass-scheme-pairs` used to assert that the two
 *     selector literals existed. Swapping the dark and light constant sets —
 *     both wrong — kept it green (issue #74). It now compares VALUES.
 *   - reading one sheet. The audit walked only the material sheet, so the
 *     nav-icon sheet (a second `createElement('style')`) was unmeasured, and a
 *     scheme-blind white rim planted there stayed green (issue #75).
 *
 * Exit code is non-zero when anything regresses, so CI can run it directly:
 *   node scripts/craft-audit.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const CLIENT = path.join(__dirname, '..', 'lib', 'client.js');

/** Tokens skin-audit.cjs proves for every skin (the "audited" set). */
const { REQUIRED_TOKENS, extractSkins } = require('./skin-audit.cjs');

// ---------------------------------------------------------------------------
// Reading the injected CSS out of the bundle
// ---------------------------------------------------------------------------
//
// The sheets are string expressions in JavaScript: arrays of lines, `+ IDENT +`
// splices, `[...].join()` and member lookups into small tables. Emulating a
// slice of JS is the only way to know what actually reaches the DOM; the
// alternative — matching source substrings — is the defect this file exists to
// avoid. Anything the evaluator cannot resolve is emitted as an UNRESOLVED
// marker and reddens `css-fully-resolved`, so the audit can never grade half a
// stylesheet and call it done.

const UNRESOLVED = (src) => `«UNRESOLVED:${src.trim().slice(0, 40)}»`;

/** Tokenise the JS-subset we need. */
function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    // Comments are dropped BEFORE quote handling. A prose comment in the CSS
    // array ("catppuccin's technique") otherwise opens a string literal at the
    // apostrophe and swallows the rest of the token stream — which silently
    // truncated the sheet to its first 68 lines.
    if (ch === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      i = nl < 0 ? src.length : nl;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      i = close < 0 ? src.length : close + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      let buf = '';
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\') {
          // Interpret the escapes that matter for CSS payloads. Taking the
          // next character literally turned every `"\n"` separator into a
          // literal `n` and prefixed each CSS line with it.
          const next = src[j + 1];
          const map = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'", '`': '`', 0: '\0' };
          buf += next in map ? map[next] : next;
          j += 2;
          continue;
        }
        buf += src[j];
        j += 1;
      }
      out.push({ t: 'str', v: buf });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const m = /^\d+(\.\d+)?/.exec(src.slice(i));
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    out.push({ t: 'punct', v: ch });
    i += 1;
  }
  return out;
}

/**
 * Evaluate a JS string expression: literals, concatenation, identifiers
 * (looked up in the bundle's own const table), array/object literals, and
 * `.join/.trim/.replace/.slice` plus `.prop` / `[n]` access.
 */
function makeEvaluator(constTable) {
  const evalExpr = (src, depth = 0) => {
    if (depth > 12) return UNRESOLVED(src);
    let toks;
    try { toks = tokenize(src); } catch { return UNRESOLVED(src); }
    let p = 0;
    const peek = () => toks[p];
    const eat = (v) => { if (toks[p] && toks[p].v === v) { p += 1; return true; } return false; };

    const parseObject = () => {
      const obj = {};
      p += 1; // {
      while (p < toks.length) {
        if (eat('}')) break;
        const key = toks[p];
        if (!key || (key.t !== 'id' && key.t !== 'str')) break;
        p += 1;
        if (!eat(':')) break;
        const start = p;
        let depth2 = 0;
        while (p < toks.length) {
          const tk = toks[p];
          if (tk.t === 'punct') {
            if ('([{'.includes(tk.v)) depth2 += 1;
            else if (')]}'.includes(tk.v)) {
              if (depth2 === 0) break;
              depth2 -= 1;
            } else if (tk.v === ',' && depth2 === 0) break;
          }
          p += 1;
        }
        if (p === start) break;
        obj[key.v] = evalTokens(toks.slice(start, p));
        if (!eat(',')) { eat('}'); break; }
      }
      return obj;
    };

    const parseArray = () => {
      const arr = [];
      p += 1; // [
      while (p < toks.length) {
        if (eat(']')) break;
        const start = p;
        let depth2 = 0;
        while (p < toks.length) {
          const tk = toks[p];
          if (tk.t === 'punct') {
            if ('([{'.includes(tk.v)) depth2 += 1;
            else if (')]}'.includes(tk.v)) {
              if (depth2 === 0) break;
              depth2 -= 1;
            } else if (tk.v === ',' && depth2 === 0) break;
          }
          p += 1;
        }
        // No progress means a token we do not understand; bail out instead of
        // spinning (an unbounded loop here is how a bug became a RangeError).
        if (p === start) break;
        arr.push(evalTokens(toks.slice(start, p)));
        if (!eat(',')) { eat(']'); break; }
      }
      return arr;
    };

    const evalTokens = (slice) => {
      // A comment-only array element (`// --- section ---` between CSS lines)
      // contributes nothing. Detect it from the token slice rather than
      // stripping `//` globally, which would corrupt URLs inside strings.
      const first = slice.find((tk) => tk.t !== 'punct' || !' ,'.includes(tk.v));
      const raw = slice.reduce((acc, tk) => acc + (tk.t === 'str' ? JSON.stringify(tk.v) : String(tk.v)), '');
      if (/^\s*(\/\/|\/\*)/.test(raw) && !slice.some((tk) => tk.t === 'str')) return '';
      if (!first) return '';
      const sub = raw;
      return evalExpr(sub, depth + 1);
    };

    /** primary := STRING | NUMBER | IDENT | [ … ] | { … } | ( expr ) */
    const parsePrimary = () => {
      const tk = peek();
      if (!tk) return '';
      if (tk.t === 'str' || tk.t === 'num') { p += 1; return tk.t === 'num' ? tk.v : tk.v; }
      if (tk.t === 'punct' && tk.v === '[') return parseArray();
      if (tk.t === 'punct' && tk.v === '{') return parseObject();
      if (tk.t === 'punct' && tk.v === '(') { p += 1; const v = parseConcat(); eat(')'); return v; }
      if (tk.t === 'id') {
        p += 1;
        if (tk.v === 'true') return true;
        if (tk.v === 'false') return false;
        if (constTable.has(tk.v)) {
          const raw = constTable.get(tk.v);
          if (raw.evaluated !== undefined) return raw.evaluated;
          raw.evaluated = evalExpr(raw.src, depth + 1);
          return raw.evaluated;
        }
        return UNRESOLVED(tk.v);
      }
      p += 1;
      return UNRESOLVED(tk.v);
    };

    /** postfix := primary ('.' ident ( args )? | '[' n ']')* */
    const parsePostfix = () => {
      let v = parsePrimary();
      for (;;) {
        if (eat('.')) {
          const name = peek();
          if (!name || name.t !== 'id') break;
          p += 1;
          if (eat('(')) {
            const args = [];
            if (!eat(')')) {
              for (;;) {
                args.push(parseConcat());
                if (eat(',')) continue;
                eat(')');
                break;
              }
            }
            if (name.v === 'join') v = Array.isArray(v) ? v.join(args[0] ?? ',') : String(v);
            else if (name.v === 'trim') v = String(v).trim();
            else if (name.v === 'slice') v = String(v).slice(args[0], args[1]);
            else if (name.v === 'replace') v = String(v).split(String(args[0])).join(String(args[1]));
            else if (name.v === 'replaceAll') v = String(v).split(String(args[0])).join(String(args[1]));
            else if (name.v === 'toString') v = Array.isArray(v) ? v.join(',') : String(v);
            else v = UNRESOLVED(name.v);
          } else if (v && typeof v === 'object') {
            v = name.v in v ? v[name.v] : UNRESOLVED(name.v);
          } else if (Array.isArray(v) && name.v === 'length') {
            v = v.length;
          } else {
            v = UNRESOLVED(name.v);
          }
          continue;
        }
        if (eat('[')) {
          const idx = parseConcat();
          eat(']');
          v = Array.isArray(v) || (v && typeof v === 'object') ? v[idx] : UNRESOLVED('[]');
          continue;
        }
        break;
      }
      return v;
    };

    /** concat := postfix ('+' postfix)* */
    const parseConcat = () => {
      let v = parsePostfix();
      while (eat('+')) {
        const rhs = parsePostfix();
        if (typeof v === 'number' && typeof rhs === 'number') v = v + rhs;
        else v = String(v === undefined ? '' : v) + String(rhs === undefined ? '' : rhs);
      }
      return v;
    };

    const first = parseConcat();
    if (toks.length && p < toks.length && first !== undefined && typeof first !== 'object') {
      // Trailing tokens we did not consume: refuse to guess.
      return UNRESOLVED(src);
    }
    return first;
  };
  return evalExpr;
}

/** Every `const|let|var NAME = <expr>;` in the bundle, as raw source text. */
function collectConsts(source) {
	const table = new Map();
	// `var` too: the nav-icon sheet's payload is `var css = …`, and leaving it
	// out is how that whole stylesheet stayed invisible to this audit.
	const re = /(?:^|[\s;{(])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g;
  let m;
  while ((m = re.exec(source))) {
    const from = m.index + m[0].length;
    table.set(m[1], { src: scanExpression(source, from) });
  }
  return table;
}

/**
 * Every stylesheet the bundle injects, evaluated.
 *
 * Discovery is by INJECTION SITE — `<something>.textContent = <expr>` — not by
 * variable names. A name heuristic is how `MATERIAL_CSS_SOURCE` (a localStorage
 * key whose name contains "css") got mistaken for a stylesheet while the real
 * nav-icon payload was missed; the site is the fact, the name is a guess.
 * `sheet-reconciliation` then requires every `createElement("style")` to be
 * accounted for, so a newly added sheet cannot appear quietly (issue #75).
 */
const REGISTERED_SHEETS = [
	{ id: 'material', marker: /\.uV2eYG_card|--dsh-dream-skin-glass-rim/ },
	{ id: 'nav-icon', marker: /\[data-dsh-dream-skin-nav\]/ }
];

/**
 * Read the expression starting at `from`.
 *
 * Terminates on `;` at bracket depth 0 — and also on a newline at depth 0 whose
 * next significant character cannot continue an expression. That second rule is
 * not optional: the nav-icon sheet is written as `var css = "…" + "…"` with no
 * semicolon (ASI), so a semicolon-only scan swallowed the entire IIFE and
 * produced a 10 kB "CSS payload" that then failed to evaluate.
 */
function scanExpression(source, from) {
	let depth = 0;
	let i = from;
	let inStr = null;
	let lastSignificant = '';
	const CONTINUES = /[.[,?:+*/%<>=&|!-]/;
	const CONTINUED = /[.[,?:+*/%<>=&|!-]/;
	while (i < source.length) {
		const ch = source[i];
		if (inStr) {
			if (ch === '\\') i += 2;
			else if (ch === inStr) {
				inStr = null;
				i += 1;
				// A closed literal is an OPERAND: without this the tracker still
				// read `+` from before the string and kept swallowing lines after
				// the ASI boundary.
				lastSignificant = '0';
				continue;
			} else i += 1;
			continue;
		}
		if (ch === '/' && source[i + 1] === '/') {
			const nl = source.indexOf('\n', i);
			i = nl < 0 ? source.length : nl;
			continue;
		}
		if (ch === '/' && source[i + 1] === '*') {
			const close = source.indexOf('*/', i + 2);
			i = close < 0 ? source.length : close + 2;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === '`') {
			inStr = ch;
			i += 1;
			continue;
		}
		if (ch === '\n' && depth <= 0 && !CONTINUES.test(lastSignificant)) {
			let j = i + 1;
			// Skip blank lines and comments before deciding.
			for (;;) {
				while (j < source.length && /\s/.test(source[j])) j += 1;
				if (source[j] === '/' && source[j + 1] === '/') {
					const nl = source.indexOf('\n', j);
					j = nl < 0 ? source.length : nl + 1;
					continue;
				}
				break;
			}
			const next = source[j] || '';
			if (!CONTINUED.test(next)) break;
		}
		if ('([{'.includes(ch)) depth += 1;
		else if (')]}'.includes(ch)) depth -= 1;
		else if (ch === ';' && depth <= 0) break;
		if (!/\s/.test(ch)) lastSignificant = ch;
		i += 1;
	}
	return source.slice(from, i);
}

function extractSheets(source) {
	const consts = collectConsts(source);
	const evalExpr = makeEvaluator(consts);
	const sheets = [];
	for (const m of source.matchAll(/\.textContent\s*=\s*/g)) {
		const at = m.index + m[0].length;
		// A bare identifier needs no statement scan: `style.textContent = css`
		// is followed by more statements with no `;` in this codebase, so
		// scanning to the next semicolon would swallow them.
		const bare = /^[A-Za-z_$][\w$]*/.exec(source.slice(at));
		// `parts.join(…)` continues an expression; `css` on its own line — as in
		// the nav-icon sheet, whose statements carry no semicolons — does not.
		const after = bare ? source[at + bare[0].length] : '';
		const expr = bare && !/[.[+(]/.test(after) ? bare[0] : scanExpression(source, at);
		const value = evalExpr(expr);
		const css = typeof value === 'string' ? value : String(value);
		// Only a stylesheet is a stylesheet: require a rule block.
		if (!/[^{}]*\{[^}]*\}/.test(css)) continue;
		const registered = REGISTERED_SHEETS.find((s) => s.marker.test(css));
		sheets.push({
			id: registered ? registered.id : `unknown-${sheets.length + 1}`,
			registered: Boolean(registered),
			css
		});
	}
	return sheets;
}

/** Injection sites the bundle owns — the reconciliation counter. */
function countInjectionSites(source) {
	return [...source.matchAll(/createElement\(\s*["']style["']\s*\)/g)].length;
}

/** Back-compat helper: the material sheet only (used by older callers). */
function extractCss(source) {
	const sheet = extractSheets(source).find((s) => s.id === 'material');
	return sheet ? sheet.css : '';
}

/**
 * Parse flat CSS into blocks: { selector, decls: [{ prop, value }] }.
 * @supports / @media wrappers are unwrapped, their children kept.
 *
 * Frame-aware, because the naive version dropped the selector of every rule
 * that followed the FIRST rule inside a wrapper (text kept accumulating into
 * the wrapper's body, so `parseBlocks` returned blocks with `selector: ''` and
 * a module-coverage check built on it was measuring nothing).
 */
function parseBlocks(css) {
  const root = { selector: null, text: '', children: [], decls: [] };
  const stack = [root];
  for (const ch of css) {
    if (ch === '{') {
      const cur = stack[stack.length - 1];
      const { decls, tail } = splitFrame(cur.text, true);
      cur.decls = (cur.decls || []).concat(decls);
      const child = { selector: tail.trim().replace(/\s+/g, ' '), text: '', children: [], decls: [] };
      cur.children.push(child);
      stack.push(child);
      cur.text = '';
      continue;
    }
    if (ch === '}') {
      if (stack.length === 1) continue; // stray brace: ignore rather than mis-frame
      const cur = stack.pop();
      const { decls } = splitFrame(cur.text);
      cur.decls = (cur.decls || []).concat(decls);
      cur.text = '';
      continue;
    }
    stack[stack.length - 1].text += ch;
  }
  for (const frame of stack) {
    if (frame.text) {
      const { decls } = splitFrame(frame.text);
      frame.decls = (frame.decls || []).concat(decls);
    }
  }

  const out = [];
  const walk = (frame) => {
    for (const child of frame.children) {
      const isWrapper = /^@(supports|media|layer)/.test(child.selector);
      if (!isWrapper && child.selector) out.push({ selector: child.selector, decls: child.decls });
      walk(child);
    }
  };
  walk(root);
  return out;
}

/**
 * Split a frame's accumulated text into declarations.
 *
 * `tailIsSelector` is the crux: the unterminated remainder belongs to a nested
 * rule's selector only when we are opening a brace. At a closing brace the same
 * text is the rule's LAST DECLARATION — dropping it (which this parser used to
 * do) silently removed one declaration per rule, which is how a planted
 * `box-shadow` on the nav sheet went unseen.
 */
function splitFrame(text, tailIsSelector = false) {
	const parts = text.split(';');
	const tail = parts.pop();
	const decls = [];
	for (const raw of parts) {
		const d = raw.trim();
		if (!d) continue;
		const k = d.indexOf(':');
		if (k < 0) continue;
		decls.push({ prop: d.slice(0, k).trim(), value: d.slice(k + 1).trim() });
	}
	if (!tailIsSelector) {
		const d = tail.trim();
		const k = d.indexOf(':');
		if (k >= 0) decls.push({ prop: d.slice(0, k).trim(), value: d.slice(k + 1).trim() });
	}
	return { decls, tail };
}

// ---------------------------------------------------------------------------
// The module inventory — what the plugin is responsible for painting
// ---------------------------------------------------------------------------

/**
 * Every surface this plugin re-skins.
 *
 * `by: plugin` — our own stylesheet paints it, so a rule matching `selector`
 * must consume `token` (`paint` names the property family that has to carry it).
 * `by: host`   — DSH's own CSS paints it (气泡 / tip / 代码块 / 选择器); we only
 * register the token, so demanding a consumption would demand something that is
 * not ours to do. Both kinds must still SHIP in every skin.
 */
const MODULES = [
	// The host paints the canvas from this token; we only register it. Demanding
	// a consumption rule here would demand work that is not ours.
	{ id: 'canvas', what: '主画布 / 壁纸洗色', by: 'host', token: '--dsw-alias-bg-base' },
	{
		id: 'sidebar', what: '左侧栏', by: 'plugin', token: '--dsw-specific-sidebar-fill',
		selector: /\.nArs4W_panel/, paint: /^background/
	},
	{
		id: 'sidebar-right', what: '右侧栏 dockkit', by: 'plugin', token: '--dsw-specific-sidebar-fill',
		selector: /data-dockkit-host=dock/, paint: /^background/
	},
	{
		id: 'composer', what: '输入框卡片', by: 'plugin', token: '--dsw-specific-input-major',
		selector: /dsh-dream-skin-composer/, paint: /^background/
	},
	{
		id: 'composer-glass', what: '输入框玻璃填充', by: 'plugin', token: '--dsw-alias-bg-base',
		selector: /dsh-dream-skin-composer.*::before/, paint: /^background/
	},
	{
		id: 'dialog', what: '提问 / 审批 / 计划卡与弹窗', by: 'plugin', token: '--dsw-alias-bg-overlay',
		selector: /question-key/, paint: /^background/
	},
	{
		id: 'hover', what: '侧栏胶囊悬停', by: 'plugin', token: '--dsw-alias-interactive-bg-hover',
		selector: /:hover/, paint: /^background/
	},
	{
		id: 'wash-layer', what: '水洗态的抬升面', by: 'plugin', token: '--dsw-alias-bg-layer-1',
		selector: /data-sidebar-right-guide-entry|sidebar-right-panel=fullscreen/, paint: /^background/
	},
	{
		// The liquid card's outline is painted from our OWN per-scheme glass
		// constant, not from a --dsw token: `glass-scheme-pairs` grades it.
		id: 'card-edge', what: '液态卡片的描边', by: 'plugin', token: '--dsh-dream-skin-glass-edge',
		selector: /data-dsh-material="liquid".*question-key/, paint: /^outline/
	},
	{ id: 'dialog-fallback', what: '弹窗（无洗色时）', by: 'host', token: '--dsw-alias-bg-layer-2' },
	{ id: 'bubble', what: '消息气泡', by: 'host', token: '--dsw-specific-bubble' },
	{ id: 'tooltip', what: '提示气泡 tip', by: 'host', token: '--dsw-specific-tip' },
	{ id: 'code', what: 'Markdown 代码块', by: 'host', token: '--dsw-alias-markdown-code-block' },
	{ id: 'selector', what: '下拉选择器', by: 'host', token: '--dsw-specific-selector' },
	{ id: 'hairline', what: '分隔描边', by: 'host', token: '--dsw-alias-border-l2' }
];

/**
 * Layout exceptions, both deliberate and both documented in the bundle:
 *  - the sidebar list/footer seam pare (a padding nudge that closes a 1px gap);
 *  - the nav-icon swap, which HIDES the host's 16px glyph and paints a 16px
 *    mask in its place — net box-neutral, but it necessarily writes a size.
 */
const LAYOUT_ALLOWLIST = [
	/hHd-Xa_(footArea|settingsArea|footerActions)/,
	/\[data-dsh-dream-skin-nav\]/
];

// Documented material blur constants (thick glass / dock panel).
const BLUR_CONSTANTS = [24, 20];

// ---------------------------------------------------------------------------
// glass semantics — what "the two schemes are actually different" means
// ---------------------------------------------------------------------------

/**
 * Each glass constant must differ between schemes in the direction that scheme
 * needs. Comparing VALUES is the point: asserting that two selector strings
 * exist is satisfied by swapping the two sets, i.e. by both being wrong
 * (issue #74).
 */
const GLASS_SEMANTICS = {
	'--dsh-dream-skin-glass-rim': {
		measure: 'whiteAlpha',
		want: 'light>dark',
		why: 'a white catch light on paper has to be stronger than on dark, or it is invisible'
	},
	'--dsh-dream-skin-glass-sheen': {
		measure: 'whiteAlpha',
		want: 'light>dark',
		why: 'same for the sheen gradient'
	},
	'--dsh-dream-skin-glass-sheen-blend': {
		measure: 'blendIsScreen',
		want: 'light=false',
		why: 'screen blend on a light surface washes the panel out instead of lighting it'
	},
	'--dsh-dream-skin-glass-edge': {
		measure: 'luminance',
		want: 'light<dark',
		why: 'an outline on paper has to be darker than its surface, not lighter'
	}
};

/** How much white an authored value carries, summed over its colour stops. */
function whiteAlpha(value) {
	let sum = 0;
	for (const m of String(value).matchAll(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/g)) {
		const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
		if (r === 255 && g === 255 && b === 255) sum += a;
	}
	return sum;
}

function meanLuminance(value) {
	let total = 0;
	let n = 0;
	for (const m of String(value).matchAll(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/g)) {
		const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
		total += (r + g + b) / 3;
		n += 1;
	}
	return n ? total / n : NaN;
}

const MEASURES = {
	whiteAlpha,
	luminance: meanLuminance,
	blendIsScreen: (v) => /(^|[\s,])screen([\s,]|$)/.test(String(v))
};

/** Does a selector carry the LIGHT-scheme qualifier? (Recognises both hosts.) */
const LIGHT_QUALIFIER = /:not\(\s*\[data-ds-dark-theme\]\s*\)|\[data-dsh-dream-skin-scheme\s*=\s*["']?light/i;

/** Properties that carry a paint (a colour a user can see). */
const PAINT_PROPS = /^(background|background-color|background-image|box-shadow|outline|border|border-color|border-left-color|border-top-color|border-bottom-color|color|fill|-webkit-text-fill-color)$/;

const WHITE_BLACK = /rgba?\(\s*(255\s*,\s*255\s*,\s*255|0\s*,\s*0\s*,\s*0)\s*(,|\/)/i;

// ---------------------------------------------------------------------------
// checks
// ---------------------------------------------------------------------------

function auditCraft(source) {
	const sheets = extractSheets(source);
	const SHIPPED = extractSkins(source);
	const checks = [];
	const push = (name, pass, detail) => checks.push({ name, pass, detail });

	// All sheets, flattened, with their sheet id attached so a report line can
	// say WHERE a violation lives.
	const blocks = [];
	for (const sheet of sheets) {
		for (const b of parseBlocks(sheet.css)) blocks.push({ ...b, sheet: sheet.id });
	}

	// ---- 0. reconciliation: no stylesheet may hide from this audit ----------
	{
		const sites = countInjectionSites(source);
		const found = sheets.map((s) => s.id);
		const problems = [];
		if (found.length !== sites) {
			problems.push(`bundle injects ${sites} stylesheet(s) but the audit reads ${found.length} (${found.join(', ')})`);
		}
		for (const sheet of sheets) {
			if (!sheet.registered) problems.push(`unregistered stylesheet (no marker in REGISTERED_SHEETS): ${sheet.css.slice(0, 48).replace(/\s+/g, ' ')}…`);
		}
		for (const reg of REGISTERED_SHEETS) {
			if (!sheets.some((s) => s.id === reg.id)) problems.push(`registered stylesheet not found: ${reg.id}`);
		}
		push('sheet-reconciliation', problems.length === 0,
			problems.length ? problems.join('; ')
				: `${found.length} injected stylesheets, all read by this audit (${found.join(', ')})`);
	}

	// ---- 0b. the reconstruction was complete --------------------------------
	{
		const broken = [];
		for (const sheet of sheets) {
			const n = (sheet.css.match(/«UNRESOLVED/g) || []).length;
			if (n) broken.push(`${sheet.id}: ${n} unevaluated expression(s)`);
		}
		push('css-fully-resolved', broken.length === 0,
			broken.length ? broken.join('; ')
				: `${sheets.map((s) => `${s.id} ${s.css.length}c`).join(', ')} fully reconstructed`);
	}

	// ---- 1. module coverage -------------------------------------------------
	// Two independent questions per module, both answered per module:
	//   (a) is the module actually painted with its audited token — by a rule
	//       matching THAT module, not by any rule anywhere in the CSS;
	//   (b) does every skin ship the token.
	const coverage = [];
	const missing = [];
	const unshipped = [];
	for (const mod of MODULES) {
		let painted = mod.by === 'host';
		if (mod.by === 'plugin') {
			for (const b of blocks) {
				if (!mod.selector.test(b.selector)) continue;
				for (const d of b.decls) {
					if (mod.paint && !mod.paint.test(d.prop)) continue;
					if (d.value.includes(mod.token)) { painted = true; break; }
				}
				if (painted) break;
			}
		}
		// Plugin-owned variables (our own per-scheme material constants) live in
		// the stylesheet, not in the per-skin token map — `glass-scheme-pairs`
		// grades them, so the "ships in every skin" question does not apply.
		const craftScoped = mod.token.startsWith('--dsh-');
		const ships = craftScoped || SHIPPED.every((s) => s.tokens[mod.token] != null);
		if (!ships) unshipped.push(`${mod.id} — ${mod.token} absent from ${SHIPPED.filter((s) => s.tokens[mod.token] == null).map((s) => s.id).join('/')}`);
		if (mod.by === 'plugin' && !painted) missing.push(`${mod.id} — no rule for ${mod.selector} paints ${mod.token}`);
		// Our own per-scheme glass constants are graded by glass-scheme-pairs;
		// every --dsw token must be in the palette audit's set.
		const unaudited = mod.token.startsWith('--dsw-') && !REQUIRED_TOKENS.includes(mod.token)
			? ' (NOT in the audited set)' : '';
		coverage.push(`${mod.id}:${mod.by === 'host' ? 'reg' : painted ? (craftScoped ? 'craft' : 'ok') : 'MISSING'}${unaudited}`);
	}
	push('module-coverage', missing.length === 0 && unshipped.length === 0 && !coverage.some((c) => c.includes('NOT in the audited set')),
		missing.length ? missing.join('; ')
			: unshipped.length ? unshipped.join('; ')
				: `${MODULES.length} modules shipped by all ${SHIPPED.length} skins — ${coverage.join(' ')}`);

	// ---- 1b. nothing is painted with a token we do not measure --------------
	const strayVars = new Set();
	for (const b of blocks) {
		for (const d of b.decls) {
			for (const m of d.value.matchAll(/var\(\s*(--dsw-[\w-]+)/g)) {
				if (!REQUIRED_TOKENS.includes(m[1])) strayVars.add(`${m[1]} (${b.sheet})`);
			}
		}
	}
	push('module-token-audited', strayVars.size === 0,
		strayVars.size ? `sheet paints with unaudited token(s): ${[...strayVars].join(', ')}`
			: 'every token the sheets paint with is measured by the palette audit');

	// ---- 2. glass constants must be scheme-aware, in every sheet ------------
	const strays = [];
	for (const b of blocks) {
		for (const d of b.decls) {
			if (!PAINT_PROPS.test(d.prop)) continue;
			if (!WHITE_BLACK.test(d.value)) continue;
			// A var() indirection is scheme-aware even if its fallback is white.
			if (d.value.includes('var(')) continue;
			if (/«UNRESOLVED/.test(d.value)) continue;
			strays.push(`${b.sheet} ${d.prop}: ${d.value}  « ${b.selector.slice(0, 56)}`);
		}
	}
	push('glass-scheme-aware', strays.length === 0,
		strays.length ? `${strays.length} scheme-blind paint constant(s): ${strays.join(' | ')}`
			: `every rim / glint / outline across ${sheets.length} sheets resolves through a per-scheme variable`);

	// ---- 3. fill overlays inherit the host radius ---------------------------
	// Only an overlay that COVERS its host can square it off. A pseudo-element
	// we invent with its own box (the nav icon mask: 16px, flex child, not
	// positioned) is not covering anything, and forcing `border-radius:
	// inherit` on it would give the glyph the row's radius instead of none.
	const squared = [];
	for (const b of blocks) {
		const props = new Map(b.decls.map((d) => [d.prop, d.value]));
		const creates = props.has('content') && /::(before|after)/.test(b.selector);
		if (!creates) continue;
		const positioned = /^(absolute|fixed)$/.test(props.get('position') || '');
		const fills = props.get('inset') === '0' ||
			(['top', 'right', 'bottom', 'left'].filter((k) => props.get(k) === '0').length === 4);
		if (!positioned || !fills) continue;
		const radius = props.get('border-radius');
		if (radius !== 'inherit') {
			squared.push(`${b.sheet} ${b.selector.slice(0, 56)} — border-radius: ${radius === undefined ? '(none)' : radius}`);
		}
	}
	push('radius-inherit', squared.length === 0,
		squared.length ? squared.join(' | ') : 'every overlay that covers its host follows the host radius');

	// ---- 3b. both schemes, and genuinely different --------------------------
	const glassVars = new Map(); // var → { dark: value, light: value }
	for (const b of blocks) {
		const isLight = LIGHT_QUALIFIER.test(b.selector);
		for (const d of b.decls) {
			if (!/^--dsh-dream-skin-glass-/.test(d.prop)) continue;
			const slot = glassVars.get(d.prop) || {};
			slot[isLight ? 'light' : 'dark'] = d.value;
			glassVars.set(d.prop, slot);
		}
	}
	{
		const problems = [];
		if (glassVars.size === 0) problems.push('no per-scheme glass constants found at all');
		for (const [name, slots] of glassVars) {
			if (slots.dark === undefined) problems.push(`${name} has no base (dark) declaration — a scheme-specific value with no fallback`);
			if (slots.light === undefined) { problems.push(`${name} is declared for one scheme only`); continue; }
			if (slots.dark === slots.light) { problems.push(`${name} is the same value in both schemes (the pair does nothing)`); continue; }
			const sem = GLASS_SEMANTICS[name];
			if (!sem) continue;
			const measure = MEASURES[sem.measure];
			const d = measure(slots.dark);
			const l = measure(slots.light);
			let ok;
			if (sem.want === 'light>dark') ok = l > d;
			else if (sem.want === 'light<dark') ok = l < d;
			else if (sem.want === 'light=false') ok = l === false && d === true;
			else ok = true;
			if (!ok) problems.push(`${name}: light(${l}) vs dark(${d}) fails "${sem.want}" — ${sem.why}`);
		}
		push('glass-scheme-pairs', problems.length === 0,
			problems.length ? problems.join('; ')
				: `${glassVars.size} glass constants differ per scheme, each in the direction it needs`);
	}

	// ---- 4. layout neutrality ------------------------------------------------
	const layoutHits = [];
	for (const b of blocks) {
		if (LAYOUT_ALLOWLIST.some((re) => re.test(b.selector))) continue;
		for (const d of b.decls) {
			if (/^(width|height|min-width|min-height|max-width|max-height|margin|margin-(left|right|top|bottom)|padding|padding-(left|right|top|bottom)|float|display)$/.test(d.prop)) {
				layoutHits.push(`${b.sheet} ${b.selector.slice(0, 44)} { ${d.prop}: ${d.value} }`);
			}
			if (d.prop === 'position' && (d.value === 'fixed' || d.value === 'absolute') && !b.selector.includes('::')) {
				layoutHits.push(`${b.sheet} ${b.selector.slice(0, 44)} { position: ${d.value} }`);
			}
		}
	}
	push('layout-neutral', layoutHits.length === 0,
		layoutHits.length ? layoutHits.join(' | ') : 'no host box is resized or repositioned (two allowlisted exceptions)');

	// ---- 5. blur radii are documented ---------------------------------------
	const strayBlur = [];
	for (const b of blocks) {
		for (const d of b.decls) {
			if (!/^(backdrop-filter|-webkit-backdrop-filter)$/.test(d.prop)) continue;
			if (d.value.includes('var(')) continue;
			for (const m of d.value.matchAll(/blur\(\s*([\d.]+)px/g)) {
				const px = Number(m[1]);
				if (!BLUR_CONSTANTS.includes(px)) strayBlur.push(`${b.sheet} ${d.prop}: ${m[0]}px`);
			}
		}
	}
	push('blur-derived', strayBlur.length === 0,
		strayBlur.length ? `undocumented blur radius: ${strayBlur.join(' | ')}`
			: `hardcoded radii are the ${BLUR_CONSTANTS.join('/')}px material constants; everything else follows the skin`);

	// ---- 6. the wash state owns the three chrome faces it exposes ---------------
	// All three exist because a wallpaper makes host chrome visible that the skin
	// otherwise covers. They are graded on DECLARATIONS, not on a selector string
	// existing: issue #97 is precisely a rule whose selector survived every test
	// while matching nothing.
	{
		const problems = [];
		const isWashGated = (sel) => /data-dsh-dream-skin-wash/.test(sel);
		// Adjudication J1 (third-party T3): "a :has() that names the shell's own stamp", not one
		// exact spelling of `:has(> [data-shell-overlay])`. The strict pattern made this gate bet on
		// our own selector staying unchanged — a rewrite that drops the child combinator or adds a
		// second condition falls out of the candidate set, and the gate then grades a rule that no
		// longer exists while the real one goes unexamined.
		const onFrame = (sel) => /:has\([^)]*\[data-shell-overlay\]/.test(sel);
		// The pseudo-element block is a DIFFERENT box with a different answer, so it must not
		// be allowed to satisfy the element's checks (or be satisfied by them). Matching the
		// anchor is not matching the target: `blocks.find` returns the first hit, and without
		// this split the frame rule and its `::before` were interchangeable to the grader —
		// deleting either one could leave the gate green.
		const isPseudo = (sel) => /::?[a-z-]*before|::?[a-z-]*after/.test(sel);
		const frameRule = blocks.find((b) => isWashGated(b.selector) && onFrame(b.selector) && !isPseudo(b.selector));
		if (!frameRule) {
			problems.push('no wash-gated AppFrame rule — neither the frame fill nor the content corner is owned');
		} else {
			const props = new Map(frameRule.decls.map((d) => [d.prop, d.value]));
			const radius = props.get('--dsh-windows-content-radius');
			if (radius !== '0px !important') {
				problems.push(`the wash-gated frame rule leaves the host content radius alone or unarmed (got ${radius === undefined ? 'nothing' : radius}) — an inline stamp on the host side needs the important flag`);
			}
			// Going through the host's OWN variable is the point: the same corner is
			// read by the right panel's fullscreen clip, so a `border-radius` written
			// here would fix one notch and bet on a hash to find it.
			if (props.has('border-radius')) problems.push('the corner is flattened with border-radius instead of the host variable');
			const ungated = blocks.filter((b) => !isWashGated(b.selector)
				&& b.decls.some((d) => d.prop === '--dsh-windows-content-radius'));
			if (ungated.length) problems.push(`radius reset is not wash-gated (${ungated[0].selector.slice(0, 48)})`);
		}
		// The caption row. `background-color` on the frame does not reach `::before`, so this
		// half needs a rule of its own; the host paints the sidebar token there across the
		// whole window width (`[data-windows-titlebar] .<hash>_frame:before`, byte-identical
		// in npm 0.2.0-rc.1's layout package and in the official DSH Desktop's bundle).
		//
		// WHITELIST, applied to EVERY wash-gated pseudo-element block in the sheet — not a
		// `blocks.find` on one anchor plus a blacklist of four property names. Adjudication J1
		// (T1/T3/T6): the first version graded the FIRST block that matched, so a second
		// wash-gated pseudo rule could carry anything at all, and the blacklist only banned the
		// four names someone thought of. A `transform: translateY(-34px)` or `inset: -9999px`
		// moves the caption box off the top of the window while every computed reading the engine
		// gate takes (fill, image, content, app-region) stays green — the box is dragged away, not
		// un-generated. Anything that is not exactly one `background` paint-clear is therefore out.
		const pseudo = blocks.filter((b) => isWashGated(b.selector) && isPseudo(b.selector));
		if (!pseudo.some((b) => onFrame(b.selector) && /::?[a-z-]*before/.test(b.selector))) {
			problems.push('no wash-gated rule for the frame’s ::before — the caption row keeps painting the sidebar token across the top of the window');
		}
		for (const b of pseudo) {
			const where = b.selector.slice(0, 52);
			if (b.decls.length !== 1) {
				problems.push(`the wash-gated pseudo-element rule (${where}) declares ${b.decls.length} properties — this reset is exactly one, and only a count catches a property nobody blacklisted`);
				continue;
			}
			const d = b.decls[0];
			if (d.prop.toLowerCase() !== 'background') {
				problems.push(`the wash-gated pseudo-element rule (${where}) declares ${d.prop} — only the paint may be touched; this one declaration owns background-color, background-image AND background-position, so no longhand is needed and nothing else is`);
				continue;
			}
			// The SHORTHAND is the requirement, not a style preference: a `background-color`
			// longhand leaves any `background-image` standing, and the flat colour this rule
			// answers today is exactly the kind of declaration a future host upgrades to a
			// gradient (issue #97 is that story already, on a different surface).
			if (d.value !== 'transparent !important' && d.value !== 'none !important') {
				problems.push(`the caption row's paint is not cleared or not armed (got ${d.value}) — a wash retint is a different decision, and without the flag an inline stamp on the host side wins`);
			}
		}
		const dragHits = blocks.filter((b) => b.decls.some((d) => /app-region$/.test(d.prop)));
		if (dragHits.length) problems.push(`this sheet declares an app-region (${dragHits[0].selector.slice(0, 48)}) — no plugin rule may claim the drag geometry`);
		push('wash-frame-flattened', problems.length === 0,
			problems.length ? problems.join('; ')
				: 'under a wash the frame fill is dropped, the host content corner is flattened through the host variable, and the caption row’s own paint goes with it — without touching the drag region');
	}

	// ---- 7. the session-list foot fade cannot paint a band under a wash ------
	// CANDIDATE SET: EVERY rule whose selector mentions a `_fade` class token, in
	// either spelling. Grading only the hash-free one is the hole issue #97 fell
	// through: a sibling rule pinned to a build hash sat in the same sheet,
	// ungated, and no check in this repository could see it because the filter
	// never looked at hash-shaped selectors (measured — the sheet passed 11/11
	// while that rule was in it). A fade rule that runs unconditionally erases
	// the host fade on wallpaper-less profiles; a fade rule anchored on a hash
	// ALONE silently un-arms itself on the next re-roll.
	{
		const problems = [];
		const HASH_FREE_FADE = '[class$="_fade"]';
		const isWashGated = (sel) => /data-dsh-dream-skin-wash/.test(sel);
		const mentionsFade = (sel) => sel.includes(HASH_FREE_FADE)
			|| /(^|[\s,>])\.?[\w-]*_fade(?![\w-])/.test(sel);
		const fadeRules = blocks.filter((b) => mentionsFade(b.selector));
		if (!fadeRules.some((b) => b.selector.includes(HASH_FREE_FADE))) {
			problems.push('no hash-free fade anchor in the sheet — issue #97 shipped as a rule on a dead hash');
		}
		for (const b of fadeRules) {
			// TWO different invariants, on two different scopes — and getting them apart
			// is the whole point of this check:
			//   · WASH GATING is per BRANCH. In `html[a] X, html[b] Y { }` either branch
			//     can match on its own, so an ungated hash branch would erase the host
			//     fade on wallpaper-less profiles no matter what the other branch says.
			//   · ANCHORING is per RULE. The 0.1.x fallback branch is a hash BY DESIGN,
			//     and it is redundant coverage rather than a bet, because the hash-free
			//     branch of the same rule already matches everything that hash can match
			//     on any host. What may never happen is a fade RULE that carries no
			//     hash-free branch at all — that is the shape issue #97 died of.
			const branches = b.selector.split(',');
			for (const branch of branches) {
				if (!isWashGated(branch)) {
					problems.push(`fade rule is not wash-gated (${branch.trim().slice(0, 48)}) — it would erase the host fade on wallpaper-less profiles`);
				}
			}
			if (!branches.some((branch) => branch.includes(HASH_FREE_FADE))) {
				problems.push(`fade rule has no hash-free branch (${b.selector.slice(0, 48)}) — a re-roll silently un-arms the whole rule`);
			}
			const props = new Map(b.decls.map((d) => [d.prop, d.value]));
			if (props.get('background') !== 'transparent') problems.push('the fade still paints a gradient');
			if (props.get('mask-image') !== 'none' || props.get('-webkit-mask-image') !== 'none') {
				problems.push('the mask path is not neutralised — a mask-image fade would keep the band');
			}
		}
		push('wash-fade-neutralised', problems.length === 0,
			problems.length ? problems.join('; ')
				: 'the session-list foot fade is neutralised under a wash through both the paint and the mask path, anchored without a build hash');
	}

	return { blocks, checks, css: extractCss(source), sheets };
}

// ---------------------------------------------------------------------------
// cli
// ---------------------------------------------------------------------------

function main() {
	const source = fs.readFileSync(CLIENT, 'utf8');
	const { checks, blocks } = auditCraft(source);
	console.log(`dsh-dream-skin craft audit — ${blocks.length} CSS blocks\n`);
	let failed = 0;
	let total = 0;
	for (const c of checks) {
		total += 1;
		if (!c.pass) failed += 1;
		console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name.padEnd(20)} ${c.detail}`);
	}
	console.log(`\n${total - failed}/${total} craft checks passed.`);
	if (failed) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
	auditCraft,
	extractCss,
	extractSheets,
	parseBlocks,
	MODULES,
	REQUIRED_TOKENS,
	BLUR_CONSTANTS,
	REGISTERED_SHEETS
};
