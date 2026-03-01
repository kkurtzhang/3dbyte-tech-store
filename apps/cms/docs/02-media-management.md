# Media Management Guide

## Overview

The CMS uses AWS S3 for media storage via the `@strapi/provider-upload-aws-s3` plugin. This guide covers how to manage media files, configure storage settings, and optimize media performance.

## Storage Configuration

### AWS S3 Setup

The CMS is configured to use AWS S3 as the primary storage provider. Configuration is managed via environment variables:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region (e.g., us-east-1)
AWS_BUCKET=your_bucket_name
AWS_ROOT_PATH=uploads (optional root folder)
AWS_SIGNED_URL_EXPIRES=900 (15 minutes default)
```

### Configuration File

Location: `/config/plugins.ts`

```typescript
upload: {
  config: {
    provider: "aws-s3",
    providerOptions: {
      rootPath: env("AWS_ROOT_PATH"),
      s3Options: {
        credentials: {
          accessKeyId: env("AWS_ACCESS_KEY_ID"),
          secretAccessKey: env("AWS_SECRET_ACCESS_KEY"),
        },
        region: env("AWS_REGION"),
        params: {
          ACL: null,
          signedUrlExpires: env("AWS_SIGNED_URL_EXPIRES", 15 * 60),
          Bucket: env("AWS_BUCKET"),
        },
      },
    },
    actionOptions: {
      upload: {},
      uploadStream: {},
      delete: {},
    },
  },
}
```

## Supported Media Types

### Images
- **Formats**: JPG, PNG, GIF, WebP, SVG
- **Recommended Formats**:
  - **WebP**: Best for web (smaller file size, good quality)
  - **JPG**: Photographs and complex images
  - **PNG**: Images with transparency or simple graphics
  - **SVG**: Logos, icons, and scalable graphics
- **Recommended Size**: Under 5MB per image
- **Recommended Dimensions**:
  - Thumbnails: 300x300px
  - Featured Images: 1200x630px (OG image standard)
  - Full-width: 1920x1080px
  - Product Images: 800x800px (square)

### Files
- **Formats**: PDF, DOC, DOCX, XLS, XLSX, ZIP, etc.
- **Recommended Size**: Under 10MB per file
- **Use Cases**:
  - Documents and whitepapers
  - Technical specifications
  - Downloadable resources

### Videos
- **Formats**: MP4, WebM (via file upload)
- **Recommended**: External hosting (YouTube, Vimeo) and embed via code
- **Size Limit**: Under 100MB (if uploaded directly)

## Media Library Interface

### Accessing Media Library
1. Log in to the Admin Panel
2. Click "Media Library" in the left sidebar
3. View all uploaded files and images

### Uploading Media

#### Single File Upload
1. Click "Upload files" or "Upload images"
2. Select file from your computer
3. Wait for upload to complete
4. Add metadata (name, alt text, caption)
5. Click "Save"

#### Multiple File Upload
1. Click "Upload files" or "Upload images"
2. Select multiple files (Ctrl/Cmd + click)
3. Wait for all uploads to complete
4. Edit metadata for each file
5. Click "Save"

#### Drag and Drop
1. Drag files from your computer to the upload area
2. Drop files to begin upload
3. Edit metadata as needed
4. Click "Save"

### Organizing Media

#### Folders
The Media Library supports folder organization:
1. Create folders by clicking "Add new folder"
2. Name folders descriptively (e.g., "products", "blog", "logos")
3. Move files between folders by drag and drop
4. Nest folders up to 3 levels deep

#### Recommended Folder Structure
```
uploads/
├── products/
│   ├── thumbnails/
│   ├── featured/
│   └── gallery/
├── blog/
│   ├── featured/
│   └── inline/
├── brand/
│   ├── logos/
│   └── assets/
└── documents/
    ├── manuals/
    └── specifications/
```

### Editing Media Metadata

#### Image Metadata
- **Name**: Descriptive filename (e.g., "product-red-variant-01.jpg")
- **Alternative Text**: Screen reader text for accessibility and SEO
- **Caption**: Optional caption displayed with the image
- **Width/Height**: Auto-detected from image

#### File Metadata
- **Name**: Descriptive filename
- **Caption**: Optional description
- **File Size**: Auto-detected

### Managing Media

#### View Options
- **Grid View**: Visual thumbnails (default)
- **List View**: Detailed file information

#### Filtering and Sorting
- **Search**: Filter by filename or metadata
- **Type Filter**: Show only images or files
- **Date Sort**: Newest first or oldest first
- **Name Sort**: Alphabetical order

#### Selecting Media
- Click to select single file
- Ctrl/Cmd + click for multiple selection
- Shift + click for range selection

#### Deleting Media
1. Select file(s) to delete
2. Click "Delete" button
3. Confirm deletion
4. **Warning**: Deletion is permanent and affects published content

## Media Optimization

### Image Optimization Best Practices

#### Before Upload
1. **Resize Images**: Use appropriate dimensions for use case
2. **Compress Images**: Use tools like TinyPNG, ImageOptim, or Squoosh
3. **Choose Right Format**:
   - WebP for most web images
   - PNG for transparency
   - JPG for photographs
4. **Strip Metadata**: Remove unnecessary EXIF data
5. **Use Progressive Loading**: Enable for JPGs

#### Recommended Tools
- **TinyPNG** (https://tinypng.com/): Free online compressor
- **ImageOptim** (Mac): Desktop compressor
- **Squoosh** (Google): Advanced web-based compressor
- **Sharp** (Node.js): Programmatic optimization

#### Compression Targets
- **JPG**: Quality 70-85%
- **PNG**: Use PNG-8 for simple graphics, PNG-24 for photos
- **WebP**: Quality 80-90% (smaller than JPG at similar quality)

### File Optimization

#### Documents
1. **PDF Optimization**:
   - Use Adobe Acrobat or online tools
   - Remove unnecessary fonts and images
   - Target size: Under 5MB
2. **Word/Excel**:
   - Compress images within documents
   - Remove unused styles
   - Save as PDF for web distribution

### CDN Integration

The CMS can be configured to use a CDN with AWS S3:

1. **CloudFront Integration**:
   - Create CloudFront distribution for S3 bucket
   - Update bucket policy to allow CloudFront access
   - Use CloudFront URL in Strapi config

2. **Custom CDN**:
   - Configure CDN to pull from S3 bucket
   - Update upload plugin settings for CDN URLs

## Media in Content Types

### Media Field Types

#### Single Media Field
- Stores one file or image
- Example: Blog featured image
- Configuration:
  ```json
  {
    "type": "media",
    "multiple": false,
    "required": true,
    "allowedTypes": ["images", "files"]
  }
  ```

#### Multiple Media Field
- Stores multiple files or images
- Example: Product image gallery
- Configuration:
  ```json
  {
    "type": "media",
    "multiple": true,
    "required": false,
    "allowedTypes": ["images"]
  }
  ```

### Using Media in Rich Text

#### Inserting Images
1. Open rich text editor
2. Click image icon in toolbar
3. Select image from Media Library or upload new
4. Set size and alignment
5. Add caption if needed

#### Inserting Files
1. Click link icon in toolbar
2. Select "Media Library" tab
3. Choose file to link
4. Set link text

## API Usage

### Uploading Media via API

```bash
# Upload image
curl -X POST http://localhost:1337/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@path/to/image.jpg"

# Upload multiple files
curl -X POST http://localhost:1337/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg"
```

### Retrieving Media

```bash
# Get media by ID
curl http://localhost:1337/api/upload/files/{id}

# Get all files
curl http://localhost:1337/api/upload/files

# Get media with content
curl http://localhost:1337/api/blogs?populate=FeaturedImage
```

### Deleting Media via API

```bash
# Delete by ID
curl -X DELETE http://localhost:1337/api/upload/files/{id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Permissions

### Role-Based Access

Media access is controlled via Roles & Permissions:
- **Super Admin**: Full access to all media
- **Editor**: Can upload, edit, and delete own media
- **Author**: Can upload and edit own media, no delete
- **Public**: Can view published media only

### Configuring Media Permissions

1. Go to Settings → Roles & Permissions
2. Select role to configure
3. Expand "Upload" section
4. Configure permissions:
   - `upload`: Upload files
   - `upload/action`: Upload files (action)
   - `upload/find`: View files
   - `upload/findOne`: View single file
   - `upload/update`: Update file metadata
   - `upload/delete`: Delete files

## Troubleshooting

### Upload Issues

#### "Upload failed" error
1. Verify AWS S3 credentials in `.env`
2. Check bucket exists and is accessible
3. Ensure bucket has write permissions
4. Check file size (should be under limit)
5. Verify file format is supported

#### "Access Denied" error
1. Check IAM user permissions
2. Verify bucket policy allows write access
3. Ensure CORS is configured if using browser upload

### File Not Displaying

#### 404 errors on media URLs
1. Check file is published
2. Verify AWS credentials are correct
3. Check bucket region matches configuration
4. Clear CDN cache if using CDN

#### Broken images in content
1. Verify image exists in Media Library
2. Check image is not deleted
3. Clear browser cache
4. Re-associate image with content

### Performance Issues

#### Slow uploads
1. Check internet connection
2. Reduce file sizes before upload
3. Compress images
4. Consider using multipart upload for large files

#### Slow page loads
1. Optimize images (see above)
2. Enable CDN caching
3. Use WebP format
4. Implement lazy loading in frontend

### Storage Quota

#### AWS S3 storage limit reached
1. Check S3 bucket size
2. Delete unused files
3. Upgrade S3 storage tier if needed
4. Implement lifecycle policies for old files

## Security Best Practices

### Access Control
1. **IAM Policies**: Use least-privilege principle
2. **Bucket Policies**: Restrict public access unless needed
3. **Signed URLs**: Use signed URLs for temporary access
4. **CORS Configuration**: Limit allowed origins

### File Security
1. **Validate Files**: Check file types on upload
2. **Scan Files**: Implement virus scanning
3. **Block Executables**: Prevent upload of executable files
4. **Size Limits**: Enforce maximum file sizes

### Data Protection
1. **Backups**: Enable S3 versioning for backup
2. **Encryption**: Enable S3 server-side encryption
3. **Audit Logs**: Enable AWS CloudTrail for access logging
4. **Monitoring**: Set up AWS CloudWatch alerts

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Strapi Upload Plugin](https://docs.strapi.io/dev-docs/providers)
- [Image Optimization Guide](https://images.guide/)
- [Content Types Guide](./01-content-types-guide.md)
- [User Permissions Guide](./04-user-permissions.md)
