import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { I18nProvider } from "@lib/i18n"
import { HtmlLangUpdater } from "@lib/i18n/components/html-lang-updater"
import "styles/globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="lt" data-mode="light">
      <body className={montserrat.className}>
        <I18nProvider>
          <HtmlLangUpdater />
          <main className="relative">{props.children}</main>
        </I18nProvider>
      </body>
    </html>
  )
}
