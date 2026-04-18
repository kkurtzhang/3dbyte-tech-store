import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import KarrioFulfillmentService from "./service";

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [KarrioFulfillmentService],
});
