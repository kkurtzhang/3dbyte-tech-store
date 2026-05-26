# Coolify Scoped Redeploys

Use `staging` as the deployment ground truth for staging. Do not use `main` to
decide what should be running in staging.

The default Coolify Docker Compose resource still uses the root
`docker-compose.yml` for full-stack deploys. A full deploy is still the right
choice when `docker-compose.yml`, lockfiles, shared packages, database bootstrap,
or multiple apps changed.

For one-app hotfixes, use a scoped redeploy so Coolify does not rebuild every
service in the compose file.

## Scope Rules

| Scope | Use when changed files are limited to |
| --- | --- |
| `storefront` | `apps/storefront-v3/**` |
| `backend` | `apps/backend/**`, `docker/backend/**` |
| `cms` | `apps/cms/**`, `docker/cms/**` |
| `all` | `docker-compose.yml`, lockfiles, root package files, `packages/**`, `deploy/**`, `.github/workflows/**`, or multiple app scopes |
| `none` | docs-only changes |

Check a commit range:

```sh
scripts/resolve-deploy-scope.sh origin/staging HEAD
```

## Manual Scoped Redeploy

Run from the checked-out staging revision on the deployment host.

```sh
COOLIFY_PROJECT_NAME="<coolify-compose-project-name>" \
COOLIFY_ENV_FILE="<path-to-coolify-env-file>" \
scripts/coolify-scope-redeploy.sh storefront
```

The project name must match the existing Coolify compose project. In Coolify
logs it appears in commands as `--project-name <value>`.

The helper intentionally uses targeted service commands and avoids
`--remove-orphans`, so a storefront redeploy does not remove Medusa, CMS,
Postgres, Redis, or workers from the existing stack.

## Immediate AI Product Hotfix

For the AI placeholder image fix, the expected scope is `storefront` because
only `apps/storefront-v3/next.config.ts` changed. If the full Coolify deployment
starts rebuilding CMS or Medusa, cancel it and run the scoped storefront redeploy
against the same staging commit instead.

After it succeeds, verify:

```sh
curl -I https://store.staging.3dbytetech.com.au/products/ai-petg-black-175-1kg
curl -I https://store.staging.3dbytetech.com.au/api/health
```

## Longer-Term Split

The clean long-term model is one Coolify resource per deployable app:

- storefront resource: `apps/storefront-v3`
- backend resource: Medusa server and worker
- CMS resource: Strapi
- shared state resource: Postgres and Redis, or managed external equivalents
- shared search resource: current Meilisearch resource

That split lets Coolify auto-deploy only the resource whose watched paths
changed. Until then, use the scoped helper for one-app hotfixes and full deploys
for shared or cross-app changes.
