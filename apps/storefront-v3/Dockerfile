# syntax=docker/dockerfile:1.7

ARG TARGETPLATFORM=linux/arm64
ARG NODE_VERSION=22-alpine

FROM --platform=${TARGETPLATFORM} node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/storefront-v3/package.json apps/storefront-v3/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY packages/shared-config/package.json packages/shared-config/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json
RUN pnpm install --frozen-lockfile --filter @3dbyte-tech-store/storefront-v3...

FROM deps AS builder
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_STRAPI_URL
ARG NEXT_PUBLIC_STRAPI_READ_TOKEN
ARG NEXT_PUBLIC_MEILISEARCH_HOST
ARG NEXT_PUBLIC_MEILISEARCH_API_KEY
ARG NEXT_PUBLIC_MEILISEARCH_INDEX_NAME
ARG NEXT_PUBLIC_MEILISEARCH_PRODUCT_INDEX_NAME
ARG NEXT_PUBLIC_MEILISEARCH_CATEGORY_INDEX_NAME
ARG NEXT_PUBLIC_MEILISEARCH_BRAND_INDEX_NAME
ARG NEXT_PUBLIC_MEILISEARCH_COLLECTION_INDEX_NAME
ARG NEXT_PUBLIC_MEILISEARCH_BLOG_INDEX_NAME
ARG NEXT_PUBLIC_STRIPE_KEY
ARG NEXT_PUBLIC_CDN_SPACE_DOMAIN
ARG NEXT_PUBLIC_SPACE_DOMAIN
ARG NEXT_PUBLIC_SPACE_ENDPOINT

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRAPI_URL=$NEXT_PUBLIC_STRAPI_URL
ENV NEXT_PUBLIC_STRAPI_READ_TOKEN=$NEXT_PUBLIC_STRAPI_READ_TOKEN
ENV NEXT_PUBLIC_MEILISEARCH_HOST=$NEXT_PUBLIC_MEILISEARCH_HOST
ENV NEXT_PUBLIC_MEILISEARCH_API_KEY=$NEXT_PUBLIC_MEILISEARCH_API_KEY
ENV NEXT_PUBLIC_MEILISEARCH_INDEX_NAME=$NEXT_PUBLIC_MEILISEARCH_INDEX_NAME
ENV NEXT_PUBLIC_MEILISEARCH_PRODUCT_INDEX_NAME=$NEXT_PUBLIC_MEILISEARCH_PRODUCT_INDEX_NAME
ENV NEXT_PUBLIC_MEILISEARCH_CATEGORY_INDEX_NAME=$NEXT_PUBLIC_MEILISEARCH_CATEGORY_INDEX_NAME
ENV NEXT_PUBLIC_MEILISEARCH_BRAND_INDEX_NAME=$NEXT_PUBLIC_MEILISEARCH_BRAND_INDEX_NAME
ENV NEXT_PUBLIC_MEILISEARCH_COLLECTION_INDEX_NAME=$NEXT_PUBLIC_MEILISEARCH_COLLECTION_INDEX_NAME
ENV NEXT_PUBLIC_MEILISEARCH_BLOG_INDEX_NAME=$NEXT_PUBLIC_MEILISEARCH_BLOG_INDEX_NAME
ENV NEXT_PUBLIC_STRIPE_KEY=$NEXT_PUBLIC_STRIPE_KEY
ENV NEXT_PUBLIC_CDN_SPACE_DOMAIN=$NEXT_PUBLIC_CDN_SPACE_DOMAIN
ENV NEXT_PUBLIC_SPACE_DOMAIN=$NEXT_PUBLIC_SPACE_DOMAIN
ENV NEXT_PUBLIC_SPACE_ENDPOINT=$NEXT_PUBLIC_SPACE_ENDPOINT

COPY packages/shared-config packages/shared-config
COPY packages/observability packages/observability
COPY packages/shared-types packages/shared-types
COPY packages/shared-utils packages/shared-utils
COPY apps/storefront-v3 apps/storefront-v3

RUN mkdir -p apps/storefront-v3/public && \
    pnpm --filter @3dbyte-tech-store/shared-types build && \
    pnpm --filter @3dbyte-tech-store/shared-utils build && \
    pnpm --filter @3dbyte-tech-store/storefront-v3 build

FROM --platform=${TARGETPLATFORM} node:${NODE_VERSION} AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront-v3/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront-v3/public ./apps/storefront-v3/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront-v3/.next/static ./apps/storefront-v3/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/storefront-v3/server.js"]
