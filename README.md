# 3D Byte Tech Store

A monorepo-based e-commerce platform built with:

- **Backend**: Medusa v2.11.3
- **CMS**: Strapi v5.15.1
- **Storefront**: Next.js 15.1.5

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm run build
```

### Development

#### Local Development

```bash
# Start all services in parallel (recommended)
pnpm run dev

# Start individual services
pnpm run dev:backend    # Medusa backend on http://localhost:9000
pnpm run dev:cms        # Strapi CMS on http://localhost:1337
pnpm run dev:storefront # Next.js on http://localhost:8000

# Using turbo directly
pnpm run dev:turbo      # All services with Turborepo
```

#### Docker Development

```bash
# Start all services with Docker
pnpm run dev:docker

# Or directly with Docker Compose
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.yml down
```

### Build

```bash
# Build all applications
pnpm run build

# Build specific application
pnpm --filter @3dbyte-tech-store/storefront build
```

### Testing

```bash
# Run all tests
pnpm run test

# Run tests for specific application
pnpm --filter @3dbyte-tech-store/backend test
```

### Linting

```bash
# Lint all packages
pnpm run lint

# Lint specific package
pnpm --filter @3dbyte-tech-store/storefront lint
```

## Project Structure

```
3dbyte-tech-store/
├── apps/
│   ├── backend/          # Medusa commerce API
│   ├── cms/              # Strapi CMS
│   └── storefront/       # Next.js storefront
├── packages/
│   ├── shared-config/    # Shared ESLint, TypeScript configs
│   ├── shared-types/     # Common TypeScript types
│   └── shared-utils/     # Shared utilities
└── ...
```

## Environment Setup

Copy the following environment files and configure them:

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env

# CMS
cp apps/cms/.env.example apps/cms/.env

# Storefront
cp apps/storefront/.env.example apps/storefront/.env
```

## Learn More

- [Medusa Documentation](https://docs.medusajs.com/)
- [Strapi Documentation](https://docs.strapi.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)