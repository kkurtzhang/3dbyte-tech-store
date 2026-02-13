import Link from "next/link";
import { SiGithub, SiX, SiDiscord } from "@icons-pack/react-simple-icons";
import { NewsletterSignup } from "./newsletter-signup";

/**
 * Footer component with 4-column grid layout.
 * Features:
 * - Shop, Support, The Lab, and Connect sections
 * - Social media links with icons
 * - Bottom bar with copyright and legal links
 * - Responsive: 4-column (desktop), 2-column (tablet), 1-column (mobile)
 * - "The Lab" aesthetic: minimalist, monospace headers, muted text
 */
export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-12 md:py-16">
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
                  href="/shop?category=Filament"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Filaments
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=Printers"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Printers
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=Components"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Components
                </Link>
              </li>
              <li>
                <Link
                  href="/shop"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  All Products
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
                  href="#"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Returns
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
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: The Lab */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-foreground">
              The Lab
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/docs"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Documentation
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
                  href="/community"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Community
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Blog
                </Link>
              </li>
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
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="GitHub"
                >
                  <SiGithub className="h-5 w-5" />
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Twitter"
                >
                  <SiX className="h-5 w-5" />
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Discord"
                >
                  <SiDiscord className="h-5 w-5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-12">
          <NewsletterSignup compact={false} variant="default" />
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2024 3D Byte Tech. All rights reserved.
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
