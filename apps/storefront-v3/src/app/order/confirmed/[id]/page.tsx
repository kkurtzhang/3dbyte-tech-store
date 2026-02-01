import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PrintButton } from "@/components/print-button"
import { getOrder } from "@/lib/medusa/orders"
import { OrderSummary } from "@/features/order/components/order-summary"

interface OrderConfirmedPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderConfirmedPage({
  params,
}: OrderConfirmedPageProps) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Order Confirmed
        </h1>
        <p className="text-muted-foreground">
          Thank you for your purchase. We've received your order.
        </p>
      </div>

      {/* Order Summary */}
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border bg-card p-6 md:p-8">
          <h2 className="mb-6 text-xl font-semibold">Order Details</h2>
          <OrderSummary order={order} />
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="flex-1 sm:flex-none">
            <Link href="/">Continue Shopping</Link>
          </Button>
          <PrintButton className="flex-1 sm:flex-none">
            Print Receipt
          </PrintButton>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({
  params,
}: OrderConfirmedPageProps): Promise<Metadata> {
  const { id } = await params

  return {
    title: `Order ${id} - Confirmed`,
    description: "Your order has been confirmed. View your order details here.",
  }
}
