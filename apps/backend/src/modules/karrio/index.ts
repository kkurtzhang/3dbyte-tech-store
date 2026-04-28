import { Module } from "@medusajs/framework/utils";
import KarrioModuleService from "./service";

export const KARRIO_MODULE = "karrio";

export default Module(KARRIO_MODULE, {
  service: KarrioModuleService,
});
