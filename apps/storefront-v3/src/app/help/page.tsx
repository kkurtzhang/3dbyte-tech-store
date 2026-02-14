import { Metadata } from "next";
import { Search, Mail, Phone, MessageCircle, ArrowRight, Package, RefreshCw, User, ShoppingBag, CreditCard, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Find answers to your questions and get support for 3DByte Tech products.",
};

export default function HelpPage() {
  const categories = [
    {
      title: "Shipping",
      description: "Track orders, shipping methods, and delivery times",
      icon: Package,
      articles: [
        "How long does shipping take?",
        "What shipping methods are available?",
        "Can I change my shipping address?",
        "International shipping information",
      ],
    },
    {
      title: "Returns",
      description: "Return policy, refunds, and exchanges",
      icon: RefreshCw,
      articles: [
        "How do I return an item?",
        "What is your return policy?",
        "How long do refunds take?",
        "Exchange process",
      ],
    },
    {
      title: "Account",
      description: "Account management, login issues, and preferences",
      icon: User,
      articles: [
        "How to create an account",
        "Reset password",
        "Update personal information",
        "Manage email preferences",
      ],
    },
    {
      title: "Orders",
      description: "Order status, tracking, and modifications",
      icon: ShoppingBag,
      articles: [
        "Check order status",
        "Cancel or modify an order",
        "Order confirmation email",
        "Order history",
      ],
    },
    {
      title: "Payment",
      description: "Payment methods, billing, and security",
      icon: CreditCard,
      articles: [
        "Accepted payment methods",
        "Secure payment process",
        "Payment failed issues",
        "Billing information",
      ],
    },
  ];

  const popularArticles = [
    { title: "How to track your order", category: "Orders", views: "2.5k" },
    { title: "Return and refund policy", category: "Returns", views: "2.1k" },
    { title: "Shipping times and methods", category: "Shipping", views: "1.8k" },
    { title: "Creating and managing your account", category: "Account", views: "1.5k" },
    { title: "Accepted payment methods", category: "Payment", views: "1.3k" },
    { title: "How to cancel an order", category: "Orders", views: "1.2k" },
  ];

  const contactOptions = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email. We typically respond within 24 hours.",
      value: "support@3dbyte.tech",
      action: "Email Us",
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak directly with our support team during business hours.",
      value: "+61 3 6123 4567",
      action: "Call Now",
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with us in real-time for quick answers.",
      value: "Available Mon-Fri 9AM-5PM AEST",
      action: "Start Chat",
    },
  ];

  return (
    <div className="container py-12 md:py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Help Center
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          How can we help you today? Search our knowledge base or browse our categories below.
        </p>
      </div>

      {/* Search Section */}
      <div className="mb-16 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search for help..."
            className="w-full rounded-lg border bg-background pl-12 pr-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* FAQ Categories */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-8">
          Browse by Category
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.title}
              className="group rounded-lg border bg-card p-6 hover:border-primary transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                  <category.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {category.articles.slice(0, 3).map((article) => (
                  <li key={article} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                    {article}
                  </li>
                ))}
              </ul>
              {category.articles.length > 3 && (
                <div className="mt-4 text-sm text-primary font-medium flex items-center gap-1">
                  View all {category.articles.length} articles
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Popular Articles */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-8">
          Popular Articles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularArticles.map((article) => (
            <a
              key={article.title}
              href="#"
              className="group flex items-start gap-3 p-4 rounded-lg border hover:border-primary transition-colors hover:bg-accent/50"
            >
              <div className="flex-1">
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors mb-1">
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-0.5 rounded">{article.category}</span>
                  <span>•</span>
                  <span>{article.views} views</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </a>
          ))}
        </div>
      </section>

      {/* Contact Support */}
      <section>
        <h2 className="text-2xl font-semibold mb-8">
          Contact Support
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contactOptions.map((option) => (
            <div
              key={option.title}
              className="rounded-lg border bg-card p-6 hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <option.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{option.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {option.description}
              </p>
              <div className="mb-4">
                <p className="text-sm font-medium">{option.value}</p>
              </div>
              <button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                {option.action}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="mt-16 pt-16 border-t">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <a href="/faq" className="hover:text-primary transition-colors flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            View FAQ
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="/contact" className="hover:text-primary transition-colors flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            Contact Us
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="/returns" className="hover:text-primary transition-colors flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Returns Policy
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="/shipping" className="hover:text-primary transition-colors flex items-center gap-1">
            <Package className="h-4 w-4" />
            Shipping Info
          </a>
        </div>
      </section>
    </div>
  );
}
