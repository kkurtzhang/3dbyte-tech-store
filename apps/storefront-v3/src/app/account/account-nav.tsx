"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { logoutAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const accountNavItems = [
  { label: "Overview", href: "/account" },
  { label: "Settings", href: "/account/settings" },
  { label: "Orders", href: "/account/orders" },
  { label: "Product Files", href: "/account/product-files" },
  { label: "Registrations", href: "/account/product-registrations" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Waitlist", href: "/waitlist" },
]

export function AccountNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await logoutAction()
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Sign out error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
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
            disabled={isLoading}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoading ? "Signing out..." : "Sign Out"}
          </Button>
        </nav>
      </aside>

      <div className="md:hidden">
        <div className="mb-6">
          <label htmlFor="account-nav" className="sr-only">
            Navigate account sections
          </label>
          <select
            id="account-nav"
            value={pathname}
            onChange={(e) => {
              router.push(e.target.value)
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
          disabled={isLoading}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoading ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </>
  )
}
