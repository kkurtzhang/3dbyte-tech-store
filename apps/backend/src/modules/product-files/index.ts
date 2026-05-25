import { Module } from "@medusajs/framework/utils";
import ProductFilesModuleService from "./service";

export const PRODUCT_FILES_MODULE = "productFiles";

export default Module(PRODUCT_FILES_MODULE, {
  service: ProductFilesModuleService,
});
