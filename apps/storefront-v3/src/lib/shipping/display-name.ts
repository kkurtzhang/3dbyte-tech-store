interface ShippingServiceNameInput {
  carrierName?: string | null
  description?: string | null
  name?: string | null
  service?: string | null
  serviceName?: string | null
}

function normalizeToken(value: string | null | undefined): string {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? ""
}

export function getShippingServiceDisplayName(
  input: ShippingServiceNameInput
): string {
  const tokens = [
    input.carrierName,
    input.description,
    input.name,
    input.service,
    input.serviceName,
  ]
    .map(normalizeToken)
    .join("_")

  if (tokens.includes("aramex") || tokens.includes("karrio")) {
    if (tokens.includes("priority") || tokens.includes("express")) {
      return "Aramex Priority"
    }

    if (tokens.includes("economy") || tokens.includes("standard")) {
      return "Aramex Economy"
    }
  }

  return (
    input.serviceName?.trim() ||
    input.name?.trim() ||
    input.service?.trim() ||
    "Shipping"
  )
}
