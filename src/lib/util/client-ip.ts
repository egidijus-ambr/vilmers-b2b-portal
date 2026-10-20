/**
 * End-user IP of the incoming request, from its forwarding headers.
 *
 * Shared by the magic-link request action (`ipAddress` argument) and the SDK's
 * server-side Apollo link (`x-client-ip` BFF header). Kept pure - no
 * `next/headers` import - because the SDK client module is also bundled for
 * the browser; callers pass in the result of `await headers()`.
 *
 * TRUST ASSUMPTION: the edge proxy (nginx) in front of the portal sets these
 * headers itself - `proxy_set_header X-Real-IP $remote_addr` and
 * `X-Forwarded-For $proxy_add_x_forwarded_for` - and never passes a
 * client-supplied X-Real-IP through. A client can prepend arbitrary values to
 * X-Forwarded-For when a proxy appends rather than overwrites, so its leftmost
 * entry is never used.
 *
 * Order: `x-real-ip`, then the rightmost non-private `x-forwarded-for` entry
 * (the address the last proxy saw, skipping internal hops), then
 * `x-client-ip`, `cf-connecting-ip`, `remote-addr`. No syntax check beyond
 * that - the backend validates `x-client-ip` with `net.isIP` and falls back
 * to `req.ip`.
 *
 * Returns null when none of the headers yields a value.
 */
export function getClientIpFromHeaders(headersList: {
  get(name: string): string | null
}): string | null {
  return (
    headersList.get("x-real-ip")?.trim() ||
    rightmostPublicForwardedFor(headersList.get("x-forwarded-for")) ||
    headersList.get("x-client-ip")?.trim() ||
    headersList.get("cf-connecting-ip")?.trim() ||
    headersList.get("remote-addr")?.trim() ||
    null
  )
}

function rightmostPublicForwardedFor(value: string | null): string | null {
  if (!value) return null
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
  for (let i = entries.length - 1; i >= 0; i--) {
    if (!isPrivateIp(entries[i])) return entries[i]
  }
  return null
}

// Loopback, private, link-local, CGNAT and unique-local ranges: internal
// proxy hops, never the end user.
function isPrivateIp(ip: string): boolean {
  const lower = ip.toLowerCase()
  const v4 = lower.startsWith("::ffff:") ? lower.slice(7) : lower
  const octets = v4.split(".")
  if (octets.length === 4) {
    const [a, b] = octets.map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    )
  }
  return (
    lower === "::" ||
    lower === "::1" ||
    /^f[cd][0-9a-f]{0,2}:/.test(lower) ||
    /^fe[89ab][0-9a-f]?:/.test(lower)
  )
}
