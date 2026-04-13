import { getProfileFromLanguage } from './getProfile'

export const getComponentGroupName = (
  additonalComponentGroups,
  componentGroupId,
  locale
) => {
  const currentAdditionalComponentGroup = additonalComponentGroups?.find(
    group => group.id === componentGroupId
  )

  let componentGroupName = ''
  if (currentAdditionalComponentGroup) {
    const componentGroupProfile = getProfileFromLanguage(
      currentAdditionalComponentGroup.additional_component_group_profiles,
      locale
    )

    componentGroupName = componentGroupProfile?.name ?? 'Not translated'
  }

  return componentGroupName
}

export const getComponentGroupCode = (
  additonalComponentGroups,
  componentGroupId
) => {
  const currentAdditionalComponentGroup = additonalComponentGroups?.find(
    group => group?.id === componentGroupId
  )

  return currentAdditionalComponentGroup?.code
}
