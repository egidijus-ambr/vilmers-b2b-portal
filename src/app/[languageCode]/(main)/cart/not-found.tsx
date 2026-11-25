import { Metadata } from "next"

import CartNotFoundContent from "./not-found-content"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default function NotFound() {
  return <CartNotFoundContent />
}
