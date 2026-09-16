// Shared magic-byte sniffing for the pricelist export's embedded images.
// Extracted into its own module (rather than living in pricelist-photos.ts,
// where `isJpeg` originally lived) specifically to avoid a circular import:
// image-resize.ts needs a format sniffer for its own resize-failure fallback
// (see resizeForEmbed's doc comment), and pricelist-photos.ts needs
// box/URL-resolution helpers FROM pricelist-workbook.ts, which in turn needs
// resizeForEmbed FROM image-resize.ts — image-resize.ts importing from
// pricelist-photos.ts directly would close that loop.
//
// Never trust a URL/file extension to mean what it says — this codebase's
// photo libraries are fed by years of uploads across multiple naming
// conventions (see pricelist-photos.ts's own history), so a mis-tagged or
// mis-uploaded file must degrade to "no image" rather than handing ExcelJS
// or sharp bytes they can't parse.

const JPEG_MAGIC = [0xff, 0xd8, 0xff]
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** JPEG SOI marker (first 3 bytes) — src_facebook is documented as uniformly JPEG, but this is checked, never assumed. */
export function isJpeg(buffer: Buffer): boolean {
  return (
    buffer.length >= JPEG_MAGIC.length &&
    JPEG_MAGIC.every((byte, i) => buffer[i] === byte)
  )
}

/**
 * PNG signature: the full 8-byte magic (not just the 4-byte `\x89PNG`
 * prefix) — the trailing `0D 0A 1A 0A` is what catches a file mangled by a
 * text-mode/line-ending transform somewhere upstream, which a 4-byte check
 * would miss entirely.
 */
export function isPng(buffer: Buffer): boolean {
  return (
    buffer.length >= PNG_MAGIC.length &&
    PNG_MAGIC.every((byte, i) => buffer[i] === byte)
  )
}

/**
 * WEBP's RIFF container: bytes 0-3 are the ASCII "RIFF" tag, bytes 8-11 are
 * the format tag ("WEBP" for a WebP file) — bytes 4-7 in between are the
 * RIFF chunk's own little-endian size field, which varies per file, hence
 * the gap in the check.
 */
export function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  )
}

/**
 * Any format the category-photo pool's fetch stage accepts BEFORE any
 * resize/conversion (src_lg is WEBP, src is mixed jpeg/png, src_facebook is
 * always JPEG) — see pricelist-photos.ts's fetch pool validator. A pool
 * that only ever expects one format (the component-photo/blueprint pools)
 * should keep using `isJpeg`/`isPng` directly, not this — this exists for
 * the ONE pool that genuinely accepts multiple source formats.
 */
export function isEmbeddableSourceImage(buffer: Buffer): boolean {
  return isJpeg(buffer) || isPng(buffer) || isWebp(buffer)
}

/**
 * The format ExcelJS/Excel can actually embed directly (OOXML has no WEBP
 * support, and ExcelJS's own `addImage` typing only advertises
 * `"jpeg"|"png"|"gif"`) — used by image-resize.ts's resizeForEmbed to decide
 * whether a resize-failure fallback buffer is safe to hand to
 * `workbook.addImage` AS-IS. Returns `null` for anything else (notably
 * WEBP), which callers must treat as "cannot embed this image at all", not
 * as a reason to guess an extension and risk a corrupt/unreadable
 * embedded picture.
 */
export function detectEmbeddableExtension(buffer: Buffer): "jpeg" | "png" | null {
  if (isJpeg(buffer)) return "jpeg"
  if (isPng(buffer)) return "png"
  return null
}
