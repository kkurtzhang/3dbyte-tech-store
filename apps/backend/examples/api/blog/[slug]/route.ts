/**
 * Single Blog Post API Route
 * 
 * Demonstrates:
 * - Dynamic route parameters
 * - 404 handling
 * - SEO data integration
 */

import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import { getStrapiService } from '../../../integrations/strapi-service';

/**
 * GET /store/blog/:slug
 * 
 * Fetch a single blog post by slug
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        type: 'validation_error',
        message: 'Invalid or missing slug parameter',
      });
    }

    const strapiService = getStrapiService();
    const post = await strapiService.getBlogPost(slug);

    if (!post) {
      return res.status(404).json({
        type: 'not_found',
        message: `Blog post with slug '${slug}' not found`,
      });
    }

    res.json({
      post,
    });
  } catch (error) {
    console.error(`Error fetching blog post:`, error);
    res.status(500).json({
      type: 'internal_error',
      message: 'Failed to fetch blog post',
    });
  }
}