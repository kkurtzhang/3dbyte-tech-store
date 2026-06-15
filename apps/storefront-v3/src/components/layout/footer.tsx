import Link from "next/link";
import { SiGithub, SiX } from "@icons-pack/react-simple-icons";
import { PaymentMethodSupport } from "@/components/ui/payment-method-support";
import { BrandLogo } from "./brand-logo";
import { NewsletterSignup } from "./newsletter-signup";

/**
 * Footer component with 4-column grid layout.
 * Features:
 * - Shop, Support, Resources, and Connect sections
 * - Social media links with icons
 * - Bottom bar with copyright and legal links
 * - Responsive: 4-column (desktop), 2-column (tablet), 1-column (mobile)
 * - Minimalist support navigation with muted text
 */
export function Footer({ blogEnabled = false }: { blogEnabled?: boolean }) {
  return (
    <footer className="border-t bg-background">
      <div className="container py-12 md:py-16">
        <div className="mb-10 flex flex-col gap-4 border-b border-border/60 pb-8 md:flex-row md:items-end md:justify-between">
          <BrandLogo size="footer" />
          <p className="max-w-xl text-sm leading-6 text-muted-foreground md:text-right">
            High-performance filaments, precision hardware, and practical 3D
            printing tools for reliable, repeatable builds.
          </p>
        </div>

        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Shop */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-foreground">
              Shop
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/shop"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/collections"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Collections
                </Link>
              </li>
              <li>
                <Link
                  href="/brands"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Brands
                </Link>
              </li>
              <li>
                <Link
                  href="/deals"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Deals
                </Link>
              </li>
              <li>
                <Link
                  href="/bundles"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Bundles
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Support */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-foreground">
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/help"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/shipping"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Shipping
                </Link>
              </li>
              <li>
                <Link
                  href="/returns"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Returns
                </Link>
              </li>
              <li>
                <Link
                  href="/track-order"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Track Order
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-foreground">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/docs"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Resource Center
                </Link>
              </li>
              <li>
                <Link
                  href="/guides"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Guides
                </Link>
              </li>
              <li>
                <Link
                  href="/downloads"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Download Center
                </Link>
              </li>
              {blogEnabled ? (
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Blog
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-foreground">
              Connect
            </h3>
            <ul className="flex gap-4">
              <li>
                <Link
                  href="https://github.com/3dbyte-tech"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="GitHub"
                >
                  <SiGithub className="h-5 w-5" />
                </Link>
              </li>
              <li>
                <Link
                  href="https://x.com/3dbyte_tech"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Twitter"
                >
                  <SiX className="h-5 w-5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-border/60 bg-muted/30 px-5 py-6 md:px-8 md:py-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] md:items-center">
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Stay In The Loop
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                New drops, restocks, and practical 3D printing notes.
              </h3>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Join the list for product releases, shop updates, and useful
                build guidance without turning the footer into a giant form
                block.
              </p>
            </div>

            <NewsletterSignup
              compact
              variant="default"
              className="w-full rounded-xl border border-border/70 bg-background px-4 py-4 shadow-sm"
            />
          </div>
        </div>

        <div className="mt-12 border-t pt-8">
          <PaymentMethodSupport
            compact
            label="Payments supported"
            className="border-none bg-transparent px-0 py-0"
          />
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 3D Byte Tech. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="/privacy-policy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
