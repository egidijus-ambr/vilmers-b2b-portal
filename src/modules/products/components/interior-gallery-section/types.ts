export type Photo = {
  url: string
  name: string
  category: string
  combination: string | null
  fabric: string | null
  mediaType?: "image" | "video"
}
