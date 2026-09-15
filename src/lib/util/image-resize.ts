// Server-side JPEG downscale for the pricelist export's embedded images
// (category photos: pricelist-photos.ts; component photos:
// pricelist-component-photos.ts). Both pools fetch a full-size src_facebook
// crop (1080x1080, 44-88KB each) but only ever DISPLAY it in a small fixed
// cell — embedding it at native size wastes ~8-10x the bytes a customer's
// download actually needs, which is what pushed a real PL50 export to
// 26.7MB and saturated the component pool's byte budget (see that module's
// own doc comment). Resizing here, once per distinct URL, before either
// pool's byte budget is checked, is what makes that budget guard memory
// again instead of being the thing that decides which photos survive.

/** A pixel box to fit an image inside — see ResizeOptions/resizeJpegForCell. */
export interface ResizeBox {
  width: number
  height: number
}

export interface ResizeOptions {
  /**
   * Trims a uniform-colour border from the source BEFORE resizing (sharp
   * 0.34's `trim({background?, threshold?, lineArt?})` — default
   * `background` is the top-left pixel, which is what a product shot on a
   * white/light backdrop needs; no `background` override is passed here).
   * `threshold` controls how strict the colour match must be (0 = exact
   * match only; higher tolerates JPEG compression noise around a nominally
   * flat background) — see pricelist-component-photos.ts's
   * `TRIM_THRESHOLD` for the tuned value and the real samples it was
   * checked against.
   *
   * Component `src_facebook` photos are a product shot on a large white/
   * light background with the item itself often occupying only a small
   * fraction of the 1080x1080 frame (verified against a real user report) —
   * without trimming, resizing THAT (not a tight crop of the item) into a
   * small cell just makes the item smaller still. Category photos don't get
   * this option (`undefined`/omitted) — left exactly as before.
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
 * The shape both pricelist image pools (pricelist-photos.ts,
 * pricelist-component-photos.ts) return per URL, in place of a bare
 * `Buffer`. `width`/`height` are `null` together, never independently, and
 * mean "unknown" — this happens ONLY when `resizeJpegForCell` itself
 * returned `null` (sharp unavailable or the resize failed), in which case
 * `buffer` is the ORIGINAL, un-resized fetch — callers (pricelist-workbook.ts)
 * must fall back to a fixed default box in that case, exactly like the
 * pre-resize fixed-square behaviour, rather than reading `width`/`height` as
 * if they were 0.
 */
export interface PricelistImage {
  buffer: Buffer
  width: number | null
  height: number | null
}

/**
 * Resizes `buffer` to fit inside `box` and wraps the result as a
 * `PricelistImage`, falling back to the ORIGINAL buffer with unknown
 * dimensions on any resize failure (see `resizeJpegForCell`'s own doc
 * comment for why that must never be treated as "no image"). Centralises
 * the fallback so both pricelist-photos.ts and
 * pricelist-component-photos.ts apply the exact same rule rather than each
 * re-implementing their own ternary.
 */
export async function resizeForEmbed(
  buffer: Buffer,
  box: ResizeBox,
  options?: ResizeOptions
): Promise<PricelistImage> {
  const resized = await resizeJpegForCell(buffer, box, options)
  if (resized) {
    return { buffer: resized.buffer, width: resized.width, height: resized.height }
  }
  return { buffer, width: null, height: null }
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
 * Resizes a JPEG buffer to fit inside `box` (aspect ratio preserved, never
 * upscaled — `fit: "inside"` + `withoutEnlargement: true`), re-encoding at
 * quality 80 with mozjpeg. Returns `null` on ANY failure (sharp
 * unavailable, corrupt/unsupported input, encode error) — callers must fall
 * back to the original, un-resized buffer in that case, never treat a
 * resize failure as a reason to drop the image entirely.
 *
 * `.rotate()` with no arguments applies the source's EXIF orientation (if
 * any) before resizing — src_facebook crops are camera/CMS-sourced JPEGs, so
 * this guards against a sideways-embedded photo even though no local sample
 * has been observed carrying EXIF orientation.
 *
 * `options.trimThreshold`, when given, trims a uniform-colour border BEFORE
 * the resize/rotate pipeline runs. sharp throws when trim finds the whole
 * image is one uniform colour or would trim to nothing — that's a NORMAL
 * input (e.g. a product photo that already fills its frame edge-to-edge),
 * not a failure, so this catches ONLY that first trim attempt and retries
 * once, untrimmed, on the SAME source — falling all the way back to `null`
 * (and therefore the original un-resized buffer) is reserved for the
 * untrimmed retry also failing, or for callers that never asked for
 * trimming at all.
 */
export async function resizeJpegForCell(
  buffer: Buffer,
  box: ResizeBox,
  options?: ResizeOptions
): Promise<ResizedJpeg | null> {
  const sharpFactory = await loadSharp()
  if (!sharpFactory) return null

  const runResize = (trim: boolean) => {
    let pipeline = sharpFactory(buffer).rotate()
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
