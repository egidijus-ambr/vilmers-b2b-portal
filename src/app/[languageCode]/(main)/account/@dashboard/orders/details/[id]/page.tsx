import { retrieveOrder } from "@lib/data/orders"
import OrderDetailsTemplate from "@modules/order/templates/order-details-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { Order } from "@lib/furnisystems-sdk/modules/customer/types"

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const order = (await retrieveOrder(params.id).catch(
    () => null
  )) as Order | null

  if (!order) {
    return {
      title: "Order Details",
      description: "View your order details",
    }
  }

  return {
    title: `Order #${order.display_id || order.order_code || params.id}`,
    description: `View your order`,
  }
}

export default async function OrderDetailPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    notFound()
  }

  return <OrderDetailsTemplate order={order} />
}
