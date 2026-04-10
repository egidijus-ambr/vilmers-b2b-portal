// Ported from furnibay-frontend-shop/src/utilityFunctions/sofaShapeUtils.ts
// Pure functions — no Apollo or framework dependencies.

export enum ArmrestsPosition {
  LEFT = "left",
  RIGHT = "right",
  BOTH = "both",
  NONE = "none",
}

/**
 * Determine armrest position from the sofa shape type string.
 * Shapes ending in 'L' have left armrest, 'R' have right.
 * SOFA/FOTEL types have both armrests.
 */
export const getArmrestsPosition = (shapeType: string | null | undefined): ArmrestsPosition | null => {
  if (!shapeType) return null
  const lastSymbol = shapeType.slice(-1)

  if (shapeType.includes("SOFA") || shapeType.includes("FOTEL")) {
    return ArmrestsPosition.BOTH
  }

  if (lastSymbol === "L") {
    return ArmrestsPosition.LEFT
  } else if (lastSymbol === "R") {
    return ArmrestsPosition.RIGHT
  }

  return ArmrestsPosition.NONE
}

/**
 * Adjust sofa form dimensions based on new armrest width.
 * Mutates the shape.dimensions in place.
 */
export const setNewSize = (
  shape: {
    type: string
    originalDimension: { width: number; height: number }
    dimensions: { width: number; armrest_width?: number }
  },
  armrestWidth: number
) => {
  let armsCount = 0
  const armrestsPosition = getArmrestsPosition(shape.type)

  if (armrestsPosition === ArmrestsPosition.BOTH) {
    armsCount = 2
  } else if (
    armrestsPosition === ArmrestsPosition.LEFT ||
    armrestsPosition === ArmrestsPosition.RIGHT
  ) {
    armsCount = 1
  }

  const defaultArmrestWidth = shape.dimensions.armrest_width ?? 16
  const sizeWithoutArmrests = shape.originalDimension.width - armsCount * defaultArmrestWidth
  shape.dimensions.width = sizeWithoutArmrests + armsCount * armrestWidth
  shape.dimensions.armrest_width = armrestWidth
}
