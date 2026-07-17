import { getCartAction } from "@/app/actions/cart"
import { getSessionAction } from "@/app/actions/auth"
import { redirect } from "next/navigation"
import { buildVerifyRequiredPath } from "@/lib/auth/verification-required"
import { CheckoutForm } from "@/features/checkout/components/checkout-form"
import { CheckoutSummary } from "@/features/checkout/components/checkout-summary"
import { CheckoutSummaryEstimateProvider } from "@/features/checkout/components/checkout-summary-estimate-context"

export default async function CheckoutPage() {
  const [cart, session] = await Promise.all([
    getCartAction(),
    getSessionAction(),
  ])

  if (!cart || !cart.items?.length) {
    redirect("/")
  }

  if (session.success && session.user?.email_verified === false) {
    redirect(
      buildVerifyRequiredPath({
        redirectTo: "/checkout",
        source: "checkout",
      }),
    )
  }

  return (
    <CheckoutSummaryEstimateProvider>
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <h1 className="mb-8 text-2xl font-bold tracking-tight">Checkout</h1>
          <CheckoutForm cart={cart} />
        </div>
        <div className="hidden space-y-6 lg:sticky lg:top-24 lg:col-span-5 lg:block lg:self-start">
          <CheckoutSummary cart={cart} />
        </div>
      </div>
    </CheckoutSummaryEstimateProvider>
  )
}
