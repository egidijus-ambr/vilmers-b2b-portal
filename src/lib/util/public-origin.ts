/**
 * Public origin (scheme + host) of the incoming request, as the browser sees it.
 *
 * Why not `request.nextUrl.origin`: the portal runs `next start -H 127.0.0.1`
 * behind nginx. With `-H` set, Next builds `request.url` / `nextUrl` from the
 * bound hostname (and normalises 127.0.0.1 to "localhost") instead of the Host
 * header, so every absolute redirect pointed at http://localhost:8090.
 *
 * Edge-runtime safe (used from middleware): no Node APIs.
 */

type HeaderReader = { get(name: string): string | null }

// hostname[:port] only (IPv6 literals in brackets allowed). Anything else is
// ignored so a crafted header can never inject into a Location header.
const HOST_RE = /^(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:.]+\])(?::\d{1,5})?$/

function firstValue(value: string | null): string {
  return (value ?? "").split(",")[0].trim()
}

function isLoopbackHost(host: string): boolean {
  const name = host.replace(/:\d{1,5}$/, "").toLowerCase()
  return (
    name === "localhost" ||
    name === "127.0.0.1" ||
    name === "[::1]" ||
    name.endsWith(".localhost")
  )
}

/**
 * @param headers   request headers
 * @param fallbackOrigin  used only when no usable host header exists
 *                        (typically `request.nextUrl.origin`)
 */
export function getPublicOrigin(
  headers: HeaderReader,
  fallbackOrigin?: string
): string {
  const candidates = [
    firstValue(headers.get("x-forwarded-host")),
    firstValue(headers.get("host")),
  ]
  const host = candidates.find((h) => h && HOST_RE.test(h))

  if (!host) {
    return fallbackOrigin ?? "http://localhost"
  }

  // Next itself injects `x-forwarded-proto: http` on requests that arrive
  // without one (nginx -> loopback is plain HTTP), so that header cannot be
  // trusted to mean "the browser used http". TLS terminates at nginx and every
  // public host is https; only loopback hosts (local dev) stay http.
  const proto = isLoopbackHost(host) ? "http" : "https"

  return `${proto}://${host}`
}
