FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/backend ./apps/backend

# Build shared packages
RUN pnpm --filter @3dbyte-tech-store/shared-types build
RUN pnpm --filter @3dbyte-tech-store/shared-utils build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S medusa -u 1001

# Change ownership of the app directory
RUN chown -R medusa:nodejs /app
USER medusa

# Expose port
EXPOSE 9000

# Start the application
CMD ["pnpm", "run", "dev"]