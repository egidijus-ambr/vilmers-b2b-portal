import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { I18nProvider } from "@lib/i18n"
import { HtmlLangUpdater } from "@lib/i18n/components/html-lang-updater"
import Script from "next/script"
import "styles/globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Vilmers",
    template: "%s | Vilmers",
  },
  description: "Comfort and quality with smart design",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Vilmers",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" suppressHydrationWarning={true}>
      <body className={montserrat.className}>
        <I18nProvider>
          <HtmlLangUpdater />
          <main className="relative">{props.children}</main>
        </I18nProvider>

        {/* Tawk.to Chat Widget with autoStart: false */}
        <Script
          id="tawk-to"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
var Tawk_API=Tawk_API||{}, 
Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/692400fe12586c1960a8d887/1jaqa7p8d';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
            `,
          }}
        />
      </body>
    </html>
  )
}
