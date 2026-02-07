"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/features/cart/components/cart-sheet";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu } from "./mobile-menu";
import { SearchCommandDialog } from "@/components/search/search-command-dialog";
import { AuthSheet } from "@/features/auth/components/auth-sheet";
import { logoutAction, getSessionAction } from "@/app/actions/auth";

export function Navbar() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const result = await getSessionAction();
      setIsLoggedIn(result.success);
    } catch (error) {
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await logoutAction();
    setIsLoggedIn(false);
    router.push("/");
    router.refresh();
  }

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
            <Link
              href="/gift-cards"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Gift Cards
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              About
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

            {/* Account */}
            {isLoading ? (
              <Button variant="ghost" size="icon" disabled>
                <User className="h-5 w-5 animate-pulse" />
              </Button>
            ) : isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link href="/account">
                  <Button variant="ghost" size="sm">
                    <User className="h-5 w-5 mr-2" />
                    My Account
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAuthOpen(true)}
              >
                <User className="h-5 w-5 mr-2" />
                Sign In
              </Button>
            )}

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
