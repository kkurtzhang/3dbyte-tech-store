import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"

import { AiProductDraft } from "./models/ai-product-draft"
import { AiProductDraftEvent } from "./models/ai-product-draft-event"

class AiProductDraftModuleService extends MedusaService({
  AiProductDraft,
  AiProductDraftEvent,
}) {
  @InjectManager()
  @InjectTransactionManager()
  async withDraftTransaction<T>(
    job: (context: Context) => Promise<T>,
    @MedusaContext() context: Context = {}
  ): Promise<T> {
    return job(context)
  }
}

export default AiProductDraftModuleService
