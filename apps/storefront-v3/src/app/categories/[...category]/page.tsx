import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCategoryByHandle, getProductsByCategory } from "@/lib/medusa/categories"
import { ProductGrid } from "@/features/shop/components/product-grid"
import { ShopSort, type SortOption } from "@/features/shop/components/shop-sort"

interface CategoryPageProps {
  params: Promise<{ category: string[] }>
  searchParams: Promise<{
    page?: string
    sort?: SortOption
  }>
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const category = await params
  const search = await searchParams
  const page = Number(search.page) || 1
  const limit = 20
  const sort = search.sort || "newest"

  const categoryData = await getCategoryByHandle(category.category)

  if (!categoryData) {
    notFound()
  }

  const { products, count } = await getProductsByCategory(categoryData.id, {
    page,
    limit,
  })

  const totalPages = Math.ceil(count / limit)

  // Format category name from handle
  const categoryName = category.category
    .map((segment) => segment.replace(/-/g, " "))
    .join(" / ")
    .replace(/\b\w/g, (l) => l.toUpperCase())

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {categoryData.name || categoryName}
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          {count} {count === 1 ? "product" : "products"}
        </p>
      </div>

      {/* Sort - Mobile */}
      <div className="mb-6 flex justify-end lg:hidden">
        <ShopSort />
      </div>

      {/* Products */}
      <ProductGrid products={products} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <nav
            className="flex gap-2"
            role="navigation"
            aria-label="Pagination"
          >
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1
              const isCurrent = pageNum === page

              const params = new URLSearchParams()
              if (pageNum > 1) params.set("page", pageNum.toString())
              if (sort !== "newest") params.set("sort", sort)

              return (
                <a
                  key={pageNum}
                  href={`/categories/${category.category.join("/")}?${params.toString()}`}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-md border font-mono text-sm transition-colors ${
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                  }`}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {pageNum}
                </a>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const category = await params
  const categoryData = await getCategoryByHandle(category.category)

  if (!categoryData) {
    return {
      title: "Category Not Found",
    }
  }

  const categoryName = category.category
    .map((segment) => segment.replace(/-/g, " "))
    .join(" / ")

  return {
    title: `${categoryData.name || categoryName} | Category`,
    description: `Browse ${categoryData.name || categoryName} products.`,
  }
}
