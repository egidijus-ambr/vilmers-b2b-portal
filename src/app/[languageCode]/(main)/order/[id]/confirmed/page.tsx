import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your order was placed successfully",
}

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] py-12">
      <div className="bg-white max-w-lg w-full p-10 text-center">
        <h1 className="text-[2rem] font-light text-dark-blue mb-4">
          Thank you!
        </h1>
        <p className="text-base text-ui-fg-subtle mb-2">
          Your order was placed successfully.
        </p>
        <p className="text-sm text-ui-fg-muted mb-8">
          Order ID: {id}
        </p>
        <LocalizedClientLink
          href="/store"
          className="text-sm text-dark-blue underline"
        >
          Continue shopping
        </LocalizedClientLink>
      </div>
    </div>
  )
}
