export const rectangleWithRoundEnd = (
  ctx,
  shapeWidth,
  shapeHeight,
  position = { x: 0, y: 0 },
) => {
  const { x, y } = position

  const radius = shapeWidth / 2
  ctx.beginPath()
  ctx.moveTo(shapeWidth + x, shapeHeight - radius + y)
  ctx.arc(radius + x, shapeHeight - radius + y, radius, 0, Math.PI, 0)
  ctx.lineTo(x, y)
  ctx.lineTo(shapeWidth + x, y)
  ctx.lineTo(shapeWidth + x, shapeHeight - radius + y)
  ctx.closePath()
}
