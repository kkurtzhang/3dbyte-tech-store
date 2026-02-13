# API Integrations Guide

## Overview

The CMS (Strapi v5.33.0) provides a comprehensive REST API for content management and integration with external services. This guide covers API usage, authentication, and common integration patterns.

## Base URLs

- **Development**: `http://localhost:1337/api`
- **Production**: Configure in environment variables
- **Admin API**: `http://localhost:1337/api` (requires authentication)

## Authentication

### JWT Authentication

Strapi uses JWT (JSON Web Tokens) for authentication:

#### Get Token (Login)
```bash
curl -X POST http://localhost:1337/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@example.com",
    "password": "your_password"
  }'
```

Response:
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

#### Using the Token
Include the token in the Authorization header:
```bash
curl http://localhost:1337/api/blogs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Refresh Token
JWT tokens expire after a configured period. Re-authenticate to get a new token.

### API Token Authentication

For service-to-service integration, create API tokens in the Admin Panel:

1. Go to Settings → API Tokens
2. Click "Create new API Token"
3. Name the token (e.g., "Medusa Integration")
4. Set duration (Unlimited or specific number of days)
5. Copy the generated token

Using API Token:
```bash
curl http://localhost:1337/api/blogs \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

## Public API vs Admin API

### Public API
- **Access**: No authentication required (for published content)
- **Scope**: Read-only access to published content
- **Use Case**: Frontend website, mobile apps
- **Endpoint**: Same as base URL

Example:
```bash
# Get published blogs (public)
curl http://localhost:1337/api/blogs
```

### Admin API
- **Access**: Requires authentication
- **Scope**: Full CRUD operations on all content
- **Use Case**: Custom admin panels, external integrations
- **Endpoint**: Same as base URL (different endpoints require auth)

Example:
```bash
# Create blog post (admin)
curl -X POST http://localhost:1337/api/blogs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "Title": "New Blog Post",
      "Content": "Blog content here...",
      "Slug": "new-blog-post"
    }
  }'
```

## API Endpoints by Content Type

### Blog
```bash
# Get all published blogs
GET /api/blogs

# Get all blogs (including drafts)
GET /api/blogs?draft=true

# Get specific blog by ID
GET /api/blogs/{id}

# Get blog by slug
GET /api/blogs?filters[Slug][$eq]=my-blog-post

# Get blogs with relations
GET /api/blogs?populate=*

# Get blogs with specific fields
GET /api/blogs?populate=FeaturedImage,Categories

# Get blogs with pagination
GET /api/blogs?pagination[page]=1&pagination[pageSize]=10

# Get blogs with sorting
GET /api/blogs?sort[0]=publishedAt:desc

# Create blog post
POST /api/blogs
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
{
  "data": {
    "Title": "New Blog Post",
    "Content": "Content here...",
    "Slug": "new-blog-post",
    "Excerpt": "Short summary"
  }
}

# Update blog post
PUT /api/blogs/{id}
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
{
  "data": {
    "Title": "Updated Title"
  }
}

# Delete blog post
DELETE /api/blogs/{id}
Authorization: Bearer YOUR_TOKEN
```

### Product Descriptions
```bash
# Get all product descriptions
GET /api/product-descriptions

# Get product by Medusa ID
GET /api/product-descriptions?filters[medusa_product_id][$eq]=prod_123

# Get product by handle
GET /api/product-descriptions?filters[product_handle][$eq]=my-product

# Get synced products
GET /api/product-descriptions?filters[sync_status][$eq]=synced

# Create product description
POST /api/product-descriptions
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
{
  "data": {
    "medusa_product_id": "prod_123",
    "product_title": "My Product",
    "product_handle": "my-product",
    "rich_description": "Description here...",
    "features": ["Feature 1", "Feature 2"],
    "specifications": {"color": "red", "size": "large"}
  }
}

# Update product description
PUT /api/product-descriptions/{id}
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
{
  "data": {
    "sync_status": "manual",
    "rich_description": "Updated description"
  }
}
```

### Other Content Types
Similar patterns apply to all content types. Replace `{content-type}` with:
- `about-us` → `/api/about-us`
- `collection` → `/api/collections`
- `faq` → `/api/faqs`
- `homepage` → `/api/homepages`
- `privacy-policy` → `/api/privacy-policies`
- `terms-and-condition` → `/api/terms-and-conditions`
- `brand-description` → `/api/brand-descriptions`
- `product-variant-color` → `/api/product-variant-colors`
- `blog-post-category` → `/api/blog-post-categories`

Note: Use plural form for API endpoints (e.g., `blogs`, `product-descriptions`).

## Query Parameters

### Filters

Filter content using various operators:

```bash
# Equal to
GET /api/blogs?filters[Title][$eq]=My Blog

# Not equal to
GET /api/blogs?filters[Title][$ne]=Another Blog

# Contains (text)
GET /api/blogs?filters[Title][$contains]=Tutorial

# Starts with
GET /api/blogs?filters[Title][$startsWith]=How

# Ends with
GET /api/blogs?filters[Title][$endsWith]=Guide

# Less than (numbers/dates)
GET /api/product-descriptions?filters[last_synced][$lt]=2024-01-01

# Greater than
GET /api/product-descriptions?filters[last_synced][$gt]=2024-01-01

# In array
GET /api/blogs?filters[slug][$in]=blog-1,blog-2,blog-3

# Not in array
GET /api/blogs?filters[slug][$nin]=blog-1,blog-2

# Multiple filters (AND)
GET /api/blogs?filters[Title][$contains]=Tutorial&filters[publishedAt][$ne]=null

# OR condition
GET /api/blogs?filters[$or][0][Title][$contains]=Tutorial&filters[$or][1][Title][$contains]=Guide
```

### Sorting

```bash
# Sort by field ascending
GET /api/blogs?sort[0]=Title:asc

# Sort by field descending
GET /api/blogs?sort[0]=publishedAt:desc

# Multiple sort fields
GET /api/blogs?sort[0]=Title:asc&sort[1]=publishedAt:desc
```

### Pagination

```bash
# Page-based pagination
GET /api/blogs?pagination[page]=1&pagination[pageSize]=10

# Offset-based pagination
GET /api/blogs?pagination[start]=0&pagination[limit]=10

# Get pagination metadata
GET /api/blogs?pagination[withCount]=true
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 5,
      "total": 50
    }
  }
}
```

### Population (Relations)

```bash
# Populate all relations
GET /api/blogs?populate=*

# Populate specific relation
GET /api/blogs?populate=Categories

# Populate nested relations
GET /api/blogs?populate[Categories][populate]=*

# Populate specific fields
GET /api/blogs?populate=FeaturedImage

# Populate multiple specific relations
GET /api/blogs?populate=FeaturedImage,Categories

# Populate media fields
GET /api/blogs?populate[FeaturedImage][fields]=url,alternativeText
```

### Field Selection

```bash
# Select specific fields
GET /api/blogs?fields[0]=Title&fields[1]=Slug&fields[2]=publishedAt

# Select fields in nested relations
GET /api/blogs?populate[FeaturedImage][fields][0]=url&populate[FeaturedImage][fields][1]=alternativeText
```

### Locale (Multi-language)

```bash
# Get content in specific locale
GET /api/blogs?locale=en

# Get all locales
GET /api/blogs?locale=all
```

## Response Format

### Success Response
```json
{
  "data": [
    {
      "id": 1,
      "documentId": "unique_id",
      "Title": "Blog Title",
      "Slug": "blog-title",
      "Content": "Content here...",
      "publishedAt": "2024-02-12T10:00:00.000Z",
      "createdAt": "2024-02-12T09:00:00.000Z",
      "updatedAt": "2024-02-12T10:00:00.000Z",
      "locale": "en"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 1,
      "total": 1
    }
  }
}
```

### Error Response
```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequestError",
    "message": "Missing or invalid params",
    "details": {}
  }
}
```

## External Integrations

### Medusa Integration

The CMS integrates with Medusa for product content synchronization.

#### Product Description Sync

Seed script location: `/seed-blog.js` (template for product sync)

Example sync pattern:
```javascript
// Fetch products from Medusa
const medusaResponse = await fetch('http://localhost:9000/store/products');
const products = await medusaResponse.json();

// Sync each product to CMS
for (const product of products.products) {
  await strapi.service('api::product-description.product-description').create({
    data: {
      medusa_product_id: product.id,
      product_title: product.title,
      product_handle: product.handle,
      rich_description: product.description,
      last_synced: new Date().toISOString(),
      sync_status: 'synced'
    }
  });
}
```

#### Webhooks

Configure Medusa webhooks to trigger CMS updates:
1. In Medusa admin, create webhook for product updates
2. Point webhook to CMS endpoint
3. CMS processes webhook payload and updates content

### Meilisearch Integration

The CMS uses Meilisearch for fast search functionality.

#### Search Configuration

Content types configure Meilisearch settings in their schema:

```json
{
  "pluginOptions": {
    "meilisearch": {
      "indexName": "blog",
      "settings": {
        "searchableAttributes": ["Title", "Content", "Excerpt"],
        "filterableAttributes": ["Categories"],
        "sortableAttributes": ["Title"],
        "displayedAttributes": ["Title", "Slug", "Content", "Excerpt", "publishedAt"]
      }
    }
  }
}
```

#### Search via API

Search is handled through Meilisearch directly:

```bash
# Search blogs
curl http://192.168.0.45:7700/indexes/blog/search \
  -H "Content-Type: application/json" \
  -d '{
    "q": "tutorial",
    "limit": 10
  }'
```

### AWS S3 Integration

Media files are stored in AWS S3:

#### Upload Plugin Configuration
See [Media Management Guide](./02-media-management.md) for detailed configuration.

#### Presigned URLs

For secure file access, generate presigned URLs:

```bash
# Get presigned URL (requires backend implementation)
curl http://localhost:1337/api/upload/files/{id}/signed-url \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Custom Endpoints

### Creating Custom Routes

1. Create route file in `/src/api/{api-name}/routes/{api-name}.ts`

```typescript
export default {
  routes: [
    {
      method: 'GET',
      path: '/custom-endpoint',
      handler: 'customController.customAction',
      config: {
        auth: false, // or 'jwt' for authenticated
      }
    }
  ]
}
```

2. Create controller in `/src/api/{api-name}/controllers/{api-name}.ts`

```typescript
export default {
  customAction: async (ctx) => {
    try {
      // Custom logic here
      const result = await doSomething();
      return result;
    } catch (error) {
      ctx.badRequest('Error message');
    }
  }
}
```

### Lifecycle Hooks

Execute code before/after API operations:

```typescript
// In content-type schema
{
  "lifecycle": {
    "beforeCreate": {
      "beforeCreateLifecycle": true
    },
    "afterCreate": {
      "afterCreateLifecycle": true
    }
  }
}
```

Lifecycle file: `/src/api/{api-name}/content-types/{api-name}/lifecycles.ts`

```typescript
export default {
  beforeCreate(event) {
    // Modify data before creation
    console.log('Before create', event.params.data);
  },
  afterCreate(event) {
    // Trigger external API call
    notifyExternalService(event.result);
  }
}
```

## Rate Limiting

Strapi doesn't include built-in rate limiting. Implement via:

### Nginx Reverse Proxy
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://localhost:1337;
}
```

### Express Rate Limit Middleware
Add to `/config/middlewares.ts`:

```typescript
export default [
  {
    name: 'strapi::logger',
    config: {
      level: 'http',
    },
  },
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io'],
          'media-src': ["'self'", 'data:', 'blob:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  // Custom rate limiting
  {
    resolve: './src/middlewares/rate-limit',
  },
];
```

## Error Handling

### Common Errors

#### 401 Unauthorized
- Missing or invalid authentication token
- Token expired (get new token)

#### 403 Forbidden
- User doesn't have permission
- Role doesn't allow the action

#### 404 Not Found
- Content doesn't exist
- Wrong endpoint path

#### 400 Bad Request
- Invalid request body
- Missing required fields
- Invalid data format

#### 429 Too Many Requests
- Rate limit exceeded
- Implement retry with exponential backoff

#### 500 Internal Server Error
- Server error
- Check server logs

### Error Response Handling
```javascript
try {
  const response = await fetch('http://localhost:1337/api/blogs');
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }

  return data;
} catch (error) {
  console.error('API Error:', error.message);
  // Handle error appropriately
}
```

## Best Practices

### Security
1. **Use HTTPS**: Always use HTTPS in production
2. **Validate Input**: Validate all input data
3. **Sanitize Output**: Sanitize data from API before display
4. **Secure Tokens**: Never expose tokens in client-side code
5. **CORS**: Configure CORS properly
6. **Rate Limiting**: Implement rate limiting to prevent abuse

### Performance
1. **Pagination**: Always use pagination for large datasets
2. **Field Selection**: Only request needed fields
3. **Caching**: Implement caching for frequently accessed data
4. **Optimized Queries**: Use filters to reduce data transfer
5. **Batch Operations**: Use bulk operations when possible

### Monitoring
1. **Logs**: Monitor API logs for errors and anomalies
2. **Metrics**: Track API usage and performance
3. **Alerts**: Set up alerts for error rates and downtime
4. **Analytics**: Analyze API usage patterns

## Testing

### Using cURL
```bash
# Test public endpoint
curl http://localhost:1337/api/blogs

# Test authenticated endpoint
curl http://localhost:1337/api/blogs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman/Insomnia
1. Import API collection
2. Set base URL
3. Configure authentication
4. Save requests for reuse

### Automated Testing
Create test scripts using Jest or similar frameworks:

```javascript
const request = require('supertest');
const strapi = require('@strapi/strapi');

describe('Blog API', () => {
  it('should return published blogs', async () => {
    const response = await request(strapi.server.httpServer)
      .get('/api/blogs')
      .expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

## Additional Resources

- [Strapi REST API Documentation](https://docs.strapi.io/dev-docs/api/rest)
- [Strapi GraphQL API](https://docs.strapi.io/dev-docs/api/graphql)
- [Strapi Content API](https://docs.strapi.io/dev-docs/api/content-api)
- [Content Types Guide](./01-content-types-guide.md)
- [User Permissions Guide](./04-user-permissions.md)
