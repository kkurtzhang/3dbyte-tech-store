import Link from "next/link"

import type { CollectionDescriptionData } from "@/lib/strapi/types"
import { cn } from "@/lib/utils"

import {
  buildCollectionCardData,
  type CollectionCardSource,
} from "../lib/collection-cards"

interface CollectionGridProps {
  collections: CollectionCardSource[]
  collectionContentByHandle: Map<string, CollectionDescriptionData>
  className?: string
}

export function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <div
          key={index}
          className="aspect-[4/5] animate-pulse rounded-lg bg-muted"
        />
      ))}
    </div>
  )
}

export function CollectionGrid({
  collections,
  collectionContentByHandle,
  className,
}: CollectionGridProps) {
  const cards = buildCollectionCardData(collections, collectionContentByHandle)

  if (cards.length === 0) {
    return null
  }

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {cards.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className="group relative block overflow-hidden rounded-lg bg-muted"
        >
          <div className="aspect-[4/5] w-full">
            {card.imageUrl ? (
              <img
                src={card.imageUrl}
                alt={card.imageAlt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <span className="font-mono text-4xl text-muted-foreground/30">
                  {card.initial}
                </span>
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
            <h3 className="text-lg font-bold text-white">{card.title}</h3>
            <p className="line-clamp-2 font-mono text-sm text-white/70">
              {card.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
