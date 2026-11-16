/**
 * Redaction for the SDK debug log. GraphQL variables carry credentials and
 * personal data (magic-link tokens, passwords, the customer email on Login /
 * GetMagicLinkForB2BCustomer, the forwarded ipAddress); none of it may reach
 * server stdout. Pure and dependency-free so it can be tested in isolation.
 */

const REDACTED = "[redacted]"

// Keys redacted on an exact (case-insensitive) match.
const EXACT_KEYS = new Set([
  "email",
  "username",
  "phone",
  "ip",
  "ipaddress",
  "code",
  "otp",
  "secret",
  "authorization",
  "refreshtoken",
  "accesstoken",
  "session",
  "magiclink",
  "token",
  "password",
])

// Keys redacted when they contain one of these fragments (case-insensitive),
// e.g. newPassword, magicLinkToken, customerEmail, phoneNumber, sessionId.
const KEY_FRAGMENTS = [
  "password",
  "token",
  "secret",
  "email",
  "phone",
  "ipaddress",
  "session",
  "magiclink",
  "authorization",
]

const MAX_DEPTH = 10

export function isRedactedKey(key: string): boolean {
  const lower = key.toLowerCase()
  if (EXACT_KEYS.has(lower)) return true
  return KEY_FRAGMENTS.some((fragment) => lower.includes(fragment))
}

function redactValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value !== "object") return value
  if (depth >= MAX_DEPTH) return REDACTED
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1))
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
      key,
      isRedactedKey(key) ? REDACTED : redactValue(inner, depth + 1),
    ])
  )
}

/** Deep copy of `variables` with sensitive keys replaced by "[redacted]". */
export function redactVariables<T extends Record<string, any> | undefined>(
  variables: T
): T {
  if (!variables) {
    return variables
  }
  return redactValue(variables, 0) as T
}
