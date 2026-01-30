// ================ SOFA DRAWING STAGE UTILITIEs =================
//===============================================================

import { METRIC_SIZE } from './SofaElements/constants'

// Repel Two Groups
export function intersectionBetweenAllGroups(allGroupsOfGroups) {
  let isThereIntersection = false
  allGroupsOfGroups.forEach((groupOfGroups, i) => {
    const groupRect = getGroupOfGroupsRect(groupOfGroups)

    allGroupsOfGroups.forEach((secondaryGroupOfGroups, i2) => {
      // If index match, we checking self, so skip
      if (i === i2) {
        return
      }
      const secondaryRect = getGroupOfGroupsRect(secondaryGroupOfGroups)
      if (haveIntersection(groupRect, secondaryRect)) {
        // Repel two groups
        isThereIntersection = true
      }
    })
  })
  return isThereIntersection
}

// Mpve function
export function moveGroupOfGroups(arrayOfGroups, x, y) {
  // Looping each individual group
  arrayOfGroups.forEach(element => {
    let currentPos = element.absolutePosition()
    currentPos.x = currentPos.x + x
    currentPos.y = currentPos.y + y
    element.absolutePosition(currentPos)
  })
}

export const getClientRect = (
  group,
  { padding = 0, roundValues = false, relativeTo = null } = {}
) => {
  const rect = group.getClientRect({
    skipStroke: true,
    skipShadow: true,
    relativeTo,
  })
  if (roundValues) {
    rect.x = Math.round(rect.x)
    rect.y = Math.round(rect.y)
    rect.width = Math.round(rect.width)
    rect.height = Math.round(rect.height)
  }
  rect.x += padding
  rect.y += padding
  rect.width -= padding * 2
  rect.height -= padding * 2
  return rect
}

// Takes in an arrayOfGroups [group1, group2. group3]
// Analyzes their coordidnates and returns a sorounding rectangle
export function getGroupOfGroupsRectWithScale(arrayOfGroups, scale) {
  // smallest and highest x define a rectangle
  let minX = 10000000000
  let maxX = 0
  let minY = 10000000000
  let maxY = 0

  // Not in pixels but in cm taken from what we add in admin
  // We need to calculate real Width and Height, as when we scale
  // Calcualtions with pixels add 0,5 +- margin of error
  // So we need to pass down accurate info
  // let realWidth = 0
  // let realHeight = 0
  // (NOT WORKING AS we get total height, but not actual height)

  // Looping each individual group
  arrayOfGroups.forEach(element => {
    const currentRect = getClientRect(element, { roundValues: true })

    if (currentRect) {
      let currentMinX = Math.round(currentRect.x)
      let currentMaxX = Math.round(currentRect.x) + currentRect.width
      let currentMinY = Math.round(currentRect.y)
      let currentMaxY = Math.round(currentRect.y) + currentRect.height

      if (currentMinX < minX) {
        minX = currentMinX
      }
      if (currentMaxX > maxX) {
        maxX = currentMaxX
      }
      if (currentMinY < minY) {
        minY = currentMinY
      }
      if (currentMaxY > maxY) {
        maxY = currentMaxY
      }
    } else {
      // handle else...
      // console.log('We got ELSEEEEE')
    }
  })

  const width = Math.round((maxX - minX) / scale)
  const height = Math.round((maxY - minY) / scale)

  return {
    x: minX / scale,
    y: minY / scale,
    width: width,
    height: height,
    center: {
      x: minX / scale + width / 2,
      y: minY / scale + height / 2,
    },
    ranges: {
      minX,
      maxX,
      minY,
      maxY,
    },
  }
}

// Takes in an arrayOfGroups [group1, group2. group3]
// Analyzes their coordidnates and returns a sorounding rectangle
export function getGroupOfGroupsRect(arrayOfGroups) {
  // smallest and highest x define a rectangle
  let minX = 10000000000
  let maxX = 0
  let minY = 10000000000
  let maxY = 0

  // Looping each individual group
  arrayOfGroups.forEach(element => {
    const currentRect = tansformTargetToRectWithRotation(element)

    let currentMinX = currentRect?.x
    let currentMaxX = currentRect?.x + currentRect?.width
    let currentMinY = currentRect?.y
    let currentMaxY = currentRect?.y + currentRect?.height

    if (currentMinX < minX) {
      minX = currentMinX
    }
    if (currentMaxX > maxX) {
      maxX = currentMaxX
    }
    if (currentMinY < minY) {
      minY = currentMinY
    }
    if (currentMaxY > maxY) {
      maxY = currentMaxY
    }
  })

  const width = maxX - minX
  const height = maxY - minY

  return {
    x: minX,
    y: minY,
    width: width,
    height: height,
    center: {
      x: minX + width / 2,
      y: minY + height / 2,
    },
    ranges: {
      minX,
      maxX,
      minY,
      maxY,
    },
  }
}

export function haveIntersection(r1, r2) {
  return !(
    r2.x > r1.x + r1.width - 1 ||
    r2.x + r2.width - 1 < r1.x ||
    r2.y > r1.y + r1.height - 1 ||
    r2.y + r2.height - 1 < r1.y
  )
}

// Takes in DropZone array ["right", "bottom"]
// Returns backrests -> ["left", "top"]
export function getBackRests(dropzoneArray) {
  const fullPsitionsList = ['left', 'right', 'top', 'bottom']
  return fullPsitionsList.filter(item => !(dropzoneArray?.indexOf(item) > -1))
}

export const recursiveGroupMatchingFunction = (groupedGroups, called = 0) => {
  // console.log('groupedGroups.length :>> ', groupedGroups.length)
  // console.log('Recursive called :>> ', called)
  // console.log('groupedGroups :>> ', groupedGroups)
  // -----
  let finalGroupedGroups = [] as any
  let matchHappened = false
  //---
  // groupedGroups.forEach((group, i) => {
  loop1: for (let i = 0; i < groupedGroups.length; i++) {
    const group = groupedGroups[i]
    loop2: for (let i2 = 0; i2 < groupedGroups.length; i2++) {
      const secondaryGroup = groupedGroups[i2]
      // groupedGroups.forEach((secondaryGroup, i2) => {
      if (i === i2) {
        //skip
      } else {
        //----
        const groupIDS = group.map(x => x.attrs.id)
        const secondaryGroupIDS = secondaryGroup.map(x => x.attrs.id)
        // Returns array of duplicates betwen two arrays
        const duplicateCheck = secondaryGroupIDS.filter(
          obj => groupIDS.indexOf(obj) !== -1
        )
        if (duplicateCheck.length > 0) {
          // console.log('Group i -->', i)
          // console.log('Group i2 -->', i2)
          // console.log('MATCH============= ')
          matchHappened = true
          // Merge two arrays and remove duplicates
          let newGroup = [...groupedGroups[i], ...groupedGroups[i2]]
          //@ts-ignore
          const uniqueGroup = [...new Set(newGroup)]
          // console.log('uniqueArray :>> ', uniqueGroup)

          let groupExists = false
          let existingGroupIndex = null
          // We push only if this group doesnt exist
          finalGroupedGroups.forEach((groupOfGroups, x) => {
            const arr = groupOfGroups.map(x => x.attrs.id)
            const arr2 = uniqueGroup.map(x => x.attrs.id)
            const duplicateCheck = arr2.filter(obj => arr.indexOf(obj) !== -1)
            if (duplicateCheck.length === arr2.length) {
              groupExists = true
            }
          })
          if (!groupExists) {
            finalGroupedGroups.push(uniqueGroup)
          }
        } else {
          // finalGroupedGroups.push(groupedGroups[i])
          const groupToPush = groupedGroups[i]
          let groupExists = false
          let existingGroupIndex = null
          // We push only if this group doesnt exist
          finalGroupedGroups.forEach((groupOfGroups, x) => {
            const arr = groupOfGroups.map(item => item.attrs.id)
            const arr2 = groupToPush.map(item => item.attrs.id)
            const duplicateCheck = arr2.filter(obj => arr.indexOf(obj) !== -1)
            if (duplicateCheck.length === arr2.length) {
              groupExists = true
              // existingGroupIndex = x
            } else if (
              duplicateCheck.length > 0 &&
              duplicateCheck.length < arr2.length
            ) {
              // 'One existing group is Bigger ===========
              groupExists = true
              existingGroupIndex = x
            }
          })
          if (!groupExists) {
            finalGroupedGroups.push(groupToPush)
          } else if (existingGroupIndex != null) {
            // Group exists
            // We should merge with
            const existingGroup = finalGroupedGroups[existingGroupIndex]
            if (existingGroup.length < groupToPush.length) {
              // console.log('Merge -> ', existingGroupIndex)
              finalGroupedGroups[existingGroupIndex] = groupToPush
            }
          }
        }
      }
    }
  }

  // Cases when its only one group
  if (groupedGroups.length <= 1) {
    finalGroupedGroups = groupedGroups
  }

  // --->  To protect from unexpected Crashes (maximum call stack exceeded)
  if (called > 30) {
    return finalGroupedGroups
  }

  if (matchHappened) {
    return recursiveGroupMatchingFunction(finalGroupedGroups, called + 1)
  } else {
    return finalGroupedGroups
  }
}

export const tansformTargetToRectWithRotationAndScale = (target, scale) => {
  // Do not mix with other targets...
  if (target) {
    if (target.attrs.name === 'sofa_shape_group') {
      var targetShape = target.findOne('.sofa_shape')

      if (targetShape) {
        var targetRect = targetShape.getClientRect()
        targetRect.width = target.attrs.width
        targetRect.height = target.attrs.height

        let currentRotation = target.findOne('.sofa_shape').attrs.rotation
        // console.log('targetRect :>> ', targetRect)
        let newWidth = target.attrs.width
        let newHeight = target.attrs.height
        let newX = targetRect.x / scale
        let newY = targetRect.y / scale
        switch (currentRotation) {
          case 0: {
            // We do nothing
            // console.log('Rotation 0')
            break
          }
          case 90: {
            // console.log('Rotation 90')
            newX = targetRect.x / scale - target.attrs.width
            break
          }
          case 180: {
            // We do nothing
            // might need to modify x, y
            // console.log('Rotation 180')
            newX = targetRect.x / scale - target.attrs.width
            newY = targetRect.y / scale - target.attrs.height
            break
          }
          case 270: {
            // console.log('Rotation 270')
            newX = targetRect.x / scale
            newY = targetRect.y / scale - target.attrs.height
            break
          }
        }
        return {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          rotation: currentRotation,
        }
      }
    }
  }
}

export const tansformTargetToRectWithRotation = target => {
  // Do not mix with other targets...
  if (target.attrs.name === 'sofa_shape_group') {
    var targetRect = target.findOne('.sofa_shape').getClientRect()
    targetRect.width = target.attrs.width
    targetRect.height = target.attrs.height

    let currentRotation = target.findOne('.sofa_shape').attrs.rotation
    // console.log('targetRect :>> ', targetRect)
    let newWidth = target.attrs.width
    let newHeight = target.attrs.height
    let newX = targetRect.x
    let newY = targetRect.y
    switch (currentRotation) {
      case 0: {
        // We do nothing
        // console.log('Rotation 0')
        break
      }
      case 90: {
        // console.log('Rotation 90')
        newX = targetRect.x - target.attrs.width
        break
      }
      case 180: {
        // We do nothing
        // might need to modify x, y
        // console.log('Rotation 180')
        newX = targetRect.x - target.attrs.width
        newY = targetRect.y - target.attrs.height
        break
      }
      case 270: {
        // console.log('Rotation 270')
        newX = targetRect.x
        newY = targetRect.y - target.attrs.height
        break
      }
    }
    return {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: currentRotation,
    }
  }
}

// Finds all seletected components that has armrestoverride parameter, moduleId specifies the specific sofa module that should be overriden
export const getArmrestOverides = selectedComponents => {
  const armOverideArr =
    selectedComponents
      .filter(component => component?.dimensions?.armrest_width != null)
      .map(component => ({
        armrestWidth: component.dimensions.armrest_width,
        moduleId: component.moduleId,
      })) ?? []
  return armOverideArr
}

export const dragBound = (
  scale,
  groupWidth,
  groupHeight,
  stageWidth,
  stageHeight
) => {
  return e => {
    // ---
    // console.log('incoking drag bound e :>> ', e)
    let pos = e
    if (pos) {
      // Left side
      if (pos.x < 0 + METRIC_SIZE * scale) {
        pos.x = 0 + METRIC_SIZE * scale
      }
      // Right side
      if (pos.x + groupWidth * scale > stageWidth) {
        pos.x = stageWidth - groupWidth * scale
      }
      // Top side
      if (pos.y < 0 + METRIC_SIZE * scale) {
        pos.y = 0 + METRIC_SIZE * scale
      }
      // Bottom side
      if (pos.y + groupHeight * scale > stageHeight) {
        pos.y = stageHeight - groupHeight * scale
      }
    }
    return pos
  }
}

export const getSofaShape = shapeType => {
  try {
    const ShapeImport = require(`./SofaElements/${shapeType}`)
    const SofaElement = ShapeImport.default
    return SofaElement
  } catch (error: any) {
    console.warn(`Sofa shape "${shapeType}" not found:`, error?.message)
    return null
  }
}

// Function to detect and calculate extension height for shapes with extensions like recliners
export const getShapeExtensionHeight = item => {
  let extensionHeight = 0

  const shapesWithExtensions = [
    'A1ALEGAR',
    'A1ALEGAL',
    'A1LEGAR',
    'A1LEGAL',
    'A1PLEGAR',
    'A1PLEGAL',
    'FOTELALEGA',
    'FOTELLEGA',
    'FOTELPLEGA',
    'EALEGA',
    'ELEGA',
    'EPLEGA',
  ]

  // Check for recliner extension (seat height)
  if (item.dimensions?.seat_height) {
    extensionHeight += item.dimensions.seat_height + 5 // +5 for spacing between main shape and extension
  }
  if (shapesWithExtensions.includes(item.type)) {
    // Add default extension height if seat_height or extendable_part_length is not available
    extensionHeight = Math.max(extensionHeight, 40) // fallback height for known extension shapes
  }

  // Check for extendable part length (another type of extension)
  if (item.dimensions?.extendable_part_length) {
    extensionHeight = item.dimensions.extendable_part_length + 5 // +5 for spacing between main shape and extension
  }

  return extensionHeight
}

// Draws a vertical zigzag pattern on the canvas context
export const drawVerticalZigzag = (ctx, startX, startY, height) => {
  const zigzagWidth = 8
  const zigzagHeight = 6
  const zigzagCount = Math.floor(height / zigzagHeight)
  const remainHeight = height - zigzagCount * zigzagHeight

  const y = remainHeight / (zigzagCount - 1) / 2
  ctx.moveTo(startX + zigzagWidth - 5, startY + y + zigzagHeight / 2)
  for (let i = 0; i < zigzagCount; i++) {
    const y = i * zigzagHeight + remainHeight / (zigzagCount - 1) / 2

    ctx.lineTo(startX + zigzagWidth - 5, startY + y + zigzagHeight / 2)
    ctx.lineTo(startX + zigzagWidth, startY + y + zigzagHeight)
  }
}
