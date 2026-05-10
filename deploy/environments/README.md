# OCI / Coolify Environment Policy

Use `main` as the production branch and `staging` as the staging branch.

## Staging

- Deploy branch: `staging`
- Coolify compose file: `docker-compose.yml`
- Use `staging.env.example` as the environment checklist.
- Keep `COMPOSE_PROFILES` empty so staging does not start its own Meilisearch.
- Keep `ADDRESS_REINDEX_ENABLED=false`.
- Use `stg_*` Meilisearch indexes for products, categories, brands, collections, and blog content.
- Read the shared `addresses_v1` index from the production search endpoint.

## Production

- Deploy branch: `main`
- Coolify compose file: `docker-compose.yml`
- Use `production.env.example` as the environment checklist.
- Set `COMPOSE_PROFILES=local-search` so production owns the shared Meilisearch service.
- Set `ADDRESS_REINDEX_ENABLED=true` only in production.
- Use `prod_*` Meilisearch indexes for products, categories, brands, collections, and blog content.
- Own and update the shared `addresses_v1` index.

## GitHub Guard

The `environment-policy` workflow blocks staging if address reindexing is enabled
and blocks production if the production policy no longer owns the shared address
reindex job.
