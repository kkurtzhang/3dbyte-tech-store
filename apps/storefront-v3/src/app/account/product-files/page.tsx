import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAction } from "@/app/actions/auth";
import { getCustomerProductFilesAction } from "@/app/actions/product-files";
import { Button } from "@/components/ui/button";
import { ProductFilesList } from "./product-files-list";

export const metadata = {
  title: "Product Files | Account",
  description: "Download restricted files unlocked by registered products.",
};

export default async function ProductFilesPage() {
  const session = await getSessionAction();

  if (!session.success) {
    redirect("/sign-in?redirect=/account/product-files");
  }

  const result = await getCustomerProductFilesAction();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product files</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Firmware, calibration packs, and protected files unlocked by your registered products.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/account/product-registrations">Register product</Link>
        </Button>
      </div>

      {result.success ? (
        <ProductFilesList productFiles={result.productFiles} />
      ) : (
        <div className="rounded-sm border p-8 text-sm text-muted-foreground">
          {result.error}
        </div>
      )}
    </div>
  );
}
