"use client";

import * as React from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/features/cart/components/cart-sheet";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu } from "./mobile-menu";
import { SearchCommandDialog } from "@/components/search/search-command-dialog";
import { AuthSheet } from "@/features/auth/components/auth-sheet";

/**
 * Navbar component for the main site navigation.
 * Features:
 * - Logo with "The Lab" badge (left)
 * - Desktop navigation links (center)
 * - Action buttons: Search (Cmd+K), Account, Cart, Theme Toggle (right)
 * - Mobile hamburger menu
 * - Sticky header with backdrop blur
 * - Command palette search dialog
 * - Authentication sheet for quick login/register
 */
export function Navbar() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);

  return (
    <>
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
              href="/shop"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Shop
            </Link>
            <Link
              href="/brands"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Brands
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Blog
            </Link>
          </nav>

          {/* Right Section: Actions */}
          <div className="flex items-center gap-1">
            {/* Search Trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>

            {/* Search Hint (Desktop only) */}
            <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>

            {/* Account Trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAuthOpen(true)}
            >
              <User className="h-5 w-5" />
              <span className="sr-only">Account</span>
            </Button>

            {/* Cart Sheet */}
            <CartSheet />

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Search Command Dialog */}
      <SearchCommandDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Auth Sheet */}
      <AuthSheet open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
