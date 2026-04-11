import type { MedusaPreorderVariant } from "@/lib/medusa/types"

export function isPreorder(preorderVariant: MedusaPreorderVariant | undefined): boolean {
  if (!preorderVariant || preorderVariant.status !== "enabled" || !preorderVariant.available_date) {
    return false
  }

  return new Date(preorderVariant.available_date) > new Date()
}
