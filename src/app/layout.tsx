import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { I18nProvider } from "@lib/i18n"
import { HtmlLangUpdater } from "@lib/i18n/components/html-lang-updater"
import { PWAInstallPrompt } from "../components/pwa-install-prompt"
import { AgentationToolbar } from "../components/agentation-toolbar"
import Script from "next/script"
import { activeTheme, activeThemeName, themeToCssVars } from "themes"
import { brandFont } from "themes/fonts"
import { features } from "@lib/features"
import { getShopSettings } from "@lib/data/shop-settings"
import "styles/globals.css"

export async function generateMetadata(): Promise<Metadata> {
  const shopSettings = await getShopSettings()
  const brand =
    shopSettings?.default_manufacturer?.company_name?.trim() ||
    activeThemeName.charAt(0).toUpperCase() + activeThemeName.slice(1)
  const faviconSrc = shopSettings?.favicon?.src
  const ogImage = shopSettings?.default_meta_image?.src
  const description =
    "A B2B e-commerce portal with offline functionality and easy access."

  return {
    metadataBase: new URL(getBaseURL()),
    title: {
      default: brand,
      template: `%s | ${brand}`,
    },
    description,
    manifest: "/manifest.json",
    keywords: ["ecommerce", "storefront", "b2b", "nextjs", "pwa", "offline"],
    authors: [{ name: brand }],
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: brand,
      title: brand,
      description,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: brand,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: brand,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: brand,
    },
    formatDetection: {
      telephone: false,
    },
    icons: faviconSrc ? { icon: faviconSrc } : undefined,
  }
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
    <html
      lang="en"
      data-mode="light"
      suppressHydrationWarning={true}
      className={brandFont.variable}
    >
      <head>
        <style>{themeToCssVars(activeTheme)}</style>
      </head>
      <body className="bg-page-background">
        <I18nProvider>
          <HtmlLangUpdater />
          <main className="relative">{props.children}</main>
          <PWAInstallPrompt />
          <AgentationToolbar />
        </I18nProvider>

        {/* Tawk.to Chat Widget - set NEXT_PUBLIC_TAWK_ENABLED=false to disable */}
        {features.tawk && (
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
        )}
      </body>
    </html>
  )
}
