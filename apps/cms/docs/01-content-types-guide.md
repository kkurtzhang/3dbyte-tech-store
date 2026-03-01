# Content Types Guide

## Overview

This guide provides detailed documentation for all content types available in the 3DByte Tech Store CMS (Strapi v5.33.0). Each content type serves a specific purpose in managing store content, products, and user-facing information.

## Content Type Categories

### 1. Blog Content

#### Blog
- **Purpose**: Manage blog posts and articles
- **Collection Name**: `blogs`
- **Fields**:
  - `Title` (string, required) - Blog post title
  - `Slug` (UID, auto-generated from Title) - URL-friendly identifier
  - `Content` (richtext, required) - Main article content with formatting
  - `FeaturedImage` (media, required) - Cover image for the blog post
  - `Categories` (relation) - One-to-many relationship with Blog Post Categories
  - `Excerpt` (text, optional) - Short summary displayed in listings
- **Features**:
  - Draft and publish workflow
  - Meilisearch integration (searchable: Title, Content, Excerpt; filterable: Categories; sortable: Title)
- **Use Cases**:
  - Company news and updates
  - Product tutorials and guides
  - Industry insights and articles

#### Blog Post Category
- **Purpose**: Organize blog posts into categories
- **Collection Name**: `blog_post_categories`
- **Fields**: Standard categorization fields
- **Use Cases**:
  - News, Tutorials, Case Studies, etc.

### 2. Product Content

#### Product Description
- **Purpose**: Detailed product information synced from Medusa
- **Collection Name**: `product_descriptions`
- **Fields**:
  - `medusa_product_id` (string, required, unique) - Reference to Medusa product
  - `product_title` (string, required) - Product name
  - `product_handle` (string, required) - Product slug/identifier
  - `rich_description` (richtext) - Detailed product description
  - `product_images` (media, multiple) - Product image gallery
  - `features` (JSON) - Product features array
  - `specifications` (JSON) - Technical specifications object
  - `seo_title` (string) - SEO-optimized title
  - `seo_description` (text) - SEO meta description
  - `meta_keywords` (JSON) - SEO keywords array
  - `last_synced` (datetime) - Timestamp of last Medusa sync
  - `sync_status` (enum) - Sync state: synced, outdated, manual
- **Features**:
  - Draft and publish workflow
  - Medusa product integration
- **Use Cases**:
  - Rich product descriptions beyond basic Medusa fields
  - SEO optimization
  - Custom product features and specifications
  - Manual overrides for product content

#### Product Variant Color
- **Purpose**: Manage product color variants
- **Collection Name**: `product_variant_colors`
- **Fields**: Color management fields
- **Use Cases**:
  - Color swatches for products
  - Variant-specific content

### 3. Collection Content

#### Collection
- **Purpose**: Group products into collections
- **Collection Name**: `collections`
- **Fields**: Collection organization fields
- **Use Cases**:
  - Product categories (e.g., "Summer Collection", "New Arrivals")
  - Featured product groups
  - Seasonal collections

### 4. Page Content

#### Homepage
- **Purpose**: Landing page content management
- **Collection Name**: `homepages`
- **Fields**: Homepage layout and content
- **Use Cases**:
  - Hero section content
  - Featured products
  - Promotional banners

#### About Us
- **Purpose**: Company information page
- **Collection Name**: `about_uses`
- **Fields**: Company description and details
- **Use Cases**:
  - Company story
  - Team information
  - Company values and mission

### 5. Legal Content

#### Privacy Policy
- **Purpose**: Privacy policy document
- **Collection Name**: `privacy_policies`
- **Fields**: Legal content sections
- **Use Cases**:
  - GDPR compliance
  - Data handling policies
  - User privacy information

#### Terms and Conditions
- **Purpose**: Terms of service document
- **Collection Name**: `terms_and_conditions`
- **Fields**: Legal terms and conditions
- **Use Cases**:
  - Service terms
  - User agreements
  - Purchase policies

### 6. Support Content

#### FAQ
- **Purpose**: Frequently asked questions
- **Collection Name**: `faqs`
- **Fields**: Question and answer pairs
- **Use Cases**:
  - Customer support queries
  - Product questions
  - Shipping and returns information

#### Brand Description
- **Purpose**: Brand information and guidelines
- **Collection Name**: `brand_descriptions`
- **Fields**: Brand assets and guidelines
- **Use Cases**:
  - Brand story
  - Logo usage guidelines
  - Brand voice and tone

## Content Type Features

### Draft and Publish Workflow
Most content types support the draft and publish workflow:
- **Draft Mode**: Create and edit content without affecting the live site
- **Publishing**: Make content visible to the public
- **Unpublishing**: Remove content from public view while keeping it in the CMS

### Media Fields
Several content types include media fields with the following options:
- **Single Media**: One file/image per field
- **Multiple Media**: Gallery or list of files/images
- **Allowed Types**:
  - Images: JPG, PNG, GIF, WebP
  - Files: PDF, DOC, XLS, etc.
- **Storage**: AWS S3 (configured via upload plugin)

### Rich Text Fields
Rich text fields provide:
- WYSIWYG editor with formatting options
- Headings (H1-H6)
- Lists (ordered/unordered)
- Links
- Images (inline)
- Tables
- Code blocks
- Quotes

### Relation Fields
Relation fields connect content types:
- **One-to-Many**: One parent, many children (e.g., Blog → Categories)
- **Many-to-Many**: Multiple connections between content types
- **Foreign Key Management**: Automatic handling via Strapi

### JSON Fields
JSON fields store structured data:
- Arrays: `["item1", "item2", "item3"]`
- Objects: `{"key": "value", "nested": {"field": "data"}}`
- Use Cases: SEO metadata, specifications, features lists

### UID Fields
UID fields generate URL-friendly identifiers:
- Auto-generated from a target field (usually title)
- Unique per content type
- Used in URLs and API endpoints
- Format: `lowercase-with-hyphens`

### DateTime Fields
DateTime fields store timestamps:
- Display format: ISO 8601
- Timezone: Server timezone (configurable)
- Use Cases: Published date, creation date, custom dates

### Enumeration Fields
Enumeration fields restrict values to predefined options:
- `sync_status`: synced, outdated, manual
- Ensures data consistency
- Used in dropdowns in admin panel

## Content Type Management

### Creating Content
1. Navigate to Content Manager in Admin Panel
2. Select the desired content type
3. Click "Create new entry"
4. Fill in required fields (marked with *)
5. Save as draft or publish directly

### Editing Content
1. Find the entry in Content Manager
2. Click to edit
3. Make changes
4. Save or publish changes

### Deleting Content
1. Select entries in Content Manager
2. Click delete
3. Confirm deletion
4. **Note**: Deletion is permanent and affects published content

### Importing Content
The CMS supports importing content via:
- Admin panel (CSV/JSON import)
- API endpoints
- Custom scripts (see `/scripts/seed-blog.js`)

### Exporting Content
Export options include:
- Admin panel (CSV/JSON export)
- API endpoints with filters
- Custom export scripts

## Best Practices

### Content Creation
1. **Use Draft Mode**: Always create drafts before publishing
2. **Fill Required Fields**: Ensure all required fields are completed
3. **Add Alt Text**: Include descriptive alt text for images
4. **SEO Optimization**: Use title and description fields for SEO
5. **Preview Content**: Review in draft mode before publishing

### Content Organization
1. **Use Categories**: Organize blog posts with categories
2. **Consistent Naming**: Follow naming conventions for titles and slugs
3. **Related Content**: Link related items using relations
4. **Version Control**: Use Git for schema changes

### Media Management
1. **Optimize Images**: Compress images before upload
2. **Use Proper Formats**: WebP for images, PDF for documents
3. **Organize Files**: Use descriptive filenames
4. **File Size Limits**: Keep files under 10MB for performance

### SEO Best Practices
1. **Unique Titles**: Each page should have a unique title
2. **Meta Descriptions**: Write compelling descriptions (150-160 characters)
3. **Keywords**: Use relevant keywords naturally
4. **URL Structure**: Ensure UIDs are readable and descriptive
5. **Image Alt Text**: Add descriptive alt text for accessibility and SEO

## API Access

All content types are accessible via Strapi's REST API:
- **Public Endpoint**: `http://localhost:1337/api/{content-type}`
- **Admin Endpoint**: Requires authentication token
- **Filters**: Supports filtering, sorting, and pagination
- **Population**: Use `populate=*` to include relations

Example:
```bash
# Get published blogs
curl http://localhost:1337/api/blogs?populate=*

# Get specific product description
curl http://localhost:1337/api/product-descriptions?filters[product_handle]=my-product
```

For detailed API documentation, see [API Integrations Guide](./03-api-integrations.md).

## Troubleshooting

### Content Not Appearing
1. Check if content is published (not draft)
2. Verify API permissions in Roles & Permissions
3. Check publication date and status
4. Clear cache if necessary

### Media Upload Issues
1. Verify AWS S3 credentials in `.env`
2. Check bucket permissions
3. Ensure file size and format are supported
4. Review upload plugin configuration

### Relation Errors
1. Ensure target content exists
2. Check relation types match
3. Verify content type is published if required
4. Review schema for any conflicts

## Additional Resources

- [Strapi Documentation](https://docs.strapi.io/)
- [Admin Panel Guide](../README.md)
- [Media Management Guide](./02-media-management.md)
- [User Permissions Guide](./04-user-permissions.md)
- [API Integrations Guide](./03-api-integrations.md)
