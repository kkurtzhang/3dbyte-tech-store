import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  STRAPI_MODULE,
  type StrapiModuleService,
} from "../../../modules/strapi";
import {
  referenceBinding,
  referenceCard,
} from "../../../lib/knowledge-reference/contract";
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (process.env.APP_ENV !== "staging") {
    res.status(404).json({ references: [] });
    return;
  }
  const offset = req.query.offset ?? "0";
  if (
    typeof offset !== "string" ||
    !/^\d{1,4}$/.test(offset) ||
    Number(offset) > 5000 ||
    Object.keys(req.query).some((key) => key !== "offset")
  ) {
    res.status(400).json({ references: [], error: "Invalid reference page." });
    return;
  }
  const query = req.scope.resolve("query"),
    strapi = req.scope.resolve<StrapiModuleService>(STRAPI_MODULE);
  try {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "status",
        "metadata",
        "variants.id",
        "variants.price_set.prices.amount",
      ],
      filters: { status: "draft" },
      pagination: { take: 50, skip: Number(offset), order: { id: "ASC" } },
    });
    const candidates: Array<{
      product: unknown;
      binding: NonNullable<ReturnType<typeof referenceBinding>>;
    }> = [];
    let scanned = 0;
    for (const product of data ?? []) {
      scanned++;
      const binding = referenceBinding(product);
      if (!binding) continue;
      candidates.push({ product, binding });
      if (candidates.length === 4) break;
    }
    const cards = await Promise.all(
      candidates.map(async ({ product, binding }) =>
        referenceCard(
          product,
          await strapi.getKnowledgeReference(
            binding.document_id,
            binding.product_id,
            binding.revision_hash,
          ),
          process.env.APP_ENV,
        ),
      ),
    );
    const references = cards.filter((card) => card !== null);
    const next = Number(offset) + scanned;
    res.json({
      references,
      next_offset:
        next <= 5000 && (scanned < (data?.length ?? 0) || data?.length === 50)
          ? next
          : null,
    });
  } catch {
    res.status(503).json({
      references: [],
      error: "References are temporarily unavailable.",
    });
  }
}
