# Media Manager Patches for Medusa v2

This directory contains patches for `@lodashventure/medusa-media-manager` to make it work correctly with Medusa v2.

---

## Patch: JWT Authentication Support

### Problem
The plugin's admin UI uses `credentials: "include"` which only works with cookie-based authentication. When using JWT authentication (`ADMIN_AUTH_TYPE=jwt`), the admin UI returns 401 Unauthorized errors.

### Solution
Added an `authenticatedFetch` wrapper that:
1. Retrieves the JWT token from `localStorage` or `sessionStorage`
2. Adds `Authorization: Bearer <token>` header to requests
3. Falls back to `credentials: "include"` for cookie-based auth

### Modified File
`node_modules/@lodashventure/medusa-media-manager/.medusa/server/src/admin/index.mjs`

### Changes Made
Added `authenticatedFetch` function after `buildQuery`:
```javascript
// Authenticated fetch wrapper for JWT authentication
async function authenticatedFetch(url, options = {}) {
  if (typeof window === "undefined") {
    return fetch(url, options);
  }

  // Try multiple token sources
  let token = null;

  // Try localStorage first (default for JWT)
  token = token || window.localStorage.getItem("medusa_auth_token");

  // Try sessionStorage as fallback
  token = token || window.sessionStorage.getItem("medusa_auth_token");

  // Try common alternative keys
  token = token || window.localStorage.getItem("medusa_jwt_token");
  token = token || window.sessionStorage.getItem("medusa_jwt_token");

  const headers = { ...options.headers };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: token ? "omit" : "include"
  });
}
```

Replaced all `fetch()` calls with `authenticatedFetch()` in:
- `listMediaAssets()`
- `uploadMediaAssets()`
- `getMediaAsset()`
- `updateMediaAsset()`
- `deleteMediaAsset()`
- `replaceMediaAsset()`
- `getMediaAssetUrl()`

---

## S3 Configuration for Shared Bucket

The media manager, Medusa, and Strapi all share the same S3 bucket (`3dbyte-tech-dev-store-cms`).

### S3 Bucket Settings

**Important: ACLs MUST be enabled** for Medusa and Strapi compatibility.

1. **Object Ownership**: `ACLs enabled` (Bucket Owner Preferred)
   - Do NOT use "Bucket Owner Enforced" - this will break Medusa/Strapi uploads

2. **Default ACL**: New objects get `bucket-owner-full-control` by default

### Bucket Policy (For Public Access)

While ACLs control per-object permissions, use a **bucket policy** to ensure public read access across all paths:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicReadAccess",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::3dbyte-tech-dev-store-cms/medusaUpload/*",
        "arn:aws:s3:::3dbyte-tech-dev-store-cms/media/*",
        "arn:aws:s3:::3dbyte-tech-dev-store-cms/uploads/*"
      ]
    }
  ]
}
```

**Apply to:** S3 Bucket → Permissions → Bucket Policy

This ensures files are publicly accessible regardless of which system uploaded them.

### System Summary

| System | Upload Path | Sets ACL? | Access Control |
|--------|-------------|-----------|----------------|
| **Medusa** | `medusaUpload/` | ✅ Yes (hardcoded) | ACL + Bucket Policy |
| **Strapi** | `uploads/` | ✅ Yes (configurable) | ACL + Bucket Policy |
| **Media Manager** | `media/` | ❌ No | Bucket Policy only |

All three systems work together with ACLs enabled on the bucket.

---

## CORS Configuration

Required for browser-based file access:

### AWS S3 Console
1. Go to your S3 bucket → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)**
3. Click **Edit** and add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:9000", "http://localhost:5173"],
    "ExposeHeaders": ["ETag"]
  }
]
```

4. Click **Save changes**

---

## Environment Configuration

### Backend (.env)
```bash
# S3 Configuration
S3_FILE_URL=https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret
S3_REGION=ap-southeast-2
S3_BUCKET=3dbyte-tech-dev-store-cms
S3_ENDPOINT=https://s3.${S3_REGION}.amazonaws.com
S3_ROOTPATH=medusaUpload/

# Media Manager Configuration
MEDIA_BUCKET=${S3_BUCKET}
MEDIA_REGION=${S3_REGION}
MEDIA_ENDPOINT=${S3_FILE_URL}  # Includes bucket name
```

### Backend Config (medusa-config.ts)
```typescript
{
  resolve: "@medusajs/medusa/file",
  options: {
    providers: [
      {
        resolve: "@medusajs/medusa/file-s3",
        id: "s3",
        options: {
          file_url: process.env.S3_FILE_URL,
          access_key_id: process.env.S3_ACCESS_KEY_ID,
          secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
          region: process.env.S3_REGION,
          bucket: process.env.S3_BUCKET,
          endpoint: process.env.S3_ENDPOINT,
          prefix: process.env.S3_ROOTPATH,
          // Note: ACL handling is managed by bucket settings + policy
        },
      },
    ],
  },
}
```

---

## Re-applying Patches After `pnpm install`

When you run `pnpm install`, the JWT auth patch will be lost. Reapply it:

```bash
# Copy the backed up admin file
cp patches/admin-index.mjs.backup \
   node_modules/@lodashventure/medusa-media-manager/.medusa/server/src/admin/index.mjs
```

---

## Summary of Changes

| Change | File | Method |
|--------|------|--------|
| JWT Authentication | `admin/index.mjs` | `authenticatedFetch()` wrapper |
| S3 Public Access | **AWS S3 Bucket** | ACLs enabled + Bucket Policy |
| S3 URL Fix | `.env` | `MEDIA_ENDPOINT=${S3_FILE_URL}` |

---

## Result

After applying the JWT patch + S3 configuration:
- ✅ JWT authentication works correctly in admin panel
- ✅ Files uploaded via media manager are publicly accessible
- ✅ Compatible with Medusa and Strapi (same bucket, ACLs enabled)
- ✅ Backward compatible with cookie-based authentication
- ✅ Public access managed via bucket policy (flexible)

---

## Troubleshooting

### Error: "The bucket does not allow ACLs"
**Cause**: Bucket has "Bucket Owner Enforced" (ACLs disabled)

**Solution**: Enable ACLs on the bucket:
1. S3 Bucket → Permissions → Object Ownership
2. Edit → Select "ACLs enabled"
3. Save

### Error: "Access to image blocked by CORS policy"
**Cause**: CORS not configured on S3 bucket

**Solution**: Add CORS configuration (see CORS section above)

### Error: "No 'Access-Control-Allow-Origin' header"
**Cause**: Same as CORS error above

**Solution**: Same as CORS error

---

## Contributing

Consider contributing the JWT auth changes to the plugin's GitHub repository:
- https://github.com/lodashventure/medusa-media-manager
