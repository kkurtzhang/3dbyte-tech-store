import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import { upsertProductVariantPreorderWorkflow } from "../../../../../workflows/upsert-product-variant-preorder";
import { disablePreorderVariantWorkflow } from "../../../../../workflows/disable-preorder-variant";

const PreorderVariantPriceSchema = z.object({
  currency_code: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toLowerCase()),
  amount: z.coerce.number().nonnegative(),
});

export const UpsertPreorderVariantSchema = z.object({
  available_date: z.string().datetime(),
  prices: z.array(PreorderVariantPriceSchema).min(1),
}).superRefine((value, ctx) => {
  const seenCurrencies = new Set<string>();

  value.prices.forEach((price, index) => {
    if (seenCurrencies.has(price.currency_code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate preorder price for ${price.currency_code.toUpperCase()}`,
        path: ["prices", index, "currency_code"],
      });
      return;
    }

    seenCurrencies.add(price.currency_code);
  });
});

type UpsertPreorderVariantSchema = z.infer<typeof UpsertPreorderVariantSchema>;

export const POST = async (
  req: AuthenticatedMedusaRequest<UpsertPreorderVariantSchema>,
  res: MedusaResponse
) => {
  const variantId = req.params.id;

  const { result } = await upsertProductVariantPreorderWorkflow(req.scope).run({
    input: {
      variant_id: variantId,
      available_date: new Date(req.validatedBody.available_date),
      prices: req.validatedBody.prices,
    },
  });

  res.json({
    preorder_variant: result,
  });
};

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const variantId = req.params.id;

  const { result } = await disablePreorderVariantWorkflow(req.scope).run({
    input: {
      variant_id: variantId,
    },
  });

  res.json({
    preorder_variant: result,
  });
};
