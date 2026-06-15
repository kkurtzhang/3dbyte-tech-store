import { Metadata } from "next";
import Link from "next/link";
import { searchBrands } from "@/lib/search/brands";
import { getBrandDescriptions } from "@/lib/strapi/content";
import { resolveStrapiMediaUrl } from "@/lib/strapi/media";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Brands",
  description: "Explore our curated list of premium 3D printing brands.",
};

export const dynamic = "force-dynamic";

function summarize(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatProductCount(count?: number) {
  if (typeof count !== "number" || !Number.isFinite(count)) {
    return null;
  }

  return `${count} ${count === 1 ? "product" : "products"}`;
}

export default async function BrandsPage() {
  const [{ hits: brands }, brandDescriptionsResponse] = await Promise.all([
    searchBrands({ limit: 100 }),
    getBrandDescriptions().catch(() => ({ data: [] })),
  ]);

  const contentByHandle = new Map(
    brandDescriptionsResponse.data.map((entry) => [
      entry.brand_handle,
      {
        logo: entry.brand_logo || null,
        summary: summarize(entry.rich_description || entry.seo_description || ""),
      },
    ])
  );
  const visibleBrands = brands.filter((brand) => brand.product_count !== 0);

  return (
    <div className="container py-8 md:py-12">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Discover top-tier manufacturers of 3D printers, filaments, and
          accessories.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleBrands.map((brand) => {
          const content = contentByHandle.get(brand.handle);
          const logoUrl = resolveStrapiMediaUrl(content?.logo?.url);
          const logoAlt =
            content?.logo?.alternativeText?.trim() || `${brand.name} logo`;
          const description =
            content?.summary ||
            brand.description ||
            "Premium 3D printing products and accessories.";
          const productCountLabel = formatProductCount(brand.product_count);

          return (
            <Link key={brand.id} href={`/brands/${brand.handle}`}>
              <Card className="h-full cursor-pointer overflow-hidden transition-colors hover:border-primary/40 hover:bg-muted/40">
                <CardHeader className="gap-4 p-5">
                  <div className="flex h-16 items-center justify-center rounded-md border border-border bg-background p-3">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={logoAlt}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="font-mono text-lg font-semibold text-muted-foreground"
                      >
                        {brand.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{brand.name}</CardTitle>
                    {productCountLabel && (
                      <p className="font-mono text-xs text-muted-foreground">
                        {productCountLabel}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {visibleBrands.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            No brands found.
          </div>
        )}
      </div>
    </div>
  );
}
