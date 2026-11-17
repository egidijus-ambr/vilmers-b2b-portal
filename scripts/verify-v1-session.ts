// Unit checks for the dormant v1 session client (src/lib/v1-session, stage 2c-2).
// Run with: pnpm verify:v1-session
//   (= node --conditions=react-server -r sucrase/register scripts/verify-v1-session.ts;
//    the react-server condition resolves `server-only` to its empty module.)
// No backend, no network: fetch is a stub or FakeBackend, which models the
// backend's rotation rules (furnisystems-backend src/auth/sessions.ts):
// (fix/refresh-superseded 32c55c7): rotate, grace once within 30 s, retired
// < 30 s of a live session -> 409 REFRESH_SUPERSEDED (Retry-After: 1, nothing
// revoked), retired >= 30 s -> reuse revokes the session and answers 401,
// unknown / revoked -> 401. Exits 0 when every case passes.
import { readFileSync } from "fs"
import { join } from "path"
import {
  V1_ACCESS_COOKIE,
  V1_REFRESH_COOKIE,
  V1_REFRESH_MAX_AGE_CAP_SECONDS,
  V1_WRITE_PROBE_COOKIE,
  V1CookiesNotWritableError,
  accessCookieMaxAge,
  type V1CookieOptions,
  type WritableCookieJar,
} from "../src/lib/v1-session/cookies"
import { readV1Session } from "../src/lib/v1-session/read"
import {
  ACTION_WAIT_MS,
  MIDDLEWARE_WAIT_MS,
  REFRESH_MEMO_TTL_MS,
  RETRY_BUDGET_MS,
  UNAUTHENTICATED_IS_DEFINITIVE,
  createV1SessionClient,
  ensureFreshV1Session,
  logoutV1Session,
  type V1Logger,
  type V1SessionClientConfig,
} from "../src/lib/v1-session/refresh"
import { findBackendRefreshCookie, splitJoinedSetCookie } from "../src/lib/v1-session/set-cookie"
import {
  createRecordingCookieJar,
  forwardedCookieHeader,
  isPrefetchRequest,
} from "../src/lib/v1-session/middleware-jar"
import { getClientIpFromHeaders, getProxyClientIpFromHeaders } from "../src/lib/util/client-ip"

// ---- fixtures ----------------------------------------------------------------------

const SECRET = "bff-secret-0123456789-0123456789-abcdef"
const CLIENT_IP = "203.0.113.77"
const UA = "Mozilla/5.0 test-agent"
const NOW = Date.parse("2026-11-17T10:00:00Z")
let clock = NOW

function b64url(value: string) {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
function jwt(expMs: number, tag: string) {
  return `${b64url('{"alg":"HS256"}')}.${b64url(JSON.stringify({ exp: Math.floor(expMs / 1000), tag }))}.sig${tag}`
}
const A_OLD = jwt(NOW - 1000, "old")
const sensitive: string[] = [SECRET, CLIENT_IP, A_OLD]

function memoryJar(initial: Record<string, string>, writable = true) {
  const store: Record<string, { value: string; options?: V1CookieOptions }> = {}
  Object.keys(initial).forEach((k) => (store[k] = { value: initial[k] }))
  const writes: Array<{ name: string; value: string; options: V1CookieOptions }> = []
  let probes = 0
  const jar: WritableCookieJar = {
    get: (name) => (store[name] && store[name].value !== "" ? store[name].value : undefined),
    set: (name, value, options) => {
      writes.push({ name, value, options })
      store[name] = { value, options }
    },
    assertWritable: () => {
      probes++
      if (!writable) throw new V1CookiesNotWritableError()
    },
  }
  return { jar, store, writes, probes: () => probes }
}

function problem(status: number, code: string, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ type: "x", title: "t", status, code, instance: "/api/v1/auth/refresh", requestId: "req-1" }), {
    status,
    headers: { "content-type": "application/problem+json; charset=utf-8", ...headers },
  })
}

type Step =
  | "ok"
  | { status: number; code?: string; retryAfter?: string }
  | "lose-after-commit"
  | "network-before"
  | { delayMs: number }

/** Models src/auth/sessions.ts rotateRefreshToken + retiredTokenPresented. */
class FakeBackend {
  n = 0
  refreshCalls = 0
  logoutCalls = 0
  superseded409 = 0
  revocations = 0
  plan: Step[] = []
  headersSeen: Array<Record<string, string>> = []
  sessions = new Map<string, { revoked: boolean }>()
  tokens = new Map<string, { sid: string; retiredAt?: number }>()
  grace = new Map<string, { pair: { token: string; access: string }; used: boolean; until: number }>()
  constructor(private now: () => number) {}

  newToken() {
    this.n++
    const t = `R${this.n}`.padEnd(43, "x")
    sensitive.push(t)
    return t
  }
  newAccess() {
    const a = jwt(this.now() + 3600_000, `a${this.n}`)
    sensitive.push(a)
    return a
  }
  login(): string {
    const sid = `s${this.sessions.size + 1}`
    this.sessions.set(sid, { revoked: false })
    const t = this.newToken()
    this.tokens.set(t, { sid })
    return t
  }
  pairResponse(token: string, access: string) {
    const headers = new Headers({ "content-type": "application/json" })
    headers.append("set-cookie", `furni_refresh=${token}; Max-Age=1209600; Path=/api/v1/auth; HttpOnly; SameSite=Strict`)
    return new Response(
      JSON.stringify({ accessToken: access, expiresIn: 3600, session: { sid: "s", realm: "portal", expiresAt: "2026-12-01T10:00:00.000Z" } }),
      { status: 200, headers }
    )
  }
  /** The backend's own decision for one presentation of `token`. */
  rotate(token: string): Response {
    const info = this.tokens.get(token)
    const unauth = () => problem(401, "UNAUTHENTICATED")
    if (!info) return unauth()
    const session = this.sessions.get(info.sid)!
    if (session.revoked) return unauth()
    if (info.retiredAt === undefined) {
      const next = this.newToken()
      const access = this.newAccess()
      info.retiredAt = this.now()
      this.tokens.set(next, { sid: info.sid })
      this.grace.set(token, { pair: { token: next, access }, used: false, until: this.now() + 30_000 })
      return this.pairResponse(next, access)
    }
    const g = this.grace.get(token)
    if (g && !g.used && this.now() < g.until) {
      g.used = true
      return this.pairResponse(g.pair.token, g.pair.access)
    }
    if (this.now() - info.retiredAt < 30_000) {
      this.superseded409++
      return problem(409, "REFRESH_SUPERSEDED", { "retry-after": "1" })
    }
    session.revoked = true
    this.revocations++
    return unauth()
  }
  fetch = (async (url: string, init: RequestInit) => {
    this.headersSeen.push({ ...(init.headers as Record<string, string>) })
    const body = JSON.parse(String(init.body || "{}"))
    if (String(url).endsWith("/auth/logout")) {
      this.logoutCalls++
      const info = this.tokens.get(body.refreshToken)
      if (info) this.sessions.get(info.sid)!.revoked = true
      return new Response(null, { status: 204 })
    }
    this.refreshCalls++
    const step = this.plan.shift() ?? "ok"
    await Promise.resolve()
    if (step === "network-before") throw new TypeError("fetch failed")
    if (typeof step === "object" && "status" in step) {
      return problem(step.status, step.code ?? "SERVICE_UNAVAILABLE", step.retryAfter ? { "retry-after": step.retryAfter } : {})
    }
    const response = this.rotate(body.refreshToken)
    if (step === "lose-after-commit") throw new TypeError("socket hang up")
    if (typeof step === "object" && "delayMs" in step) {
      await new Promise((r) => setTimeout(r, step.delayMs))
    }
    return response
  }) as unknown as typeof fetch
}

const sleeps: number[] = []
function makeClient(fetchFn: typeof fetch, extra: Partial<V1SessionClientConfig> = {}) {
  return createV1SessionClient({
    restApiUrl: "http://backend.test/api/",
    bffSecret: SECRET,
    fetch: fetchFn,
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms)
      clock += ms
    },
    ...extra,
  })
}
const ctx = { clientIp: CLIENT_IP, userAgent: UA }
const opts = (extra: Record<string, unknown> = {}) => ({ secure: true, nowMs: clock, ...extra })

// ---- log capture: every console method, every case -----------------------------------

const logged: string[] = []
;(["log", "info", "warn", "error", "debug"] as const).forEach((method) => {
  const original = console[method].bind(console)
  console[method] = (...args: unknown[]) => {
    logged.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "))
    if (process.env.VERBOSE) original(...args)
  }
})

// ---- runner ------------------------------------------------------------------------

let failed = 0
const results: string[] = []
async function test(name: string, fn: () => Promise<void> | void) {
  clock = NOW
  sleeps.length = 0
  try {
    await fn()
    results.push(`PASS  ${name}`)
  } catch (error) {
    failed++
    results.push(`FAIL  ${name}\n      ${(error as Error).message}`)
  }
}
function ok(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}
function eq(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}
const realSleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  // ---- happy path -----------------------------------------------------------------

  await test("refresh success rotates both cookies with the right attributes and headers", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    const { jar, store } = memoryJar({ [V1_ACCESS_COOKIE]: A_OLD, [V1_REFRESH_COOKIE]: t0 })
    const r = await ensureFreshV1Session(makeClient(be.fetch), jar, ctx, opts())
    ok(r.kind === "ok" && r.refreshed, `result ${r.kind}`)
    ok(store[V1_REFRESH_COOKIE].value !== t0, "refresh cookie rotated")
    eq(store[V1_REFRESH_COOKIE].options, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: V1_REFRESH_MAX_AGE_CAP_SECONDS }, "refresh cookie options (14 d cap)")
    eq(store[V1_ACCESS_COOKIE].options, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 3540 }, "access cookie options")
    const h = be.headersSeen[0]
    eq(h["Content-Type"], "application/json", "JSON content type")
    ok(!("Origin" in h) && !("origin" in h), "no Origin")
    eq([h["x-bff-secret"], h["x-client-ip"], h["user-agent"]], [SECRET, CLIENT_IP, UA], "BFF headers + user-agent")
  })

  await test("access cookie maxAge is never 0 (clamped for short-lived tokens)", () => {
    eq([accessCookieMaxAge(3600), accessCookieMaxAge(60), accessCookieMaxAge(1), accessCookieMaxAge(0)], [3540, 30, 1, 1], "maxAge")
  })

  await test("BFF headers omitted without a valid secret or without a proxy IP", async () => {
    const be = new FakeBackend(() => clock)
    await makeClient(be.fetch, { bffSecret: "short" }).refresh(be.login(), ctx)
    await makeClient(be.fetch).refresh(be.login(), { clientIp: null })
    be.headersSeen.forEach((h) => ok(!("x-bff-secret" in h) && !("x-client-ip" in h), "no BFF headers"))
  })

  await test("x-client-ip comes only from x-real-ip (strict variant); existing helper unchanged", () => {
    const h = (o: Record<string, string>) => ({ get: (n: string) => o[n] ?? null })
    eq(getProxyClientIpFromHeaders(h({ "x-real-ip": " 198.51.100.4 " })), "198.51.100.4", "x-real-ip")
    eq(getProxyClientIpFromHeaders(h({ "x-forwarded-for": "198.51.100.9" })), null, "XFF ignored")
    eq(getProxyClientIpFromHeaders(h({ "x-real-ip": "evil<script>" })), null, "garbage refused")
    eq(getProxyClientIpFromHeaders(h({ "x-real-ip": "2001:db8::1" })), "2001:db8::1", "IPv6")
    eq(getClientIpFromHeaders(h({ "x-forwarded-for": "198.51.100.9" })), "198.51.100.9", "legacy helper still reads XFF")
  })

  await test("valid access cookie: no refresh, no write, no probe", async () => {
    const be = new FakeBackend(() => clock)
    const a = jwt(NOW + 3600_000, "fresh")
    const m = memoryJar({ [V1_ACCESS_COOKIE]: a, [V1_REFRESH_COOKIE]: be.login() })
    eq(await ensureFreshV1Session(makeClient(be.fetch), m.jar, ctx, opts()), { kind: "ok", accessToken: a, refreshed: false }, "result")
    eq([be.refreshCalls, m.writes.length, m.probes()], [0, 0, 0], "untouched")
  })

  await test("no refresh cookie: anonymous, nothing called or cleared", async () => {
    const be = new FakeBackend(() => clock)
    const m = memoryJar({})
    eq(await ensureFreshV1Session(makeClient(be.fetch), m.jar, ctx, opts()), { kind: "anonymous", cleared: "none" }, "result")
    eq(be.refreshCalls + m.writes.length, 0, "untouched")
  })

  // ---- de-dup, memo, chain ----------------------------------------------------------

  await test("N parallel calls with the same refresh token -> ONE backend request", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    const client = makeClient(be.fetch)
    const jars = Array.from({ length: 10 }, () => memoryJar({ [V1_REFRESH_COOKIE]: t0 }))
    const all = await Promise.all(jars.map((j) => ensureFreshV1Session(client, j.jar, ctx, opts())))
    eq(be.refreshCalls, 1, "backend calls")
    const t1 = jars[0].store[V1_REFRESH_COOKIE].value
    all.forEach((r) => ok(r.kind === "ok", "each caller ok"))
    jars.forEach((j) => eq(j.store[V1_REFRESH_COOKIE].value, t1, "each response sets the same rotated token"))
  })

  await test("two client instances (edge + node) on one backend: grace gives both the same pair", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    const edge = makeClient(be.fetch)
    const node = makeClient(be.fetch)
    const a = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    const b = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    await Promise.all([ensureFreshV1Session(edge, a.jar, ctx, opts()), ensureFreshV1Session(node, b.jar, ctx, opts())])
    eq(be.refreshCalls, 2, "one call per instance")
    eq(a.store[V1_REFRESH_COOKIE].value, b.store[V1_REFRESH_COOKIE].value, "same pair via grace")
    eq(be.revocations, 0, "nothing revoked")
  })

  await test("third presentation (edge + node + third instance) gets 409 superseded: cookies intact, session alive, next request works", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    const edge = makeClient(be.fetch)
    const node = makeClient(be.fetch)
    const sibling = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    await Promise.all([
      ensureFreshV1Session(edge, sibling.jar, ctx, opts()),
      ensureFreshV1Session(node, memoryJar({ [V1_REFRESH_COOKIE]: t0 }).jar, ctx, opts()), // grace used
    ])
    const third = makeClient(be.fetch)
    const m = memoryJar({ [V1_ACCESS_COOKIE]: A_OLD, [V1_REFRESH_COOKIE]: t0 })
    const r = await ensureFreshV1Session(third, m.jar, ctx, opts())
    ok(r.kind === "unavailable" && r.failure.reason === "superseded" && r.failure.retryable, `result ${JSON.stringify(r)}`)
    eq(r.kind === "unavailable" && r.failure.retryAfterSeconds, 1, "Retry-After honoured")
    eq([be.superseded409, be.revocations, be.refreshCalls], [1, 0, 3], "409 once, nothing revoked, superseded NOT retried")
    eq(sleeps, [], "no backoff retry of the superseded token")
    eq(m.writes.length, 0, "no cookie written or deleted")
    eq([m.store[V1_REFRESH_COOKIE].value, m.store[V1_ACCESS_COOKIE].value], [t0, A_OLD], "cookies intact")
    // The browser's next request carries the newer cookie the sibling set:
    const nextRequest = memoryJar({ [V1_REFRESH_COOKIE]: sibling.store[V1_REFRESH_COOKIE].value })
    eq((await ensureFreshV1Session(third, nextRequest.jar, ctx, opts())).kind, "ok", "session alive with the newer token")
  })

  await test("superseded token is never re-sent from this process within the memo lifetime", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    await makeClient(be.fetch).refresh(t0, ctx)
    await makeClient(be.fetch).refresh(t0, ctx) // grace used
    const client = makeClient(be.fetch)
    eq((await client.refresh(t0, ctx)).kind, "error", "409")
    clock += 35_000 // a re-send now would REVOKE the session
    const again = await client.refresh(t0, ctx)
    ok(again.kind === "error" && again.reason === "superseded", "served from the negative cache")
    eq([be.superseded409, be.revocations], [1, 0], "no re-send, no revocation")
  })

  await test("definitive 401 UNAUTHENTICATED clears BOTH cookies", async () => {
    const be = new FakeBackend(() => clock)
    eq(UNAUTHENTICATED_IS_DEFINITIVE, true, "401 is definitive")
    const m = memoryJar({ [V1_ACCESS_COOKIE]: A_OLD, [V1_REFRESH_COOKIE]: "G".repeat(43) })
    eq(await ensureFreshV1Session(makeClient(be.fetch), m.jar, ctx, opts()), { kind: "anonymous", cleared: "all" }, "result")
    eq(m.writes.map((w) => [w.name, w.value, w.options.maxAge, w.options.path]), [[V1_ACCESS_COOKIE, "", 0, "/"], [V1_REFRESH_COOKIE, "", 0, "/"]], "both deleted")
  })

  await test("refresh 401 is negative-cached: a dead cookie costs one backend call per TTL", async () => {
    const be = new FakeBackend(() => clock)
    const client = makeClient(be.fetch)
    const dead = "D".repeat(43)
    eq((await client.refresh(dead, ctx)).kind, "rejected", "first")
    eq((await client.refresh(dead, ctx)).kind, "rejected", "second")
    eq(be.refreshCalls, 1, "one call within the TTL")
    clock += 31_000
    await client.refresh(dead, ctx)
    eq(be.refreshCalls, 2, "called again after the TTL")
  })

  await test("stragglers with the old token at 25 s and 45 s get the pair from memory, backend untouched", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    const client = makeClient(be.fetch)
    const first = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    await ensureFreshV1Session(client, first.jar, ctx, opts())
    const t1 = first.store[V1_REFRESH_COOKIE].value
    for (const at of [25_000, 45_000]) {
      clock = NOW + at
      const m = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
      await ensureFreshV1Session(client, m.jar, ctx, opts())
      eq(m.store[V1_REFRESH_COOKIE].value, t1, `straggler at ${at / 1000}s`)
    }
    eq([be.refreshCalls, be.revocations, be.superseded409], [1, 0, 0], "no second presentation")
    ok(REFRESH_MEMO_TTL_MS >= 60_000, "memo outlives the grace window with margin")
  })

  await test("reuse after 30 s (straggler past the memo): backend revokes, 401, both cookies cleared", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    const client = makeClient(be.fetch)
    await ensureFreshV1Session(client, memoryJar({ [V1_REFRESH_COOKIE]: t0 }).jar, ctx, opts())
    clock = NOW + REFRESH_MEMO_TTL_MS + 1
    const m = memoryJar({ [V1_ACCESS_COOKIE]: A_OLD, [V1_REFRESH_COOKIE]: t0 })
    eq(await ensureFreshV1Session(client, m.jar, ctx, opts()), { kind: "anonymous", cleared: "all" }, "result")
    eq(be.revocations, 1, "documented limit: reuse after the memo revokes — the session really is dead")
    eq(m.jar.get(V1_REFRESH_COOKIE), undefined, "refresh cookie cleared (correct: session revoked)")
  })

  await test("lost response, grace already used by a sibling: the retry gets 409 -> unavailable, cookies kept, session alive", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    await makeClient(be.fetch).refresh(t0, ctx) // sibling rotates
    be.plan = ["lose-after-commit"] // this attempt consumes the grace, response lost
    const m = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    const r = await ensureFreshV1Session(makeClient(be.fetch), m.jar, ctx, opts())
    ok(r.kind === "unavailable" && r.failure.reason === "superseded", `result ${r.kind}`)
    eq([be.refreshCalls, be.superseded409, be.revocations], [3, 1, 0], "one retry, then stop on 409")
    eq(m.writes.length, 0, "cookies untouched")
  })

  await test("chain T0 -> T1 -> T2: a T0 straggler gets the newest pair", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    const client = makeClient(be.fetch)
    const a = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    await ensureFreshV1Session(client, a.jar, ctx, opts())
    clock += 5_000
    await ensureFreshV1Session(client, a.jar, ctx, opts({ force: true }))
    const t2 = a.store[V1_REFRESH_COOKIE].value
    const a2 = a.store[V1_ACCESS_COOKIE].value
    clock += 5_000
    const straggler = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    const r = await ensureFreshV1Session(client, straggler.jar, ctx, opts())
    eq(r.kind === "ok" && r.accessToken, a2, "newest access token")
    eq(straggler.store[V1_REFRESH_COOKIE].value, t2, "newest refresh token")
    eq(be.refreshCalls, 2, "no extra backend call")
  })

  // ---- lost responses, retries, timeouts ------------------------------------------------

  await test("response lost after a committed rotation: retried inside the client, grace pair used", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    be.plan = ["lose-after-commit"]
    const m = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    const r = await ensureFreshV1Session(makeClient(be.fetch), m.jar, ctx, opts())
    eq(r.kind, "ok", "rescued")
    eq([be.refreshCalls, be.revocations], [2, 0], "one retry, nothing revoked")
    eq(sleeps, [250], "short backoff")
  })

  await test("503 with Retry-After: 1 is honoured, then succeeds", async () => {
    const be = new FakeBackend(() => clock)
    be.plan = [{ status: 503, code: "SERVICE_UNAVAILABLE", retryAfter: "1" }]
    const r = await makeClient(be.fetch).refresh(be.login(), ctx)
    eq(r.kind, "refreshed", "outcome")
    eq(sleeps, [1000], "waited Retry-After")
  })

  await test("retries stop within the budget (well under the 30 s grace)", async () => {
    const be = new FakeBackend(() => clock)
    be.plan = [{ status: 503, retryAfter: "20" }]
    const r = await makeClient(be.fetch).refresh(be.login(), ctx)
    ok(r.kind === "error" && r.retryAfterSeconds === 20, "gave up")
    eq(be.refreshCalls, 1, "Retry-After beyond the budget: no retry")
    ok(RETRY_BUDGET_MS < 30_000, "budget < grace")
  })

  await test("caller stops waiting (timeout) without aborting; result lands in the memo; request at +35 s served from memory", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    be.plan = [{ delayMs: 60 }]
    const client = makeClient(be.fetch)
    const m = memoryJar({ [V1_ACCESS_COOKIE]: A_OLD, [V1_REFRESH_COOKIE]: t0 })
    const r = await ensureFreshV1Session(client, m.jar, ctx, opts({ waitMs: 10 }))
    eq(r.kind === "unavailable" && r.failure.reason, "timeout", "caller timed out")
    eq(m.writes.length, 0, "cookies untouched")
    await realSleep(120)
    clock = NOW + 35_000
    const later = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    const r2 = await ensureFreshV1Session(client, later.jar, ctx, opts())
    eq(r2.kind, "ok", "served from memo")
    eq([be.refreshCalls, be.revocations], [1, 0], "old token never re-presented")
  })

  await test("middleware waits less than actions", () => {
    ok(MIDDLEWARE_WAIT_MS < ACTION_WAIT_MS, "wait budgets")
  })

  const transientCases: Array<[string, Step[], { reason: string; retryable: boolean; status?: number }]> = [
    ["503 x3", [{ status: 503 }, { status: 503 }, { status: 503 }], { reason: "status", retryable: true, status: 503 }],
    ["500 x3", [{ status: 500, code: "INTERNAL" }, { status: 500, code: "INTERNAL" }, { status: 500, code: "INTERNAL" }], { reason: "status", retryable: true, status: 500 }],
    ["network x3", ["network-before", "network-before", "network-before"], { reason: "network", retryable: true }],
    ["403 FORBIDDEN (BFF bug, no retry)", [{ status: 403, code: "FORBIDDEN" }], { reason: "status", retryable: false, status: 403 }],
    ["415 (BFF bug, no retry)", [{ status: 415, code: "UNSUPPORTED_MEDIA_TYPE" }], { reason: "status", retryable: false, status: 415 }],
    ["409 without REFRESH_SUPERSEDED (contract error)", [{ status: 409, code: "CONFLICT" }], { reason: "protocol", retryable: false, status: 409 }],
    ["REFRESH_SUPERSEDED on a non-409 (contract error)", [{ status: 401, code: "REFRESH_SUPERSEDED" }], { reason: "protocol", retryable: false, status: 401 }],
  ]
  for (const [name, plan, expected] of transientCases) {
    await test(`transient: ${name} -> cookies untouched, error surfaced, briefly negative-cached`, async () => {
      const be = new FakeBackend(() => clock)
      const t0 = be.login()
      be.plan = plan.slice()
      const client = makeClient(be.fetch)
      const m = memoryJar({ [V1_ACCESS_COOKIE]: A_OLD, [V1_REFRESH_COOKIE]: t0 })
      const r = await ensureFreshV1Session(client, m.jar, ctx, opts())
      ok(r.kind === "unavailable", `kind ${r.kind}`)
      if (r.kind === "unavailable") {
        eq([r.failure.reason, r.failure.retryable], [expected.reason, expected.retryable], "reason / retryable")
        if (expected.status) eq(r.failure.status, expected.status, "status")
      }
      eq(m.writes.length, 0, "no cookie written")
      eq(be.refreshCalls, plan.length, "attempts")
      await ensureFreshV1Session(client, m.jar, ctx, opts())
      eq(be.refreshCalls, plan.length, "within the negative TTL: no new call")
      clock += 31_000
      await ensureFreshV1Session(client, m.jar, ctx, opts())
      ok(be.refreshCalls > plan.length, "after the TTL: tries again")
    })
  }

  await test("other transient shapes: proxy 401 / 502 HTML / 2xx without cookie keep cookies", async () => {
    const shapes: Array<() => Response> = [
      () => new Response("Unauthorized", { status: 401, headers: { "content-type": "text/plain" } }),
      () => new Response("<html>bad gateway</html>", { status: 502, headers: { "content-type": "text/html" } }),
      () => new Response(JSON.stringify({ accessToken: "x", expiresIn: 3600, session: { sid: "s", realm: "portal", expiresAt: "2026-12-01T00:00:00Z" } }), { status: 200, headers: { "content-type": "application/json" } }),
    ]
    for (const shape of shapes) {
      const client = makeClient((async () => shape()) as unknown as typeof fetch)
      const m = memoryJar({ [V1_REFRESH_COOKIE]: "Z".repeat(43) })
      const r = await ensureFreshV1Session(client, m.jar, ctx, opts())
      ok(r.kind === "unavailable" && r.failure.retryable, `unavailable (${r.kind})`)
      eq(m.writes.length, 0, "no write")
    }
  })

  await test("hard timeout of one attempt aborts the fetch -> cookies untouched", async () => {
    const hang = ((_url: string, init: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
      })) as unknown as typeof fetch
    const m = memoryJar({ [V1_REFRESH_COOKIE]: "H".repeat(43) })
    const r = await ensureFreshV1Session(makeClient(hang, { attemptAbortMs: 20, retryBudgetMs: 0 }), m.jar, ctx, opts())
    eq(r.kind === "unavailable" && r.failure.reason, "timeout", "timeout")
    eq(m.writes.length, 0, "no write")
  })

  await test("local invalid: a refresh token over 512 chars is never sent and both cookies are cleared", async () => {
    const be = new FakeBackend(() => clock)
    const m = memoryJar({ [V1_REFRESH_COOKIE]: "x".repeat(513) })
    eq(await ensureFreshV1Session(makeClient(be.fetch), m.jar, ctx, opts()), { kind: "anonymous", cleared: "all" }, "result")
    eq(be.refreshCalls, 0, "no call")
  })

  // ---- render safety, write probe ---------------------------------------------------

  await test("write probe: a non-writable jar throws BEFORE any backend call", async () => {
    const be = new FakeBackend(() => clock)
    const m = memoryJar({ [V1_REFRESH_COOKIE]: be.login() }, false)
    let thrown: unknown
    try {
      await ensureFreshV1Session(makeClient(be.fetch), m.jar, ctx, opts())
    } catch (error) {
      thrown = error
    }
    ok(thrown instanceof V1CookiesNotWritableError, "V1CookiesNotWritableError")
    eq(be.refreshCalls, 0, "backend never called, nothing committed")
  })

  await test("render read: no fetch, no write", () => {
    const realFetch = globalThis.fetch
    let calls = 0
    globalThis.fetch = (() => {
      calls++
      throw new Error("render must not fetch")
    }) as typeof fetch
    try {
      const jar = { get: (n: string) => ({ [V1_ACCESS_COOKIE]: A_OLD, [V1_REFRESH_COOKIE]: "T".repeat(43) } as Record<string, string>)[n] }
      eq(readV1Session(jar, NOW), { status: "needs-refresh" }, "expired access")
      eq(readV1Session({ get: (n) => (n === V1_ACCESS_COOKIE ? jwt(NOW + 3600_000, "f") : undefined) }, NOW).status, "ok", "fresh access")
      eq(readV1Session({ get: (n) => (n === V1_ACCESS_COOKIE ? jwt(NOW + 2_000, "s") : "T") }, NOW).status, "needs-refresh", "within 5 s of exp")
      eq(readV1Session({ get: () => undefined }, NOW), { status: "anonymous" }, "nothing")
      eq(calls, 0, "no fetch")
    } finally {
      globalThis.fetch = realFetch
    }
  })

  await test("render modules import nothing that can fetch or write", () => {
    const dir = join(__dirname, "../src/lib/v1-session")
    ;["read.ts", "render.ts"].forEach((file) => {
      const source = readFileSync(join(dir, file), "utf8")
      ;(source.match(/from\s+"[^"]+"/g) || []).forEach((i) => ok(!/refresh|instance|server"|middleware/.test(i), `${file} imports ${i}`))
      ok(!/\bfetch\(|\.set\(/.test(source), `${file} calls fetch or set`)
    })
  })

  // ---- misconfiguration ---------------------------------------------------------------

  await test("misconfiguration: empty backend URL refuses fast, logs once at error, never the values", async () => {
    const lines: Array<[string, string]> = []
    const logger: V1Logger = { warn: (m) => lines.push(["warn", m]), error: (m) => lines.push(["error", m]) }
    let fetched = 0
    const client = createV1SessionClient({ restApiUrl: "", bffSecret: "short-secret-value", production: true, logger, fetch: (() => { fetched++ }) as unknown as typeof fetch })
    const r1 = await client.refresh("T".repeat(43), ctx)
    await client.refresh("T".repeat(43), ctx)
    eq(r1, { kind: "error", reason: "config", retryable: false }, "outcome")
    eq(fetched, 0, "no fetch")
    eq(lines.map((l) => l[0]), ["error", "error"], "URL + secret, once each, error level in production")
    eq(client.configProblems(), ["NEXT_PUBLIC_BACKEND_REST_API", "BFF_SHARED_SECRET"], "problems by name")
    ok(!JSON.stringify(lines).includes("short-secret-value"), "secret value not logged")
  })

  await test("misconfiguration: short secret outside production logs a warning once", async () => {
    const lines: string[] = []
    const be = new FakeBackend(() => clock)
    const client = makeClient(be.fetch, { bffSecret: "x".repeat(31), logger: { warn: () => lines.push("warn"), error: () => lines.push("error") } })
    await client.refresh(be.login(), ctx)
    await client.refresh(be.login(), ctx)
    eq(lines, ["warn"], "one warning")
  })

  // ---- parsing, middleware jar, logout ----------------------------------------------------

  await test("Set-Cookie parsing: both backend names, joined headers, clearing cookies", () => {
    const T = "P".repeat(43)
    eq(findBackendRefreshCookie([`__Secure-furni_refresh=${T}; Max-Age=100; Path=/api/v1/auth; Secure; HttpOnly`]), { token: T, maxAgeSeconds: 100 }, "__Secure- name")
    eq(findBackendRefreshCookie(["furni_refresh=; Max-Age=0; Path=/api/v1/auth"]), null, "clearing cookie is not a token")
    const parts = splitJoinedSetCookie(`a=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT, furni_refresh=${T}; Expires=Wed, 02 Dec 2026 10:00:00 GMT; HttpOnly`)
    eq(parts.length, 2, "split keeps Expires commas")
    eq(findBackendRefreshCookie(parts, NOW), { token: T, maxAgeSeconds: 15 * 86400 }, "Expires -> seconds")
  })

  await test("middleware jar + forwarded header + prefetch detection", () => {
    const T = "M".repeat(43)
    const jar = createRecordingCookieJar(() => T)
    jar.assertWritable()
    jar.set(V1_REFRESH_COOKIE, "N".repeat(43), { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 10 })
    jar.set(V1_ACCESS_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 })
    eq(jar.get(V1_REFRESH_COOKIE), "N".repeat(43), "overlay read")
    eq(forwardedCookieHeader(`lang=en; ${V1_REFRESH_COOKIE}=${T}; ${V1_ACCESS_COOKIE}=a`, jar.writes()), `lang=en; ${V1_REFRESH_COOKIE}=${"N".repeat(43)}`, "forwarded")
    const h = (o: Record<string, string>) => ({ get: (n: string) => o[n] ?? null })
    eq([isPrefetchRequest(h({ "next-router-prefetch": "1" })), isPrefetchRequest(h({ "sec-purpose": "prefetch;prerender" })), isPrefetchRequest(h({}))], [true, true, false], "prefetch")
  })

  await test("logout: bearer + body, memo evicted, always clears locally; 503 -> not acknowledged", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    const client = makeClient(be.fetch)
    const a = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    await ensureFreshV1Session(client, a.jar, ctx, opts())
    const access = a.store[V1_ACCESS_COOKIE].value
    eq(client.stats().memo, 1, "memo populated")
    eq(await logoutV1Session(client, a.jar, ctx, { secure: true }), { acknowledged: true }, "204")
    eq(be.headersSeen[be.headersSeen.length - 1].Authorization, `Bearer ${access}`, "bearer sent")
    eq(client.stats().memo, 0, "memo entry evicted (T0 -> T1 points at the logged-out token)")
    eq(a.jar.get(V1_REFRESH_COOKIE), undefined, "cleared")
    const down = makeClient((async () => problem(503, "SERVICE_UNAVAILABLE")) as unknown as typeof fetch)
    const b = memoryJar({ [V1_REFRESH_COOKIE]: "L".repeat(43) })
    eq((await logoutV1Session(down, b.jar, ctx, { secure: true })).acknowledged, false, "not acknowledged")
    eq(b.jar.get(V1_REFRESH_COOKIE), undefined, "cleared anyway")
  })

  await test("logout evicts the whole memo chain: a T0 straggler after logout is not handed a dead pair", async () => {
    const be = new FakeBackend(() => clock)
    const t0 = be.login()
    const client = makeClient(be.fetch)
    const a = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    await ensureFreshV1Session(client, a.jar, ctx, opts())
    clock += 5_000
    await ensureFreshV1Session(client, a.jar, ctx, opts({ force: true }))
    eq(client.stats().memo, 2, "T0 -> T1 -> T2 memoised")
    await logoutV1Session(client, a.jar, ctx, { secure: true })
    eq(client.stats().memo, 0, "whole chain evicted")
    const straggler = memoryJar({ [V1_REFRESH_COOKIE]: t0 })
    const r = await ensureFreshV1Session(client, straggler.jar, ctx, opts())
    ok(r.kind !== "ok", `not served from memory (${r.kind})`)
    ok(!straggler.writes.some((w) => w.name === V1_REFRESH_COOKIE && w.value), "no dead pair written back")
  })

  // ---- Next.js bindings (next/headers mocked; next/server real) -------------------------

  const env = process.env as Record<string, string | undefined>
  env.NEXT_PUBLIC_BACKEND_REST_API = "http://backend.test/api"
  env.BFF_SHARED_SECRET = SECRET
  const bindingBackend = new FakeBackend(() => Date.now())
  const realFetch = globalThis.fetch
  globalThis.fetch = bindingBackend.fetch

  const store: Record<string, string> = {}
  let renderMode = false
  const headerValues: Record<string, string> = { "x-real-ip": CLIENT_IP, "x-forwarded-for": "198.51.100.200", "user-agent": UA }
  const fakeHeaders = {
    cookies: async () => ({
      get: (n: string) => (store[n] !== undefined && store[n] !== "" ? { name: n, value: store[n] } : undefined),
      set: (n: string, v: string) => {
        if (renderMode) throw new Error("Cookies can only be modified in a Server Action or Route Handler")
        store[n] = v
      },
    }),
    headers: async () => ({ get: (n: string) => headerValues[n] ?? null }),
  }
  const Module = require("module") as { _resolveFilename(r: string, p: unknown, m: boolean, o: unknown): string }
  const headersPath = Module._resolveFilename("next/headers", module, false, { conditions: new Set(["react-server", "node", "require"]) })
  require.cache[headersPath] = { id: headersPath, filename: headersPath, loaded: true, exports: fakeHeaders } as unknown as NodeModule

  const server = await import("../src/lib/v1-session/server")
  const render = await import("../src/lib/v1-session/render")
  const mw = await import("../src/lib/v1-session/middleware-binding")
  const { NextRequest, NextResponse } = await import("next/server")

  await test("server binding: action refresh writes cookies + probe; strict IP + user-agent forwarded", async () => {
    const t0 = bindingBackend.login()
    store[V1_REFRESH_COOKIE] = t0
    const r = await server.ensureV1SessionInAction()
    eq(r.kind, "ok", "refreshed")
    ok(store[V1_REFRESH_COOKIE] !== t0, "rotated cookie stored")
    ok(V1_WRITE_PROBE_COOKIE in store, "write probe ran")
    const h = bindingBackend.headersSeen[bindingBackend.headersSeen.length - 1]
    eq([h["x-client-ip"], h["user-agent"]], [CLIENT_IP, UA], "x-real-ip used, XFF ignored")
  })

  await test("server binding: called from a render, it throws before the backend is called", async () => {
    const before = bindingBackend.refreshCalls
    store[V1_ACCESS_COOKIE] = ""
    store[V1_REFRESH_COOKIE] = bindingBackend.login()
    renderMode = true
    let thrown: unknown
    try {
      await server.ensureV1SessionInAction()
    } catch (error) {
      thrown = error
    } finally {
      renderMode = false
    }
    ok(thrown instanceof V1CookiesNotWritableError, `threw ${(thrown as Error)?.name}`)
    eq(bindingBackend.refreshCalls, before, "no rotation request")
    renderMode = true
    eq((await render.getV1SessionForRender()).status, "needs-refresh", "render read works in render mode")
    renderMode = false
  })

  await test("middleware binding: next() forwards rotated cookies downstream AND sets them on the response", async () => {
    const t0 = bindingBackend.login()
    const request = new NextRequest("http://portal.test/en/account", {
      headers: { cookie: `lang=en; ${V1_REFRESH_COOKIE}=${t0}`, "x-real-ip": CLIENT_IP, "user-agent": UA },
    })
    let seen = ""
    const response = await mw.withV1Session(request, ({ result, next }) => {
      seen = result.kind
      return next()
    })
    eq(seen, "ok", "result")
    const t1 = response.cookies.get(V1_REFRESH_COOKIE)?.value
    ok(t1 && t1 !== t0, "Set-Cookie with the rotated token")
    ok(response.cookies.get(V1_ACCESS_COOKIE)?.value, "access cookie set")
    const forwarded = response.headers.get("x-middleware-request-cookie") || ""
    ok(forwarded.includes(`${V1_REFRESH_COOKIE}=${t1}`) && forwarded.includes("lang=en"), "downstream cookie header rewritten")
  })

  await test("middleware binding: a redirect also carries the rotated cookies", async () => {
    const request = new NextRequest("http://portal.test/en/account", { headers: { cookie: `${V1_REFRESH_COOKIE}=${bindingBackend.login()}` } })
    const response = await mw.withV1Session(request, () => NextResponse.redirect("http://portal.test/en/login"))
    eq(response.status, 307, "redirect")
    ok(response.cookies.get(V1_REFRESH_COOKIE)?.value, "cookies applied to the redirect")
  })

  await test("middleware binding: a prefetch never refreshes", async () => {
    const before = bindingBackend.refreshCalls
    const request = new NextRequest("http://portal.test/en/account", {
      headers: { cookie: `${V1_REFRESH_COOKIE}=${bindingBackend.login()}`, "next-router-prefetch": "1" },
    })
    let kind = ""
    const response = await mw.withV1Session(request, ({ result, next }) => {
      kind = result.kind
      return next()
    })
    eq(kind, "deferred", "deferred")
    eq(bindingBackend.refreshCalls, before, "no backend call")
    eq(response.cookies.getAll().length, 0, "no cookies written")
  })

  globalThis.fetch = realFetch

  await test("nothing sensitive reached any console method", () => {
    ok(logged.length > 0, "the failure paths did log something")
    const all = logged.join("\n")
    sensitive.forEach((needle) => ok(all.indexOf(needle) === -1, `log contains a sensitive value (${needle.slice(0, 6)}...)`))
    ;["sigold", "backend.test"].forEach((needle) => ok(all.indexOf(needle) === -1, `log contains ${needle}`))
  })

  results.forEach((line) => process.stdout.write(line + "\n"))
  process.stdout.write(`\n${results.length - failed}/${results.length} passed\n`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((error) => {
  process.stdout.write(`verify-v1-session crashed: ${(error as Error)?.name}: ${(error as Error)?.message}\n`)
  process.exit(1)
})
