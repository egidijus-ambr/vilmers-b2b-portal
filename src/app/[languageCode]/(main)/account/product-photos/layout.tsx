import { redirect } from "next/navigation"
import { activeTheme } from "themes"
import ProductPhotosLayoutClient from "./product-photos-layout-client"

export default async function ProductPhotosLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ languageCode: string }>
}) {
  // Brands without product photos: send direct URL hits to the overview.
  if (!activeTheme.showProductPhotos) {
    const { languageCode } = await params
    redirect(`/${languageCode}/account`)
  }

  return <ProductPhotosLayoutClient>{children}</ProductPhotosLayoutClient>
}
