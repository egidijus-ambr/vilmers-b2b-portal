// Server-side image downscale for the pricelist export's embedded images
// (category photos: pricelist-photos.ts; component photos:
// pricelist-component-photos.ts). Every pool fetches a source that's much
// bigger than what it's ever DISPLAYED at — embedding it at native size
// wastes many times the bytes a customer's download actually needs, which is
// what pushed a real PL50 export to 26.7MB and saturated the component
// pool's byte budget (see that module's own doc comment). Resizing here,
// once per distinct URL, before either pool's byte budget is checked, is
// what makes that budget guard memory again instead of being the thing that
// decides which photos survive.
//
// Input format is NOT restricted to JPEG (despite this file's `resizeJpegFor
// Cell` name, kept for now to avoid a repo-wide rename) — sharp decodes
// JPEG/PNG/WEBP identically regardless of what you feed it, so the category
// photo pool's WEBP `src_lg`/mixed-format `src` sources need zero extra code
// here; only the OUTPUT is fixed at JPEG (`.jpeg({...})` below always runs),
// which is why every SUCCESSFUL resize can be embedded with `extension:
// "jpeg"` regardless of the source format.

import { detectEmbeddableExtension } from "./image-magic"

/** A pixel box to fit an image inside — see ResizeOptions/resizeJpegForCell. */
export interface ResizeBox {
  width: number
  height: number
}

// Both pools that call this file's resize functions with `trimThreshold`
// share this exact value — exported so pricelist-photos.ts and
// pricelist-component-photos.ts both read it from here instead of each
// declaring their own copy. See `ResizeOptions.trimThreshold`'s own doc
// comment for what the number means; the value itself was tuned against 6
// real component photos (see this constant's git history/report for that
// measurement) and is reused as-is for category header photos — both are
// the same kind of source (a product shot on a white/light background),
// so there's no reason to expect a different threshold to be needed.
export const TRIM_THRESHOLD = 25

export interface ResizeOptions {
  /**
   * Trims a uniform-colour border from the source BEFORE resizing (sharp
   * 0.34's `trim({background?, threshold?, lineArt?})` — default
   * `background` is the top-left pixel, which is what a product shot on a
   * white/light backdrop needs; no `background` override is passed here).
   * `threshold` controls how strict the colour match must be (0 = exact
   * match only; higher tolerates JPEG compression noise around a nominally
   * flat background) — see `TRIM_THRESHOLD` above for the tuned value both
   * pools share.
   *
   * BOTH the component-photo pool AND the category header-photo pool pass
   * this now: both sources are a product shot on a large white/light
   * background with the item itself often occupying only a fraction of the
   * frame (verified against a real user report for components, and against
   * real PL50 samples — e.g. ALPINE, "Natural Life" — for category photos,
   * where the untrimmed product left roughly half of CATEGORY_HEADER_PHOTO_BOX
   * empty) — without trimming, resizing THAT (not a tight crop of the item)
   * into a small cell just makes the item smaller still.
   *
   * sharp THROWS (does not return an empty/null result) when the whole
   * image is one uniform colour, or would trim to nothing — see
   * resizeJpegForCell's own doc comment for how that's handled; a caller
   * never needs to special-case it here.
   */
  trimThreshold?: number
}

/** Mirrors sharp's own `{width, height}` on a successful resize. */
export interface ResizedJpeg {
  buffer: Buffer
  width: number
  height: number
}

/**
 * The shape every pricelist image pool (pricelist-photos.ts,
 * pricelist-component-photos.ts) returns per URL, in place of a bare
 * `Buffer`. `width`/`height` are `null` together, never independently, and
 * mean "unknown" — this happens ONLY when `resizeJpegForCell` itself
 * returned `null` (sharp unavailable or the resize failed), in which case
 * `buffer` is the ORIGINAL, un-resized fetch and `extension` reflects
 * WHATEVER FORMAT THAT ORIGINAL ACTUALLY IS (sniffed, not assumed) —
 * callers (pricelist-workbook.ts) must fall back to a fixed default box in
 * that case, exactly like the pre-resize fixed-square behaviour, rather
 * than reading `width`/`height` as if they were 0.
 *
 * `extension` exists specifically because the category-photo pool's
 * preferred source (`src_lg`) is WEBP, which OOXML/ExcelJS can never embed
 * — see `resizeForEmbed`'s own doc comment for why a resize failure on that
 * source must resolve to "cannot embed", not "embed the WEBP labelled
 * jpeg".
 */
export interface PricelistImage {
  buffer: Buffer
  width: number | null
  height: number | null
  extension: "jpeg" | "png"
}

/**
 * Resizes `buffer` to fit inside `box` and wraps the result as a
 * `PricelistImage` (always `extension: "jpeg"` on a successful resize — see
 * this file's own top-of-file comment on why). On any resize failure (sharp
 * unavailable, corrupt input, unsupported input), falls back to the
 * ORIGINAL buffer with unknown dimensions — but ONLY if that original is
 * ITSELF a format ExcelJS can embed (`detectEmbeddableExtension`, from
 * image-magic.ts): a resize failure on a WEBP `src_lg` (sharp down, or a
 * genuinely corrupt WEBP) leaves nothing embeddable at all, so this returns
 * `null` in that case — a caller must treat that exactly like "no image for
 * this URL" (see fetchPricelistPhotos's own doc comment), NOT retry with a
 * hardcoded `extension: "jpeg"` on bytes that were never JPEG.
 *
 * Centralises this fallback so every pool applies the exact same rule
 * rather than each re-implementing its own ternary.
 */
export async function resizeForEmbed(
  buffer: Buffer,
  box: ResizeBox,
  options?: ResizeOptions
): Promise<PricelistImage | null> {
  const resized = await resizeJpegForCell(buffer, box, options)
  if (resized) {
    return {
      buffer: resized.buffer,
      width: resized.width,
      height: resized.height,
      extension: "jpeg",
    }
  }
  const fallbackExtension = detectEmbeddableExtension(buffer)
  if (!fallbackExtension) return null
  return { buffer, width: null, height: null, extension: fallbackExtension }
}

// `sharp` is imported LAZILY, on first use, rather than as a top-level
// `import` — this module is reachable from a Next.js server route, and
// `sharp` ships a platform-specific native binary (@img/sharp-<platform>-
// <arch>) that isn't guaranteed to be present on every deploy target. A
// top-level import failing would break loading this whole module (and
// therefore the export route) for every request, not just the resize step;
// deferring it into a try/catch degrades to "skip resizing, embed the
// original buffer" instead — the exact same never-fail-the-export
// discipline this file's callers already apply to fetch failures (see
// image-fetch.ts's own doc comment).
//
// Memoised at MODULE scope (not re-attempted per call) — `sharp`'s own
// import cost and any native-binary resolution failure are one-time, process
// lifetime facts, not something that can change between one image URL and
// the next within a single export. Without this, a missing binary would
// retry (and re-fail, and re-log) the same dynamic import for every one of
// the ~300+ distinct URLs a real batch can see, rather than once.
type SharpModule = typeof import("sharp")
let sharpPromise: Promise<SharpModule | null> | undefined

function loadSharp(): Promise<SharpModule | null> {
  if (sharpPromise === undefined) {
    sharpPromise = import("sharp")
      .then((mod) => mod.default)
      .catch((error) => {
        console.warn(
          "[pricelist-export] sharp is not available in this environment " +
            "(native binary missing?) — component/category photos will be " +
            "embedded at native size instead of resized. This is logged once.",
          error instanceof Error ? error.message : error
        )
        return null
      })
  }
  return sharpPromise
}

/**
 * Whether sharp is usable in this process — resolves the SAME memoised
 * promise `loadSharp` does, so calling this never re-attempts or re-logs a
 * failed import. Exposed so pricelist-photos.ts can decide, ONCE per pool
 * invocation, whether it's safe to even attempt the WEBP `src_lg`/mixed-
 * format `src` sources at all: without sharp there is no way to decode or
 * convert either into something ExcelJS can embed, so that pool falls back
 * to fetching ONLY `src_facebook` (guaranteed JPEG) in that case — see
 * `resolveCategoryPhotoUrl` (pricelist-workbook.ts) for where this decision
 * is actually applied.
 */
export async function isSharpAvailable(): Promise<boolean> {
  return (await loadSharp()) !== null
}

/**
 * Resizes an image buffer (JPEG, PNG, or WEBP — sharp auto-detects the
 * input format from its content, not its URL/extension, so no format
 * parameter is needed here) to fit inside `box` (aspect ratio preserved,
 * never upscaled — `fit: "inside"` + `withoutEnlargement: true`),
 * re-encoding at quality 80 with mozjpeg. Returns `null` on ANY failure
 * (sharp unavailable, corrupt/unsupported input, encode error) — callers
 * must fall back to the original, un-resized buffer in that case (see
 * `resizeForEmbed`), never treat a resize failure as a reason to drop the
 * image entirely.
 *
 * Chains `.rotate()`, `.flatten(white)`, an optional `.trim()`, `.resize()`,
 * then `.jpeg()` — NOTE: sharp queues these as an operation pipeline and
 * applies them in ITS OWN required internal order (trim is alpha-aware on
 * its own regardless of where `.flatten()` is chained in the JS builder),
 * not literally in JS call order — so this isn't "ordering as a fix" for
 * anything; each call exists for its own independent reason:
 *
 * - `.rotate()` with no arguments applies the source's EXIF orientation (if
 *   any) — src_facebook crops are camera/CMS-sourced JPEGs, so this guards
 *   against a sideways-embedded photo even though no local sample has been
 *   observed carrying EXIF orientation.
 * - `.flatten({background: white})` is needed because JPEG has no alpha
 *   channel, so ANY transparency in the source must be composited onto a
 *   solid colour before the final `.jpeg()` encode, and sharp's own DEFAULT
 *   flatten background is BLACK, not white. This is not theoretical:
 *   `src_lg` (the category-photo pool's preferred WEBP source — see
 *   pricelist-photos.ts) is a cutout product shot with a real alpha channel
 *   (verified against live data — 2000x1419, `hasAlpha: true`); skipping
 *   this rendered every enlarged header photo on a black rectangle before
 *   it was added. `src_facebook`/most `src` sources have no alpha, so this
 *   is a harmless no-op for them.
 * - `options.trimThreshold`, when given, trims a uniform-colour border.
 *   sharp throws when trim finds the whole image is one uniform colour or
 *   would trim to nothing — that's a NORMAL input (e.g. a product photo
 *   that already fills its frame edge-to-edge), not a failure, so this
 *   catches ONLY that first trim attempt and retries once, untrimmed, on
 *   the SAME source — falling all the way back to `null` (and therefore
 *   the original un-resized buffer) is reserved for the untrimmed retry
 *   also failing, or for callers that never asked for trimming at all.
 *
 * ONE shared pipeline for every caller (category photos: pricelist-photos.ts;
 * component photos: pricelist-component-photos.ts) — `trim` is a boolean
 * flag threaded through `options.trimThreshold`, not two copies of this
 * function.
 */
export async function resizeJpegForCell(
  buffer: Buffer,
  box: ResizeBox,
  options?: ResizeOptions
): Promise<ResizedJpeg | null> {
  const sharpFactory = await loadSharp()
  if (!sharpFactory) return null

  const runResize = (trim: boolean) => {
    let pipeline = sharpFactory(buffer)
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
    if (trim && options?.trimThreshold != null) {
      pipeline = pipeline.trim({ threshold: options.trimThreshold })
    }
    return pipeline
      .resize({ width: box.width, height: box.height, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })
  }

  try {
    let result
    if (options?.trimThreshold != null) {
      try {
        result = await runResize(true)
      } catch {
        // See this function's doc comment: trim failing (uniform colour /
        // trims to nothing) is expected for some real inputs, not an error —
        // retry untrimmed on the same source rather than giving up.
        result = await runResize(false)
      }
    } else {
      result = await runResize(false)
    }
    return { buffer: result.data, width: result.info.width, height: result.info.height }
  } catch (error) {
    console.warn(
      "[pricelist-export] Failed to resize an image — embedding the " +
        "original, un-resized buffer instead:",
      error instanceof Error ? error.message : error
    )
    return null
  }
}
