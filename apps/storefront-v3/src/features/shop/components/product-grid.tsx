import { StoreProduct } from "@medusajs/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/features/product/components/product-card";

// Define a minimal interface that covers both Medusa StoreProduct and Meilisearch documents
export interface ProductLike {
  id: string;
  handle?: string | null;
  title?: string | null;
  thumbnail?: string | null;
  images?: { url: string }[] | null;
  variants?: any[] | null;
  // Meilisearch specific fields
  price?: number;
  currency_code?: string;
  // Medusa specific fields
  calculated_price?: {
    calculated_amount: number;
    currency_code: string;
  };
}

export interface ProductGridProps {
  products: (StoreProduct | ProductLike | any)[];
  className?: string;
}

export function ProductGrid({ products, className }: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <div className={className}>
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6",
        className,
      )}
    >
      {products.map((product) => {
        const thumbnail =
          product.thumbnail ||
          product.images?.[0]?.url ||
          "/placeholder-product.png";

        // Handle price resolution for different product types
        let price = 0;
        let currencyCode = "usd";

        if ("price" in product && typeof product.price === "number") {
          // Meilisearch document (flat price)
          price = product.price;
          currencyCode = product.currency_code || "usd";
        } else {
          // Medusa StoreProduct (nested in variants)
          const variant = product.variants?.[0];
          currencyCode = variant?.calculated_price?.currency_code || "usd";
          // Medusa returns price in cents
          price = (variant?.calculated_price?.calculated_amount || 0) / 100;
        }

        return (
          <ProductCard
            key={product.id}
            id={product.id}
            handle={product.handle!}
            title={product.title!}
            thumbnail={thumbnail}
            price={{
              amount: price,
              currency_code: currencyCode.toUpperCase(),
            }}
          />
        );
      })}
    </div>
  );
}
