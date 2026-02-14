import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { cn } from "@/lib/utils";
import { CartProvider } from "@/context/cart-context";
import { SavedItemsProvider } from "@/context/saved-items-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { CompareProvider } from "@/context/compare-context";
import { InventoryAlertProvider } from "@/context/inventory-alert-context";
import { SessionProvider } from "@/lib/providers/session-provider";
import { Toaster } from "@/components/ui/toaster";
import { NewsletterPopup } from "@/components/newsletter/newsletter-popup";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { InStockNotification } from "@/components/in-stock-notification";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    template: "%s | 3D Byte Tech Store",
    default: "3D Byte Tech Store - Premium 3D Printing Supplies",
  },
  description:
    "High-performance filaments, Voron kits, and hardware for makers and engineers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
          <NuqsAdapter>
            <CartProvider>
              <SavedItemsProvider>
                <WishlistProvider>
                <CompareProvider>
                <InventoryAlertProvider>
                <div className="relative flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
                <Toaster />
                <NewsletterPopup />
                <InStockNotification />
                </InventoryAlertProvider>
                </CompareProvider>
                </WishlistProvider>
              </SavedItemsProvider>
            </CartProvider>
          </NuqsAdapter>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
