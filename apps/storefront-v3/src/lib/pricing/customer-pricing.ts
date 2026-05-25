export function isCustomerTaxInclusiveCurrency(currencyCode?: string | null) {
  return currencyCode?.toLowerCase() === "aud"
}

export function toCustomerPriceAmount(amount: number, _currencyCode: string) {
  if (!Number.isFinite(amount)) {
    return amount
  }

  return amount
}

export function formatCustomerPrice(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(toCustomerPriceAmount(amount, currencyCode))
}
