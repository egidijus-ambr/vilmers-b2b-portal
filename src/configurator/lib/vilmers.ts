import { getComponentGroupCode } from './utils/getComponentGroupName'
import { getProfileFromLanguage } from './utils/getProfile'
import { getPriceFromPriceCategories } from './price-utils'
import {
  ArmrestsPosition,
  getArmrestsPosition,
} from './utils/sofaShapeUtils'
import type { ConfiguratorState } from '../context/configurator-context'

const getProductName = (product: any) => {
  const profiles = product?.advanced_product?.advanced_product_profiles
  const name = Array.isArray(profiles) ? profiles[0]?.name : profiles?.name
  return name?.split(' ')[0]
}

export const SITTING_CUSHION_DESIGN_CODE = 'sitting-cushion-design'
export const BACK_CUSHION_DESIGN_CODE = 'back-cushion-design'
export const SITTING_CUSHION_COMFORT_CODE = 'sitting-cushion-comfort'
export const BACK_CUSHION_COMFORT_CODE = 'back-cushion-comfort'
export const ARMREST_CODE = 'armrest'
export const LEGS_CODE = 'legs'
export const THREADS_CODE = 'threads-type'
export const THREADS_COLOR_CODE = 'threads-colors'
export const LOGOS_CODE = 'logos'
export const SHOOTING_CODE = 'shooting'
export const DIRECTION_CODE = 'direction'
export const MODEL_CODE = 'model'
export const MODEL_CODE_OTHER = 'model-other'
export const MATTRESS_COVER = 'product-mattress-cover'
export const MATTRESS = 'product-mattress'
export const TOP_MATTRESS = 'product-top-mattress'
export const DESIGN_COMFORT = 'design-comfort'

const getSingleComponentConfigString = (
  product: any,
  fabrics: any,
  additionalComponents: any,
  fabricCombination: any,
  setId: any,
  itemId: any,
  item: any,
  containsLogo = false,
  shape: any = null
) => {
  //console.log('getSingleComponentConfigString', item)
  if (!item) {
    return {}
  }
  const productName = getProductName(product)
  const product_containerId = product.id

  const withGroupNames = additionalComponents.map((component: any) => ({
    ...component,
    groupCode: getComponentGroupCode(
      product.advanced_product.additional_component_groups,
      component.additionalComponentGroupId
    ),
  }))

  // find group with name porankiai
  let armRestLeft = ''
  let armRestRight = ''

  const armrests = additionalComponents?.find(
    (c: any) => c.groupCode === ARMREST_CODE + '-' + item.code
  )

  let armrestConfig = ''
  const armrestsPosition = shape?.attrs.armrestPosition ?? ''

  if (armrests) {
    armRestLeft =
      armrestsPosition === 'L' || armrestsPosition === 'LR'
        ? armrests.code.split(':')[1] + 'X1' // replace last symbol with 1 (left armrest)
        : ''

    armRestRight =
      armrestsPosition === 'R' || armrestsPosition === 'LR'
        ? armrests.code.split(':')[1] + 'X2' // replace last symbol with 2 (right armrest)
        : ''

    armrestConfig = `${armRestLeft}${armRestRight}`
  }

  // baldam turintiems abu porankius (baigiasi penketu) reikia paduoti abu defaultinius porankiu id
  if (armrestConfig.length === 0) {
    if (item.code?.[item.code?.length - 1] === '5') {
      armrestConfig = 'AXXXXXAXXXXX'
    } else {
      armrestConfig = 'AXXXXX'
    }
  }

  // get armrest design from metadata
  let frameDesign = 'XX'

  try {
    frameDesign = armrests?.metadata?.frame_design ?? 'XX'
  } catch (e) {
    console.error('Error parsing armrest metadata', e)
  }

  const getSelectedComponent = (groupCode: string) =>
    withGroupNames.find((group: any) => group?.groupCode === groupCode)

  const getSelectedComponentMulti = (groupCode: string) =>
    withGroupNames.filter((group: any) => group?.groupCode?.startsWith(groupCode))

  const getSelectedCode = (groupCode: string) =>
    getSelectedComponent(groupCode)?.code

  const itemCategory = item.code?.split('-')[0]

  // --- SHOOTING ---
  let shootingOrig = getSelectedCode(SHOOTING_CODE)
  let shooting = shootingOrig

  if (shooting !== '0') {
    if (
      (itemCategory === '51' && item.code.endsWith('5')) ||
      itemCategory === '53' ||
      itemCategory === '54' ||
      itemCategory === '56'
    ) {
      shooting = '1'
    } else if (itemCategory === '91') {
      shooting = '0'
    } else {
      shooting = '2'
    }
  }

  if (itemCategory === '57') {
    shooting = '0' // no shooting for matrasses
  }

  // Hnadling cases when module has only one shooting code, like 51-NEWPORT-B095X3, that has only one shooting code: 2
  if (item.metadata?.constraint_shooting) {
    if (item.metadata.constraint_shooting.length === 1) {
      shooting = item.metadata.constraint_shooting[0]
    } else if (item.metadata.constraint_shooting.length > 1) {
      // const shootingCode = item.metadata.constraint_shooting.find(
      //   (s) => s.code === shootingOrig,
      // )
      // if (shootingCode) {
      //   shooting = shootingCode.code
      // }
    }
  }

  // ---
  const getConstrtainsValue = (propertyvalue: string, armrest: string) => {
    if (!propertyvalue) return null
    if (typeof propertyvalue === 'string') {
      return propertyvalue
    } else if (typeof propertyvalue === 'object') {
      const keys = Object.keys(propertyvalue)
      const values = Object.values(propertyvalue)
      const index = keys.findIndex(key => key === armrest)

      if (index !== -1) {
        return values[index]
      }
    }
  }

  let designComfort = getSelectedCode(DESIGN_COMFORT)?.split(':')?.[1]

  if (item.metadata) {
    designComfort =
      getConstrtainsValue(
        item.metadata?.designComfortConditions,
        armrests?.code
      ) ?? designComfort
  }
  let sittingCushionDesign = designComfort?.[0]
  let sittingCushionComfort = designComfort?.[1]
  let backCushionDesign = designComfort?.[3]
  let backCushionComfort = designComfort?.[4]
  if (itemCategory === '57') {
    // For Matrasses
    backCushionDesign = 'X'
    backCushionComfort = 'X'
    // sittingCushionDesign = 'X'
    // sittingCushionComfort = 'X'
  }

  // --- LEGS ---
  let leg = getSelectedCode(LEGS_CODE) ?? '000'
  // if module code ends with 0, then it is a middle frame (corner, seater, etc.)
  const isComponentWithoutArmerst =
    item.code?.endsWith('0') ||
    item.code?.endsWith('1') ||
    item.code?.endsWith('2')

  const legForArmrest = additionalComponents?.find((c: any) =>
    c.groupCode.startsWith(LEGS_CODE + '-' + item.code)
  )
  if (legForArmrest) {
    leg = legForArmrest.code
  }

  if (isComponentWithoutArmerst && item.metadata?.additionalLegs?.length > 0) {
    let legComponent = getSelectedComponent(LEGS_CODE)
    // find conponents name

    const legName = legComponent?.additional_component_profiles[0]?.name

    let additionalLeg

    if (legName) {
      const nameParts = legName.split(' ')
      const legHeight = nameParts[0]
      const legNumber = nameParts[1]

      // cut off two first elements and join the rest
      const legColor = nameParts.slice(2).join(' ')

      //filter out module legs that are same height and color
      const matchingColorAndHeighLegs = item.metadata.additionalLegs?.filter(
        (l: any) =>
          l.legHeight === legHeight &&
          l.legColor?.toLowerCase() === legColor?.toLowerCase()
      )

      // looking for leg with same leg number
      const legWithSameLegNumber = matchingColorAndHeighLegs.find(
        (l: any) => l.legNumber === legNumber
      )
      if (legWithSameLegNumber) {
        additionalLeg = legWithSameLegNumber.code
      }

      // if additionalLeg is not found, try to apply extraLegs rules
      // try to find in extraLegs what extra leg is set for that main leg
      if (!additionalLeg && item.metadata.extraLegs) {
        const extraLegRule = item.metadata.extraLegs.find(
          (l: any) => l.mainLegNumber === legComponent.metadata?.LegNumber
        )

        if (extraLegRule) {
          // find leg with same height and color
          additionalLeg = matchingColorAndHeighLegs.find(
            (mcl: any) => mcl.legNumber === extraLegRule.extraLegNumber
          )?.code
          // additionalLeg = matchingColorAndHeighLegs.find(
        }
      }

      if (!additionalLeg && matchingColorAndHeighLegs.length > 0) {
        //additionalLeg = matchingColorAndHeighLegs[0].code
        additionalLeg = matchingColorAndHeighLegs[0].code
      }

      // Case when module shoud not have any legs or there some default value, then use that default value
      // This also covers case for mudules like B075X0 which shoudl get 000 as a leg code.
      if (!additionalLeg && item.metadata.additionalLegs.length === 1) {
        const defaultLeg = item.metadata.additionalLegs[0]
        additionalLeg = defaultLeg.code
      }

      // console.log('data', {module: item.code, legHeight, legNumber, legColor, filteredLegs, leg, additionalLeg, moduleLegs: item.metadata.legs})

      leg = additionalLeg ?? leg
    }
  }

  // get logo name
  let logoComponent = getSelectedComponent(LOGOS_CODE)
  let nologoCode = '0'
  // Additional exeptions for logo codes, when USA or CAN logos are selected, no logo code should be not 0 but 21 or 23
  if (logoComponent?.code === '20' || logoComponent?.code === '21') {
    //USA+VIlmers
    nologoCode = '21'
  }
  if (logoComponent?.code === '22' || logoComponent?.code === '23') {
    //CAN+Vilmers
    nologoCode = '23'
  }

  const logo = containsLogo ? getSelectedCode(LOGOS_CODE) ?? '0' : nologoCode
  const logoName = getProfileFromLanguage(
    logoComponent?.additional_component_profiles,
    'lt'
  )?.name

  //get thread colors // we need at least two colors. event they are 0|0
  // const threads = getSelectedComponentMulti(THREADS_COLOR_CODE)?.map(
  //   (thread) => thread.code,
  // )
  const threads_type = getSelectedCode(THREADS_CODE)
  const threads_colors = getSelectedComponentMulti(THREADS_COLOR_CODE)?.map(
    (thread: any) => thread.code
  )

  if (threads_colors.length === 0) {
    threads_colors.push('0')
    threads_colors.push('0')
  }
  if (threads_colors.length === 1) {
    threads_colors.push('0')
  }

  // module name for generic models

  let genericName = item.metadata?.generic_name

  const c = {
    setId,
    itemId,
    //category: 51,
    /// these values are hardcoded
    // price: 100,
    // discount: 0,
    // quantity: 1,
    // requestedShipDate: '2025-01-01',
    /// ---------------------
    armrestConfig,
    product_containerId,
    productName,
    moduleCode: item.code,
    moduleName: item.name,
    shapeType: item.type,
    armrestsPosition: getArmrestsPosition(item.type),
    armRestLeft,
    armRestRight,
    leg,
    frameDesign,
    sittingCushionDesign,
    backCushionDesign,
    sittingCushionComfort,
    backCushionComfort,
    threads_colors,
    threads_type,
    genericName,
    logo,
    logoName,
    shooting,
    fabric: fabrics?.fabricGroupObject?.code,
    //fabrics_raw: fabrics,
    fabricColor: fabrics?.fabricObject?.code,
    direction: getSelectedCode(DIRECTION_CODE),
    //fabricsRaw: fabrics,
    fabrics: Object.values(fabrics.combinationFabrics ?? {})
      .map((f: any) => ({
        position: f.option.code,
        fabric: f.fabricGroupObject?.code,
        fabricColor: f.fabricObject?.code,
      }))
      .sort((a, b) => a.position.localeCompare(b.position)),

    fabricCombination: fabricCombination?.code,
  }

  let fabricColors = ''
  c.fabrics.map((f: any, i: number) => {
    fabricColors += `${f.fabric}-${f.fabricColor}`
    if (i < c.fabrics.length - 1) {
      fabricColors += '|'
    }
  })
  let configuration
  if (c?.moduleCode?.startsWith('9')) {
    configuration = ''
  } else {
    configuration =
      `${c.armrestConfig}` +
      `.${c.sittingCushionDesign}${c.sittingCushionComfort}.${c.backCushionDesign}${c.backCushionComfort}` +
      `.${c.frameDesign}.${c.shooting}.${
        c.fabricCombination
      }.${fabricColors}.${c.threads_colors.join('|')}` +
      `.${c.logo}.${c.leg}.${c.direction}`
  }
  return { ...c, configuration }
}

const hasLeftArmrest = (attrs: any) => {
  return attrs.armrestPosition?.includes('L')
}
const hasRightArmrest = (attrs: any) => {
  return attrs.armrestPosition?.includes('R')
}

export const getConfigString = ({
  product,
  sofaCombinations,
  fabrics,
  additionalComponents,
  fabricCombination,
  advancedProductTotalPricesPerModule,
  pricelists,
}: {
  product: any
  sofaCombinations: any
  fabrics: any
  additionalComponents: any
  fabricCombination: any
  advancedProductTotalPricesPerModule: any
  pricelists: any
}) => {
  const sets: any[] = []
  // Going through all combinations and creating list (sets) if list (items). Each item is a configuration string
  let setId = 1
  // console.log('getConfigString', product)

  if (product.advanced_product.advanced_product_type === 'SOFA') {
    for (const [i, combination = []] of sofaCombinations.entries() ?? []) {
      const newSet: any[] = []
      const mudulesCount = Object.entries(combination).length
      let index = 0
      let logoIsSet = false

      // --- LOGOS ---
      // Logo ant modulio su kairiniu porankiu, jei nėra, tada ant modulio su dešininiu porankiu, jei abiejose pusėse nėra porankio, tada ant kairinio modulio.
      // Taip pat logo ir ant visų set'ų 51gr su X5 (abiem porankiais), 53gr foteliams, 54gr pufams
      // Jeigu klientas užsakytų nepilną kombinaciją/set'ą, reiktų logo dėti tik ant porankio, vadinasi tik ant X3 arba X4 modulio,
      // jei set'as susidarytų tik iš modulių be porankio X0 - logo nededame (būna atvejų kai pasipildo turimą kombinaciją arba baldas visada yra baigtais šonais ir galima sakytis kombinacijas be porankių)
      const shapes = Object.values(combination) as any
      const shapesLogos = (Object.values(combination) as any).map((_s: any) => false)

      if (hasLeftArmrest(shapes[0]?.attrs)) {
        shapesLogos[0] = true
      } else {
        const last = shapes[shapes.length - 1]?.attrs
        if (hasRightArmrest(last)) {
          shapesLogos[shapesLogos.length - 1] = true
        } else {
          shapesLogos[0] = true
          // find if module has right connector and check if its connected to another module
          // console.log('leftc', leftc)
          // const leftc = shapes[0]?.attrs?.connected?.left
          // if (leftc && !shapes[0]?.attrs.connected?.left) {
          //   console.log(
          //     'left connector found, but not connected to another module',
          //     leftc,
          //   )
          //   shapesLogos[0] = false
          // } else {
          //   console.log(
          //     'left connector not found or connected to another module',
          //     leftc,
          //   )
          //   shapesLogos[0] = true
          // }
        }
      }

      for (const [j, shape] of Object.entries(combination)) {
        const itemId = parseInt(j) + 1
        const item = (shape as any)?.attrs?.originalSofaForm

        const modulePrice = advancedProductTotalPricesPerModule?.find(
          (p: any) => p.shape === item.code
        )?.price

        const categoryCode = item.code?.split('-')[0]

        let isLogoModule = shapesLogos[j]

        if (
          (categoryCode === '51' && item.code.endsWith('5')) ||
          categoryCode === '53' ||
          categoryCode === '54'
        ) {
          isLogoModule = true
        }

        const config = getSingleComponentConfigString(
          product,
          fabrics,
          additionalComponents,
          fabricCombination,
          setId,
          itemId,
          item,
          isLogoModule,
          shape
        )

        newSet.push({ ...config, price: modulePrice })
      }
      sets.push(newSet)
    }
  } else if (
    product.advanced_product.advanced_product_type === 'OTHER_WITH_FABRICS'
  ) {
    const newSet: any[] = []

    // find model component
    const modelComponent = additionalComponents.find(
      (component: any) => component.groupCode === MODEL_CODE
    )

    let price = getCompoentPrice(modelComponent, fabrics, pricelists)

    // console.log('modelComponent', modelComponent)
    const config = getSingleComponentConfigString(
      product,
      fabrics,
      additionalComponents,
      fabricCombination,
      setId,
      1,
      modelComponent,
      true
    )
    newSet.push({ ...config, price })

    // MATTRESS COVER ========================
    //Handling beds case when there are mattress cover
    const mattressCover = additionalComponents.find(
      (component: any) => component.groupCode === MATTRESS_COVER
    )
    if (mattressCover && mattressCover.code !== '0') {
      const price = getCompoentPrice(mattressCover, fabrics, pricelists)
      const mattressCoverConfig = getSingleComponentConfigString(
        product,
        fabrics,
        additionalComponents.map((component: any) => ({
          ...component,
          code: component.groupCode === LEGS_CODE ? '000' : component.code,
        })),
        fabricCombination,
        setId,
        2,
        mattressCover,
        true
      )
      newSet.push({ ...mattressCoverConfig, price })
    }
    const mattress = additionalComponents.find(
      (component: any) => component.groupCode === MATTRESS
    )

    // MATTRESS ========================
    if (mattress && mattress.code !== '0') {
      setId += 1
      const price = getCompoentPrice(mattress, fabrics, pricelists)
      const mattressConfig = getSingleComponentConfigString(
        product,
        fabrics,
        additionalComponents.map((component: any) => ({
          ...component,
          code: component.groupCode === LEGS_CODE ? '000' : component.code,
        })),
        fabricCombination,
        setId,
        1,
        mattress,
        false
      )
      newSet.push({ ...mattressConfig, price })
    }
    const topMattress = additionalComponents.find(
      (component: any) => component.groupCode === TOP_MATTRESS
    )

    // TOP MATTRESS ========================
    if (topMattress && topMattress.code !== '0') {
      setId += 1
      const price = getCompoentPrice(topMattress, fabrics, pricelists)
      const topMattressConfig = getSingleComponentConfigString(
        product,
        fabrics,
        additionalComponents.map((component: any) => ({
          ...component,
          code: component.groupCode === LEGS_CODE ? '000' : component.code,
        })),
        fabricCombination,
        setId,
        1,
        topMattress,
        false
      )
      newSet.push({ ...topMattressConfig, price })
    }

    sets.push(newSet)
  } else if (product.advanced_product?.advanced_product_type === 'OTHER') {
    const newSet: any[] = []

    // find model component
    const modelComponent = additionalComponents.find(
      (component: any) => component.groupCode === MODEL_CODE_OTHER
    )

    let price = getCompoentPrice(modelComponent, fabrics, pricelists)

    const config = getSingleComponentConfigString(
      product,
      fabrics,
      additionalComponents,
      fabricCombination,
      setId,
      1,
      modelComponent,
      true
    )
    newSet.push({ ...config, price })
    sets.push(newSet)
  } else {
    console.warn(
      '[vilmers] Unknown advanced_product_type',
      product.advanced_product?.advanced_product_type
    )
  }

  return sets
}

const getCompoentPrice = (component: any, fabrics: any, pricelists: any) => {
  // find firt not null pricelist
  const pricelistId = pricelists?.find((p: any) => p)

  if (!pricelistId) {
    return 0
  }

  let price: any = 0
  if (component?.price_fabric_category.length > 0) {
    price = getPriceFromPriceCategories(
      fabrics,
      component.price_fabric_category
    )
  } else if (component?.extra_prices) {
    price = component.extra_prices.find(
      (p: any) => p.price_listId === pricelistId
    )?.price
  }
  return price
}

export function buildIntegrationConfiguration(
  state: ConfiguratorState,
  priceListId: number
) {
  if (!state.productData?.advanced_product) {
    return []
  }

  const product = {
    ...state.productData,
    advanced_product: {
      ...state.productData.advanced_product,
      additional_component_groups:
        state.productData.manufacturer?.additional_component_groups ?? [],
    },
  }

  const advancedProductTotalPricesPerModule = state.pricesPerModule
    ? Object.entries(state.pricesPerModule).map(([shape, price]) => ({
        shape,
        price,
      }))
    : null

  return getConfigString({
    product,
    sofaCombinations: state.sofaCombinations,
    fabrics: state.selectedFabric,
    additionalComponents: state.selectedAdditionalComponents,
    fabricCombination: state.selectedFabricCombination?.fabricCombination,
    advancedProductTotalPricesPerModule,
    pricelists: [priceListId],
  })
}
