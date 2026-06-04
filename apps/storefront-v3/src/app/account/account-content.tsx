import Link from "next/link"
import {
  Download,
  Heart,
  MapPin,
  Package,
  Settings,
  User,
  Wrench,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CustomerData {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
}

const accountActions = [
  {
    href: "/account/settings",
    icon: Settings,
    label: "Manage profile and password",
    text: "Edit your name, phone number, password, and account security.",
  },
  {
    href: "/account/orders",
    icon: Package,
    label: "View orders",
    text: "Track purchases, payment status, and fulfillment progress.",
  },
  {
    href: "/account/addresses",
    icon: MapPin,
    label: "Manage addresses",
    text: "Save shipping and billing addresses for faster checkout.",
  },
  {
    href: "/account/product-files",
    icon: Download,
    label: "Product files",
    text: "Find downloads, manuals, and product resources tied to orders.",
  },
  {
    href: "/account/product-registrations",
    icon: Wrench,
    label: "Product registrations",
    text: "Register products for warranty and support visibility.",
  },
  {
    href: "/wishlist",
    icon: Heart,
    label: "Wishlist",
    text: "Review saved products and continue shopping when ready.",
  },
]

function getDisplayName(customer: CustomerData) {
  const name = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  return name || customer.email || "Customer"
}

export function AccountContent({ customer }: { customer: CustomerData }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Account Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm md:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="mt-1 font-medium">{getDisplayName(customer)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1 font-medium">
                {customer.email || "Not available"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="mt-1 font-medium">
                {customer.phone || "Not added"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {accountActions.map((action) => {
          const Icon = action.icon

          return (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-lg border bg-card p-5 text-card-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="flex items-start gap-3">
                <span className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-medium">{action.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {action.text}
                  </span>
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
