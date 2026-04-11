import { MedusaService } from "@medusajs/framework/utils";
import { Preorder } from "./models/preorder";
import { PreorderVariant } from "./models/preorder-variant";
import { PreorderVariantPrice } from "./models/preorder-variant-price";

class PreorderModuleService extends MedusaService({
  PreorderVariant,
  PreorderVariantPrice,
  Preorder,
}) {}

export default PreorderModuleService;
