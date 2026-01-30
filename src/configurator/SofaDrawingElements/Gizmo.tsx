import { Circle, Group, Line } from 'react-konva'

interface CircleLineProps {
  // color: string
  settings: {
    x: number
    y: number
    type: string
    rotation?: number
  }
  shapeRotation?: number
  shapeWidth?: number
  shapeHeight?: number
}

function rotateRectangleCorner(
  rectangleWidth,
  rectangleHeight,
  { x, y },
  degrees,
) {
  // Calculate rotated position of corner A
  let newX, newY

  const difX = rectangleWidth - x
  const difY = rectangleHeight - y

  if (degrees === 0) {
    // No change in position for 90 degrees rotation
    newX = rectangleWidth - difX
    newY = rectangleHeight - difY
  } else if (degrees === 90) {
    // 90 degrees rotation
    newX = difY
    newY = rectangleWidth - difX
  } else if (degrees === 180) {
    // 270 degrees rotation
    newX = difX
    newY = difY
  } else if (degrees === 270) {
    // 270 degrees rotation
    newX = rectangleHeight - difY
    newY = difX
  } else {
    // Handle other degrees of rotation if needed
    // ...
  }

  return { x: newX, y: newY }
}

const Gizmo: React.FC<CircleLineProps> = ({
  settings,
  shapeRotation = 0,
  shapeWidth = 50,
  shapeHeight = 50,
}) => {
  if (process.env.NEXT_PUBLIC_SHOW_SOFA_SHAPE_GIZMO !== 'true') {
    return null
  }

  const { x, y, type, rotation = 0 } = settings

  const rotatedRect = rotateRectangleCorner(
    shapeWidth,
    shapeHeight,
    { x, y },
    shapeRotation,
  )

  //translate cordinates based on rotation
  const newX = rotatedRect.x
  const newY = rotatedRect.y
  // console.log(type, { x, y }, shapeRotation, { newX, newY })

  let color = 'orange'
  let direction = 1
  const isLeft = type === 'left' ? true : false

  if (isLeft) {
    color = 'blue'
    direction = -1
  }
  if (!isLeft) {
    color = 'red'
    direction = 1
  }

  return (
    <Group x={newX} y={newY} opacity={0.8} rotation={rotation + shapeRotation}>
      {/* <Line points={[0, 0, direction * 20,  0]} stroke={color} strokeWidth={3} /> */}
      <Line points={[0, 0, 0, 20]} stroke={color} strokeWidth={5} />
      {/* <Circle x={0} y={0} radius={5} fill={color} /> */}
    </Group>
  )
}

export default Gizmo
