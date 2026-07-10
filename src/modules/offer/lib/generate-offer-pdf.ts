"use client"

// Client-side HTML -> PDF generation for the offer page.
// Rasterizes each on-page `.offer-page` section with html2canvas-pro (which
// tolerates modern CSS color functions like oklch/lab) and assembles them into
// a single A4 portrait PDF via jsPDF. Returns both a Blob (for direct download)
// and a raw base64 string with no data-URI prefix (for emailing).

export interface GeneratedOfferPdf {
  blob: Blob
  base64: string
}

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

// Used to drop the remote (cross-origin) product image from the capture if it
// taints the canvas — the same-origin Konva drawing still renders fine.
function isCrossOriginImage(el: Element): boolean {
  if (!(el instanceof HTMLImageElement)) return false
  try {
    return (
      new URL(el.src, window.location.href).origin !== window.location.origin
    )
  } catch {
    return false
  }
}

export async function generateOfferPdf(): Promise<GeneratedOfferPdf> {
  const pages = Array.from(
    document.querySelectorAll<HTMLElement>(".offer-page")
  )
  if (pages.length === 0) {
    throw new Error("No offer pages found to export")
  }

  // Lazy-load the heavy raster/pdf libs only when actually exporting.
  const [{ jsPDF }, h2c] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
  ])
  const html2canvas = h2c.default

  const capture = async (
    el: HTMLElement
  ): Promise<{ dataUrl: string; width: number; height: number }> => {
    const baseOpts = {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    }
    try {
      const canvas = await html2canvas(el, baseOpts)
      // toDataURL throws on a tainted canvas — surfaces the CORS problem here
      // so we can fall back rather than fail the whole export.
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
      return { dataUrl, width: canvas.width, height: canvas.height }
    } catch (err) {
      console.warn(
        "[generateOfferPdf] Capture failed (likely product image CORS); retrying without cross-origin images",
        err
      )
      const canvas = await html2canvas(el, {
        ...baseOpts,
        ignoreElements: isCrossOriginImage,
      })
      return {
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        width: canvas.width,
        height: canvas.height,
      }
    }
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })

  for (let i = 0; i < pages.length; i++) {
    const { dataUrl, width, height } = await capture(pages[i])
    // Fit the page image into A4 preserving aspect ratio.
    const ratio = Math.min(A4_WIDTH_MM / width, A4_HEIGHT_MM / height)
    const renderW = width * ratio
    const renderH = height * ratio
    const offsetX = (A4_WIDTH_MM - renderW) / 2
    if (i > 0) pdf.addPage()
    pdf.addImage(dataUrl, "JPEG", offsetX, 0, renderW, renderH)
  }

  const blob = pdf.output("blob") as Blob
  const dataUri = pdf.output("datauristring")
  const base64 = dataUri.substring(dataUri.indexOf(",") + 1)

  return { blob, base64 }
}
