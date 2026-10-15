"use client";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export type AssistantProductSuggestion = {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string | null;
  price?: string | null;
  inStock?: boolean | null;
  reason?: string | null;
};

export function AssistantProductCard({
  product,
}: {
  product: AssistantProductSuggestion;
}) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(product.handle)) return null;
  const productHref = `/products/${encodeURIComponent(product.handle)}`;

  return (
    <article className="rounded-sm border border-border bg-background p-3 shadow-sm">
      <Link
        href={productHref}
        className="flex gap-3"
        aria-label={product.title}
      >
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt=""
            className="h-16 w-16 rounded-sm object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-muted">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium">{product.title}</h3>
          {product.price ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {product.price}
            </p>
          ) : null}
          {product.reason ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {product.reason}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {product.inStock === false
            ? "Check availability"
            : "Catalogue option"}
        </span>
        <Button asChild size="sm" variant="outline" className="rounded-sm">
          <Link href={productHref}>View product</Link>
        </Button>
      </div>
    </article>
  );
}
