// Run: pnpm verify:i18n-overrides
import { buildOverrides, deepMerge } from "../src/lib/i18n/overrides-core"
import { fetchTranslationOverrides } from "../src/lib/i18n/overrides"
import { applyOverridesPayload, resetOverridesStore } from "../src/lib/i18n/overrides-store"
import { createI18nInstance } from "../src/lib/i18n/unified-config"

let failed = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`)
  if (!cond) failed++
}
const j = JSON.stringify
const bundled = { a: "A", n: { x: "X", y: "Y" }, "kebab-key": "K" }

// unflatten
check("flat key", j(buildOverrides({ "kebab-key": "new" }, bundled)) === j({ "kebab-key": "new" }))
check("dotted key unflattened", j(buildOverrides({ "n.x": "nx" }, bundled)) === j({ n: { x: "nx" } }))
check("empty / non-string ignored", j(buildOverrides({ a: "", "n.x": 5, "n.y": null }, bundled)) === "{}")
check("non-object entries -> {}", j(buildOverrides([1], bundled)) === "{}" && j(buildOverrides(null, bundled)) === "{}")
// shape guard
check("string over branch ignored", j(buildOverrides({ n: "oops" }, bundled)) === "{}")
check("branch under string ignored", j(buildOverrides({ "a.b": "oops" }, bundled)) === "{}")
check("sibling still applied", j(buildOverrides({ n: "oops", "n.y": "ok" }, bundled)) === j({ n: { y: "ok" } }))
check("override-vs-override conflict", j(buildOverrides({ "m.k": "1", "m.k.z": "2" }, bundled)) === j({ m: { k: "1" } }))
check("proto pollution blocked", j(buildOverrides({ "__proto__.p": "x", "n.constructor": "y" }, bundled)) === "{}" && ({} as any).p === undefined)
check("empty segment ignored", j(buildOverrides({ "n..x": "x", ".a": "x" }, bundled)) === "{}")
// merge
const m = deepMerge(bundled, { n: { x: "nx" }, a: "AA", n2: "new" }) as any
check("deep merge", m.n.x === "nx" && m.n.y === "Y" && m.a === "AA" && m.n2 === "new")
check("merge does not mutate base", bundled.n.x === "X")
check("merge ignores shape mismatch", j(deepMerge(bundled, { n: "s", a: { z: "1" } })) === j(bundled))
check("merge {} identity", j(deepMerge(bundled, {})) === j(bundled))

async function main() {
  process.env.NEXT_PUBLIC_BACKEND_REST_API = "http://localhost:4000/api"
  const realFetch = globalThis.fetch
  let lastUrl = ""
  const mock = (impl: () => Promise<Response>) => {
    globalThis.fetch = (async (u: any) => {
      lastUrl = String(u)
      return impl()
    }) as any
  }
  const ok = (b: unknown) => new Response(JSON.stringify(b), { status: 200 })

  mock(async () => ok({ entries: {} }))
  check("(a) empty entries -> {}", j(await fetchTranslationOverrides("en", "common")) === "{}")
  check("url has overridesOnly + b2b_common", lastUrl === "http://localhost:4000/api/v1/translations/b2b_common?language=en&overridesOnly=true")

  mock(async () => ok({ entries: { "awaiting-payment": "Waiting" } }))
  check("(b) flat override", j(await fetchTranslationOverrides("fr", "common")) === j({ "awaiting-payment": "Waiting" }))

  mock(async () => ok({ entries: { "claims.title": "My claims" } }))
  check("(c) dotted account override", j(await fetchTranslationOverrides("de", "account")) === j({ claims: { title: "My claims" } }))
  check("account -> b2b_account", lastUrl.includes("/b2b_account?"))

  mock(async () => new Response("nope", { status: 404 }))
  check("(d) 404 -> {}", j(await fetchTranslationOverrides("en", "common")) === "{}")

  mock(() => new Promise<Response>(() => {}))
  const origTimeout = AbortSignal.timeout
  ;(AbortSignal as any).timeout = () => AbortSignal.abort()
  mock(async () => { throw new Error("aborted") })
  check("(e) timeout/abort -> {}", j(await fetchTranslationOverrides("en", "common")) === "{}")
  ;(AbortSignal as any).timeout = origTimeout

  mock(async () => new Response("<html>", { status: 200 }))
  check("bad JSON -> {}", j(await fetchTranslationOverrides("en", "common")) === "{}")
  mock(async () => ok({ entries: { "claims": "string over branch" } }))
  check("shape-guarded against real bundle", j(await fetchTranslationOverrides("en", "account")) === "{}")

  let called = false
  mock(async () => { called = true; return ok({ entries: { a: "b" } }) })
  check("unknown namespace/lang: no fetch, {}", j(await fetchTranslationOverrides("en", "product")) === "{}" && j(await fetchTranslationOverrides("lt", "common")) === "{}" && !called)

  globalThis.fetch = realFetch

  // sanity: response language mismatch is ignored
  mock(async () => ok({ language: "de", entries: { "claims.title": "x" } }))
  check("language mismatch -> {}", j(await fetchTranslationOverrides("fr", "account")) === "{}")
  globalThis.fetch = realFetch

  // --- overrides store + i18next singleton (real loader, real bundles) ---
  const KEY = Object.keys(JSON.parse(require("fs").readFileSync("src/lib/i18n/locales/en/common.json", "utf8")))[0]
  const BUNDLED = JSON.parse(require("fs").readFileSync("src/lib/i18n/locales/en/common.json", "utf8"))[KEY] as string
  const { instance: inst, config } = createI18nInstance({ isServer: false })
  const P = (v: any) => ({ en: { common: v } })
  resetOverridesStore()
  // payload applied BEFORE the bundle loads survives the load (init starts the
  // async load of the default namespace; the payload lands while it is in flight)
  await inst.init({ ...config, debug: false })
  applyOverridesPayload(inst as any, P({ [KEY]: "OVR1" }))
  const mutations: string[] = []
  const origAdd = inst.addResourceBundle.bind(inst)
  const origRem = inst.removeResourceBundle.bind(inst)
  ;(inst as any).addResourceBundle = (...a: any[]) => { mutations.push("add"); return (origAdd as any)(...a) }
  ;(inst as any).removeResourceBundle = (...a: any[]) => { mutations.push("remove"); return (origRem as any)(...a) }

  await inst.loadNamespaces(["common"])
  check("payload before load survives load", inst.t(KEY, { ns: "common" }) === "OVR1")

  // payload applied AFTER the bundle load replaces it
  applyOverridesPayload(inst as any, P({ [KEY]: "OVR2" }))
  check("payload after load replaces bundle", inst.t(KEY, { ns: "common" }) === "OVR2")

  // unchanged payload -> no instance mutation
  mutations.length = 0
  applyOverridesPayload(inst as any, P({ [KEY]: "OVR2" }))
  check("unchanged payload -> no mutation", mutations.length === 0)

  // unknown marker (null) keeps previous state
  applyOverridesPayload(inst as any, P(null))
  applyOverridesPayload(inst as any, { en: { common: undefined } })
  check("unknown marker keeps previous", inst.t(KEY, { ns: "common" }) === "OVR2" && mutations.length === 0)

  // override removed -> bundled restored (replace, not merge)
  applyOverridesPayload(inst as any, P({}))
  check("override removed -> bundled restored", inst.t(KEY, { ns: "common" }) === BUNDLED)

  // garbage payloads never throw, never mutate
  mutations.length = 0
  applyOverridesPayload(inst as any, { xx: { common: { a: "b" } }, en: { product: { a: "b" } } } as any)
  applyOverridesPayload(inst as any, "nope" as any)
  check("invalid payload ignored", mutations.length === 0)

  if (failed) { console.log(`\n${failed} FAILED`); process.exit(1) }
  console.log("\nAll passed")
}
main()
