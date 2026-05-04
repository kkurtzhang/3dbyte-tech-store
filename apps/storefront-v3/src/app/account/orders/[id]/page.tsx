import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { OrderDetails } from "@/app/track-order/page"
import { Button } from "@/components/ui/button"
import { getOrder, ORDER_TRACKING_FIELDS } from "@/lib/medusa/orders"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Order #${id.slice(-8).toUpperCase()}`,
    description: `Order details for order ${id}`,
  }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const order = await getOrder(id, ORDER_TRACKING_FIELDS)

  if (!order) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link href="/account/orders">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
      </Link>

      <OrderDetails order={order} />
    </div>
  )
}
