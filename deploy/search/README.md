# Shared Meilisearch Coolify Resource

Deploy this directory as a separate Coolify Docker Compose resource before the
staging or production app stack.

- Branch: `staging` while validating OCI deployment, then `main` for production
  once this file is merged there.
- Compose file: `deploy/search/docker-compose.yml`
- Domain: `https://search.3dbytetech.com.au:7700`
- Environment checklist: `deploy/search/search.env.example`
- Do not add host port mappings for `7700`.
- Do not use `MEILISEARCH_MASTER_KEY` in storefront, Medusa, or Strapi app envs.
- The compose health check probes the public `/health` endpoint inside the
  container; no API key is required for that route.

After the resource is online, use the master key to create scoped API keys:

- browser/public key: `actions=["search"]`
- staging backend key: write access only to Medusa-owned `stg_*` indexes and
  the shared `addresses_v1` / `localities_v1` indexes
- staging CMS key: write access only to `stg_blog` and
  `stg_blog_post_categories`
- production backend key: write access only to Medusa-owned `prod_*` indexes
  and the shared `addresses_v1` / `localities_v1` indexes
- production CMS key: write access only to `prod_blog` and
  `prod_blog_post_categories`
