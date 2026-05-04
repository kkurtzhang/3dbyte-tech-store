import { InferTypeOf, ProductDTO } from "@medusajs/framework/types";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";

type BundleItemWithProduct = {
  id: string;
  quantity: number;
  product: ProductDTO;
};

type BundleWithItemsAndProduct = {
  id: string;
  title: string;
  product?: {
    handle?: string | null;
    variants?: ProductDTO["variants"];
  } | null;
  items: BundleItemWithProduct[];
};

export type PrepareBundleCartDataStepInput = {
  bundle: BundleWithItemsAndProduct;
  quantity: number;
  items: {
    item_id: string;
    variant_id: string;
  }[];
};

type ProductVariantWithPricing = NonNullable<ProductDTO["variants"]>[number] & {
  calculated_price?: {
    calculated_amount?: number | null;
    original_amount?: number | null;
  } | null;
  prices?: {
    amount?: number | null;
  }[] | null;
};

type BundleLineItemPricing = {
  itemId: string;
  selectedVariantId: string;
  quantity: number;
  unitPrice: number;
  regularUnitPrice: number;
};

function buildBundleSelectionKey(
  bundleId: string,
  items: PrepareBundleCartDataStepInput["items"]
) {
  const selection = [...items]
    .sort((left, right) => left.item_id.localeCompare(right.item_id))
    .map((item) => `${item.item_id}:${item.variant_id}`)
    .join("|");

  return `${bundleId}:${selection}`;
}

function roundAmount(amount: number) {
  return Number(amount.toFixed(4));
}

function getVariantPriceAmount(variant: ProductVariantWithPricing | undefined | null) {
  const calculatedPrice = variant?.calculated_price?.calculated_amount;
  const originalPrice = variant?.calculated_price?.original_amount;
  const listedPrice = variant?.prices?.[0]?.amount;

  return calculatedPrice || originalPrice || listedPrice || 0;
}

function calculateBundleLineItemPricing(
  bundle: BundleWithItemsAndProduct,
  items: PrepareBundleCartDataStepInput["items"]
) {
  const bundleBasePrice = getVariantPriceAmount(
    bundle.product?.variants?.[0] as ProductVariantWithPricing | undefined
  );

  const preparedItems = bundle.items.map((item) => {
    const selectedItem = items.find((candidate) => candidate.item_id === item.id);

    if (!selectedItem) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No variant selected for bundle item ${item.id}`
      );
    }

    const selectedVariant = item.product.variants?.find(
      (candidate) => candidate.id === selectedItem.variant_id
    ) as ProductVariantWithPricing | undefined;

    if (!selectedVariant) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Variant ${selectedItem.variant_id} is invalid for bundle item ${item.id}`
      );
    }

    const defaultVariant = item.product.variants?.[0] as ProductVariantWithPricing | undefined;
    const selectedUnitPrice = getVariantPriceAmount(selectedVariant);
    const defaultUnitPrice = getVariantPriceAmount(defaultVariant);

    return {
      item,
      itemId: item.id,
      selectedVariantId: selectedItem.variant_id,
      selectedUnitPrice,
      defaultUnitPrice,
      standaloneLineTotal: selectedUnitPrice * item.quantity,
      defaultLineTotal: defaultUnitPrice * item.quantity,
    };
  });

  const selectedStandaloneTotal = preparedItems.reduce(
    (total, item) => total + item.standaloneLineTotal,
    0
  );
  const defaultStandaloneTotal = preparedItems.reduce(
    (total, item) => total + item.defaultLineTotal,
    0
  );
  const bundleDiscountAmount = Math.max(defaultStandaloneTotal - bundleBasePrice, 0);
  const effectiveBundleTotal = Math.max(
    selectedStandaloneTotal - bundleDiscountAmount,
    0
  );

  if (selectedStandaloneTotal <= 0) {
    return preparedItems.map((item) => ({
      itemId: item.itemId,
      selectedVariantId: item.selectedVariantId,
      quantity: item.item.quantity,
      unitPrice: roundAmount(item.selectedUnitPrice),
      regularUnitPrice: roundAmount(item.selectedUnitPrice),
    }));
  }

  let allocatedTotal = 0;

  return preparedItems.map((item, index): BundleLineItemPricing => {
    const isLastItem = index === preparedItems.length - 1;
    const lineTotal = isLastItem
      ? Math.max(effectiveBundleTotal - allocatedTotal, 0)
      : roundAmount(
          effectiveBundleTotal *
            (item.standaloneLineTotal / selectedStandaloneTotal)
        );

    allocatedTotal += lineTotal;

    return {
      itemId: item.itemId,
      selectedVariantId: item.selectedVariantId,
      quantity: item.item.quantity,
      unitPrice: roundAmount(lineTotal / item.item.quantity),
      regularUnitPrice: roundAmount(item.selectedUnitPrice),
    };
  });
}

export function buildBundleCartLineItems({
  bundle,
  quantity,
  items,
}: PrepareBundleCartDataStepInput) {
  const bundleKey = buildBundleSelectionKey(bundle.id, items);
  const pricingByItemId = new Map<string, BundleLineItemPricing>();

  calculateBundleLineItemPricing(bundle, items).forEach((itemPricing) => {
    pricingByItemId.set(itemPricing.itemId, itemPricing);
  });

  return bundle.items.map((item) => {
    const selectedItem = items.find((candidate) => candidate.item_id === item.id);

    if (!selectedItem) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No variant selected for bundle item ${item.id}`
      );
    }

    const itemPricing = pricingByItemId.get(item.id);

    if (!itemPricing) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unable to calculate pricing for bundle item ${item.id}`
      );
    }

    return {
      variant_id: selectedItem.variant_id,
      quantity: itemPricing.quantity * quantity,
      unit_price: itemPricing.unitPrice,
      metadata: {
        bundle_id: bundle.id,
        bundle_key: bundleKey,
        bundle_item_id: item.id,
        bundle_item_quantity: itemPricing.quantity,
        bundle_quantity: quantity,
        bundle_regular_unit_price: itemPricing.regularUnitPrice,
        bundle_title: bundle.title,
        bundle_product_handle: bundle.product?.handle ?? null,
      },
    };
  });
}

export const prepareBundleCartDataStep = createStep(
  "prepare-bundle-cart-data",
  async (input: PrepareBundleCartDataStepInput) => {
    return new StepResponse(buildBundleCartLineItems(input));
  }
);
