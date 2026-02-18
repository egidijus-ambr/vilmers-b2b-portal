import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Montserrat } from "next/font/google"
import { I18nProvider } from "@lib/i18n"
import { HtmlLangUpdater } from "@lib/i18n/components/html-lang-updater"
import { PWAInstallPrompt } from "../components/pwa-install-prompt"
import Script from "next/script"
import "styles/globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Vilmers B2B Portal",
    template: "%s | Vilmers B2B Portal",
  },
  description:
    "A B2B e-commerce portal for Vilmers customers with offline functionality and easy access.",
  manifest: "/manifest.json",
  keywords: [
    "ecommerce",
    "storefront",
    "b2b",
    "vilmers",
    "nextjs",
    "pwa",
    "offline",
  ],
  authors: [{ name: "Vilmers Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Vilmers B2B Portal",
    title: "Vilmers B2B Portal",
    description:
      "A B2B e-commerce portal for Vilmers customers with offline functionality and easy access.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vilmers B2B Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vilmers B2B Portal",
    description:
      "A B2B e-commerce portal for Vilmers customers with offline functionality and easy access.",
    images: ["/images/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vilmers B2B Portal",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" suppressHydrationWarning={true}>
      <body className={`${montserrat.className} bg-gold-10`}>
        <I18nProvider>
          <HtmlLangUpdater />
          <main className="relative">{props.children}</main>
          <PWAInstallPrompt />
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
