type FabricImageLike = {
  src?: string | null
  src_md?: string | null
  src_xs?: string | null
  src_thumbnail?: string | null
} | null | undefined

/**
 * Backend image variants (WebP, generated server-side):
 * src_thumbnail 150px (~15 KB), src_xs 500px (~160 KB), src_md 1000px (~600 KB),
 * src_lg (~2 MB), src = original upload (~1.5 MB JPG).
 * Colours imported before variant generation only have `src`.
 */

/** Smallest available image, for grid swatches and small thumbnails. */
export const fabricThumbSrc = (image: FabricImageLike): string | undefined =>
  image?.src_thumbnail || image?.src_xs || image?.src_md || image?.src || undefined

/** Mid-size image for hover previews / single larger previews. */
export const fabricPreviewSrc = (image: FabricImageLike): string | undefined =>
  image?.src_xs || image?.src_md || image?.src_thumbnail || image?.src || undefined
