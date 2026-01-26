import { Module } from "@medusajs/framework/utils";
import MeilisearchModuleService from "./service";
import configureCategoryIndexLoader from "./loaders/configure-category-index";
import configureBrandIndexLoader from "./loaders/configure-brand-index";
import configureProductIndexLoader from "./loaders/configure-product-index";

export const MEILISEARCH_MODULE = "meilisearch";

export default Module(MEILISEARCH_MODULE, {
  service: MeilisearchModuleService,
  loaders: [
    configureCategoryIndexLoader,
    configureBrandIndexLoader,
    configureProductIndexLoader,
  ],
});
