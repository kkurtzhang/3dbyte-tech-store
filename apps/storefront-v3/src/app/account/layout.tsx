"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/**
 * Account layout with hybrid navigation:
 * - Desktop: Sidebar navigation (left) with main content (right)
 * - Mobile: Dropdown/select menu at top with stacked content below
 */

interface AccountNavItem {
  label: string
  href: string
}

const accountNavItems: AccountNavItem[] = [
  { label: "Profile", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Addresses", href: "/account/addresses" },
]

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const handleSignOut = () => {
    // TODO: Implement sign out when Medusa integration is complete
    console.log("Sign out clicked")
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8 md:flex-row">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:block w-[250px] shrink-0">
          <nav className="space-y-1">
            <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider">
              Account
            </h2>
            {accountNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            <Separator className="my-4" />
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="mb-6">
            <label htmlFor="account-nav" className="sr-only">
              Navigate account sections
            </label>
            <select
              id="account-nav"
              value={pathname}
              onChange={(e) => {
                window.location.href = e.target.value
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {accountNavItems.map((item) => (
                <option key={item.href} value={item.href}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            className="w-full mb-6"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
