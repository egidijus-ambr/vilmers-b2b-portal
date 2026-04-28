export const ACTING_CUSTOMER_COOKIE = 'actingCustomerId'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function setActingCustomerCookie(id: number): void {
  if (typeof document === 'undefined') return
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  document.cookie = `${ACTING_CUSTOMER_COOKIE}=${id}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
}

export function clearActingCustomerCookie(): void {
  if (typeof document === 'undefined') return
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  document.cookie = `${ACTING_CUSTOMER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

export function readActingCustomerCookie(): number | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ACTING_CUSTOMER_COOKIE}=([^;]*)`),
  )
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) && Number.isInteger(n) ? n : null
}
