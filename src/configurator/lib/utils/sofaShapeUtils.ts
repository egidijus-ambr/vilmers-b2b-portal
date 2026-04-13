export enum ArmrestsPosition {
  LEFT = 'left',
  RIGHT = 'right',
  BOTH = 'both',
  NONE = 'none',
}

export const getArmrestsPosition = (shapeType) => {
  if (!shapeType) return null
  const lastSymbol = shapeType?.slice(-1)

  if (shapeType.includes('SOFA') || shapeType.includes('FOTEL')) {
    return ArmrestsPosition.BOTH
  }

  if (lastSymbol === 'L') {
    return ArmrestsPosition.LEFT
  } else if (lastSymbol === 'R') {
    return ArmrestsPosition.RIGHT
  }
  return ArmrestsPosition.NONE
}
