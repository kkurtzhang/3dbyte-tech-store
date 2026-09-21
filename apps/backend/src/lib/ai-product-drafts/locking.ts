import type { MedusaRequest } from "@medusajs/framework/http"
import type { ILockingModule } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export function withAiDraftLock<T>(req: MedusaRequest, job: () => Promise<T>) {
  const locking = req.scope.resolve(Modules.LOCKING) as ILockingModule
  // PostgreSQL holds the advisory lock for the whole job, not a fixed Redis lease.
  return locking.execute(`ai-product-draft:${req.params.id}`, job, { timeout: 10, provider: "locking-postgres" })
}
