import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import {
  getProducts,
  getCategoryProductCounts,
  getCollectionProductCounts,
} from "@/lib/medusa/products";
import { getCategories } from "@/lib/medusa/categories";
import { getCollections } from "@/lib/medusa/collections";
import { ProductGrid } from "@/features/shop/components/product-grid";
import {
  ShopFilters,
  FilterGroup,
} from "@/features/shop/components/shop-filters";
import {
  ShopSort,
  type SortOption,
} from "@/features/shop/components/shop-sort";
import { ListingLayout } from "@/components/layout/listing-layout";

interface ShopPageProps {
  searchParams: Promise<{
    page?: string;
    sort?: SortOption;
    category?: string;
    collection?: string;
    q?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = 20;
  const sort = params.sort || "newest";

  // Parse category and collection filters
  const categoryIds = params.category?.split(",").filter(Boolean) || [];
  const collectionIds = params.collection?.split(",").filter(Boolean) || [];

  // Fetch products, categories, and collections in parallel
  const [productsData, categoriesData, collectionsData] = await Promise.all([
    getProducts({
      page,
      limit,
      category_id: categoryIds.length > 0 ? categoryIds : undefined,
      collection_id: collectionIds.length > 0 ? collectionIds : undefined,
      q: params.q,
    }),
    getCategories(),
    getCollections(),
  ]);

  const { products, count } = productsData;
  const totalPages = Math.ceil(count / limit);

  // Fetch product counts for categories and collections
  const [categoryCounts, collectionCounts] = await Promise.all([
    getCategoryProductCounts(categoriesData.map((c) => c.id)),
    getCollectionProductCounts(collectionsData.map((c) => c.id)),
  ]);

  // Build filter groups from fetched data with product counts
  const categories: FilterGroup = {
    id: "categories",
    label: "Categories",
    options: categoriesData.map((cat) => ({
      id: cat.id,
      label: cat.name || cat.handle || "Unnamed Category",
      count: categoryCounts.get(cat.id) || 0,
    })),
  };

  const collections: FilterGroup = {
    id: "collections",
    label: "Collections",
    options: collectionsData.map((col) => ({
      id: col.id,
      label: col.title || col.handle || "Unnamed Collection",
      count: collectionCounts.get(col.id) || 0,
    })),
  };

  return (
    <ListingLayout
      header={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">All Products</h1>
            <p className="font-mono text-sm text-muted-foreground">
              {count} {count === 1 ? "product" : "products"}
            </p>
          </div>
          <ShopSort />
        </div>
      }
      sidebar={
        <ShopFilters
          categories={categories.options.length > 0 ? categories : undefined}
          collections={collections.options.length > 0 ? collections : undefined}
        />
      }
    >
      <div className="space-y-8">
        <ProductGrid products={products} />

        {totalPages > 1 && (
          <div className="flex justify-center">
            <nav
              className="flex gap-2"
              role="navigation"
              aria-label="Pagination"
            >
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = pageNum === page;

                const searchParams = new URLSearchParams();
                if (pageNum > 1) searchParams.set("page", pageNum.toString());
                if (sort !== "newest") searchParams.set("sort", sort);
                if (params.category)
                  searchParams.set("category", params.category);
                if (params.collection)
                  searchParams.set("collection", params.collection);

                return (
                  <a
                    key={pageNum}
                    href={`/shop?${searchParams.toString()}`}
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-md border font-mono text-sm transition-colors",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent",
                    )}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {pageNum}
                  </a>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </ListingLayout>
  );
}

export async function generateMetadata({
  searchParams,
}: ShopPageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = params.category;

  return {
    title: category ? `${category} Products | Shop` : "All Products | Shop",
    description: "Browse our product catalog.",
  };
}
