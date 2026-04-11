import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { PREORDER_MODULE } from "../../modules/preorder";

export type PreorderPriceInput = {
  currency_code: string;
  amount: number;
};

type StepInput = {
  preorder_variant_id: string;
  prices: PreorderPriceInput[];
};

type StoredPreorderPrice = PreorderPriceInput & {
  id: string;
  preorder_variant_id: string;
};

const normalizePrices = (prices: PreorderPriceInput[]): PreorderPriceInput[] => {
  const dedupedPrices = new Map<string, PreorderPriceInput>();

  for (const price of prices) {
    const currencyCode = price.currency_code.trim().toLowerCase();

    if (!currencyCode) {
      continue;
    }

    dedupedPrices.set(currencyCode, {
      currency_code: currencyCode,
      amount: price.amount,
    });
  }

  return Array.from(dedupedPrices.values()).sort((left, right) =>
    left.currency_code.localeCompare(right.currency_code)
  );
};

const syncPrices = async (
  preorderModuleService: {
    createPreorderVariantPrices: (data: Array<Record<string, unknown>>) => Promise<unknown>;
    updatePreorderVariantPrices: (data: Array<Record<string, unknown>>) => Promise<unknown>;
    deletePreorderVariantPrices: (ids: string[]) => Promise<unknown>;
  },
  existingPrices: StoredPreorderPrice[],
  desiredPrices: PreorderPriceInput[],
  preorderVariantId: string
) => {
  const existingByCurrency = new Map(
    existingPrices.map((price) => [price.currency_code.toLowerCase(), price])
  );
  const desiredByCurrency = new Map(
    desiredPrices.map((price) => [price.currency_code.toLowerCase(), price])
  );

  const pricesToCreate = desiredPrices
    .filter((price) => !existingByCurrency.has(price.currency_code))
    .map((price) => ({
      preorder_variant_id: preorderVariantId,
      currency_code: price.currency_code,
      amount: price.amount,
    }));

  const pricesToUpdate = desiredPrices
    .map((price) => {
      const existingPrice = existingByCurrency.get(price.currency_code);

      if (!existingPrice || existingPrice.amount === price.amount) {
        return null;
      }

      return {
        id: existingPrice.id,
        amount: price.amount,
      };
    })
    .filter((price): price is { id: string; amount: number } => Boolean(price));

  const priceIdsToDelete = existingPrices
    .filter((price) => !desiredByCurrency.has(price.currency_code.toLowerCase()))
    .map((price) => price.id);

  if (pricesToCreate.length) {
    await preorderModuleService.createPreorderVariantPrices(pricesToCreate);
  }

  if (pricesToUpdate.length) {
    await preorderModuleService.updatePreorderVariantPrices(pricesToUpdate);
  }

  if (priceIdsToDelete.length) {
    await preorderModuleService.deletePreorderVariantPrices(priceIdsToDelete);
  }
};

export const syncPreorderVariantPricesStep = createStep(
  "sync-preorder-variant-prices",
  async (input: StepInput, { container }) => {
    const preorderModuleService = container.resolve(PREORDER_MODULE);
    const normalizedPrices = normalizePrices(input.prices);
    const existingPrices =
      (await preorderModuleService.listPreorderVariantPrices({
        preorder_variant_id: input.preorder_variant_id,
      })) as StoredPreorderPrice[];

    await syncPrices(
      preorderModuleService,
      existingPrices,
      normalizedPrices,
      input.preorder_variant_id
    );

    return new StepResponse(normalizedPrices, {
      preorder_variant_id: input.preorder_variant_id,
      prices: existingPrices.map((price) => ({
        currency_code: price.currency_code,
        amount: Number(price.amount),
      })),
    });
  },
  async (state, { container }) => {
    if (!state) {
      return;
    }

    const preorderModuleService = container.resolve(PREORDER_MODULE);
    const existingPrices =
      (await preorderModuleService.listPreorderVariantPrices({
        preorder_variant_id: state.preorder_variant_id,
      })) as StoredPreorderPrice[];

    await syncPrices(
      preorderModuleService,
      existingPrices,
      normalizePrices(state.prices),
      state.preorder_variant_id
    );
  }
);
