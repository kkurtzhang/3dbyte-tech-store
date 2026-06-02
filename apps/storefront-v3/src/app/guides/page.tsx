import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Download,
  Layers,
  Search,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import { NewsletterSignup } from "@/components/layout/newsletter-signup"
import { getCmsIcon } from "@/features/cms/components/cms-icon-map"
import { ContentSearchBox } from "@/features/search/components/content-search-box"
import { getBlogPostCategories, getBlogPosts, getGuidesPage } from "@/lib/strapi/content"

import type {
  BlogPost,
  BlogPostCategory,
  GuidesCategoryData,
  GuidesFeaturedGuideData,
  GuidesPageData,
  GuidesQuickLinkData,
} from "@/lib/strapi/types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "3D Printing Guides",
  description:
    "Practical 3D printing guides for maintenance, calibration, filament selection, and troubleshooting.",
}

type FeaturedGuide = {
  title: string
  category: string
  readTime?: string
  rating?: string
  description: string
  href: string
  icon: LucideIcon
}

type TopicCard = {
  title: string
  description: string
  icon: LucideIcon
  links: {
    title: string
    href: string
  }[]
}

type QuickLink = {
  title: string
  href: string
  icon: LucideIcon
}

type GuideContent = {
  heading: string
  subheading: string
  featuredGuides: FeaturedGuide[]
  topics: TopicCard[]
  quickLinks: QuickLink[]
  usesCuratedFeaturedGuides: boolean
  usesCuratedTopics: boolean
}

const fallbackTopics: TopicCard[] = [
  {
    title: "Printer Maintenance",
    description: "Keep motion systems, nozzles, beds, and electronics reliable.",
    icon: Wrench,
    links: [{ title: "Browse maintenance guides", href: "/blog?category=maintenance" }],
  },
  {
    title: "Filament Selection",
    description: "Choose materials by strength, temperature, finish, and print risk.",
    icon: Layers,
    links: [{ title: "Browse filament guides", href: "/blog?category=filament-selection" }],
  },
  {
    title: "Calibration",
    description: "Tune first layers, flow, pressure advance, temperature, and speed.",
    icon: Settings,
    links: [{ title: "Browse calibration guides", href: "/blog?category=calibration" }],
  },
]

const fallbackQuickLinks: QuickLink[] = [
  {
    title: "Download Center",
    href: "/downloads",
    icon: Download,
  },
]

function textOrFallback(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim()

  return trimmed || fallback
}

function safeHref(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return fallback
  }

  return trimmed.startsWith("/") ? trimmed : fallback
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

function getCategoryLabel(post: BlogPost) {
  return post.Categories?.[0]?.Title || "Guide"
}

function getCategoryHref(category: BlogPostCategory) {
  return `/blog?category=${category.Slug}`
}

function normalizeCategories(categories: BlogPostCategory[]) {
  return categories.filter((category) => category.Title && category.Slug)
}

function mapCmsFeaturedGuide(guide: GuidesFeaturedGuideData): FeaturedGuide {
  return {
    title: guide.Title,
    category: textOrFallback(guide.Category, "Guide"),
    readTime: guide.ReadTime?.trim() || undefined,
    rating: guide.Rating?.trim() || undefined,
    description: textOrFallback(guide.Description, "Read this practical workshop guide."),
    href: safeHref(guide.Href, "/blog"),
    icon: getCmsIcon(guide.Icon, BookOpen),
  }
}

function mapBlogPostToFeaturedGuide(post: BlogPost): FeaturedGuide {
  return {
    title: post.Title,
    category: getCategoryLabel(post),
    readTime: formatDate(post.publishedAt),
    description: textOrFallback(post.Excerpt, "Read this practical workshop guide."),
    href: `/blog/${post.Slug}`,
    icon: BookOpen,
  }
}

function mapCmsTopic(category: GuidesCategoryData): TopicCard {
  const links =
    category.Guides?.map((guide) => ({
      title: guide.Title,
      href: safeHref(guide.Href, "/blog"),
    })).filter((guide) => guide.title.trim()) ?? []

  return {
    title: category.Title,
    description: textOrFallback(category.Description, "Browse related tutorials and notes."),
    icon: getCmsIcon(category.Icon, BookOpen),
    links: links.length > 0 ? links : [{ title: "Browse articles", href: "/blog" }],
  }
}

function mapBlogCategoryToTopic(category: BlogPostCategory): TopicCard {
  return {
    title: category.Title,
    description: "Browse related tutorials, comparisons, and practical notes.",
    icon: BookOpen,
    links: [{ title: `Browse ${category.Title}`, href: getCategoryHref(category) }],
  }
}

function mapCmsQuickLink(link: GuidesQuickLinkData): QuickLink {
  return {
    title: link.Title,
    href: safeHref(link.Href, "/guides"),
    icon: getCmsIcon(link.Icon, Download),
  }
}

function buildGuideContent({
  guidePage,
  posts,
  categories,
}: {
  guidePage: GuidesPageData | null
  posts: BlogPost[]
  categories: BlogPostCategory[]
}): GuideContent {
  const cmsFeaturedGuides =
    guidePage?.FeaturedGuides?.map(mapCmsFeaturedGuide).filter((guide) => guide.title.trim()) ?? []
  const cmsTopics =
    guidePage?.Categories?.map(mapCmsTopic).filter((category) => category.title.trim()) ?? []
  const cmsQuickLinks =
    guidePage?.QuickLinks?.map(mapCmsQuickLink).filter((link) => link.title.trim()) ?? []
  const blogCategories = normalizeCategories(categories)
  const fallbackBlogTopics =
    blogCategories.length > 0 ? blogCategories.slice(0, 6).map(mapBlogCategoryToTopic) : fallbackTopics

  return {
    heading: textOrFallback(guidePage?.Heading, "3D Printing Guides"),
    subheading: textOrFallback(
      guidePage?.Subheading,
      "Practical learning content from the CMS: maintenance, calibration, filament choice, troubleshooting, and setup notes. Product files still live in the Download Center."
    ),
    featuredGuides:
      cmsFeaturedGuides.length > 0
        ? cmsFeaturedGuides
        : posts.slice(0, 3).map(mapBlogPostToFeaturedGuide),
    topics: cmsTopics.length > 0 ? cmsTopics : fallbackBlogTopics,
    quickLinks: cmsQuickLinks.length > 0 ? cmsQuickLinks : fallbackQuickLinks,
    usesCuratedFeaturedGuides: cmsFeaturedGuides.length > 0,
    usesCuratedTopics: cmsTopics.length > 0,
  }
}

async function loadGuideContent() {
  const [guidePageResult, postsResult, categoriesResult] = await Promise.allSettled([
    getGuidesPage(),
    getBlogPosts({ limit: 6 }),
    getBlogPostCategories(),
  ])

  return buildGuideContent({
    guidePage: guidePageResult.status === "fulfilled" ? guidePageResult.value.data : null,
    posts: postsResult.status === "fulfilled" ? postsResult.value.data || [] : [],
    categories: categoriesResult.status === "fulfilled" ? categoriesResult.value.data || [] : [],
  })
}

export default async function GuidesPage() {
  const content = await loadGuideContent()

  return (
    <main>
      <section className="border-b bg-muted/30">
        <div className="container grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] md:items-end md:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Learning Hub
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              {content.heading}
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
              {content.subheading}
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
              {content.usesCuratedFeaturedGuides
                ? "Curated in the Guides Page single type so the storefront can highlight priority resources."
                : "Pulled from CMS blog content so the storefront stays current."}
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

        {content.featuredGuides.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {content.featuredGuides.map((guide) => (
              <Link
                key={`${guide.title}-${guide.href}`}
                href={guide.href}
                className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/70 hover:bg-accent/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                  >
                    {guide.category}
                  </span>
                  <guide.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-6 group-hover:text-primary">
                  {guide.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {guide.description}
                </p>
                <span className="mt-5 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span className="flex flex-wrap gap-2">
                    {guide.readTime ? <span>{guide.readTime}</span> : null}
                    {guide.rating ? <span>{guide.rating}</span> : null}
                  </span>
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
              Publish guide-style blog posts or curated featured guides in Strapi
              and this page will fill itself from managed content.
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
              {content.usesCuratedTopics
                ? "Curated topic groups from the Guides Page single type."
                : "Categories are pulled from CMS when available, with practical fallback topics for a new content library."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {content.topics.map((topic) => (
              <div
                key={topic.title}
                className="rounded-lg border bg-background p-5 transition-colors hover:border-primary/70"
              >
                <topic.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="mt-4 font-semibold">{topic.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {topic.description}
                </p>
                <div className="mt-4 space-y-2">
                  {topic.links.map((link) => (
                    <Link
                      key={`${topic.title}-${link.title}-${link.href}`}
                      href={link.href}
                      className="flex items-center justify-between gap-3 text-sm font-medium text-primary"
                    >
                      {link.title}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-4">
            {content.quickLinks.map((link) => (
              <Link
                key={`${link.title}-${link.href}`}
                href={link.href}
                className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/70"
              >
                <link.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                <h2 className="mt-4 text-xl font-semibold">{link.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Manuals, datasheets, install files, safety sheets, warranty
                  documents, and related resources live here.
                </p>
              </Link>
            ))}
          </div>

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
  )
}
