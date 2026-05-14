import { INDEX_PRODUCTS, searchClient } from "./client"

const BLOG_INDEX = "blog"

export type ContentSearchScope = "help" | "guides"
export type ContentSearchKind = "guide" | "article" | "product"

export interface ContentSearchHit {
  id: string
  kind: ContentSearchKind
  title: string
  snippet: string
  url: string
}

interface BlogDocument {
  id: string | number
  Title?: string
  Slug?: string
  Excerpt?: string
  Content?: string
  Categories?: Array<{ Title?: string } | string>
}

interface ProductDocument {
  id: string
  title?: string
  handle?: string
  categories?: string[]
}

function extractSnippet(value?: string): string {
  if (!value) return ""
  const withoutHtml = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return withoutHtml.length > 160 ? `${withoutHtml.slice(0, 157)}...` : withoutHtml
}

function getCategoryTitles(input?: BlogDocument["Categories"]): string[] {
  if (!input || input.length === 0) return []
  return input
    .map((item) => {
      if (typeof item === "string") {
        return item
      }
      return item.Title || ""
    })
    .filter(Boolean)
}

function mapBlogHit(hit: BlogDocument, scope: ContentSearchScope): ContentSearchHit | null {
  const title = (hit.Title || "").trim()
  const slug = (hit.Slug || "").trim()
  if (!title || !slug) return null

  const categories = getCategoryTitles(hit.Categories).map((item) => item.toLowerCase())
  const isGuide = scope === "guides" || categories.includes("guides")

  return {
    id: `blog:${slug}`,
    kind: isGuide ? "guide" : "article",
    title,
    snippet: extractSnippet(hit.Excerpt || hit.Content),
    url: `/blog/${slug}`,
  }
}

function mapProductHit(hit: ProductDocument): ContentSearchHit | null {
  const title = (hit.title || "").trim()
  const handle = (hit.handle || "").trim()
  if (!title || !handle) return null

  const categories = Array.isArray(hit.categories) ? hit.categories.join(", ") : ""

  return {
    id: `product:${hit.id}`,
    kind: "product",
    title,
    snippet: categories,
    url: `/products/${handle}`,
  }
}

function dedupeByUrl(hits: ContentSearchHit[]): ContentSearchHit[] {
  const seen = new Set<string>()
  return hits.filter((hit) => {
    if (seen.has(hit.url)) return false
    seen.add(hit.url)
    return true
  })
}

async function searchBlog(query: string, limit: number, scope: ContentSearchScope): Promise<ContentSearchHit[]> {
  try {
    const response = await searchClient.index(BLOG_INDEX).search<BlogDocument>(query, {
      limit,
      attributesToRetrieve: ["id", "Title", "Slug", "Excerpt", "Content", "Categories"],
    })
    return response.hits
      .map((hit) => mapBlogHit(hit, scope))
      .filter((hit): hit is ContentSearchHit => Boolean(hit))
  } catch {
    return []
  }
}

async function searchProducts(query: string, limit: number): Promise<ContentSearchHit[]> {
  try {
    const response = await searchClient.index(INDEX_PRODUCTS).search<ProductDocument>(query, {
      limit,
      attributesToRetrieve: ["id", "title", "handle", "categories"],
    })
    return response.hits
      .map((hit) => mapProductHit(hit))
      .filter((hit): hit is ContentSearchHit => Boolean(hit))
  } catch {
    return []
  }
}

export async function searchContent(
  query: string,
  scope: ContentSearchScope,
  limit: number = 8
): Promise<ContentSearchHit[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return []
  }

  if (scope === "guides") {
    const guides = await searchBlog(normalizedQuery, limit, "guides")
    return dedupeByUrl(guides).slice(0, limit)
  }

  const [articleResults, productResults] = await Promise.all([
    searchBlog(normalizedQuery, limit, "help"),
    searchProducts(normalizedQuery, limit),
  ])

  return dedupeByUrl([...articleResults, ...productResults]).slice(0, limit)
}
