export interface FlipbookRenderData {
  pageUrls: string[]
  pageWidth: number
  pageHeight: number
}

// Server-side only: GCS sends no CORS headers, so the browser cannot fetch the
// manifest — but Next's server fetch can. revalidate keeps re-uploads fresh
// without hitting GCS per request.
export const getFlipbookRenderData = async (
  manifestUrl: string
): Promise<FlipbookRenderData | null> => {
  try {
    const res = await fetch(manifestUrl, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const manifest = await res.json()
    if (manifest.status !== "ready" || !Array.isArray(manifest.pages)) return null
    const base = manifestUrl.replace(/manifest\.json.*$/, "")
    return {
      pageUrls: manifest.pages.map((name: string) => `${base}${name}`),
      pageWidth: Number(manifest.width) || 1600,
      pageHeight: Number(manifest.height) || 2263,
    }
  } catch (error) {
    console.error(`Error fetching flipbook manifest "${manifestUrl}":`, error)
    return null
  }
}
