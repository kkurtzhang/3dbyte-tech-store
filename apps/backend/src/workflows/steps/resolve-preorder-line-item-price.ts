import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

type PreorderVariantPrice = {
  currency_code: string;
  amount: number;
};

type StepInput = {
  currency_code: string;
  variant: {
    id: string;
    preorder_variant?: {
      status: "enabled" | "disabled";
      available_date: string | Date;
      prices?: PreorderVariantPrice[];
    };
  };
};

export const resolvePreorderLineItemPrice = ({
  currency_code,
  variant,
}: StepInput): number | null => {
  const preorderVariant = variant.preorder_variant;

  if (
    !preorderVariant ||
    preorderVariant.status !== "enabled" ||
    new Date(preorderVariant.available_date) <= new Date()
  ) {
    return null;
  }

  const matchedPrice = preorderVariant.prices?.find(
    (price) =>
      price.currency_code.toLowerCase() === currency_code.toLowerCase()
  );

  if (!matchedPrice) {
    throw new Error(
      `Pre-order price is not configured for currency ${currency_code.toUpperCase()}`
    );
  }

  return matchedPrice.amount;
};

export const resolvePreorderLineItemPriceStep = createStep(
  "resolve-preorder-line-item-price",
  async (input: StepInput) => {
    return new StepResponse(resolvePreorderLineItemPrice(input));
  }
);
