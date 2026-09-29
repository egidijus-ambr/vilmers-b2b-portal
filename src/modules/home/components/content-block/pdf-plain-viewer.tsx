"use client"

import { useTranslation } from "react-i18next"
import CmsCtaButton from "@modules/common/components/cms-cta-button"

interface PdfPlainViewerProps {
  /** Public, unauthenticated GCS PDF url (`config.pdf_url`). */
  pdfUrl: string
  languageCode: string
}

/**
 * Plain PDF render mode for the `pdf_flipbook` content block
 * (`config.viewer_mode === "plain"`): the browser's own native PDF viewer
 * filling the viewport, instead of the page-flip flipbook. Unlike the
 * flipbook it needs no server-fetched rasterized-page manifest — only the
 * PDF's own url — so it can render on any template that selects `config`.
 *
 * `<object>` (not a bare `<iframe>`) is used deliberately: iOS Safari and
 * many in-app webviews refuse to render a PDF inside a frame and silently
 * show a blank rectangle, with nothing to react to. `<object>`'s children
 * are real DOM fallback content that the browser renders automatically
 * whenever it can't display the embed, so those visitors still get a
 * working link instead of a blank page.
 */
export default function PdfPlainViewer({
  pdfUrl,
  languageCode,
}: PdfPlainViewerProps) {
  const { t } = useTranslation()
  const label = t("view-pdf", "View PDF")

  return (
    <div className="h-[100dvh] w-full bg-neutral-100">
      {/* `key` forces a remount (not just a `data` attribute update) if
          `pdfUrl` ever changes — browsers don't reliably reload an <object>
          embed just because its `data` attribute changed in place. */}
      <object
        key={pdfUrl}
        data={pdfUrl}
        type="application/pdf"
        className="block h-full w-full"
        aria-label={label}
      >
        {/* Rendered by the browser only when it can't display the <object>
            embed itself (see the file-level comment) — a centred, genuinely
            useful CTA rather than a bare URL. */}
        <div className="flex h-full w-full items-center justify-center p-6">
          <CmsCtaButton
            label={label}
            link={pdfUrl}
            linkPage={null}
            newTab
            languageCode={languageCode}
            showArrow
          />
        </div>
      </object>
    </div>
  )
}
