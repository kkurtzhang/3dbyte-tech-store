import { Button } from "@/components/ui/button";
import { getProducts } from "@/lib/medusa/products";
import { getStrapiContent } from "@/lib/strapi/content";
import { ProductCard } from "@/features/product/components/product-card";
import Link from "next/link";

export const revalidate = 3600;

export default async function Home() {
  // Parallel fetch for performance
  const [productsData, strapiData] = await Promise.allSettled([
    getProducts({ limit: 4 }),
    getStrapiContent("homepage").catch(() => null)
  ]);

  const products = productsData.status === "fulfilled" ? productsData.value.products : [];
  const heroData = strapiData.status === "fulfilled" && strapiData.value ? strapiData.value.data?.attributes : null;

  // Fallbacks for Hero Content
  const title = heroData?.hero_title || "Engineered for Precision.";
  const subtitle = heroData?.hero_subtitle || "[ VORON KITS ] [ HIGH-PERF FILAMENTS ] [ HARDWARE ]";
  const ctaText = heroData?.cta_text || "BROWSE_CATALOG";

  return (
    <div className="container py-10">
      <section className="mx-auto flex max-w-[980px] flex-col items-start gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
          {/* Simple splitting for styling if default, otherwise raw text */}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
           // Extract price (simplified logic: first variant, first price)
           // In production, we'd use a pricing module or region-aware context
           const variant = product.variants?.[0];
           // @ts-expect-error - Medusa types are strict but we request prices in getProducts
           const price = variant?.calculated_price || variant?.prices?.[0];

           const displayPrice = price ? {
             amount: price.amount || price.calculated_amount,
             currency_code: price.currency_code
           } : { amount: 0, currency_code: "usd" };

           return (
            <ProductCard
                key={product.id}
                id={product.id}
                handle={product.handle}
                title={product.title}
                thumbnail={product.thumbnail || ""}
                price={displayPrice}
                // Mock specs for now, or extract from metadata if available
                specs={[
                  { label: "Type", value: product.type?.value || "Standard" }
                ]}
            />
           )
        })}
      </div>
    </div>
  );
}
