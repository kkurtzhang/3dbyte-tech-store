/**
 * Workflow: Enrich Product with CMS Content
 * 
 * Demonstrates:
 * - Medusa v2 workflow pattern
 * - Integrating Strapi data into Medusa entities
 * - Multi-step workflow with compensation
 * - Error handling in workflows
 */

import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { getStrapiService } from '../integrations/strapi-service';

// Workflow input type
interface EnrichProductInput {
  productId: string;
  includeRelatedContent?: boolean;
}

// Workflow output type
interface EnrichProductOutput {
  productId: string;
  enrichedData: {
    detailedDescription?: string;
    specifications?: Record<string, any>;
    relatedBlogPosts?: Array<{
      title: string;
      slug: string;
      excerpt: string;
    }>;
    faqs?: Array<{
      question: string;
      answer: string;
    }>;
  };
}

/**
 * Step 1: Fetch product details from CMS
 */
const fetchProductContentStep = createStep(
  'fetch-product-content',
  async ({ productId }: EnrichProductInput, context) => {
    const strapiService = getStrapiService();

    try {
      // Fetch product-specific content from Strapi
      const { data } = await strapiService.client.findMany('product-contents', {
        filters: {
          productId: { $eq: productId },
        },
        populate: ['specifications', 'faqs'],
      });

      const content = data[0] || null;

      return new StepResponse(
        { content },
        { productId } // Compensation data
      );
    } catch (error) {
      console.error('Error fetching product content:', error);
      throw new Error(`Failed to fetch content for product ${productId}`);
    }
  },
  async (compensationData, context) => {
    // Compensation: Log that enrichment failed
    console.log(`Rolling back content fetch for product ${compensationData.productId}`);
  }
);

/**
 * Step 2: Fetch related blog posts
 */
const fetchRelatedContentStep = createStep(
  'fetch-related-content',
  async ({ productId, includeRelatedContent }: EnrichProductInput, context) => {
    if (!includeRelatedContent) {
      return new StepResponse({ relatedPosts: [] });
    }

    const strapiService = getStrapiService();

    try {
      // Search for blog posts mentioning this product
      const posts = await strapiService.searchBlogPosts(productId);

      const relatedPosts = posts.slice(0, 3).map(post => ({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
      }));

      return new StepResponse({ relatedPosts });
    } catch (error) {
      console.error('Error fetching related content:', error);
      // Non-critical error, return empty array
      return new StepResponse({ relatedPosts: [] });
    }
  }
);

/**
 * Step 3: Combine and format data
 */
const formatEnrichedDataStep = createStep(
  'format-enriched-data',
  async (input, context) => {
    const { content } = context.fetchProductContent;
    const { relatedPosts } = context.fetchRelatedContent;

    const enrichedData: EnrichProductOutput['enrichedData'] = {};

    if (content) {
      enrichedData.detailedDescription = content.detailedDescription;
      enrichedData.specifications = content.specifications;
      enrichedData.faqs = content.faqs;
    }

    if (relatedPosts.length > 0) {
      enrichedData.relatedBlogPosts = relatedPosts;
    }

    return new StepResponse({ enrichedData });
  }
);

/**
 * Main workflow: Enrich product with CMS content
 * 
 * @example
 * const result = await enrichProductWorkflow().run({
 *   input: {
 *     productId: 'prod_123',
 *     includeRelatedContent: true
 *   }
 * });
 */
export const enrichProductWorkflow = createWorkflow(
  'enrich-product-with-content',
  (input: EnrichProductInput) => {
    // Execute steps
    const productContent = fetchProductContentStep(input);
    const relatedContent = fetchRelatedContentStep(input);
    const formattedData = formatEnrichedDataStep(input);

    // Return workflow result
    return new WorkflowResponse<EnrichProductOutput>({
      productId: input.productId,
      enrichedData: formattedData.enrichedData,
    });
  }
);