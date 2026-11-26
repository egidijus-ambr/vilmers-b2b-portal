import SkeletonCartPage from "@modules/skeletons/templates/skeleton-cart-page"

// Same skeleton CartTemplate renders while the cart is first fetched, so the
// route-level loading state and the client fetch look identical (no jump).
export default function Loading() {
  return <SkeletonCartPage />
}
