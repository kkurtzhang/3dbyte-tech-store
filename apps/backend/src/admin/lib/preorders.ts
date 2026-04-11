import type { AdminProductVariant } from "@medusajs/framework/types";

export type AdminMoneyAmount = {
  currency_code: string;
  amount: number;
};

export type AdminPreorderVariant = {
  id: string;
  variant_id: string;
  available_date: string;
  prices?: AdminMoneyAmount[];
  status: "enabled" | "disabled";
  created_at?: string;
  updated_at?: string;
};

export type AdminProductVariantWithPreorder = AdminProductVariant & {
  prices?: AdminMoneyAmount[];
  preorder_variant?: AdminPreorderVariant | null;
};

export type PreorderVariantResponse = {
  variant: AdminProductVariantWithPreorder;
};

export type CreatePreorderVariantData = {
  available_date: string;
  prices: AdminMoneyAmount[];
};

export const toNumberInputValue = (value?: number | null): string => {
  return value === undefined || value === null ? "" : String(value);
};

export const parseNumberInputValue = (
  value: string
): number | undefined => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

export const formatMoneyAmount = (
  amount: number,
  currencyCode: string
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount);
};

export const getCurrencyCodes = (
  regularPrices: AdminMoneyAmount[] = [],
  preorderPrices: AdminMoneyAmount[] = []
): string[] => {
  return Array.from(
    new Set(
      [...regularPrices, ...preorderPrices].map((price) =>
        price.currency_code.toLowerCase()
      )
    )
  ).sort((left, right) => left.localeCompare(right));
};

export const buildPriceInputMap = (
  currencyCodes: string[],
  prices: AdminMoneyAmount[] = []
): Record<string, string> => {
  const pricesByCurrency = new Map(
    prices.map((price) => [price.currency_code.toLowerCase(), price.amount])
  );

  return currencyCodes.reduce<Record<string, string>>((acc, currencyCode) => {
    acc[currencyCode] = toNumberInputValue(pricesByCurrency.get(currencyCode));
    return acc;
  }, {});
};

export const parsePriceInputs = (
  priceInputs: Record<string, string>,
  currencyCodes: string[]
): {
  prices: AdminMoneyAmount[];
  missingCurrencyCodes: string[];
} => {
  const prices: AdminMoneyAmount[] = [];
  const missingCurrencyCodes: string[] = [];

  for (const currencyCode of currencyCodes) {
    const parsedValue = parseNumberInputValue(priceInputs[currencyCode] ?? "");

    if (parsedValue === undefined) {
      missingCurrencyCodes.push(currencyCode);
      continue;
    }

    prices.push({
      currency_code: currencyCode,
      amount: parsedValue,
    });
  }

  return {
    prices,
    missingCurrencyCodes,
  };
};

const displayDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export const isEnabledPreorderVariant = (
  preorderVariant: AdminPreorderVariant | null | undefined
): preorderVariant is AdminPreorderVariant => {
  return preorderVariant?.status === "enabled";
};

export const formatPreorderDate = (dateString: string): string => {
  return displayDateFormatter.format(new Date(dateString));
};

export const toDateTimeLocalValue = (date = new Date()): string => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};
