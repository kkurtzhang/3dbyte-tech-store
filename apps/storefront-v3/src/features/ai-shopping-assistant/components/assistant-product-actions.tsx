"use client";

import type { AssistantProductSearchEvent } from "@3dbyte-tech-store/shared-types";
import { useCallback, useState } from "react";
import { z } from "zod";

import { AssistantProductCard } from "./assistant-product-card";

const eventSchema = z
  .object({
    messageId: z.string().min(1).max(200),
    callId: z.string().min(1).max(200),
    status: z.enum(["matches", "empty", "unavailable", "declined"]),
    mode: z.enum(["search", "browse"]),
    query: z.string().max(200),
    products: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
            title: z.string().trim().min(1).max(300),
            href: z
              .string()
              .regex(/^\/products\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/),
            match: z.enum(["search", "alternative", "browse"]),
          })
          .strict(),
      )
      .max(6),
  })
  .strict()
  .refine((event) =>
    event.status === "matches"
      ? event.products.length > 0
      : event.products.length === 0,
  );

/** Only the live SDK onData callback updates these actions; history parts never do. */
export function useProductSearchEvents() {
  const [productEvents, setProductEvents] = useState<
    Record<string, AssistantProductSearchEvent>
  >({});
  const receiveProductData = useCallback(
    (part: { type: string; data?: unknown }) => {
      if (part.type !== "data-product-search") return;
      const parsed = eventSchema.safeParse(part.data);
      if (!parsed.success) return;
      setProductEvents((current) => ({
        ...current,
        [parsed.data.messageId]: parsed.data,
      }));
    },
    [],
  );
  return { productEvents, receiveProductData };
}

export function AssistantProductActions({
  event,
}: {
  event: AssistantProductSearchEvent;
}) {
  const statusText = {
    empty: "No matching products were found. Try a different product name.",
    unavailable: "Product search is unavailable. Please try again.",
    declined: "No product search was made because you asked to skip it.",
  };
  if (event.status !== "matches")
    return (
      <p role="status" className="mt-3 text-sm text-muted-foreground">
        {statusText[event.status]}
      </p>
    );
  return (
    <section
      aria-label="Product results"
      className="mt-3 space-y-3 border-t border-border pt-3"
    >
      <p className="text-sm font-medium">
        {event.mode === "browse"
          ? "Browse catalogue"
          : `Search options for “${event.query}”`}
      </p>
      <p className="text-xs text-muted-foreground">
        These are catalogue options. Compatibility is unverified; check the
        product details before choosing.
      </p>
      {event.products.map((product) => (
        <AssistantProductCard
          key={product.id}
          product={{
            id: product.id,
            title: product.title,
            handle: product.href.slice("/products/".length),
            reason:
              product.match === "alternative"
                ? "Possible alternative — query match is unverified"
                : event.mode === "browse"
                  ? "Catalogue option"
                  : "Catalogue search result",
          }}
        />
      ))}
    </section>
  );
}
