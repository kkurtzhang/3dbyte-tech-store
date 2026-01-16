"use client"

import Link from "next/link"
import { Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CartSheet } from "@/features/cart/components/cart-sheet"
import { ThemeToggle } from "./theme-toggle"
import { MobileMenu } from "./mobile-menu"

/**
 * Navbar component for the main site navigation.
 * Features:
 * - Logo with "The Lab" badge (left)
 * - Desktop navigation links (center)
 * - Action buttons: Search, Account, Cart, Theme Toggle (right)
 * - Mobile hamburger menu
 * - Sticky header with backdrop blur
 */
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Left Section: Mobile Menu + Logo */}
        <div className="flex items-center gap-2">
          <MobileMenu />

          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-lg">3D Byte</span>
            <span className="hidden sm:inline-flex items-center rounded-sm border border-border bg-muted px-2 py-0.5 text-xs font-mono uppercase tracking-wider">
              The Lab
            </span>
          </Link>
        </div>

        {/* Center Section: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
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
        </nav>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1">
          {/* Search Trigger */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/search">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>

          {/* Search Hint (Desktop only) */}
          <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>

          {/* Account Trigger */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account">
              <User className="h-5 w-5" />
              <span className="sr-only">Account</span>
            </Link>
          </Button>

          {/* Cart Sheet */}
          <CartSheet />

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
