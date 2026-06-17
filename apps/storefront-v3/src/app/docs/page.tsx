import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Download,
  FileText,
  LifeBuoy,
  Newspaper,
  PackageCheck,
  Search,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Resource Center",
  description:
    "Find downloads, guides, support articles, blog posts, and account-only product files from 3D Byte Tech.",
};

export const dynamic = "force-dynamic"

const primaryResources = [
  {
    title: "Download Center",
    description:
      "Public manuals, datasheets, safety sheets, warranty notes, and install files.",
    href: "/downloads",
    icon: Download,
    tone: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  {
    title: "3D Printing Guides",
    description:
      "Learning paths for calibration, maintenance, filament choice, and troubleshooting.",
    href: "/guides",
    icon: BookOpen,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    title: "Help Center",
    description:
      "Shipping, returns, orders, account tasks, and ways to reach the support team.",
    href: "/help",
    icon: LifeBuoy,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    title: "Account Product Files",
    description:
      "Register product serials and access entitled firmware or restricted files.",
    href: "/account/product-files",
    icon: PackageCheck,
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
];

const secondaryResources = [
  {
    title: "Blog",
    description: "News, maker notes, product education, and deeper buying context.",
    href: "/blog",
    icon: Newspaper,
  },
  {
    title: "Warranty and returns",
    description: "Understand return windows, warranty support, and return steps.",
    href: "/returns",
    icon: ShieldCheck,
  },
  {
    title: "FAQ",
    description: "Quick answers for shipping, checkout, compatibility, and accounts.",
    href: "/faq",
    icon: FileText,
  },
];

export default function DocsPage() {
  return (
    <main className="bg-background">
      <section className="border-b bg-muted/30">
        <div className="container grid gap-8 py-12 md:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] md:items-end md:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Customer Resources
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Resource Center
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
              One place for files, how-to content, account downloads, and support
              paths. Product-specific documents stay easy to find without mixing
              them into learning articles.
            </p>
          </div>

          <div className="rounded-lg border bg-background p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-primary/10 p-2 text-primary">
                <Search className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-semibold">Start With Intent</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Need a file? Use downloads. Need to learn? Use guides. Need
                  help with an order? Use support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-2">
          {primaryResources.map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/70 hover:bg-accent/30"
            >
              <div className="flex items-start gap-4">
                <span className={`rounded-md p-3 ${resource.tone}`}>
                  <resource.icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold">
                      {resource.title}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                    {resource.description}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/20">
        <div className="container py-10 md:py-14">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                More Useful Places
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                These pages stay focused on customer jobs instead of internal
                content-type names.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary"
            >
              Contact support
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {secondaryResources.map((resource) => (
              <Link
                key={resource.href}
                href={resource.href}
                className="group rounded-lg border bg-background p-5 transition-colors hover:border-primary/60"
              >
                <resource.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                <h3 className="mt-4 font-semibold">{resource.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {resource.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
