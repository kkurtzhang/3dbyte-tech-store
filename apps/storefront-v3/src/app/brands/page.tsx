import { Metadata } from "next";
import Link from "next/link";
import { searchBrands } from "@/lib/search/brands";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Brands",
  description: "Explore our curated list of premium 3D printing brands.",
};

export default async function BrandsPage() {
  const { hits: brands } = await searchBrands({ limit: 100 });

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
        {brands.map((brand) => (
          <Link key={brand.id} href={`/brands/${brand.handle}`}>
            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>{brand.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {brand.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {brand.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No description available.
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}

        {brands.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            No brands found.
          </div>
        )}
      </div>
    </div>
  );
}
