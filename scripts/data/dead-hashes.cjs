/**
 * dsh-dream-skin — HASH LITERALS WE KEEP ON PURPOSE (issue #92).
 *
 * The gate in `tests/hashes.test.cjs` refuses a build-hash literal that the
 * host corpus does not contain: such a selector cannot match anything, and the
 * repository's anchor discipline says to hang a stable `data-*` attribute
 * instead. This file is the escape hatch — and like every escape hatch here it
 * is dated, reasoned, and machine-checked:
 *
 *   - a `legacy-host-line` entry must name the host line it is kept for
 *     (`since`), because that is the only reason these can exist at all;
 *   - the entry must still be USED somewhere in the shipped surface — an
 *     allowance nobody needs is a permission, not a decision;
 *   - and it must still measure 0 hits. The moment the corpus grows the hash
 *     back, the excuse has outlived its reason and the gate says so (the same
 *     rule the forward-gap `since` field uses in issue #88).
 *
 * Each live entry also shows up as a FINDING in the gate's output rather than
 * passing silently: "we deliberately keep a dead selector" is a fact a human
 * has to know about, and the finding is pinned by name in the test file so it
 * cannot quietly disappear.
 */

/** The vocabulary. One word today; the gate rejects anything else. */
const DEAD_HASH_KINDS = ['legacy-host-line'];

const DEAD_HASHES = {
	bqrRRG: {
		kind: 'legacy-host-line',
		since: '0.1.0-rc.6',
		why:
			'`bqrRRG_card` was the inline-warning card. On 0.2.0-rc.1 it is 0 hits in the whole installed ' +
			'host tree, so the rule and the drift-probe group can never match there. Kept because README still ' +
			'declares `0.1.0-rc.6 ~ 0.1.x` support and this repository holds no 0.1.x corpus to prove it dead ' +
			'there too — that half is an assumption, not a measurement.'
	},
	nArs4W: {
		kind: 'legacy-host-line',
		since: '0.1.0-rc.6',
		why:
			'`nArs4W_panel` / `_pane` / `_paneContent` / `_workbench` / `_explorerBody` were the right ' +
			'file panel and workbench. 0 hits on 0.2.0-rc.1 in the installed tree; the 10.5.0 third-party ' +
			'review measured the same and asked for it to be declared publicly (see docs/desktop-support.md ' +
			'"锚点依赖与漂移探针"). Same unresolved 0.1.x question as the entry above.'
	},
	qDHVXG: {
		kind: 'legacy-host-line',
		since: '0.1.0-rc.6',
		why:
			'`qDHVXG_fade` was the conversation list foot fade. 0 hits on 0.2.0-rc.1. The surface itself ' +
			'still exists under a new hash, which is why the rule is kept as an OR-fallback rather than ' +
			'deleted: deleting it would silently drop the 0.1.x line instead of measuring it.'
	}
};

module.exports = { DEAD_HASHES, DEAD_HASH_KINDS };
