// src/lib/util/go-to-configurator-cookie.ts
export const GO_TO_CONFIGURATOR_COOKIE = 'goToConfigurator'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function setGoToConfiguratorCookie(on: boolean): void {
  if (typeof document === 'undefined') return
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  if (on) {
    document.cookie = `${GO_TO_CONFIGURATOR_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
  } else {
    document.cookie = `${GO_TO_CONFIGURATOR_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  }
}

export function clearGoToConfiguratorCookie(): void {
  setGoToConfiguratorCookie(false)
}

export function readGoToConfiguratorCookie(): boolean {
  if (typeof document === 'undefined') return false
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${GO_TO_CONFIGURATOR_COOKIE}=([^;]*)`),
  )
  return match?.[1] === '1'
}
