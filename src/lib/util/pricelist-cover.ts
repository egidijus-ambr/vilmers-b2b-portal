import "server-only"

import { promises as fs } from "fs"
import path from "path"
import { fetchImagePool } from "./image-fetch"
import { resizeForEmbed, type PricelistImage } from "./image-resize"
import { isEmbeddableSourceImage } from "./image-magic"
import type { PricelistCover } from "./pricelist-workbook"
import { FALLBACK_LOGO_URL } from "@lib/data/pricelist-settings"

const LOG = "[pricelist-export]"
// 2x the on-sheet display box (see COVER_IMAGE_BOX in pricelist-workbook.ts),
// retina-sharp. NO trim: the cover artwork contains the title text.
const COVER_RESIZE_BOX = { width: 1600, height: 1600 }
const LOGO_RASTER_WIDTH_PX = 480
const MAX_LOGO_BYTES = 2 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15_000

export interface CoverSettingsInput {
  coverEnabled: boolean
  coverImageUrl: string | null
  /** Resolved per customer (see resolveCoverLines); part of the cache key. */
  coverLines: string[]
  logoUrl: string
}

/**
 * The cover-related part of the cache key. When the cover is off nothing
 * else matters, so the rest is normalised away (no key churn when an admin
 * edits terms while the cover is disabled).
 */
export function coverCacheParts(s: CoverSettingsInput): unknown[] {
  return s.coverEnabled
    ? [true, s.coverImageUrl ?? "", s.coverLines, s.logoUrl]
    : [false]
}

async function readLocalPublicFile(urlPath: string): Promise<Buffer | null> {
  try {
    const publicDir = path.resolve(process.cwd(), "public")
    const resolved = path.resolve(publicDir, "." + path.posix.normalize("/" + urlPath))
    if (!resolved.startsWith(publicDir + path.sep)) return null
    return await fs.readFile(resolved)
  } catch (error) {
    console.warn(`${LOG} Cover: cannot read local file ${urlPath}:`, error)
    return null
  }
}

/** Rasterises a logo (SVG/PNG/JPEG/WEBP) to a PNG, keeping transparency. */
async function rasterizeLogo(buffer: Buffer): Promise<PricelistImage | null> {
  try {
    const sharp = (await import("sharp")).default
    // High density so SVG vectors rasterise crisply; harmless for bitmaps.
    const { data, info } = await sharp(buffer, { density: 300 })
      .resize({ width: LOGO_RASTER_WIDTH_PX, withoutEnlargement: false })
      .png()
      .toBuffer({ resolveWithObject: true })
    return { buffer: data, width: info.width, height: info.height, extension: "png" }
  } catch (error) {
    console.warn(`${LOG} Cover: logo rasterisation failed:`, error)
    return null
  }
}

async function loadLogoBytes(url: string): Promise<Buffer | null> {
  if (url.startsWith("/") && !url.startsWith("//")) return readLocalPublicFile(url)
  const results = await fetchImagePool([url], {
    concurrency: 1,
    fetchTimeoutMs: FETCH_TIMEOUT_MS,
    deadlineMs: FETCH_TIMEOUT_MS * 2,
    validate: (b) => b.length > 0 && b.length <= MAX_LOGO_BYTES,
    logLabel: "Cover logo",
  })
  return results.get(url) ?? null
}

async function fetchCoverImage(url: string | null): Promise<PricelistImage | null> {
  if (!url) return null
  const results = await fetchImagePool([url], {
    concurrency: 1,
    fetchTimeoutMs: FETCH_TIMEOUT_MS,
    deadlineMs: FETCH_TIMEOUT_MS * 2,
    validate: isEmbeddableSourceImage,
    logLabel: "Cover image",
  })
  const buffer = results.get(url)
  return buffer ? resizeForEmbed(buffer, COVER_RESIZE_BOX) : null
}

async function fetchLogo(url: string): Promise<{ logo: PricelistImage | null; usedFallback: boolean }> {
  const primary = await loadLogoBytes(url)
  const rasterised = primary ? await rasterizeLogo(primary) : null
  if (rasterised) return { logo: rasterised, usedFallback: false }
  if (url === FALLBACK_LOGO_URL) return { logo: null, usedFallback: false }
  const fallbackBytes = await readLocalPublicFile(FALLBACK_LOGO_URL)
  const fallback = fallbackBytes ? await rasterizeLogo(fallbackBytes) : null
  return { logo: fallback, usedFallback: true }
}

/**
 * Fetches the cover artwork + logo. NEVER throws. `degraded` is true when a
 * configured image could not be obtained (the cover still renders without
 * it); the caller then serves the file but does not cache it, so a transient
 * failure is not frozen in for the cache lifetime.
 */
export async function fetchPricelistCover(
  s: CoverSettingsInput
): Promise<{ cover: PricelistCover; degraded: boolean }> {
  const [image, logoResult] = await Promise.all([
    fetchCoverImage(s.coverImageUrl).catch((error) => {
      console.warn(`${LOG} Cover image failed:`, error)
      return null
    }),
    fetchLogo(s.logoUrl).catch((error) => {
      console.warn(`${LOG} Cover logo failed:`, error)
      return { logo: null, usedFallback: false }
    }),
  ])
  const degraded =
    (!!s.coverImageUrl && !image) || logoResult.usedFallback || !logoResult.logo
  if (degraded) {
    console.warn(
      `${LOG} Cover degraded: image=${image ? "ok" : s.coverImageUrl ? "MISSING" : "none"} ` +
        `logo=${logoResult.logo ? (logoResult.usedFallback ? "fallback" : "ok") : "MISSING"}`
    )
  }
  return {
    cover: { image, lines: s.coverLines, logo: logoResult.logo },
    degraded,
  }
}
