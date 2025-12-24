# CMS (Strapi) - Context Engineering Rules

> **Parent Context**: Always read `/CLAUDE.md` first for global monorepo rules.

## STRAPI V5.15.1 SPECIFICS

### Architecture Overview
- **Framework**: Strapi v5 (TypeScript-first)
- **API**: REST + GraphQL auto-generated
- **Database**: PostgreSQL
- **File Storage**: AWS S3 / local
- **Search**: Meilisearch integration

### Core Concepts
```
cms/
├── src/
│   ├── api/              # Content types & controllers
│   │   ├── blog-post/
│   │   ├── page/
│   │   └── author/
│   ├── components/       # Reusable content components
│   ├── extensions/       # Extend Strapi functionality
│   ├── middlewares/      # Custom middleware
│   ├── plugins/          # Custom plugins
│   └── index.ts         # Entry point
├── config/              # Configuration files
│   ├── api.ts
│   ├── admin.ts
│   ├── database.ts
│   ├── middlewares.ts
│   ├── plugins.ts
│   └── server.ts
├── database/
│   └── migrations/      # Database migrations
└── public/              # Static files
```

## CONTENT TYPES

### Creating Content Types

#### Via Admin Panel (Recommended for Initial Setup)
1. Navigate to Content-Type Builder
2. Create new collection or single type
3. Add fields with proper validation
4. Save and let Strapi generate code

#### Programmatically (For Version Control)
```typescript
// src/api/blog-post/content-types/blog-post/schema.json
{
  "kind": "collectionType",
  "collectionName": "blog_posts",
  "info": {
    "singularName": "blog-post",
    "pluralName": "blog-posts",
    "displayName": "Blog Post",
    "description": "Blog posts and articles"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "i18n": {
      "localized": true
    }
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true,
      "maxLength": 255
    },
    "slug": {
      "type": "uid",
      "targetField": "title",
      "required": true
    },
    "content": {
      "type": "richtext",
      "required": true
    },
    "excerpt": {
      "type": "text",
      "maxLength": 500
    },
    "featured_image": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "author": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::author.author",
      "inversedBy": "blog_posts"
    },
    "categories": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::category.category",
      "inversedBy": "blog_posts"
    },
    "seo": {
      "type": "component",
      "repeatable": false,
      "component": "shared.seo"
    },
    "published_at": {
      "type": "datetime"
    }
  }
}
```

### Dynamic Zones (Flexible Content)
```typescript
// schema.json
{
  "attributes": {
    "content_blocks": {
      "type": "dynamiczone",
      "components": [
        "blocks.rich-text",
        "blocks.image-gallery",
        "blocks.video-embed",
        "blocks.code-block"
      ]
    }
  }
}
```

## COMPONENTS (Reusable Fields)

### Component Definition
```typescript
// src/components/shared/seo.json
{
  "collectionName": "components_shared_seos",
  "info": {
    "displayName": "SEO",
    "description": "SEO metadata"
  },
  "attributes": {
    "meta_title": {
      "type": "string",
      "required": true,
      "maxLength": 60
    },
    "meta_description": {
      "type": "text",
      "required": true,
      "maxLength": 160
    },
    "meta_image": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    },
    "keywords": {
      "type": "string"
    },
    "canonical_url": {
      "type": "string"
    }
  }
}
```

### Using Components
```typescript
// Components are reusable across content types
// Just reference them in your schema:
{
  "seo": {
    "type": "component",
    "repeatable": false,
    "component": "shared.seo"
  }
}
```

## CONTROLLERS

### Custom Controller Logic
```typescript
// src/api/blog-post/controllers/blog-post.ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::blog-post.blog-post',
  ({ strapi }) => ({
    // Override default find
    async find(ctx) {
      // Custom logic before
      ctx.query = {
        ...ctx.query,
        populate: {
          author: {
            fields: ['name', 'bio'],
            populate: {
              avatar: true
            }
          },
          featured_image: true,
          categories: {
            fields: ['name', 'slug']
          }
        }
      };

      // Call default controller
      const { data, meta } = await super.find(ctx);

      // Custom logic after (e.g., add view count)
      const enrichedData = data.map(post => ({
        ...post,
        attributes: {
          ...post.attributes,
          view_count: Math.floor(Math.random() * 1000) // Example
        }
      }));

      return { data: enrichedData, meta };
    },

    // Custom endpoint
    async findBySlug(ctx) {
      const { slug } = ctx.params;

      const entity = await strapi.db
        .query('api::blog-post.blog-post')
        .findOne({
          where: { slug },
          populate: {
            author: true,
            featured_image: true,
            categories: true,
            seo: true
          }
        });

      if (!entity) {
        return ctx.notFound('Blog post not found');
      }

      const sanitized = await this.sanitizeOutput(entity, ctx);
      return this.transformResponse(sanitized);
    },

    // Increment view count
    async incrementViews(ctx) {
      const { id } = ctx.params;

      await strapi.db.query('api::blog-post.blog-post').update({
        where: { id },
        data: {
          view_count: strapi.db.raw('view_count + 1')
        }
      });

      return { success: true };
    }
  })
);
```

### Custom Routes
```typescript
// src/api/blog-post/routes/custom-routes.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/blog-posts/slug/:slug',
      handler: 'blog-post.findBySlug',
      config: {
        auth: false // Public endpoint
      }
    },
    {
      method: 'POST',
      path: '/blog-posts/:id/increment-views',
      handler: 'blog-post.incrementViews',
      config: {
        auth: false
      }
    }
  ]
};
```

## SERVICES

### Custom Service Logic
```typescript
// src/api/blog-post/services/blog-post.ts
import { factories } from '@strapi/strapi';

export default factories.createCoreService(
  'api::blog-post.blog-post',
  ({ strapi }) => ({
    // Custom service method
    async findPublished(params = {}) {
      const entries = await strapi.entityService.findMany(
        'api::blog-post.blog-post',
        {
          ...params,
          filters: {
            ...params.filters,
            publishedAt: {
              $notNull: true
            }
          },
          sort: { publishedAt: 'desc' }
        }
      );

      return entries;
    },

    async findRelated(postId: string, limit = 3) {
      const post = await strapi.entityService.findOne(
        'api::blog-post.blog-post',
        postId,
        {
          populate: ['categories']
        }
      );

      if (!post) return [];

      const categoryIds = post.categories.map(cat => cat.id);

      const related = await strapi.db
        .query('api::blog-post.blog-post')
        .findMany({
          where: {
            id: { $ne: postId },
            categories: { id: { $in: categoryIds } }
          },
          limit,
          populate: {
            featured_image: true,
            author: {
              fields: ['name']
            }
          }
        });

      return related;
    }
  })
);
```

## LIFECYCLE HOOKS

### Implement Lifecycle Events
```typescript
// src/api/blog-post/content-types/blog-post/lifecycles.ts
export default {
  // Before creating
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Auto-generate slug if not provided
    if (!data.slug && data.title) {
      data.slug = strapi.plugin('slugify').service('main').slugify(data.title);
    }
    
    // Set published_at if publishing
    if (data.publishedAt === null) {
      data.published_at = new Date();
    }
  },

  // After creating
  async afterCreate(event) {
    const { result } = event;
    
    // Trigger webhook to storefront for revalidation
    await strapi.plugin('webhook-trigger').service('trigger').send({
      event: 'blog-post.created',
      data: result
    });
    
    // Index in search engine
    await strapi.plugin('meilisearch').service('main').indexEntry(
      'blog-post',
      result
    );
  },

  // Before updating
  async beforeUpdate(event) {
    const { data, where } = event.params;
    
    // Track who made changes
    if (data.updatedBy) {
      data.last_modified_by = data.updatedBy;
    }
  },

  // After updating
  async afterUpdate(event) {
    const { result } = event;
    
    // Trigger revalidation webhook
    await strapi.plugin('webhook-trigger').service('trigger').send({
      event: 'blog-post.updated',
      data: result
    });
    
    // Update search index
    await strapi.plugin('meilisearch').service('main').updateEntry(
      'blog-post',
      result
    );
  },

  // Before deleting
  async beforeDelete(event) {
    const { where } = event.params;
    
    // Log deletion
    strapi.log.info(`Deleting blog post with ID: ${where.id}`);
  },

  // After deleting
  async afterDelete(event) {
    const { result } = event;
    
    // Remove from search index
    await strapi.plugin('meilisearch').service('main').deleteEntry(
      'blog-post',
      result.id
    );
    
    // Trigger webhook
    await strapi.plugin('webhook-trigger').service('trigger').send({
      event: 'blog-post.deleted',
      data: { id: result.id }
    });
  }
};
```

## MIDDLEWARES

### Custom Middleware
```typescript
// src/middlewares/response-time.ts
export default (config, { strapi }) => {
  return async (ctx, next) => {
    const start = Date.now();
    
    await next();
    
    const duration = Date.now() - start;
    ctx.set('X-Response-Time', `${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      strapi.log.warn(`Slow request: ${ctx.method} ${ctx.url} took ${duration}ms`);
    }
  };
};
```

### Register Middleware
```typescript
// config/middlewares.ts
export default [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  {
    name: 'global::response-time',
    config: {}
  }
];
```

## PLUGINS

### Upload Provider (AWS S3)
```typescript
// config/plugins.ts
export default ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        s3Options: {
          credentials: {
            accessKeyId: env('S3_ACCESS_KEY_ID'),
            secretAccessKey: env('S3_ACCESS_SECRET')
          },
          region: env('S3_REGION'),
          params: {
            Bucket: env('S3_BUCKET')
          }
        }
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {}
      }
    }
  },

  // Meilisearch
  meilisearch: {
    config: {
      host: env('MEILISEARCH_HOST', 'http://localhost:7700'),
      apiKey: env('MEILISEARCH_API_KEY'),
      contentTypes: [
        {
          name: 'api::blog-post.blog-post',
          index: 'blog_posts',
          fields: ['title', 'excerpt', 'content'],
          settings: {
            searchableAttributes: ['title', 'excerpt', 'content'],
            displayedAttributes: ['id', 'title', 'slug', 'excerpt'],
            filterableAttributes: ['categories', 'author']
          }
        }
      ]
    }
  }
});
```

## WEBHOOKS

### Configure Webhooks
```typescript
// Via Admin Panel or programmatically
// Webhook to trigger Next.js revalidation
{
  "name": "Revalidate Storefront",
  "url": "https://your-storefront.com/api/revalidate",
  "headers": {
    "Authorization": "Bearer YOUR_SECRET_TOKEN"
  },
  "events": [
    "entry.create",
    "entry.update",
    "entry.delete",
    "entry.publish",
    "entry.unpublish"
  ]
}
```

### Handle Webhooks in Storefront
```typescript
// apps/storefront/app/api/revalidate/route.ts
export async function POST(request: Request) {
  const secret = request.headers.get('authorization');
  
  if (secret !== `Bearer ${process.env.STRAPI_WEBHOOK_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  const { event, model } = body;
  
  // Revalidate based on content type
  if (model === 'blog-post') {
    await revalidatePath('/blog');
    if (body.entry?.slug) {
      await revalidatePath(`/blog/${body.entry.slug}`);
    }
  }
  
  return Response.json({ revalidated: true });
}
```

## PERMISSIONS & AUTHENTICATION

### API Tokens
```typescript
// Generate in Admin Panel: Settings > API Tokens
// Use in requests:
fetch('http://localhost:1337/api/blog-posts', {
  headers: {
    'Authorization': `Bearer YOUR_API_TOKEN`
  }
});
```

### Public vs Private Routes
```typescript
// In routes configuration
{
  method: 'GET',
  path: '/blog-posts',
  handler: 'blog-post.find',
  config: {
    auth: false, // Public
    policies: []
  }
}

{
  method: 'POST',
  path: '/blog-posts',
  handler: 'blog-post.create',
  config: {
    auth: true, // Requires authentication
    policies: ['is-admin']
  }
}
```

### Custom Policies
```typescript
// src/policies/is-admin.ts
export default (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;
  
  if (!user) {
    return false;
  }
  
  return user.role.type === 'admin';
};
```

## TESTING

### Unit Tests
```typescript
// __tests__/blog-post.test.ts
import { setupStrapi, cleanupStrapi } from '../helpers/strapi';

describe('Blog Post API', () => {
  let strapi;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  it('should create a blog post', async () => {
    const post = await strapi.service('api::blog-post.blog-post').create({
      data: {
        title: 'Test Post',
        content: 'Test content',
        publishedAt: new Date()
      }
    });

    expect(post).toBeDefined();
    expect(post.title).toBe('Test Post');
  });

  it('should find published posts only', async () => {
    const posts = await strapi
      .service('api::blog-post.blog-post')
      .findPublished();

    posts.forEach(post => {
      expect(post.publishedAt).not.toBeNull();
    });
  });
});
```

## PERFORMANCE

### Database Queries
```typescript
// Use populate carefully - avoid over-fetching
const posts = await strapi.entityService.findMany(
  'api::blog-post.blog-post',
  {
    populate: {
      author: {
        fields: ['name'], // Only needed fields
      },
      featured_image: {
        fields: ['url', 'alternativeText']
      }
    },
    fields: ['title', 'slug', 'excerpt'], // Only needed fields
    pagination: {
      pageSize: 10
    }
  }
);
```

### Caching Strategy
- Use CDN for media files (S3 + CloudFront)
- Implement Redis caching for frequently accessed data
- Use ISR (Incremental Static Regeneration) in storefront

## ENVIRONMENT VARIABLES

```bash
# Server
HOST=0.0.0.0
PORT=1337
APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=your-token-salt
ADMIN_JWT_SECRET=your-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-salt
JWT_SECRET=your-secret

# Database
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=cms
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_SSL=false

# AWS S3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_ACCESS_SECRET=your-secret-key

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-api-key

# Webhooks
STOREFRONT_WEBHOOK_URL=https://your-storefront.com/api/revalidate
WEBHOOK_SECRET=your-webhook-secret
```

## BEFORE IMPLEMENTING

1. **Check Strapi documentation OR Use Strapi MCP**: <https://docs.strapi.io/cms/intro>
2. **Review existing content types**: Reuse components
3. **Plan data structure**: Normalize vs denormalize
4. **Consider relationships**: One-to-many, many-to-many
5. **Test in Content-Type Builder**: Prototype structure first
6. **Plan webhooks**: How will storefront stay in sync?

## COMMON GOTCHAS

- **Circular dependencies**: Be careful with bidirectional relations
- **Populate depth**: Deep population kills performance
- **Draft & Publish**: Remember to publish entries
- **Permissions**: Public access requires explicit configuration
- **File uploads**: Configure S3 early for production
- **Webhooks**: Test thoroughly, failed webhooks don't retry

Remember: Read `/CLAUDE.md` for global monorepo rules. This file supplements those rules with Strapi-specific guidance.