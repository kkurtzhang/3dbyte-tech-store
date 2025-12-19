# 3D Byte Tech Store

A modern, full-stack e-commerce platform built with a monorepo architecture, combining the power of Medusa, Strapi, and Next.js to deliver a premium shopping experience.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/3dbyte-tech-store.git
cd 3dbyte-tech-store

# Install dependencies
pnpm install

# Copy environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/cms/.env.example apps/cms/.env
cp apps/storefront/.env.example apps/storefront/.env.local

# Start all services
pnpm run dev
```

Your store will be available at:
- **Storefront**: http://localhost:8000
- **Admin Panel**: http://localhost:9000/app
- **CMS Admin**: http://localhost:1337/admin

## 📋 Prerequisites

- **Node.js**: 20.0.0 or higher
- **pnpm**: 8.0.0 or higher
- **PostgreSQL**: For local development
- **Redis**: For caching (optional for development)

## 🏗️ Architecture

This project uses a monorepo structure managed by pnpm and Turborepo, consisting of three main applications:

```
3dbyte-tech-store/
├── apps/
│   ├── backend/          # Medusa v2.12.3 - Commerce API
│   ├── cms/              # Strapi v5.15.1 - Headless CMS
│   └── storefront/       # Next.js 16.1.0 - Frontend
├── packages/
│   ├── shared-config/    # ESLint, TypeScript, Prettier configs
│   ├── shared-types/     # Common TypeScript definitions
│   ├── shared-ui/        # Reusable React components
│   └── shared-utils/     # Shared utility functions
├── scripts/              # Build and development scripts
├── docker/               # Docker configurations
└── docs/                 # Project documentation
```

## 🛠️ Technology Stack

### Backend (Medusa v2.12.3)
- **Framework**: Headless commerce platform
- **Database**: PostgreSQL
- **Cache**: Redis
- **Features**:
  - Product & inventory management
  - Order processing
  - Customer management
  - Payment integrations (Stripe, PayPal)
  - Shipping & tax calculations
  - Admin dashboard

### CMS (Strapi v5.15.1)
- **Framework**: Headless CMS
- **Features**:
  - Blog management
  - Content pages
  - Media management with AWS S3
  - Meilisearch integration
  - Webhooks for automatic revalidation

### Storefront (Next.js 16.1.0)
- **Framework**: React 19.2.3 with TypeScript
- **Styling**: Tailwind CSS with Medusa UI components
- **Features**:
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - Product catalog with filtering
  - Shopping cart
  - Multi-step checkout
  - User authentication
  - Search (Algolia integration)
  - Dark/Light themes

### Development Tools
- **Package Manager**: pnpm with workspace support
- **Build System**: Turborepo for optimized builds
- **Code Quality**: ESLint, Prettier, TypeScript
- **Testing**: Jest (unit), Playwright (e2e)
- **Containerization**: Docker with Compose

## ✨ Key Features

### E-commerce Functionality
- 📦 Product catalog with variants and options
- 🛒 Shopping cart with promotional codes
- 💳 Multi-payment methods (Stripe, PayPal)
- 📦 Order tracking and history
- 👥 Customer accounts and profiles
- 🚚 Shipping calculations
- 💰 Tax management
- 📉 Inventory tracking
- 🔄 Returns and exchanges

### Content Management
- 📝 Blog posts and articles
- 📄 Static pages (About, FAQ, etc.)
- 🖼️ Media asset management
- 🔍 SEO-friendly URLs
- 📝 Rich text editing
- 🔄 Content versioning

### Developer Experience
- 🔗 Type-safe APIs across all services
- ⚡ Optimized build pipeline with caching
- 🔄 Hot reloading in development
- 🐳 Docker support for easy setup
- 🧪 Comprehensive testing suite
- 🎨 Shared UI components
- 📚 Extensive documentation

## 🛠️ Development

### Starting the Development Server

```bash
# All services in parallel (recommended)
pnpm run dev

# Individual services
pnpm run dev:backend      # Medusa on http://localhost:9000
pnpm run dev:cms          # Strapi on http://localhost:1337
pnpm run dev:storefront   # Next.js on http://localhost:8000

# Using Turborepo directly
pnpm run dev:turbo
```

### Docker Development

```bash
# Start all services with Docker
pnpm run dev:docker

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.yml down
```

### Building

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

# Specific test types
pnpm run test:unit
pnpm run test:integration
pnpm run test-e2e
```

### Code Quality

```bash
# Lint all packages
pnpm run lint

# Type checking
pnpm run type-check

# Format code
pnpm run format:write
```

## 📦 Package Management

This monorepo uses pnpm workspaces for efficient dependency management:

```bash
# Add dependency to specific app
pnpm add <package> --filter=@3dbyte-tech-store/storefront

# Add shared dependency to root
pnpm add <package> -w

# Update all dependencies
pnpm update

# Check dependency tree
pnpm ls
```

## 🔧 Environment Configuration

### Backend (apps/backend/.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medusa

# Redis
REDIS_URL=redis://localhost:6379

# Medusa
MEDUSA_ADMIN_ONBOARDING_TYPE=default
CORS_ORIGIN=http://localhost:8000
ADMIN_CORS=http://localhost:9000
```

### CMS (apps/cms/.env)
```env
# Database
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=cms
DATABASE_USERNAME=username
DATABASE_PASSWORD=password

# Strapi
STRAPI_ADMIN_JWT_SECRET=your-jwt-secret
API_TOKEN_SALT=your-token-salt

# S3 (optional)
S3_BUCKET=your-bucket
S3_REGION=your-region
S3_ACCESS_KEY_ID=your-access-key
S3_ACCESS_SECRET=your-secret-key
```

### Storefront (apps/storefront/.env.local)
```env
# Medusa
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000

# Strapi
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_READ_TOKEN=your-read-token

# Webhook secret
STRAPI_WEBHOOK_REVALIDATION_SECRET=your-webhook-secret
```

## 🚀 Deployment

### Production Deployment

1. **Build Applications**
   ```bash
   pnpm run build
   ```

2. **Environment Setup**
   - Configure production environment variables
   - Set up PostgreSQL and Redis instances
   - Configure AWS S3 for media storage

3. **Deploy Storefront (Vercel)**
   ```bash
   # Connect repository to Vercel
   # Set environment variables in Vercel dashboard
   ```

4. **Deploy Backend & CMS**
   - Recommended platforms: Railway, AWS, DigitalOcean
   - Ensure database persistence
   - Configure SSL certificates

### Docker Production Deployment

```bash
# Build and deploy with Docker Compose
docker-compose -f docker/docker-compose.prod.yml up -d
```

## 📚 Documentation

- [Project Overview](docs/project-overview.md) - Detailed project information
- [API Documentation](docs/api/) - Backend API reference
- [Components Guide](docs/components.md) - Shared UI components
- [Deployment Guide](docs/deployment.md) - Production deployment instructions
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention

We follow conventional commits:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `style:` for formatting
- `refactor:` for code refactoring
- `test:` for tests
- `chore:` for maintenance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Medusa](https://medusajs.com/) - The headless commerce platform
- [Strapi](https://strapi.io/) - The leading open-source headless CMS
- [Next.js](https://nextjs.org/) - The React framework
- [Vercel](https://vercel.com/) - For hosting the storefront
- [Turborepo](https://turbo.build/) - For optimized monorepo builds

## 📞 Support

If you have any questions or need help, please:

1. Check the [documentation](docs/)
2. Search [existing issues](https://github.com/your-org/3dbyte-tech-store/issues)
3. Create a new issue if needed
4. Join our [Discord community](https://discord.gg/your-invite)

---

**Built with ❤️ by the 3D Byte Tech Store team**