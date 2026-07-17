import ContentBlock from "@modules/home/components/content-block"
import type { ContentBlockData } from "@modules/home/components/content-block/types"

// TEMPORARY test route: regression check that scroll_rhythm gallery falls
// back to the responsive clamp() heights when NO Custom Styles maxHeight is
// set. Delete after screenshotting.

function svgDataUri(
  w: number,
  h: number,
  color: string,
  label: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="100%" height="100%" fill="${color}" />
    <text x="50%" y="50%" font-size="${Math.min(w, h) / 4}" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">${label}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const IMG_SPECS: { w: number; h: number; color: string }[] = [
  { w: 800, h: 600, color: "#e74c3c" }, // 0 - full
  { w: 400, h: 600, color: "#3498db" }, // 1 - short
  { w: 600, h: 400, color: "#2ecc71" }, // 2 - short
  { w: 900, h: 500, color: "#e67e22" }, // 3 - full
  { w: 500, h: 700, color: "#9b59b6" }, // 4 - short
  { w: 700, h: 500, color: "#1abc9c" }, // 5 - short
]

const galleryImages = IMG_SPECS.map((spec, i) => ({
  id: `img-${i}`,
  src: svgDataUri(spec.w, spec.h, spec.color, String(i)),
  display_order: i,
}))

const data: ContentBlockData = {
  id: "temp-gallery-block-no-maxheight",
  type: "gallery",
  style: "scroll_rhythm",
  video_link: null,
  video_type: null,
  video_autoplay: null,
  video_loop: null,
  arrangement: 0,
  main_image: null,
  gallery_images: galleryImages,
  content_block_profiles: [],
  default_margins: true,
  max_height: null,
  max_width: null,
  min_height: null,
  min_width: null,
  top_margin: null,
  bottom_margin: null,
  left_margin: null,
  right_margin: null,
  background_color: null,
  text_color: null,
  media_max_height: null,
  media_max_width: null,
  media_min_height: null,
  media_min_width: null,
  object_fit_cover: null,
  link_new_tab: null,
  link_page: null,
  extra_css: null,
  config: null,
}

export default function TempGalleryNoMaxHeightPage() {
  return (
    <div className="py-10">
      <ContentBlock data={data} index={0} languageCode="en" />
    </div>
  )
}
