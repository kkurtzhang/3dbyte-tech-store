import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { getProducts, getDemoProducts } from "@/lib/medusa/products"
import { getStrapiContent } from "@/lib/strapi/content"
import { ProductCard } from "@/features/product/components/product-card"
import Link from "next/link"

export const revalidate = 3600

// Loading skeleton for products
function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-80 animate-pulse rounded-lg bg-muted"
        />
      ))}
    </div>
  )
}

// Product grid component
function ProductGrid({ products }: { products: any[] }) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-muted-foreground"
          >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 2 1.58h9.78a2 2 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium">No products found</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Check back later for new arrivals
        </p>
        <Button asChild variant="outline">
          <Link href="/search">Browse All Products</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const variant = product.variants?.[0]
        // @ts-expect-error - Medusa types are strict but we request prices in getProducts
        const price = variant?.calculated_price || variant?.prices?.[0]

        const displayPrice = price
          ? {
              amount: price.amount || price.calculated_amount,
              currency_code: price.currency_code,
            }
          : { amount: 0, currency_code: "usd" }

        return (
          <ProductCard
            key={product.id}
            id={product.id}
            handle={product.handle}
            title={product.title}
            thumbnail={product.thumbnail || ""}
            price={displayPrice}
            specs={
              product.type
                ? [{ label: "Type", value: product.type.value || product.type }]
                : undefined
            }
          />
        )
      })}
    </div>
  )
}

export default async function Home() {
  // Fetch products with fallback support
  const { products, count } = await getProducts({ limit: 4 })

  // Fetch hero content in parallel
  const strapiData = await getStrapiContent("homepage").catch(() => null)
  const heroData = strapiData && strapiData.value ? strapiData.value.data?.attributes : null

  // Fallbacks for Hero Content
  const title = heroData?.hero_title || "Engineered for Precision."
  const subtitle = heroData?.hero_subtitle || "[ VORON KITS ] [ HIGH-PERF FILAMENTS ] [ HARDWARE ]"
  const ctaText = heroData?.cta_text || "BROWSE_CATALOG"

  return (
    <div className="container py-10">
      {/* Hero Section */}
      <section className="mx-auto flex max-w-[980px] flex-col items-start gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
          {title === "Engineered for Precision." ? (
            <>Engineered for <span className="text-primary">Precision</span>.</>
          ) : (
            title
          )}
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl font-mono">
          {subtitle}
        </p>
        <div className="flex w-full items-center justify-start gap-2 py-2">
          <Button asChild size="lg" className="rounded-sm font-mono text-sm">
            <Link href="/search">{ctaText}</Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-sm font-mono text-sm">
            VIEW_SPECS
          </Button>
        </div>
      </section>

      {/* Featured Products Section */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Featured Products ({count})</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/search">View All →</Link>
          </Button>
        </div>

        <Suspense fallback={<ProductsSkeleton />}>
          <ProductGrid products={products} />
        </Suspense>
      </section>
    </div>
  )
}
