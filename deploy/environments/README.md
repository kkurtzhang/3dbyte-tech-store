# OCI / Coolify Environment Policy

Use `main` as the production branch and `staging` as the staging branch.

## Staging

- Deploy branch: `staging`
- Coolify compose file: `docker-compose.yml`
- Use `staging.env.example` as the environment checklist.
- Keep `COMPOSE_PROFILES` empty so staging does not start local-only services.
- Keep `ADDRESS_REINDEX_ENABLED=false`.
- Keep `MAILDEV_ENABLED=false`; staging should not run the MailDev provider or container.
- Use `stg_*` Meilisearch indexes for products, categories, brands, collections, and blog content.
- Read the shared `addresses_v1` index from the dedicated shared Meilisearch resource.

## Production

- Deploy branch: `main`
- Coolify compose file: `docker-compose.yml`
- Use `production.env.example` as the environment checklist.
- Keep `COMPOSE_PROFILES` empty so production does not start local-only services.
- Set `ADDRESS_REINDEX_ENABLED=true` only in production.
- Keep `MAILDEV_ENABLED=false`; production uses Resend for transactional email.
- Use `prod_*` Meilisearch indexes for products, categories, brands, collections, and blog content.
- Own and update the shared `addresses_v1` index through the dedicated shared Meilisearch resource.

## Shared Meilisearch

- Deploy as a separate Coolify Docker Compose resource.
- Coolify compose file: `deploy/search/docker-compose.yml`
- Use `deploy/search/search.env.example` as the environment checklist.
- Assign the `meilisearch` service domain to `https://search.3dbytetech.com.au:7700`.
- Keep the master key only in the shared search resource.
- Use scoped API keys in staging and production app stacks.

## GitHub Guard

The `environment-policy` workflow blocks staging if address reindexing is enabled
or if MailDev is enabled. It blocks production if the production policy no
longer owns the shared address reindex job, or if MailDev is enabled. It also
checks that Meilisearch is owned by `deploy/search/docker-compose.yml` instead
of the staging or production app stack.
