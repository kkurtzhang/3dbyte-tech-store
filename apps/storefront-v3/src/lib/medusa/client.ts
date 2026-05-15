import Medusa from "@medusajs/js-sdk"
import { resolveMedusaBaseUrl } from "./base-url"

export const sdk = new Medusa({
  baseUrl: resolveMedusaBaseUrl(),
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})
