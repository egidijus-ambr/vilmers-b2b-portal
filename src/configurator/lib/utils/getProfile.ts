export function getProfileIndexFromLanguage(profiles: any[], locale: string) {
  if (!profiles || profiles.length === 0) return null

  const index = profiles.findIndex(profile => {
    return profile.language === locale
  })

  return index === -1 ? null : index
}

export function getProfileFromLanguage(profiles: any[], locale: string) {
  if (!profiles || profiles.length === 0) return {}

  const profile = profiles.find(profile => {
    return profile.language === locale
  })

  return profile
}
