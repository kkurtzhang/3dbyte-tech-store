import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Download,
  Layers,
  Search,
  Settings,
  Wrench,
} from "lucide-react";

import { NewsletterSignup } from "@/components/layout/newsletter-signup";
import { ContentSearchBox } from "@/features/search/components/content-search-box";
import { getBlogPostCategories, getBlogPosts } from "@/lib/strapi/content";
import type { BlogPost, BlogPostCategory } from "@/lib/strapi/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "3D Printing Guides",
  description:
    "Practical 3D printing guides for maintenance, calibration, filament selection, and troubleshooting.",
};

const fallbackTopics = [
  {
    title: "Printer Maintenance",
    description: "Keep motion systems, nozzles, beds, and electronics reliable.",
    href: "/blog?category=maintenance",
    icon: Wrench,
  },
  {
    title: "Filament Selection",
    description: "Choose materials by strength, temperature, finish, and print risk.",
    href: "/blog?category=filament-selection",
    icon: Layers,
  },
  {
    title: "Calibration",
    description: "Tune first layers, flow, pressure advance, temperature, and speed.",
    href: "/blog?category=calibration",
    icon: Settings,
  },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getCategoryLabel(post: BlogPost) {
  return post.Categories?.[0]?.Title || "Guide";
}

function getCategoryHref(category: BlogPostCategory) {
  return `/blog?category=${category.Slug}`;
}

function normalizeCategories(categories: BlogPostCategory[]) {
  return categories.filter((category) => category.Title && category.Slug);
}

async function loadGuideContent() {
  try {
    const [postsResponse, categoriesResponse] = await Promise.all([
      getBlogPosts({ limit: 6 }),
      getBlogPostCategories(),
    ]);

    return {
      posts: postsResponse.data || [],
      categories: normalizeCategories(categoriesResponse.data || []),
    };
  } catch {
    return {
      posts: [] as BlogPost[],
      categories: [] as BlogPostCategory[],
    };
  }
}

export default async function GuidesPage() {
  const { posts, categories } = await loadGuideContent();
  const featuredPosts = posts.slice(0, 3);
  const topicLinks =
    categories.length > 0
      ? categories.slice(0, 6).map((category) => ({
          title: category.Title,
          description: "Browse related tutorials, comparisons, and practical notes.",
          href: getCategoryHref(category),
          icon: BookOpen,
        }))
      : fallbackTopics;

  return (
    <main>
      <section className="border-b bg-muted/30">
        <div className="container grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] md:items-end md:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Learning Hub
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              3D Printing Guides
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
              Practical learning content from the CMS: maintenance, calibration,
              filament choice, troubleshooting, and setup notes. Product files
              still live in the Download Center.
            </p>
          </div>

          <div className="rounded-lg border bg-background p-4 shadow-sm">
            <ContentSearchBox
              scope="guides"
              placeholder="Search guides and tutorials..."
            />
          </div>
        </div>
      </section>

      <section className="container py-10 md:py-14">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured Guides
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pulled from CMS blog content so the storefront stays current.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            View all articles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredPosts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {featuredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.Slug}`}
                className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/70 hover:bg-accent/30"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                >
                  {getCategoryLabel(post)}
                </span>
                <h3 className="mt-4 text-lg font-semibold leading-6 group-hover:text-primary">
                  {post.Title}
                </h3>
                {post.Excerpt ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {post.Excerpt}
                  </p>
                ) : null}
                <span className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
                  <time dateTime={post.publishedAt}>
                    {formatDate(post.publishedAt)}
                  </time>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">Guides are coming from CMS</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Publish guide-style blog posts or categories in Strapi and this
              page will fill itself from managed content.
            </p>
          </div>
        )}
      </section>

      <section className="border-t bg-muted/20">
        <div className="container py-10 md:py-14">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Browse by Topic
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Categories are pulled from CMS when available, with practical
              fallback topics for a new content library.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {topicLinks.map((topic) => (
              <Link
                key={topic.href}
                href={topic.href}
                className="group rounded-lg border bg-background p-5 transition-colors hover:border-primary/70"
              >
                <topic.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                <h3 className="mt-4 font-semibold">{topic.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {topic.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/downloads"
            className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/70"
          >
            <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Need a file?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Manuals, datasheets, install files, safety sheets, and warranty
              documents belong in the Download Center.
            </p>
          </Link>

          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-xl font-semibold">Stay Updated</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Get new practical guides, product notes, and restock updates.
            </p>
            <NewsletterSignup compact variant="minimal" className="mt-4" />
          </div>
        </div>
      </section>
    </main>
  );
}
