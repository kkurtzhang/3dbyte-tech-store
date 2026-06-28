import { Module } from "@medusajs/framework/utils"

import AiProductDraftModuleService from "./service"

export const AI_PRODUCT_DRAFT_MODULE = "aiProductDraft"

export default Module(AI_PRODUCT_DRAFT_MODULE, {
  service: AiProductDraftModuleService,
})
