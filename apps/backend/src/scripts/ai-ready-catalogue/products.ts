import type { AiReadyCatalogueProductDefinition } from "./types";
import { EQUIPMENT_PRODUCTS } from "./equipment-products";
import { FILAMENT_PRODUCTS } from "./filament-products";
import { RC_PRODUCTS } from "./rc-products";

export const AI_READY_CATALOGUE_PRODUCT_DEFINITIONS: AiReadyCatalogueProductDefinition[] =
  [...FILAMENT_PRODUCTS, ...EQUIPMENT_PRODUCTS, ...RC_PRODUCTS];
