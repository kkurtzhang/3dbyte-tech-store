import { Metadata } from "next"
import {
  getAddressesAction,
  getCustomerAuthHeaders,
  getSessionAction,
  type CustomerAddress,
} from "@/app/actions/auth"
import { redirect } from "next/navigation"
import { buildVerifyRequiredPath } from "@/lib/auth/verification-required"
import { listOrders } from "@/lib/medusa/orders"
import { AccountContent } from "./account-content"
import { VerificationBanner } from "./verification-banner"

const ACCOUNT_DASHBOARD_ORDER_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "created_at",
  "total",
  "currency_code",
]

export const metadata: Metadata = {
  title: "Account Overview",
  description: "View your account overview and manage account activity",
}

interface AccountPageProps {
  searchParams?: Promise<{
    registered?: string | string[]
    verified?: string | string[]
    checkout_blocked?: string | string[]
  }>
}

async function getCustomerData() {
  try {
    const session = await getSessionAction()
    if (!session.success) {
      return null
    }
    return session.user
  } catch (error) {
    console.error("Failed to fetch customer data:", error)
    return null
  }
}

function isDefaultShippingAddress(address: CustomerAddress) {
  return Boolean(
    address.is_default_shipping || address.is_default || address.is_default_billing,
  )
}

async function getOrderDashboardSummary() {
  try {
    const authHeaders = await getCustomerAuthHeaders()
    if (!authHeaders) {
      return { count: null, latestOrder: null }
    }

    const { orders, count } = await listOrders(
      {
        limit: 1,
        fields: ACCOUNT_DASHBOARD_ORDER_FIELDS,
      },
      authHeaders,
    )

    return {
      count,
      latestOrder: orders[0] || null,
    }
  } catch (error) {
    console.error("Failed to fetch account dashboard orders:", error)
    return { count: null, latestOrder: null }
  }
}

async function getAddressDashboardSummary() {
  try {
    const result = await getAddressesAction()

    if (!result.success) {
      return { count: null, hasDefaultShippingAddress: false }
    }

    return {
      count: result.addresses.length,
      hasDefaultShippingAddress: result.addresses.some(isDefaultShippingAddress),
    }
  } catch (error) {
    console.error("Failed to fetch account dashboard addresses:", error)
    return { count: null, hasDefaultShippingAddress: false }
  }
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const customer = await getCustomerData()

  if (!customer) {
    redirect("/sign-in")
    return null
  }

  if (customer.email_verified === false) {
    redirect(buildVerifyRequiredPath({ source: "account" }))
    return null
  }

  const params = await searchParams
  const registered = Array.isArray(params?.registered)
    ? params.registered[0]
    : params?.registered
  const verified = Array.isArray(params?.verified)
    ? params.verified[0]
    : params?.verified
  const checkoutBlocked = Array.isArray(params?.checkout_blocked)
    ? params.checkout_blocked[0]
    : params?.checkout_blocked
  const [orderSummary, addressSummary] = await Promise.all([
    getOrderDashboardSummary(),
    getAddressDashboardSummary(),
  ])

  return (
    <div className="space-y-6">
      <VerificationBanner
        registered={registered}
        verified={verified}
        checkoutBlocked={checkoutBlocked}
      />

      <div>
        <h1 className="text-2xl font-semibold">Account Overview</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Review your account details and jump into common account tasks.
        </p>
      </div>

      <AccountContent
        customer={customer}
        dashboard={{
          addressCount: addressSummary.count,
          hasDefaultShippingAddress: addressSummary.hasDefaultShippingAddress,
          hasPhone: Boolean(customer.phone),
          isEmailVerified: true,
          latestOrder: orderSummary.latestOrder,
          orderCount: orderSummary.count,
        }}
      />
    </div>
  )
}
