import { MedusaService } from "@medusajs/framework/utils"

import { AiProductDraft } from "./models/ai-product-draft"
import { AiProductDraftEvent } from "./models/ai-product-draft-event"

class AiProductDraftModuleService extends MedusaService({
  AiProductDraft,
  AiProductDraftEvent,
}) {}

export default AiProductDraftModuleService
