# OCI / Coolify Environment Policy

Use `main` as the production branch and `staging` as the staging branch.

## Staging

- Deploy branch: `staging`
- Coolify compose file: `docker-compose.yml`
- Use `staging.env.example` as the environment checklist.
- Keep `COMPOSE_PROFILES` empty so staging does not start local-only services.
- Keep `ADDRESS_REINDEX_ENABLED=false`.
- Temporarily set `ADDRESS_MANUAL_REINDEX_ENABLED=true` only while staging
  needs the one-off address bootstrap button. Set it back to `false` after the
  shared address index has been created.
- Keep `MAILDEV_ENABLED=false`; staging should not run the MailDev provider or container.
- Keep `RESEND_FROM_EMAIL` on the staging-safe `staging-*` sender and use a
  dedicated `STRAPI_RESEND_API_KEY` for CMS admin reset/invite emails.
- Use `stg_*` Meilisearch indexes for products, categories, brands,
  collections, public product documents, and blog content.
- Read the shared `addresses_v1` index from the dedicated shared Meilisearch resource.

## Production

- Deploy branch: `main`
- Coolify compose file: `docker-compose.yml`
- Use `production.env.example` as the environment checklist.
- Keep `COMPOSE_PROFILES` empty so production does not start local-only services.
- Set `ADDRESS_REINDEX_ENABLED=true` only in production. This also enables the
  production manual address reindex button.
- Keep `MAILDEV_ENABLED=false`; production uses Resend for transactional email.
- Keep `RESEND_FROM_EMAIL` on the non-staging production sender and use the
  production `STRAPI_RESEND_API_KEY` for CMS admin reset/invite emails.
- Use `prod_*` Meilisearch indexes for products, categories, brands,
  collections, public product documents, and blog content.
- Own and update the shared `addresses_v1` index through the dedicated shared Meilisearch resource.

## Shared Meilisearch

- Deploy as a separate Coolify Docker Compose resource.
- Coolify compose file: `deploy/search/docker-compose.yml`
- Use `deploy/search/search.env.example` as the environment checklist.
- Assign the `meilisearch` service domain to `https://search.3dbytetech.com.au:7700`.
- Keep the master key only in the shared search resource.
- Use scoped API keys in staging and production app stacks.

## Database Bootstrap Notes

- The Coolify app stack uses the internal `postgres` service and builds
  Medusa/Strapi connection URLs with `sslmode=disable`. Do not use a
  Coolify-generated Postgres URL with `sslmode=require` for these internal
  containers.
- The `postgres-init` service is a one-shot bootstrap task. It creates the
  `strapi` and `karrio` databases when missing and enables `pgvector` for the
  Medusa and Strapi databases, including on volumes that already existed before
  the init SQL was mounted.
- `postgres-init` is built from `docker/postgres/Dockerfile.init`, which bakes
  the bootstrap script into the image. Do not bind-mount the source checkout for
  this script in Coolify; deployment helpers may not expose that path to runtime
  containers reliably.
- `postgres-init` shares the Postgres Unix socket through the `postgres_socket`
  volume so it can repair an existing volume safely when Coolify's
  `POSTGRES_PASSWORD` has drifted from the password used at first database
  initialization. On each deploy it syncs the database role password back to the
  current environment value before Medusa and Strapi start.
- If a first staging deploy started before this bootstrap existed and Strapi
  logs `database "strapi" does not exist`, either redeploy with this compose
  change or create the database manually from the Postgres container:

```sh
export PGPASSWORD="$POSTGRES_PASSWORD"
psql -h 127.0.0.1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE strapi"
psql -h 127.0.0.1 -U "$POSTGRES_USER" -d medusa -c "CREATE EXTENSION IF NOT EXISTS vector"
psql -h 127.0.0.1 -U "$POSTGRES_USER" -d strapi -c "CREATE EXTENSION IF NOT EXISTS vector"
```

## GitHub Guard

The `environment-policy` workflow blocks staging if address reindexing is enabled
or if MailDev is enabled. It blocks production if the production policy no
longer owns the shared address reindex job, or if MailDev is enabled. It also
checks that Meilisearch is owned by `deploy/search/docker-compose.yml` instead
of the staging or production app stack.
