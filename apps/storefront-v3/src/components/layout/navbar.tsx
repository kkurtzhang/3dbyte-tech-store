"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Heart,
  LogOut,
  MapPin,
  Package,
  Search,
  Settings,
  User,
} from "lucide-react";
import {
  logoutAction,
  getSessionAction,
  type AuthUser,
} from "@/app/actions/auth";
import { SearchCommandDialog } from "@/components/search/search-command-dialog";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/context/wishlist-context";
import { AuthSheet } from "@/features/auth/components/auth-sheet";
import { CartSheet } from "@/features/cart/components/cart-sheet";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu } from "./mobile-menu";

function getCustomerDisplayName(user: AuthUser | null) {
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  return user?.email?.split("@")[0] || "Account";
}

export function Navbar({ blogEnabled = false }: { blogEnabled?: boolean }) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const [sessionUser, setSessionUser] = React.useState<AuthUser | null>(null);
  const accountMenuRef = React.useRef<HTMLDivElement>(null);
  const accountMenuTriggerRef = React.useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { wishlist } = useWishlist();
  const accountLabel = getCustomerDisplayName(sessionUser);

  React.useEffect(() => {
    checkSession();
    setAccountMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!accountMenuOpen) return;

    accountMenuRef.current
      ?.querySelector<HTMLElement>("[role='menuitem']")
      ?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setAccountMenuOpen(false);
        accountMenuTriggerRef.current?.focus();
        return;
      }

      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        return;
      }

      const items = Array.from(
        accountMenuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") || []
      );
      if (!items.length) return;

      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : event.key === "ArrowUp"
              ? (currentIndex - 1 + items.length) % items.length
              : (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !accountMenuRef.current?.contains(event.target) &&
        !accountMenuTriggerRef.current?.contains(event.target)
      ) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [accountMenuOpen]);

  async function checkSession() {
    try {
      const result = await getSessionAction();
      setIsLoggedIn(result.success);
      setSessionUser(result.success ? result.user || null : null);
    } catch (error) {
      setIsLoggedIn(false);
      setSessionUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await logoutAction();
    setIsLoggedIn(false);
    setSessionUser(null);
    setAccountMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Left Section: Mobile Menu + Logo */}
          <div className="flex items-center gap-2">
            <MobileMenu blogEnabled={blogEnabled} />

            <BrandLogo mobileMark priority />
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
              href="/collections"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Collections
            </Link>
            <Link
              href="/brands"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Brands
            </Link>
            <Link
              href="/downloads"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Downloads
            </Link>
            {blogEnabled ? (
              <Link
                href="/blog"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Blog
              </Link>
            ) : null}
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
              <div className="relative">
                <Button
                  ref={accountMenuTriggerRef}
                  variant="ghost"
                  size="icon"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="account-menu"
                  onClick={() => setAccountMenuOpen((current) => !current)}
                  className="sm:h-9 sm:w-auto sm:px-3"
                >
                  <User className="h-5 w-5 sm:mr-2" />
                  <span className="hidden max-w-[9rem] truncate sm:inline-block">
                    {accountLabel}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`ml-2 hidden h-4 w-4 transition-transform sm:block ${
                      accountMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
                {accountMenuOpen ? (
                  <div
                    id="account-menu"
                    ref={accountMenuRef}
                    role="menu"
                    aria-label="Account menu"
                    className="absolute right-0 top-full mt-2 w-64 rounded-md border bg-popover p-2 text-popover-foreground shadow-lg"
                  >
                    <div role="none" className="border-b px-3 py-2 text-xs text-muted-foreground">
                      Signed in as
                      <span className="mt-1 block truncate font-medium text-foreground">
                        {sessionUser?.email}
                      </span>
                    </div>
                    <Link
                      role="menuitem"
                      href="/account"
                      className="mt-2 flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      My Account
                    </Link>
                    <Link
                      role="menuitem"
                      href="/account/orders"
                      className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <Package className="h-4 w-4" />
                      Orders
                    </Link>
                    <Link
                      role="menuitem"
                      href="/account/addresses"
                      className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <MapPin className="h-4 w-4" />
                      Addresses
                    </Link>
                    <Link
                      role="menuitem"
                      href="/account/settings"
                      className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      role="menuitem"
                      type="button"
                      className="mt-2 flex w-full items-center gap-2 rounded-sm border-t px-3 py-2 pt-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAuthOpen(true)}
                className="sm:h-9 sm:w-auto sm:px-3"
              >
                <User className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline-block">Sign In</span>
              </Button>
            )}

            {/* Wishlist */}
            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {wishlist.length}
                  </span>
                )}
                <span className="sr-only">Wishlist</span>
              </Button>
            </Link>

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
      <AuthSheet
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={checkSession}
      />
    </>
  );
}
