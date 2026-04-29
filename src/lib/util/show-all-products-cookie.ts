// src/lib/util/show-all-products-cookie.ts
export const SHOW_ALL_PRODUCTS_COOKIE = 'showAllProducts'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function setShowAllProductsCookie(on: boolean): void {
  if (typeof document === 'undefined') return
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  if (on) {
    document.cookie = `${SHOW_ALL_PRODUCTS_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
  } else {
    document.cookie = `${SHOW_ALL_PRODUCTS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  }
}

export function clearShowAllProductsCookie(): void {
  setShowAllProductsCookie(false)
}

export function readShowAllProductsCookie(): boolean {
  if (typeof document === 'undefined') return false
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${SHOW_ALL_PRODUCTS_COOKIE}=([^;]*)`),
  )
  return match?.[1] === '1'
}
