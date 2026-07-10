import { NextRequest } from "next/server"

// Same-origin proxy for product images so html2canvas-pro can read their bytes
// when generating the offer PDF. The upstream S3/GCS hosts don't send
// Access-Control-Allow-Origin, so a cross-origin <img> taints the canvas and the
// photo is dropped. Fetching server-side and re-serving from our own origin
// avoids the CORS restriction entirely.

// SSRF guard: only these known product-image hosts may be proxied. Anything
// else is rejected — this endpoint must never fetch arbitrary URLs.
const ALLOWED_HOSTS = new Set<string>([
  "sftp-furnisystems.s3.amazonaws.com",
  "storage.googleapis.com",
])

// Also allow any AWS S3 host (bucket-style or regional) since product images
// live across several S3 buckets/regions.
function isAllowedHost(hostname: string): boolean {
  if (ALLOWED_HOSTS.has(hostname)) return true
  return hostname.endsWith(".s3.amazonaws.com") || /\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(hostname)
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")
  if (!rawUrl) {
    return new Response("Missing url parameter", { status: 400 })
  }

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return new Response("Invalid url", { status: 400 })
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return new Response("Unsupported protocol", { status: 400 })
  }

  if (!isAllowedHost(target.hostname)) {
    return new Response("Host not allowed", { status: 400 })
  }

  try {
    const upstream = await fetch(target.toString(), {
      // Don't forward cookies/credentials to the image host.
      cache: "no-store",
      // Fail closed on redirects: an allowlisted URL that 3xx-redirects to an
      // internal host would otherwise be followed, defeating the SSRF guard.
      redirect: "error",
    })

    if (!upstream.ok || !upstream.body) {
      return new Response("Failed to fetch image", { status: 502 })
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream"

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    console.error("[offer-image proxy] fetch failed:", error)
    return new Response("Upstream fetch error", { status: 502 })
  }
}
