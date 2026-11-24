// Pure helpers for the admin-edited UI translation override layer.
// No imports, no I/O: shared by the server helper (overrides.ts), the route
// handler, the browser loader and the verify script.

export type JsonObject = { [key: string]: unknown }

/** Portal namespace -> backend namespace. Only these two are overridable. */
export const OVERRIDE_NAMESPACES = {
  common: "b2b_common",
  account: "b2b_account",
} as const
export type OverrideNamespace = keyof typeof OVERRIDE_NAMESPACES

export const isOverrideNamespace = (v: unknown): v is OverrideNamespace =>
  typeof v === "string" &&
  Object.prototype.hasOwnProperty.call(OVERRIDE_NAMESPACES, v)

const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"])

const isPlainObject = (v: unknown): v is JsonObject =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const hasOwn = (o: object, k: string) =>
  Object.prototype.hasOwnProperty.call(o, k)

/**
 * Turn flat dotted entries into a nested override object, dropping anything
 * unsafe. `bundled` is the complete bundled resource for the same
 * language/namespace; it is used as the shape reference:
 *  - non-string / empty-string values are ignored
 *  - an override whose path would put a string where the bundle has an object
 *    branch (or descend through a bundled string) is ignored
 *  - overrides that conflict with each other (a.b and a.b.c) are ignored
 * Keys absent from the bundle are kept (harmless, never looked up).
 */
export function buildOverrides(
  entries: unknown,
  bundled: unknown
): JsonObject {
  const out: JsonObject = {}
  if (!isPlainObject(entries)) return out

  for (const [flatKey, value] of Object.entries(entries)) {
    if (typeof value !== "string" || value === "") continue
    const path = flatKey.split(".")
    if (path.some((s) => s === "" || FORBIDDEN_SEGMENTS.has(s))) continue

    // Shape guard against the bundle.
    let ref: unknown = bundled
    let ok = true
    for (let i = 0; i < path.length; i++) {
      if (ref === undefined) break // beyond the bundle: nothing to conflict with
      const isLeaf = i === path.length - 1
      if (!isPlainObject(ref)) {
        // We still have path left but the bundle has a string (or other) here.
        ok = false
        break
      }
      const next = hasOwn(ref, path[i]) ? ref[path[i]] : undefined
      if (isLeaf) {
        if (next !== undefined && typeof next !== "string") ok = false
      }
      ref = next
    }
    if (!ok) continue

    // Insert, refusing conflicts with other overrides.
    let node: JsonObject = out
    let conflict = false
    for (let i = 0; i < path.length - 1; i++) {
      const seg = path[i]
      const cur = hasOwn(node, seg) ? node[seg] : undefined
      if (cur === undefined) {
        const child: JsonObject = {}
        node[seg] = child
        node = child
      } else if (isPlainObject(cur)) {
        node = cur
      } else {
        conflict = true
        break
      }
    }
    if (conflict) continue
    const last = path[path.length - 1]
    if (hasOwn(node, last) && isPlainObject(node[last])) continue
    node[last] = value
  }
  return out
}

/**
 * Deep-merge `overrides` over `base` into a new object. Strings only replace
 * strings (or fill gaps); an override can never replace a branch with a leaf
 * or the reverse, so t() lookups on sibling keys are unaffected.
 */
export function deepMerge(base: unknown, overrides: unknown): unknown {
  if (!isPlainObject(base)) return base
  if (!isPlainObject(overrides)) return base
  const out: JsonObject = { ...base }
  for (const [k, ov] of Object.entries(overrides)) {
    if (FORBIDDEN_SEGMENTS.has(k)) continue
    const bv = hasOwn(base, k) ? base[k] : undefined
    if (bv === undefined) {
      out[k] = ov
    } else if (isPlainObject(bv) && isPlainObject(ov)) {
      out[k] = deepMerge(bv, ov)
    } else if (typeof bv === "string" && typeof ov === "string") {
      out[k] = ov
    }
    // any other shape mismatch: keep the bundled value
  }
  return out
}
