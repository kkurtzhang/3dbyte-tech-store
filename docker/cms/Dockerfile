FROM node:22-alpine

# Install system dependencies for sharp (image processing) and build tools
RUN apk update && apk add --no-cache \
    build-base \
    gcc \
    autoconf \
    automake \
    zlib-dev \
    libpng-dev \
    nasm \
    bash \
    vips-dev \
    git

WORKDIR /opt

RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY apps/cms/package.json ./apps/cms/

# Install dependencies
RUN pnpm install --frozen-lockfile

ENV PATH=/opt/node_modules/.bin:$PATH

# Copy source code
COPY packages ./packages
COPY apps/cms ./apps/cms

# Build shared packages
RUN pnpm --filter @3dbyte-tech-store/shared-types build
RUN pnpm --filter @3dbyte-tech-store/shared-utils build

# Keep the workspace as-is at /opt, just ensure everything is built
RUN pnpm --filter @3dbyte-tech-store/shared-types build && \
    pnpm --filter @3dbyte-tech-store/shared-utils build && \
    pnpm --filter @3dbyte-tech-store/cms build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S strapi -u 1001

# Change ownership of the app directory
RUN chown -R strapi:nodejs /opt
USER strapi

WORKDIR /opt/apps/cms

# Expose port
EXPOSE 1337

# Start the application
CMD ["pnpm", "run", "develop"]
