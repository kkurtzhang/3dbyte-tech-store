import { getCartAction } from "@/app/actions/cart"
import { redirect } from "next/navigation"
import { CheckoutForm } from "@/features/checkout/components/checkout-form"
import { CheckoutSummary } from "@/features/checkout/components/checkout-summary"

export default async function CheckoutPage() {
  const cart = await getCartAction()

  if (!cart || !cart.items?.length) {
    redirect("/")
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <h1 className="mb-8 text-2xl font-bold tracking-tight">System_Acquisition</h1>
        <CheckoutForm cart={cart} />
      </div>
      <div className="lg:col-span-5">
        <CheckoutSummary cart={cart} />
      </div>
    </div>
  )
}
