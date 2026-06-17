import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { getCustomerAuthHeaders } from '@/app/actions/auth'
import { OrderDetails } from '@/app/track-order/track-order-client'
import { Button } from '@/components/ui/button'
import { getOrder, ORDER_TRACKING_FIELDS } from '@/lib/medusa/orders'

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
  const authHeaders = await getCustomerAuthHeaders()
  const order = authHeaders ? await getOrder(id, ORDER_TRACKING_FIELDS, authHeaders) : null

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
