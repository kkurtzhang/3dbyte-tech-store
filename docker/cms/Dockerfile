FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY apps/cms/package.json ./apps/cms/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/cms ./apps/cms

# Build shared packages
RUN pnpm --filter @3dbyte-tech-store/shared-types build
RUN pnpm --filter @3dbyte-tech-store/shared-utils build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S strapi -u 1001

# Change ownership of the app directory
RUN chown -R strapi:nodejs /app
USER strapi

# Expose port
EXPOSE 1337

# Start the application
CMD ["pnpm", "run", "dev"]