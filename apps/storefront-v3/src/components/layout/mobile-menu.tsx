"use client"

import { Menu, Search, User } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "./theme-toggle"

/**
 * MobileMenu component for navigation on mobile devices.
 * Opens in a Sheet overlay with all navigation links.
 */
export function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="font-mono uppercase tracking-wider">
            Navigation
          </SheetTitle>
        </SheetHeader>

        <Separator className="my-4" />

        <nav className="flex flex-col space-y-4">
          {/* Main Navigation Links */}
          <div className="flex flex-col space-y-3">
            <Link
              href="/products"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Products
            </Link>
            <Link
              href="/resources"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Resources
            </Link>
          </div>

          <Separator />

          {/* Action Items */}
          <div className="flex flex-col space-y-3">
            <Link
              href="/search"
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
            >
              <Search className="h-4 w-4" />
              Search
            </Link>
            <Link
              href="/account"
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
            >
              <User className="h-4 w-4" />
              Account
            </Link>
          </div>

          <Separator />

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Theme</span>
            <ThemeToggle />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
