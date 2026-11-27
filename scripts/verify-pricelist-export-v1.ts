// Unit checks for portal REST slice 11 (price-list export data on REST v1,
// backend 4e38588 GET /me/pricelist-export): the request (path, language,
// bearer, X-Acting-Customer-Id), the ONE retry without the acting header
// (403 ACTING_NOT_ALLOWED only; never 404 / FORBIDDEN), the error -> route
// code mapping, the combo built from the ANSWER (not local values), the
// cache-key / identity parts (customer id included) and the file route's
// job ownership check. Also checks that every field of the GraphQL document
// GetSofaPricelistExportProducts is in the backend's v1 DTO.
// No backend, no network: fetch is a stub.
// Run with: pnpm verify:pricelist-export-v1
// Exits 0 when every case passes, 1 otherwise.

import * as fs from "fs"
import * as nodePath from "path"
import {
  ExportProblemError,
  comboIdentity,
  comboKeyParts,
  createExportAnswerMemo,
  exportAnswerMemoKey,
  exportCallerKey,
  exportComboFromV1,
  exportErrorFromV1,
  fetchPricelistExportV1,
  jobBelongsTo,
  v1ExportLanguage,
  type V1PricelistExport,
} from "../src/lib/util/pricelist-export-v1"
import { V1ProblemError } from "../src/lib/furnisystems-sdk/client/v1-data"

let failures = 0
function assert(name: string, cond: boolean) {
  if (cond) console.log(`  PASS: ${name}`)
  else {
    failures++
    console.log(`  FAIL: ${name}`)
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const answer: V1PricelistExport = {
  customerId: 42,
  priceListId: 7,
  priceListName: "Dealer EUR",
  tagIds: [9, 3, 3],
  data: [],
}

type Call = { url: string; headers: Record<string, string>; method: string }

function stub(responses: Array<{ status: number; body: unknown }>) {
  const calls: Call[] = []
  const fetchStub = (async (url: string, init: RequestInit) => {
    calls.push({
      url,
      headers: init.headers as Record<string, string>,
      method: String(init.method),
    })
    const r = responses[Math.min(calls.length - 1, responses.length - 1)]
    return new Response(JSON.stringify(r.body), {
      status: r.status,
      headers: { "content-type": "application/json" },
    })
  }) as unknown as typeof fetch
  return {
    calls,
    deps: { restApiUrl: "http://backend/api/", fetch: fetchStub, bffHeaders: async () => ({}) },
  }
}

const problem = (status: number, code: string) => ({ status, body: { status, code } })

async function main() {
  console.log("request")
  {
    const s = stub([{ status: 200, body: answer }])
    const got = await fetchPricelistExportV1(s.deps, {
      bearer: "tok",
      actingCustomerId: 42,
      language: "de",
    })
    assert("one call", s.calls.length === 1)
    assert("GET", s.calls[0]?.method === "GET")
    assert(
      "path + language",
      s.calls[0]?.url === "http://backend/api/v1/me/pricelist-export?language=de"
    )
    assert("bearer", s.calls[0]?.headers.Authorization === "Bearer tok")
    assert("acting header", s.calls[0]?.headers["X-Acting-Customer-Id"] === "42")
    assert("x-client portal", s.calls[0]?.headers["x-client"] === "portal")
    assert("answer passed through", got.priceListId === 7 && got.customerId === 42)
  }
  {
    const s = stub([{ status: 200, body: answer }])
    await fetchPricelistExportV1(s.deps, { bearer: "tok", actingCustomerId: null, language: "en" })
    assert("no acting header without acting id", !("X-Acting-Customer-Id" in (s.calls[0]?.headers ?? {})))
  }
  assert("language da -> dk", v1ExportLanguage("da") === "dk")
  assert("language FR -> fr", v1ExportLanguage("FR") === "fr")

  console.log("acting retry")
  {
    const s = stub([problem(403, "ACTING_NOT_ALLOWED"), { status: 200, body: answer }])
    await fetchPricelistExportV1(s.deps, { bearer: "tok", actingCustomerId: 42, language: "en" })
    assert("ACTING_NOT_ALLOWED: retried once", s.calls.length === 2)
    assert(
      "retry has no acting header",
      !("X-Acting-Customer-Id" in (s.calls[1]?.headers ?? {}))
    )
  }
  for (const [status, code] of [
    [404, "NOT_FOUND"],
    [403, "FORBIDDEN"],
    [409, "EXPORT_NO_CUSTOMER"],
    [401, "UNAUTHENTICATED"],
  ] as const) {
    const s = stub([problem(status, code), { status: 200, body: answer }])
    let thrown: unknown = null
    try {
      await fetchPricelistExportV1(s.deps, { bearer: "tok", actingCustomerId: 42, language: "en" })
    } catch (e) {
      thrown = e
    }
    assert(`${status} ${code}: not retried`, s.calls.length === 1)
    assert(`${status} ${code}: thrown with status`, (thrown as V1ProblemError)?.status === status)
  }

  console.log("error mapping")
  const map = (status: number, code: string | null) =>
    exportErrorFromV1(new V1ProblemError({ status, code, actingSent: true }))
  const codeOf = (e: ExportProblemError | null) => (e ? `${e.code}/${e.status}` : null)
  assert("401 -> null (GraphQL fallback)", map(401, "UNAUTHENTICATED") === null)
  assert("404 -> not_found", codeOf(map(404, "NOT_FOUND")) === "not_found/404")
  assert("409 EXPORT_NO_CUSTOMER -> no_customer", codeOf(map(409, "EXPORT_NO_CUSTOMER")) === "no_customer/409")
  assert("409 EXPORT_NO_PRICE_LIST -> no_pricelist", codeOf(map(409, "EXPORT_NO_PRICE_LIST")) === "no_pricelist/409")
  assert("403 FORBIDDEN -> not_available", codeOf(map(403, "FORBIDDEN")) === "not_available/403")
  assert("403 no code -> not_available", codeOf(map(403, null)) === "not_available/403")
  assert("403 ACTING_NOT_ALLOWED -> no_customer", codeOf(map(403, "ACTING_NOT_ALLOWED")) === "no_customer/409")
  assert("409 other -> fetch_failed", codeOf(map(409, "CONFLICT")) === "fetch_failed/502")
  assert("429 -> fetch_failed", codeOf(map(429, "RATE_LIMITED")) === "fetch_failed/502")
  assert("500 -> fetch_failed", codeOf(map(500, null)) === "fetch_failed/502")
  assert("network (0) -> fetch_failed", codeOf(map(0, null)) === "fetch_failed/502")
  assert("non-v1 error -> fetch_failed", codeOf(exportErrorFromV1(new Error("x"))) === "fetch_failed/502")

  console.log("combo from the answer")
  const combo = exportComboFromV1(answer, { language: "en", coverLines: ["A"], customerId: 42 })
  assert(
    "customer / list / tags from the answer (tags sorted, unique)",
    eq(combo, { customerId: 42, priceListId: 7, tagIds: [3, 9], language: "en", coverLines: ["A"] })
  )
  {
    let thrown: unknown = null
    try {
      exportComboFromV1(answer, { language: "en", coverLines: [], customerId: 43 })
    } catch (e) {
      thrown = e
    }
    assert(
      "answer for another customer -> forbidden",
      thrown instanceof ExportProblemError && thrown.code === "forbidden" && thrown.status === 403
    )
  }

  console.log("cache key / identity / ownership")
  const other = { ...combo, customerId: 43 }
  assert("key parts carry the customer id", eq(comboKeyParts(combo), [42, 7, [3, 9], "en"]))
  assert("key parts differ by customer", !eq(comboKeyParts(combo), comboKeyParts(other)))
  assert("key parts differ by list", !eq(comboKeyParts(combo), comboKeyParts({ ...combo, priceListId: 8 })))
  assert("identity differs by customer", comboIdentity(combo) !== comboIdentity(other))
  assert("identity differs by cover", comboIdentity(combo) !== comboIdentity({ ...combo, coverLines: [] }))
  assert("job belongs to its customer", jobBelongsTo(combo, { customerId: 42, coverLines: ["A"] }))
  assert("job refused to another customer", !jobBelongsTo(combo, { customerId: 43, coverLines: ["A"] }))
  assert("job refused on other cover lines", !jobBelongsTo(combo, { customerId: 42, coverLines: ["B"] }))
  const jobsSrc = fs.readFileSync(
    nodePath.join(__dirname, "..", "src", "lib", "util", "pricelist-export-jobs.ts"),
    "utf8"
  )
  assert("comboBaseParts uses comboKeyParts", /\.\.\.comboKeyParts\(combo\)/.test(jobsSrc))
  assert("comboId uses comboIdentity", /comboId = \(c: ExportCombo\) => comboIdentity\(c\)/.test(jobsSrc))

  console.log("answer memo")
  {
    let clock = 1_000_000
    const memo = createExportAnswerMemo({ ttlMs: 1000, maxEntries: 2, now: () => clock })
    let loads = 0
    const load = (a: V1PricelistExport = answer) => async () => {
      loads++
      return a
    }
    const agentA = exportCallerKey({ realm: "portal", id: 1, customerAccountId: "acc-1" })
    const agentB = exportCallerKey({ realm: "portal", id: 2, customerAccountId: "acc-2" })
    const impersonated = exportCallerKey({ realm: "portal", id: 1, customerAccountId: "acc-1", impersonatedBy: 9 })
    const k = (callerKey: string, acting: number | null, language = "en") =>
      exportAnswerMemoKey({ callerKey, actingCustomerId: acting, language })

    await memo.get(k(agentA, 42), load())
    const again = await memo.get(k(agentA, 42), load())
    assert("hit: second call not loaded", loads === 1 && again === answer)
    await memo.get(k(agentA, 43), load())
    assert("miss on a different acting id", loads === 2)
    assert("acting none != acting id", k(agentA, null) !== k(agentA, 42))
    await memo.get(k(agentB, 42), load())
    assert("miss on a different caller", loads === 3)
    assert("impersonated session is another caller", agentA !== impersonated)
    assert("language in the key", k(agentA, 42, "de") !== k(agentA, 42, "fr"))
    assert("LRU bound", memo.size() === 2)
    // agentA/42 was evicted (oldest after the agentA/43 and agentB/42 loads).
    await memo.get(k(agentA, 42), load())
    assert("evicted entry reloads", loads === 4)

    clock += 1000
    await memo.get(k(agentA, 42), load())
    assert("expired entry reloads", loads === 5)

    let thrown: unknown = null
    const failing = async () => {
      loads++
      throw new V1ProblemError({ status: 500 })
    }
    try {
      await memo.get(k(agentA, 7), failing)
    } catch (e) {
      thrown = e
    }
    assert("error propagates", (thrown as V1ProblemError)?.status === 500)
    await memo.get(k(agentA, 7), load())
    assert("error not cached", loads === 7)

    let release: () => void = () => undefined
    const gate = new Promise<void>((r) => (release = r))
    const slow = async () => {
      loads++
      await gate
      return answer
    }
    const p1 = memo.get(k(agentB, 8), slow)
    const p2 = memo.get(k(agentB, 8), slow)
    release()
    const [r1, r2] = await Promise.all([p1, p2])
    assert("single-flight: one load for concurrent calls", loads === 8 && r1 === r2)

    // A hit still goes through exportComboFromV1's customer check.
    const cached = await memo.get(k(agentB, 8), load())
    let mismatch: unknown = null
    try {
      exportComboFromV1(cached, { language: "en", coverLines: [], customerId: 99 })
    } catch (e) {
      mismatch = e
    }
    assert("memo hit still checked by exportComboFromV1", mismatch instanceof ExportProblemError)
  }
  const sourceSrc = fs.readFileSync(
    nodePath.join(__dirname, "..", "src", "lib", "util", "pricelist-export-source.ts"),
    "utf8"
  )
  assert(
    "source: v1 arm reads through the memo, then exportComboFromV1",
    /answerMemo\.get\(/.test(sourceSrc) &&
      sourceSrc.indexOf("await v1Answer(") < sourceSrc.indexOf("combo: exportComboFromV1(")
  )

  console.log("GraphQL document fields are in the v1 DTO")
  const sdkSrc = fs.readFileSync(
    nodePath.join(__dirname, "..", "src", "lib", "furnisystems-sdk", "modules", "products", "index.ts"),
    "utf8"
  )
  const docStart = sdkSrc.indexOf("query GetSofaPricelistExportProducts(")
  const docEnd = sdkSrc.indexOf("\n`", docStart)
  const doc = sdkSrc
    .slice(docStart, docEnd)
    .split("\n")
    .map((l) => l.replace(/#.*$/, ""))
    .join("\n")
    .replace(/\([^()]*(\([^()]*\)[^()]*)*\)/g, "") // arguments
  const docFields = new Set(
    (doc.slice(doc.indexOf("{") + 1).match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []).filter(
      (f) => f !== "findManyProductContainer"
    )
  )
  const dtoPath = nodePath.join(
    __dirname,
    "..",
    "..",
    "furnisystems-backend",
    "src",
    "dto",
    "pricelistExport.dto.ts"
  )
  if (!fs.existsSync(dtoPath)) {
    console.log("  SKIP: backend checkout not found next to the portal")
  } else {
    const dto = fs.readFileSync(dtoPath, "utf8")
    const missing = Array.from(docFields).filter(
      (f) => !new RegExp(`['"]${f}['"]|\\b${f}:`).test(dto)
    )
    assert(
      `every document field is in the DTO (${docFields.size} fields)${
        missing.length ? `; missing: ${missing.join(", ")}` : ""
      }`,
      missing.length === 0
    )
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
