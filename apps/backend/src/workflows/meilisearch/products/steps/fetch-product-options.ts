import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { Logger } from "@medusajs/framework/types";

export type FetchProductOptionsStepOutput = Record<string, string>;
// { option_id: option_title } e.g., { "opt_123": "Color" }

/**
 * Step to fetch all product options and build an ID-to-title mapping
 *
 * This mapping is used to correctly categorize variant options.
 * For example, when a variant has an option with option_id "opt_123",
 * we can look up the title "Color" to create the correct key "options_color".
 *
 * Why is this needed?
 * - Variant options only contain option_id and value, not the option title
 * - The option title (e.g., "Color", "Size") is needed for faceting keys
 * - Fetching once and passing the mapping is more efficient than querying per variant
 */
export const fetchProductOptionsStep = createStep<
  undefined,
  Record<string, string>,
  Record<string, string>
>(
  "fetch-product-options",
  async (_input, { container }) => {
    const remoteQuery = container.resolve(
      ContainerRegistrationKeys.REMOTE_QUERY,
    );
    const logger = container.resolve<Logger>("logger");

    try {
      // Fetch all product options
      const { data: productOptions } = await remoteQuery.graph({
        entity: "product_option",
        fields: ["id", "title"],
      });

      // Build a plain object from option_id to title for efficient lookup
      // Using plain object instead of Map because Map gets serialized to empty object
      const optionTitleMap: Record<string, string> = {};
      for (const option of productOptions as Array<{
        id: string;
        title: string;
      }>) {
        optionTitleMap[option.id] = option.title;
      }

      logger.info(
        `Fetched ${Object.keys(optionTitleMap).length} product options for Meilisearch indexing`,
      );

      return new StepResponse(optionTitleMap, optionTitleMap);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.warn(
        `Failed to fetch product options: ${message}. Options faceting will be limited.`,
      );
      // Return empty object to allow indexing to continue
      return new StepResponse({}, {});
    }
  },
  // No compensation needed - this is a read-only step
  async (_compensationData) => {
    // No-op
  },
);
