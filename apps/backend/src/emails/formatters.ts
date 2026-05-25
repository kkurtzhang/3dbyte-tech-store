import type { EmailAddress } from "./types";

const countryNames = new Map([
  ["au", "Australia"],
  ["ca", "Canada"],
  ["gb", "United Kingdom"],
  ["nz", "New Zealand"],
  ["us", "United States"],
]);

const normalizeAmount = (amount: number | null | undefined): number => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return 0;
  }

  return amount;
};

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
  const formatted = formatter.format(normalizeAmount(amount));

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
  const countryCode = address.country_code?.trim().toLowerCase();
  const countryLine = countryCode
    ? countryNames.get(countryCode) ?? countryCode.toUpperCase()
    : null;

  return [
    fullName,
    address.company,
    address.address_1,
    address.address_2,
    cityLine,
    countryLine,
  ].filter((line): line is string => Boolean(line));
};

export const areEmailAddressesEqual = (
  left?: EmailAddress | null,
  right?: EmailAddress | null,
): boolean => {
  const normalizeLines = (address?: EmailAddress | null) =>
    formatEmailAddress(address).map((line) => line.toLowerCase());

  return JSON.stringify(normalizeLines(left)) === JSON.stringify(normalizeLines(right));
};
