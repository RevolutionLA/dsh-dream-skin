/**
 * dsh-dream-skin — host half.
 *
 * Durable, origin-independent persistence for the browser half.
 *
 * The browser half previously stored every preference in localStorage, which
 * is scoped per origin (scheme + host + port). DSH Desktop binds its web
 * server to an OS-assigned port on every launch (profile.js forces the
 * webserver row to `port: 0`, and the launcher passes `--port 0`), so the GUI
 * origin changes on every restart and localStorage "forgets" the saved skin,
 * wallpaper and settings — the data is still in the leveldb, just under the
 * previous port's origin.
 *
 * This host half gives the browser half a stable channel that survives
 * origin changes:
 *
 *   - a state file at `$DSH_HOME/dream-skin.json` (default `~/.dsh/...`),
 *     written atomically (tmp + rename). It stays a FLAT map of string values
 *     plus one reserved metadata key (`STATE_SCHEMA_KEY`) that carries the
 *     file's schema version; nesting the settings would break an older build
 *     sharing the same DSH_HOME, and that key never reaches the browser;
 *   - a fenced JSON API at `/dream-skin/api` — POST `{method:"get"}` returns
 *     the state object without that metadata key, POST `{method:"set",
 *     patch:{...}}` MERGES it: keys in the patch are set (a string) or removed
 *     (null), keys absent from the patch are left untouched, so two writers
 *     (two tabs, or the web profile and the desktop shell) cannot wipe each
 *     other's unrelated settings. A patch that carries the reserved key cannot
 *     move it — writeState re-derives the stamp from the file itself.
 *
 * The browser half seeds its in-memory cache from localStorage (so the first
 * paint is correct), then loads the authoritative state from this API and
 * re-applies it; writes are debounced and pushed here as the full state.
 *
 * Route security: the same trust fence as dsh-better-sidebar's /sidebar
 * routes — loopback (or a configured trusted authority) Host header and
 * same-origin browser markers only. This is a DNS-rebinding / cross-site
 * defense, not authentication.
 */

import { homedir } from "node:os";
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

/** State file name inside the DSH home directory. */
const STATE_FILENAME = "dream-skin.json";
/**
 * Reserved key inside that file holding its schema version as a decimal string.
 *
 * The file is shared by every install resolving to the same DSH_HOME — the web
 * profile and the official desktop shell can be running two different plugin
 * versions at once, and whichever writes last decides the bytes the other reads
 * next. So the format cannot nest (an older reader would `String()` an object
 * into a setting): it stays a flat map of strings, plus this one key. It is
 * deliberately NOT part of the `get` answer, so the browser never adopts it as
 * a preference, and a patch that carries it is overwritten on the way to disk
 * (writeState re-derives the stamp FROM THE FILE), so a page cannot claim a
 * schema version.
 */
export const STATE_SCHEMA_KEY = "dsh-dream-skin:schema-version";
/** Schema version this build writes and understands. Bump only with a migration. */
export const STATE_SCHEMA_VERSION = "1";
// Fail at load rather than write a "NaN" stamp onto the user's file.
if (!/^\d+$/.test(STATE_SCHEMA_VERSION) || Number(STATE_SCHEMA_VERSION) < 1) {
	throw new Error(`dsh-dream-skin: STATE_SCHEMA_VERSION must be a decimal integer string >= 1, got ${JSON.stringify(STATE_SCHEMA_VERSION)}`);
}
/** Max accepted request body (wallpapers are base64 data URLs, can be MBs). */
const MAX_BODY_BYTES = 32 * 1024 * 1024;
/** Route prefix owned by this plugin. */
const API_PREFIX = "/dream-skin/api";

/** Plugin identity for cordis.yml rows. */
export const name = "dsh-dream-skin";
/**
 * Services required before mounting: only the web server routes.
 *
 * The trust-authority source is deliberately NOT listed here. `inject` is a
 * hard gate — a service named here that the running host does not provide
 * leaves the entry `pending` forever: `apply()` never runs, the route never
 * registers, and the only trace is one loader log line. That source moved
 * once already (see `trustedAuthorities()`), so requiring either name would
 * silently kill the host half on the other host generation (issue #109).
 */
export const inject = ["webServer"];

// ── state file ─────────────────────────────────────────────────────────────

/** Absolute path of the state file under the DSH home directory. */
function statePath() {
	const home = process.env.DSH_HOME && process.env.DSH_HOME.length > 0 ? process.env.DSH_HOME : join(homedir(), ".dsh");
	return join(home, STATE_FILENAME);
}

/** Read the state object; `{}` when absent or corrupt. */
function readState() {
	const state = readStateFile();
	delete state[STATE_SCHEMA_KEY];
	return state;
}

/**
 * Read the state file as bytes on disk, metadata key included. `{}` when the
 * file is absent or unparsable — a corrupt file is treated as empty, which is
 * how this plugin has always behaved (the browser half still holds the values
 * in localStorage and re-pushes them).
 */
function readStateFile() {
	try {
		const parsed = JSON.parse(readFileSync(statePath(), "utf8"));
		return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

/** The stamped version when the file carries a decimal integer string, else 0. */
function observedSchemaVersion(raw) {
	const stamp = raw[STATE_SCHEMA_KEY];
	if (typeof stamp !== "string" || !/^\d+$/.test(stamp)) return 0;
	return Number(stamp);
}

/**
 * The stamp to write: ours, or the one already on the file when that is HIGHER.
 *
 * A newer build may have put keys in here that we pass through untouched (see
 * writeState). Stamping our own version onto those bytes would claim a format
 * the file is not, and the next upgrade would run its migration over data that
 * already went through it. Nothing we write removes a key, so the highest stamp
 * any writer has declared stays true.
 */
function schemaStampFor(raw) {
	const ours = Number(STATE_SCHEMA_VERSION);
	const seen = observedSchemaVersion(raw);
	return String(seen > ours ? seen : ours);
}

/** Persist the state object atomically (tmp + rename, direct-write fallback). */
function writeState(state) {
	const file = statePath();
	mkdirSync(dirname(file), { recursive: true });
	const tmp = `${file}.tmp`;
	// The reserved key is re-stamped last and wins over `state`, so no caller
	// can persist a forged schema through the settings map. Values stay strings:
	// an older build reading this file String()s anything nested into a setting.
	const body = JSON.stringify({ ...state, [STATE_SCHEMA_KEY]: schemaStampFor(readStateFile()) });
	// The state file holds the user's wallpaper data URLs (personal images),
	// so keep it owner-only on POSIX (mode is ignored on Windows).
	writeFileSync(tmp, body, { encoding: "utf8", mode: 0o600 });
	try {
		renameSync(tmp, file);
	} catch {
		// rename can fail on Windows if the target is transiently locked; a
		// direct write is a safe fallback for this single-process case.
		writeFileSync(file, body, { encoding: "utf8", mode: 0o600 });
	}
}

// ── trust fence (mirror of dsh-better-sidebar/src/trust-fence.ts) ─────────

/** Normalized URL of a Host-header authority, or undefined when unparsable. */
function parseAuthority(authority) {
	try {
		return new URL(`http://${authority}`);
	} catch {
		return undefined;
	}
}

/** Whether a normalized URL hostname names the local loopback authority. */
function isLoopbackHostname(hostname) {
	if (hostname === "localhost" || hostname === "[::1]") return true;
	const parts = hostname.split(".");
	return parts.length === 4
		&& parts[0] === "127"
		&& parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

/** Canonical authority form: hostname, or hostname:port when a port was written. */
function canonicalAuthority(entry, entryUrl) {
	const port = entryUrl.port !== "" ? entryUrl.port : new URL(`https://${entry}`).port;
	return port === "" ? entryUrl.hostname : `${entryUrl.hostname}:${port}`;
}

/**
 * Assert one configured `trustedHosts` entry is a bare authority (`host` or
 * `host:port`) in canonical form — mirrors dsh-client-connection's guard.
 * Anything WHATWG parsing would silently rewrite (whitespace, dangling
 * colon, zero-padded port, path fragment, bogus host spellings) is refused,
 * so a misconfigured entry cannot quietly broaden the authority grant. The
 * host list arrives through `trustedAuthorities()` — the host's own
 * `--trusted-host` values; this is a defensive second check that fails loud on
 * a broken value.
 */
function assertTrustedAuthority(entry) {
	const entryUrl = parseAuthority(entry);
	if (entryUrl !== undefined && canonicalAuthority(entry, entryUrl) === entry.toLowerCase()) return;
	throw new Error(`dsh-dream-skin: trustedHosts entry ${JSON.stringify(entry)} is not a bare host[:port] authority`);
}

/** Whether the request authority matches a trustedHosts entry (exact or port-less). */
function isTrustedAuthority(hostUrl, trustedHosts) {
	return trustedHosts.some((entry) => {
		assertTrustedAuthority(entry);
		const entryUrl = parseAuthority(entry);
		if (entryUrl === undefined) return false;
		return canonicalAuthority(entry, entryUrl) === entryUrl.hostname
			? entryUrl.hostname === hostUrl.hostname
			: entryUrl.host === hostUrl.host;
	});
}

/**
 * Decide whether one request may reach the plugin routes.
 * @param req - node HTTP request facts (headers).
 * @param trustedHosts - non-loopback authorities this deployment serves.
 * @returns true when the Host is ours (loopback or trusted) and browser markers are same-origin.
 */
function isTrustedApiRequest(req, trustedHosts) {
	const host = typeof req.headers.host === "string" ? req.headers.host : undefined;
	if (host === undefined) return false;
	const hostUrl = parseAuthority(host);
	if (hostUrl === undefined) return false;
	if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
	if (req.headers["sec-fetch-site"] === "cross-site") return false;
	const origin = req.headers.origin;
	if (origin === undefined) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}

// ── JSON body / response helpers ───────────────────────────────────────────

/**
 * The trust authorities this deployment serves beyond loopback.
 *
 * Read at request time through `ctx.get()`, and from a fallback chain, because
 * the service that carries this list moved once already:
 *
 *   - `0.2.1-alpha.2` and later — the `web-startup` row provides `webStartup`,
 *     whose `trustedHosts` are the invocation's `--trusted-host` authorities
 *     (the same list `dsh-client-connection` reads for its own fence);
 *   - `0.2.0` and earlier — the `web-runtime` row provided `webRuntime` with
 *     the same field; that service no longer exists on the newer line.
 *
 * Two consequences are deliberate. Nothing named here may go into `inject`:
 * naming a service the running host does not provide leaves the entry
 * `pending` forever, which is the failure this chain removes (issue #109).
 * And the lookup happens per request rather than once in `apply()`, so a host
 * that mounts the service later is picked up without a remount.
 *
 * @param ctx - host cordis context.
 * @returns the extra authorities, or `[]` when no such service is mounted —
 *   which leaves loopback as the whole grant, the same default both hosts ship.
 */
function trustedAuthorities(ctx) {
	const startup = ctx.get("webStartup");
	if (startup !== undefined && startup !== null) return startup.trustedHosts ?? [];
	const runtime = ctx.get("webRuntime");
	if (runtime !== undefined && runtime !== null) return runtime.trustedHosts ?? [];
	return [];
}

/** Sentinel: the request body exceeded MAX_BODY_BYTES (respond 413, not 400). */
const PAYLOAD_TOO_LARGE = Symbol("payload-too-large");

/**
 * Read a JSON request body, capped at MAX_BODY_BYTES.
 * Resolves the parsed body, or `null` when not valid JSON, or
 * `PAYLOAD_TOO_LARGE` when the body exceeded the cap.
 */
function readJsonBody(req) {
	return new Promise((resolve) => {
		const chunks = [];
		let size = 0;
		let aborted = false;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES && !aborted) {
				aborted = true;
				req.destroy();
				resolve(PAYLOAD_TOO_LARGE);
				return;
			}
			if (!aborted) chunks.push(chunk);
		});
		req.on("end", () => {
			if (aborted) return;
			try {
				const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
				resolve(parsed);
			} catch {
				resolve(null);
			}
		});
		req.on("error", () => {
			if (!aborted) resolve(null);
		});
	});
}

/** Write a JSON response with the given status code. */
function writeJson(res, status, value) {
	const body = JSON.stringify(value);
	res.writeHead(status, {
		"content-type": "application/json",
		"cache-control": "no-store"
	});
	res.end(body);
}

/** Handle one fenced API request. */
async function handleApi(req, res) {
	if (req.method !== "POST") {
		writeJson(res, 405, { ok: false, error: { code: "method-error", message: "method not allowed" } });
		return;
	}
	// Content-type fence: only JSON bodies are meaningful here. Without it a
	// cross-site form POST (which the trust fence already blocks via
	// sec-fetch-site) would otherwise be parsed as `{}` and mis-handled. This
	// keeps the surface narrow and matches the official plugin behavior.
	const contentType = typeof req.headers["content-type"] === "string" ? req.headers["content-type"].toLowerCase() : "";
	if (!contentType.startsWith("application/json")) {
		writeJson(res, 415, { ok: false, error: { code: "unsupported-media-type", message: "content-type must be application/json" } });
		return;
	}
	const payload = await readJsonBody(req);
	if (payload === PAYLOAD_TOO_LARGE) {
		writeJson(res, 413, { ok: false, error: { code: "payload-too-large", message: "request body too large" } });
		return;
	}
	if (payload === null || typeof payload !== "object" || typeof payload.method !== "string") {
		writeJson(res, 400, { ok: false, error: { code: "bad-request", message: "bad request" } });
		return;
	}
	if (payload.method === "get") {
		writeJson(res, 200, { ok: true, value: readState() });
		return;
	}
	if (payload.method === "set") {
		const patch = payload.patch;
		if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
			writeJson(res, 400, { ok: false, error: { code: "bad-request", message: "patch must be a plain object" } });
			return;
		}
		// Merge into the current state. Only the keys present in `patch` are
		// touched: a string value sets it, null removes it, and keys not in the
		// patch are left untouched. This makes concurrent writers (e.g. two
		// browser tabs, each with its own in-memory cache) safe — a tab that
		// changed the accent won't wipe the wallpaper another tab just set.
		// Only string / null values are accepted, so a compromised page cannot
		// smuggle non-JSON types into the file.
		const next = readState();
		for (const [key, value] of Object.entries(patch)) {
			if (typeof key !== "string") continue;
			// No special case for STATE_SCHEMA_KEY here on purpose. writeState
			// re-derives the stamp FROM THE FILE and applies it after spreading
			// `state`, so a patch that tries to forge it is overwritten rather
			// than filtered — one authority instead of a guard that could never
			// be shown to matter. The forge test pins that ordering.
			if (value === null) delete next[key];
			else if (typeof value === "string") next[key] = value;
		}
		writeState(next);
		writeJson(res, 200, { ok: true });
		return;
	}
	writeJson(res, 404, { ok: false, error: { code: "not-found", message: `unknown method "${payload.method}"` } });
}

/**
 * Host loader entry: mount the fenced persistence API.
 * @param ctx - host cordis context (`webServer` is the only hard requirement;
 *   the trust authorities come from `webStartup` or the legacy `webRuntime`
 *   through `trustedAuthorities()`, and may be absent on either host line).
 */
export function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: API_PREFIX,
		handler: async (req, res) => {
			if (!isTrustedApiRequest(req, trustedAuthorities(ctx))) {
				writeJson(res, 403, { ok: false, error: { code: "forbidden", message: "forbidden" } });
				return;
			}
			try {
				await handleApi(req, res);
			} catch (error) {
				// Do not echo the internal error back to the browser — the
				// trusted-origin page does not need filesystem paths etc.
				console.error("[dsh-dream-skin] persistence API error:", error);
				writeJson(res, 500, { ok: false, error: { code: "internal", message: "internal error" } });
			}
		}
	}), "dsh-dream-skin: persistence API routes");
}
