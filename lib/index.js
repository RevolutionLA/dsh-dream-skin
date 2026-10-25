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
 * It also serves one user-chosen wallpaper folder to the browser half (issue
 * #61, wallpaper rotation over local photos): `POST {method:"folder-list"}`
 * lists the images in that folder and up to three levels of real subfolders
 * below it, and `GET /dream-skin/api/folder/file?name=…` streams one of them by
 * its relative path. The folder is read ONLY from the persisted setting
 * `dsh-dream-skin:wallpaper-folder`, never from a request, and the route can
 * reach nothing but regular image files inside it, through real directories
 * only — never through a symlink (see FOLDER_* below).
 *
 * Route security: the same trust fence as dsh-better-sidebar's /sidebar
 * routes — loopback (or a configured trusted authority) Host header and
 * same-origin browser markers only. This is a DNS-rebinding / cross-site
 * defense, not authentication.
 */

import { homedir } from "node:os";
import { readFileSync, writeFileSync, renameSync, mkdirSync, createReadStream, constants as fsConstants } from "node:fs";
import { readdir, lstat, realpath } from "node:fs/promises";
import { join, dirname, isAbsolute, extname } from "node:path";
import { pipeline } from "node:stream";

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
/** The one GET path of the plugin: a single image of the wallpaper folder. */
const FOLDER_FILE_PATH = `${API_PREFIX}/folder/file`;
/** State key holding the wallpaper folder path (a flat string, like every other setting). */
const FOLDER_KEY = "dsh-dream-skin:wallpaper-folder";
/**
 * What the folder route serves, by extension. SVG is deliberately absent: opened
 * directly it would run its scripts in the application's origin. HEIC is absent
 * because Chromium cannot decode it, so a listed file could never be painted.
 */
const FOLDER_IMAGE_TYPES = new Map([
	[".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"],
	[".webp", "image/webp"], [".gif", "image/gif"], [".avif", "image/avif"], [".bmp", "image/bmp"]
]);
/** Listing ceiling (after sorting); the answer says when it was cut. */
const FOLDER_MAX_FILES = 2000;
/** Subfolder levels listed below the folder: `a/b/c/image.jpg` is the deepest path. */
const FOLDER_MAX_DEPTH = 3;
/** Directories read per listing, the folder itself included; past it the answer says it was cut. */
const FOLDER_MAX_DIRS = 500;
/** Largest single image the route lists or serves. */
const FOLDER_MAX_IMAGE_BYTES = 40 * 1024 * 1024;
/** Human order for file names: img2 before img10, case-insensitive. */
const FOLDER_NAME_ORDER = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Plugin identity for cordis.yml rows. */
export const name = "dsh-dream-skin";
/** Services required before mounting: the web server routes only. Trust fence hosts come from webRuntime (DSH ≤ 0.2.0) or webStartup (DSH ≥ 0.2.1). */
export const inject = ["webServer"];

/**
 * Resolve the list of trusted authorities for this request.
 * DSH ≤ 0.2.0 exposes them on `webRuntime.trustedHosts`; DSH ≥ 0.2.1 moved
 * them to `webStartup.trustedHosts`. Return an empty array when neither is
 * present — the loopback check in isTrustedApiRequest still protects the
 * route, and a configured authority grant is purely optional.
 *
 * Both reads go through `ctx.get()`, NOT `ctx.webStartup` / `ctx.webRuntime`.
 * Cordis only allows property access for services named in `inject`, and
 * neither name may be listed there (that is the whole point of issue #109:
 * naming a service the running host lacks leaves the entry pending forever).
 * A property read of a non-injected service throws
 * `cannot get property "…" without inject` — measured against the host's own
 * cordis, where the throw happens per request and lands as a 500, i.e. the
 * persistence API breaks on every host generation while the plugin still
 * looks mounted. `ctx.get()` is the documented "read without the inject
 * requirement" door and returns undefined for an absent service.
 */
function trustedAuthorities(ctx) {
	const startup = ctx.get("webStartup");
	if (startup !== undefined && startup !== null) return startup.trustedHosts ?? [];
	const runtime = ctx.get("webRuntime");
	if (runtime !== undefined && runtime !== null) return runtime.trustedHosts ?? [];
	return [];
}

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
 * host list here comes from webRuntime (already validated by dsh-web-app);
 * this is a defensive second check that fails loud on a broken value.
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

// ── wallpaper folder ───────────────────────────────────────────────────────

/** An Error carrying a stable `folder-…` code; messages never include paths. */
function folderError(code) {
	const error = new Error(code);
	error.code = code;
	return error;
}

/**
 * The real path of the configured folder. Throws a `folder-…` error when the
 * setting is empty, relative, missing or not a directory.
 *
 * The folder routes use the asynchronous file API throughout: they run in the Host
 * process that also serves the agent and the sessions, and a folder with tens of
 * thousands of files, or one on a slow or permission-gated volume, must not stall it.
 */
async function resolveFolder() {
	const raw = readStateFile()[FOLDER_KEY];
	if (typeof raw !== "string" || raw.trim() === "") throw folderError("folder-unset");
	let path = raw.trim();
	if (path === "~" || path.startsWith("~/")) path = join(homedir(), path.slice(1));
	if (!isAbsolute(path)) throw folderError("folder-not-absolute");
	let real;
	let stat;
	try {
		real = await realpath(path);
		stat = await lstat(real);
	} catch {
		throw folderError("folder-missing");
	}
	if (!stat.isDirectory()) throw folderError("folder-not-directory");
	return real;
}

/** One path segment the folder routes accept: a plain, visible name (so never "." or ".."). */
function isFolderSegment(segment) {
	return segment.length > 0 && segment.length <= 255 && !segment.startsWith(".") && !/[\\/\u0000-\u001f]/.test(segment);
}

/** Human order for one name: img2 before img10, case-insensitive, then byte order as the tie-break. */
function compareFolderNames(a, b) {
	return FOLDER_NAME_ORDER.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

/**
 * Listing order: by directory first, segment by segment, then by file name. A
 * folder's own images come before its subfolders' (a prefix sorts first), so a
 * sequential rotation plays one folder through before moving to the next.
 */
function compareFolderEntries(a, b) {
	const da = a.length - 1;
	const db = b.length - 1;
	for (let i = 0; i < Math.min(da, db); i++) {
		const c = compareFolderNames(a[i], b[i]);
		if (c !== 0) return c;
	}
	if (da !== db) return da - db;
	return compareFolderNames(a[da], b[db]);
}

/**
 * The images in the folder and in up to FOLDER_MAX_DEPTH levels of subfolders,
 * in listing order (compareFolderEntries), each named by its relative path with
 * "/" separators. Only regular files in real directories qualify: a symlink is
 * skipped whether it points at an image or a directory, so nothing outside the
 * folder can be listed through it. Directory entries come typed from readdir;
 * image candidates are filtered and sorted first and only then stat'ed, in
 * order, until FOLDER_MAX_FILES are accepted, so a huge tree costs at most that
 * many stats (plus FOLDER_MAX_DIRS directory reads).
 */
async function listFolder() {
	const root = await resolveFolder();
	const candidates = [];
	const pending = [[]];
	let dirsRead = 0;
	let truncated = false;
	while (pending.length > 0) {
		if (dirsRead >= FOLDER_MAX_DIRS) {
			truncated = true;
			break;
		}
		const dir = pending.shift();
		let entries;
		try {
			entries = await readdir(join(root, ...dir), { withFileTypes: true });
		} catch {
			// The folder itself must be readable; an unreadable subfolder is skipped.
			if (dir.length === 0) throw folderError("folder-unreadable");
			continue;
		}
		dirsRead++;
		const subdirs = [];
		for (const entry of entries) {
			if (!isFolderSegment(entry.name)) continue;
			const segments = [...dir, entry.name];
			if (entry.isDirectory()) {
				if (dir.length < FOLDER_MAX_DEPTH) subdirs.push(segments);
			} else if (entry.isFile() && FOLDER_IMAGE_TYPES.has(extname(entry.name).toLowerCase())) {
				candidates.push(segments);
			}
		}
		subdirs.sort((a, b) => compareFolderNames(a[a.length - 1], b[b.length - 1]));
		pending.push(...subdirs);
	}
	candidates.sort(compareFolderEntries);
	const files = [];
	let examined = 0;
	while (examined < candidates.length && files.length < FOLDER_MAX_FILES) {
		const segments = candidates[examined++];
		let stat;
		try {
			stat = await lstat(join(root, ...segments));
		} catch {
			continue;
		}
		if (!stat.isFile() || stat.size === 0 || stat.size > FOLDER_MAX_IMAGE_BYTES) continue;
		files.push({ name: segments.join("/"), size: stat.size, mtimeMs: Math.round(stat.mtimeMs) });
	}
	return { files, truncated: truncated || examined < candidates.length };
}

/**
 * The segments of a relative image path the file route accepts, or null: at
 * most FOLDER_MAX_DEPTH directories plus the file name, every segment a plain
 * visible name. Same rules as the listing, so whatever is listed can be served.
 */
function folderPathSegments(name) {
	if (typeof name !== "string" || name.length === 0) return null;
	const segments = name.split("/");
	if (segments.length > FOLDER_MAX_DEPTH + 1 || !segments.every(isFolderSegment)) return null;
	return segments;
}

/**
 * Stream one image of the folder (the caller has already checked the method is
 * GET). Every refusal is the same bodiless 404, so the route cannot be used to
 * ask which paths exist.
 */
async function serveFolderImage(res, url) {
	const refuse = (status) => {
		res.writeHead(status, { "cache-control": "no-store" });
		res.end();
	};
	const name = url.searchParams.get("name");
	// A relative path of plain names: no backslashes, control characters, hidden segments or "..".
	const segments = folderPathSegments(name);
	if (segments === null) {
		refuse(404);
		return;
	}
	const type = FOLDER_IMAGE_TYPES.get(extname(name).toLowerCase());
	if (type === undefined) {
		refuse(404);
		return;
	}
	let root;
	try {
		root = await resolveFolder();
	} catch {
		refuse(404);
		return;
	}
	// `root` is a real path and every segment a plain name. lstat does not follow
	// links, so each directory on the way must itself be a real directory — a
	// symlinked subfolder (to anywhere) is refused exactly as the listing skips it.
	let dir = root;
	for (const segment of segments.slice(0, -1)) {
		dir = join(dir, segment);
		let dirStat;
		try {
			dirStat = await lstat(dir);
		} catch {
			refuse(404);
			return;
		}
		if (!dirStat.isDirectory()) {
			refuse(404);
			return;
		}
	}
	const file = join(dir, segments[segments.length - 1]);
	let stat;
	try {
		stat = await lstat(file);
	} catch {
		refuse(404);
		return;
	}
	if (!stat.isFile() || stat.size === 0 || stat.size > FOLDER_MAX_IMAGE_BYTES) {
		refuse(404);
		return;
	}
	res.writeHead(200, {
		"content-type": type,
		"content-length": String(stat.size),
		"cache-control": "no-store",
		"x-content-type-options": "nosniff",
		"content-security-policy": "sandbox; default-src 'none'",
		"content-disposition": "inline"
	});
	// O_NOFOLLOW closes the window between the checks above and the open.
	const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
	pipeline(createReadStream(file, { flags }), res, (error) => {
		// Headers are already sent: all that is left is to cut the connection.
		if (error) res.destroy();
	});
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
	if (payload.method === "folder-list") {
		try {
			writeJson(res, 200, { ok: true, value: await listFolder() });
		} catch (error) {
			if (error === null || typeof error !== "object" || typeof error.code !== "string" || !error.code.startsWith("folder-")) throw error;
			writeJson(res, 200, { ok: false, error: { code: error.code, message: error.code } });
		}
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
 * @param ctx - host cordis context (webServer, optionally webRuntime / webStartup).
 */
export function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: API_PREFIX,
		handler: async (req, res) => {
			const hosts = trustedAuthorities(ctx);
			if (!isTrustedApiRequest(req, hosts)) {
				writeJson(res, 403, { ok: false, error: { code: "forbidden", message: "forbidden" } });
				return;
			}
			try {
				// The one GET route: an image of the wallpaper folder. Every other
				// request keeps the POST + JSON rules of handleApi.
				if (req.method === "GET" && typeof req.url === "string") {
					const url = new URL(req.url, "http://localhost");
					if (url.pathname === FOLDER_FILE_PATH) {
						await serveFolderImage(res, url);
						return;
					}
				}
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
