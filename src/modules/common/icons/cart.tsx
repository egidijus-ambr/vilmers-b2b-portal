import React from "react"

import { IconProps } from "types/icon"

const Cart: React.FC<IconProps> = ({
  size = "16",
  color = "currentColor",
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <path
        d="M4.49089 7.90846C4.51239 7.33966 4.97975 6.88965 5.54895 6.88965H19.9594C20.5132 6.88965 20.9735 7.3164 21.0152 7.86862L21.9139 19.751C21.9604 20.3655 21.4743 20.8896 20.8581 20.8896H5.09962C4.49916 20.8896 4.01886 20.3908 4.04155 19.7908L4.49089 7.90846Z"
        stroke={color}
        strokeWidth="1.2"
      />
      <path
        d="M17.5294 8.84171C17.5294 5.33308 15.3962 2.48877 12.7647 2.48877C10.1332 2.48877 8 5.33308 8 8.84171"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default Cart
