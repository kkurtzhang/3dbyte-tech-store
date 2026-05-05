import type { EmailAddress } from "./types";

const centsPerUnit = 100;

export const formatEmailMoney = (
  amount: number | null | undefined,
  currencyCode: string,
): string => {
  const normalizedCurrencyCode = currencyCode.toUpperCase();
  const formatter = new Intl.NumberFormat("en-AU", {
    currency: normalizedCurrencyCode,
    currencyDisplay: "narrowSymbol",
    style: "currency",
  });
  const formatted = formatter.format((amount ?? 0) / centsPerUnit);

  return normalizedCurrencyCode === "AUD" && formatted.startsWith("$")
    ? `A${formatted}`
    : formatted;
};

export const formatEmailDate = (value: string | Date): string =>
  new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const formatEmailAddress = (address?: EmailAddress | null): string[] => {
  if (!address) {
    return [];
  }

  const fullName = [address.first_name, address.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const cityLine = [address.city, address.province, address.postal_code]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [
    fullName,
    address.address_1,
    address.address_2,
    cityLine,
    address.country_code?.toUpperCase(),
  ].filter((line): line is string => Boolean(line));
};
