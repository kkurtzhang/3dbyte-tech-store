# Backend Code Examples

This directory contains example code demonstrating best practices for the Medusa backend.

## Directory Structure

examples/
├── integrations/
│   ├── strapi-client.ts          # Strapi API client
│   └── strapi-service.ts         # Service layer for CMS integration
├── workflows/
│   ├── enrich-product-with-content.ts    # Product enrichment workflow
│   └── sync-products-with-cms.ts         # Batch sync workflow
├── api/
│   ├── blog/
│   │   ├── route.ts              # Blog list endpoint
│   │   └── [slug]/route.ts       # Single blog post endpoint
│   └── content/
│       └── revalidate/route.ts   # Webhook handler for cache invalidation
├── subscribers/
│   └── product-updated.ts        # Event subscriber example
└── README.md                     # This file

## Key Patterns

### 1. Strapi Integration
- Use `StrapiClient` for all CMS API calls
- Implement caching to reduce API calls
- Handle errors gracefully
- Use TypeScript for type safety

### 2. Medusa Workflows
- Break complex logic into composable steps
- Implement compensation for rollbacks
- Use proper error handling
- Type all inputs and outputs

### 3. API Routes
- Validate all inputs with Zod
- Return consistent error formats
- Use proper HTTP status codes
- Document with JSDoc

### 4. Event Subscribers
- Keep subscribers lightweight
- Don't throw errors that break main flow
- Use for async side effects only
- Clear related caches when data changes

## Usage Examples

### Fetching Blog Posts
```typescript
import { getStrapiService } from './integrations/strapi-service';

const strapiService = getStrapiService();

// Get paginated posts
const { posts, pagination } = await strapiService.getBlogPosts({
  page: 1,
  pageSize: 10,
  category: 'tech',
});

// Get single post
const post = await strapiService.getBlogPost('my-blog-post-slug');

// Search posts
const results = await strapiService.searchBlogPosts('typescript');
```

### Using Workflows
```typescript
import { enrichProductWorkflow } from './workflows/enrich-product-with-content';

// Run workflow
const result = await enrichProductWorkflow().run({
  input: {
    productId: 'prod_123',
    includeRelatedContent: true,
  },
  container, // Medusa container
});

console.log(result.enrichedData);
```

### API Route Pattern
```typescript
// apps/backend/src/api/custom/route.ts
import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import { z } from 'zod';

const schema = z.object({
  id: z.string(),
});

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const params = schema.parse(req.query);
    // Handle request
    res.json({ success: true });
  } catch (error) {
    // Handle error
    res.status(400).json({ error: 'Invalid request' });
  }
}
```

## Testing

All examples should have corresponding tests:
```typescript
// strapi-service.test.ts
describe('StrapiService', () => {
  it('should fetch blog posts', async () => {
    const service = getStrapiService();
    const result = await service.getBlogPosts({ page: 1 });
    expect(result.posts).toBeInstanceOf(Array);
  });
});
```

## Environment Variables Required
```bash
# Strapi Integration
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your_token_here
```

## Common Pitfalls

1. **Don't fetch from Strapi on every request** - Use caching
2. **Don't expose Strapi errors to clients** - Transform them
3. **Don't block main flow in subscribers** - Keep them async
4. **Don't forget to clear cache** - Invalidate when data changes

## Additional Resources

- [Medusa Workflows](https://docs.medusajs.com/learn/fundamentals/workflows)
- [Strapi REST API](https://docs.strapi.io/dev-docs/api/rest)
- [Medusa Event System](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers)