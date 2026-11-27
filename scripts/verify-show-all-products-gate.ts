// Verification script for the "Show all products" privilege gate.
// No test runner in this repo; run with: pnpm verify:show-all-products-gate
// Exits 0 when all cases pass, 1 otherwise.
import { canUseShowAllProducts } from "../src/lib/util/show-all-products-gate"
import { getImpersonationClaims } from "../src/lib/util/jwt-utils"

let failures = 0
function assert(name: string, cond: boolean) {
  if (cond) console.log(`  PASS: ${name}`)
  else {
    failures++
    console.log(`  FAIL: ${name}`)
  }
}

// Unsigned test tokens: only the payload matters to the decode helpers.
function token(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64")
  return `${b64({ alg: "HS256" })}.${b64(payload)}.sig`
}
const claimsOf = (p: Record<string, unknown>) => getImpersonationClaims(token(p))

const LOGIN_ADMIN_TOKEN = { customerId: 10, customer_accountId: "acc-10", role: "admin" }
const IMPERSONATION = { customerId: 10, customer_accountId: null, managerId: 3 }

console.log("Backend role decides, token role is ignored")
assert("token says admin, backend says customer -> false",
  canUseShowAllProducts({ id: "10", role: "customer" }, claimsOf(LOGIN_ADMIN_TOKEN)) === false)
assert("token says customer, backend says admin -> true",
  canUseShowAllProducts({ id: "10", role: "admin" }, claimsOf({ ...LOGIN_ADMIN_TOKEN, role: "customer" })) === true)
assert("backend admin, no token claims -> true", canUseShowAllProducts({ id: "10", role: "admin" }, null) === true)
for (const role of ["Admin", "manager", "agent", "b2b_customer", "", null, undefined]) {
  assert(`backend role ${JSON.stringify(role)} -> false`,
    canUseShowAllProducts({ id: "10", role: role as any }, null) === false)
}

console.log("Fail closed without a backend customer")
assert("null backend customer, admin token -> false", canUseShowAllProducts(null, claimsOf(LOGIN_ADMIN_TOKEN)) === false)
assert("undefined backend customer -> false", canUseShowAllProducts(undefined, null) === false)
assert("null backend customer, impersonation token -> false", canUseShowAllProducts(null, claimsOf(IMPERSONATION)) === false)

console.log("Impersonation")
assert("impersonation token + backend accepted it (same customer) -> true",
  canUseShowAllProducts({ id: "10", role: "customer" }, claimsOf(IMPERSONATION)) === true)
assert("impersonation token but backend resolved a different customer -> false",
  canUseShowAllProducts({ id: "11", role: "customer" }, claimsOf(IMPERSONATION)) === false)
assert("managerId on a token WITH a login account is not impersonation -> false",
  canUseShowAllProducts({ id: "10", role: "customer" }, claimsOf({ ...IMPERSONATION, customer_accountId: "acc-10" })) === false)
assert("garbage token -> no claims", getImpersonationClaims("not-a-jwt") === null)

if (failures > 0) {
  console.log(`\n${failures} failure(s)`)
  process.exit(1)
}
console.log("\nAll cases passed")
