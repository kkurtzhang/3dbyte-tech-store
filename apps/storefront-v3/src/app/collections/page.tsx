import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { CollectionGrid } from "@/features/collections/components/collection-grid"
import {
  CollectionsEmptyState,
  CollectionsErrorState,
} from "@/features/collections/components/collections-state"
import { buildCollectionContentByHandle } from "@/features/collections/lib/collection-cards"
import { getCollectionsResult } from "@/lib/medusa/collections"
import { getCollectionDescriptions } from "@/lib/strapi/content"

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Browse curated collections of 3D printers, parts, materials, upgrades, and workshop essentials.",
}

export const dynamic = "force-dynamic"

export default async function CollectionsPage() {
  const [{ collections, error }, collectionDescriptionsResponse] = await Promise.all([
    getCollectionsResult(),
    getCollectionDescriptions().catch(() => ({ data: [] })),
  ])

  const collectionContentByHandle = buildCollectionContentByHandle(
    collectionDescriptionsResponse.data || []
  )

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            COLLECTION INDEX
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Shop by Collection</h1>
          <p className="max-w-2xl text-muted-foreground">
            Explore curated collections across printers, motion systems,
            electronics, materials, and upgrade paths.
          </p>
          {!error && collections.length > 0 && (
            <p className="font-mono text-sm text-muted-foreground">
              {collections.length} {collections.length === 1 ? "collection" : "collections"}
            </p>
          )}
        </div>

        <Button asChild variant="outline" className="rounded-sm font-mono text-xs">
          <Link href="/shop">Browse All Products</Link>
        </Button>
      </div>

      {error ? (
        <CollectionsErrorState />
      ) : collections.length === 0 ? (
        <CollectionsEmptyState />
      ) : (
        <CollectionGrid
          collections={collections}
          collectionContentByHandle={collectionContentByHandle}
          className="grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        />
      )}
    </div>
  )
}
