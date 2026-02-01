import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrandByHandle, getProductsByBrand } from "@/lib/search/brands";
import { ProductGrid } from "@/features/shop/components/product-grid";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{
    handle: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const brand = await getBrandByHandle(handle);

  if (!brand) {
    return {
      title: "Brand Not Found",
    };
  }

  return {
    title: brand.name,
    description:
      brand.description || `Shop ${brand.name} products at 3D Byte Tech Store.`,
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { handle } = await params;
  const brand = await getBrandByHandle(handle);

  if (!brand) {
    notFound();
  }

  const { hits: products } = await getProductsByBrand(handle);

  return (
    <div className="container py-8 md:py-12">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
        {brand.description && (
          <p className="text-muted-foreground text-lg max-w-2xl">
            {brand.description}
          </p>
        )}
      </div>

      <Separator className="my-8" />

      <div className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">
          Products ({products.length})
        </h2>

        {products.length > 0 ? (
          // @ts-ignore - ProductGrid types need alignment with Meilisearch hits
          <ProductGrid products={products} />
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            No products found for this brand.
          </div>
        )}
      </div>
    </div>
  );
}
