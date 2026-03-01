import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Mail,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  User,
} from "lucide-react";
import { ContentSearchBox } from "@/features/search/components/content-search-box";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Find answers to common questions and contact 3DByte Tech support.",
};

export default function HelpPage() {
  const categories = [
    {
      title: "Shipping",
      description: "Delivery windows, methods, and shipping restrictions.",
      icon: Package,
      href: "/shipping",
      articles: [
        "How long does delivery take?",
        "What shipping options can I choose?",
        "Do you ship internationally?",
      ],
    },
    {
      title: "Returns",
      description: "Eligibility, return flow, and refund timelines.",
      icon: RefreshCw,
      href: "/returns",
      articles: [
        "How to start a return",
        "Refund processing times",
        "Items that cannot be returned",
      ],
    },
    {
      title: "Orders",
      description: "Order status, tracking, and post-purchase updates.",
      icon: ShoppingBag,
      href: "/track-order",
      articles: [
        "Track an existing order",
        "Where to find tracking details",
        "What to do if tracking stalls",
      ],
    },
    {
      title: "Account",
      description: "Sign-in, profile management, and saved items.",
      icon: User,
      href: "/account",
      articles: [
        "Reset account access",
        "Update account details",
        "Manage saved products",
      ],
    },
  ];

  const popularResources = [
    { title: "Track your order", category: "Orders", href: "/track-order" },
    { title: "Shipping policy", category: "Shipping", href: "/shipping" },
    { title: "Returns and refunds", category: "Returns", href: "/returns" },
    { title: "Frequently asked questions", category: "FAQ", href: "/faq" },
    { title: "Contact support", category: "Support", href: "/contact" },
    { title: "Manage account settings", category: "Account", href: "/account/settings" },
  ];

  const contactOptions = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Open your email app and send us your issue details.",
      value: "support@3dbyte.tech",
      action: "Email Support",
      href: "mailto:support@3dbyte.tech",
    },
    {
      icon: MessageCircle,
      title: "Support Form",
      description: "Use our guided form for order, product, and account issues.",
      value: "Best for detailed requests",
      action: "Open Contact Form",
      href: "/contact",
    },
    {
      icon: Package,
      title: "Track an Order",
      description: "Check shipping progress using your order number and email.",
      value: "Live order status lookup",
      action: "Track Order",
      href: "/track-order",
    },
  ];

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Help Center</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Find fast answers for shipping, returns, account, and order support.
        </p>
      </div>

      <div className="mb-16 rounded-xl border bg-card p-8">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Need a quick answer?</h2>
            <p className="text-muted-foreground mt-2">
              Start with our FAQ or jump straight to order tracking.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Search className="h-4 w-4" />
              Browse FAQ
            </Link>
            <Link
              href="/track-order"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Package className="h-4 w-4" />
              Track Order
            </Link>
          </div>
        </div>
        <div className="mt-6">
          <ContentSearchBox
            scope="help"
            placeholder="Search help articles and product support..."
          />
        </div>
      </div>

      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-8">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="group rounded-lg border bg-card p-6 hover:border-primary transition-colors"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                  <category.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </div>

              <ul className="space-y-2">
                {category.articles.map((article) => (
                  <li key={article} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    {article}
                  </li>
                ))}
              </ul>

              <div className="mt-4 text-sm text-primary font-medium inline-flex items-center gap-1">
                Open {category.title}
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-8">Popular Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularResources.map((resource) => (
            <Link
              key={resource.title}
              href={resource.href}
              className="group flex items-start gap-3 p-4 rounded-lg border hover:border-primary transition-colors hover:bg-accent/50"
            >
              <div className="flex-1">
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors mb-1">
                  {resource.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-0.5 rounded">{resource.category}</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-8">Contact Support</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contactOptions.map((option) => (
            <div key={option.title} className="rounded-lg border bg-card p-6 hover:border-primary transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <option.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{option.title}</h3>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
              <p className="text-sm font-medium mb-4">{option.value}</p>

              {option.href.startsWith("mailto:") ? (
                <a
                  href={option.href}
                  className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {option.action}
                </a>
              ) : (
                <Link
                  href={option.href}
                  className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {option.action}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 pt-16 border-t">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/faq" className="hover:text-primary transition-colors flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            FAQ
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link href="/contact" className="hover:text-primary transition-colors flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            Contact
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link href="/returns" className="hover:text-primary transition-colors flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Returns
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link href="/shipping" className="hover:text-primary transition-colors flex items-center gap-1">
            <Package className="h-4 w-4" />
            Shipping
          </Link>
        </div>
      </section>
    </div>
  );
}
