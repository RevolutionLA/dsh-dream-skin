// dsh-dream-skin — the domain of every per-skin default.
//
// Why this exists: `SKINS[].defaults` used to carry seven numbers of which only
// three had any check at all, so `wallpaperBlur: 800` or `sidebarOpacity: 3.4`
// regenerated, passed every gate and shipped (issue #73). Both are visible
// accidents at runtime — a blurred-out screen, and an "opacity" that is really
// an alpha above 1.
//
// This table is now the single source of the default set:
//   - `skin-system.cjs` refuses to emit a skin outside it (generation-time);
//   - `apply-skin-system.cjs` renders the object literal from it (so a new
//     field can never be added to the bundle without a domain here);
//   - `tests/` checks the shipped bundle against it, and checks that the
//     runtime's own key list agrees with it.
//
// Bounds are deliberately the *product* constraints, not the widest legal
// range: a dialog below 0.8 stops hiding what is behind it (issue #67), a
// composer below 0.2 is a hole in the layout.

/** @typedef {{field: string, storageKey: string, kind: string}} DefaultField */

const DEFAULT_DOMAIN = [
  {
    field: "wallpaperOpacity",
    storageKey: "dsh-dream-skin:wallpaper-opacity",
    kind: "alpha",
    // (0, 1]: 0 means the wallpaper is not there at all, which is a bug not a taste.
    min: 0,
    max: 1,
    minExclusive: true
  },
  {
    field: "wallpaperBlur",
    storageKey: "dsh-dream-skin:wallpaper-blur",
    kind: "number",
    min: 0,
    max: 60,
    integer: true
  },
  {
    field: "sidebarOpacity",
    storageKey: "dsh-dream-skin:sidebar-opacity",
    kind: "alpha",
    min: 0,
    max: 1,
    minExclusive: true
  },
  {
    field: "composerOpacity",
    storageKey: "dsh-dream-skin:composer-opacity",
    kind: "alpha",
    // Below this the input card stops reading as a surface (10.5.x ruling).
    min: 0.2,
    max: 1,
    minExclusive: false
  },
  {
    field: "modalOpacity",
    storageKey: "dsh-dream-skin:modal-opacity",
    kind: "alpha",
    // Below this a dialog stops occluding the page behind it (issue #67).
    min: 0.8,
    max: 1,
    minExclusive: false
  },
  {
    field: "material",
    storageKey: "dsh-dream-skin:material-preset",
    kind: "enum",
    values: ["frosted", "liquid"]
  },
  {
    field: "autodim",
    storageKey: "dsh-dream-skin:wallpaper-autodim",
    kind: "boolean"
  }
];

/** Field names in the order the bundle renders them. */
const DEFAULT_FIELDS = DEFAULT_DOMAIN.map((d) => d.field);

/** The storage keys `applySkinDefaults()` is allowed to write. */
const DEFAULT_STORAGE_KEYS = DEFAULT_DOMAIN.map((d) => d.storageKey);

const inRange = (v, spec) => {
  if (typeof v !== "number" || !Number.isFinite(v)) return false;
  if (spec.integer && !Number.isInteger(v)) return false;
  if (spec.minExclusive ? v <= spec.min : v < spec.min) return false;
  return v <= spec.max;
};

/**
 * Every way `defaults` violates the domain, as human-readable strings.
 * Empty array === the skin may ship.
 */
function validateDefaults(defaults, label = "skin") {
  const problems = [];
  if (!defaults || typeof defaults !== "object") return [`${label}: defaults is not an object`];
  for (const spec of DEFAULT_DOMAIN) {
    const v = defaults[spec.field];
    const where = `${label}.defaults.${spec.field}`;
    if (v === undefined) {
      problems.push(`${where} is missing`);
      continue;
    }
    if (spec.kind === "enum") {
      if (!spec.values.includes(v)) problems.push(`${where} = ${JSON.stringify(v)}, expected one of ${spec.values.join("/")}`);
    } else if (spec.kind === "boolean") {
      if (typeof v !== "boolean") problems.push(`${where} = ${JSON.stringify(v)}, expected a boolean`);
    } else if (!inRange(v, spec)) {
      const lo = spec.minExclusive ? `(${spec.min}` : `[${spec.min}`;
      problems.push(`${where} = ${JSON.stringify(v)}, expected ${lo}, ${spec.max}]`);
    }
  }
  for (const key of Object.keys(defaults)) {
    if (!DEFAULT_FIELDS.includes(key)) problems.push(`${label}.defaults.${key} has no domain in DEFAULT_DOMAIN`);
  }
  return problems;
}

/** The storage value a field is written as (strings, because localStorage). */
function serializeDefault(spec, value) {
  if (spec.kind === "boolean") return value ? "1" : "0";
  return String(value);
}

module.exports = {
  DEFAULT_DOMAIN,
  DEFAULT_FIELDS,
  DEFAULT_STORAGE_KEYS,
  validateDefaults,
  serializeDefault
};
