# Deployment Guide

This guide covers how to deploy the 3D Byte Tech Store to production.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Storefront Deployment (Vercel)](#storefront-deployment-vercel)
- [Backend Deployment](#backend-deployment)
- [CMS Deployment](#cms-deployment)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [CI/CD Setup](#cicd-setup)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

Before deploying, ensure you have:

- Node.js 20+ installed
- pnpm 8+ installed
- Git repository with the code
- Domain name (optional but recommended)
- SSL certificates (for custom domains)

## Environment Setup

### 1. Production Environment Variables

Create production environment files:

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://username:password@host:5432/database
REDIS_URL=redis://username:password@host:6379

# Medusa
MEDUSA_ADMIN_ONBOARDING_TYPE=default
CORS_ORIGIN=https://your-domain.com
ADMIN_CORS=https://admin.your-domain.com

# Secrets
MEDUSA_JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret

# Payment providers
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret
```

#### CMS (.env)
```env
# Database
DATABASE_CLIENT=postgres
DATABASE_HOST=your-db-host
DATABASE_PORT=5432
DATABASE_NAME=cms
DATABASE_USERNAME=username
DATABASE_PASSWORD=password

# Strapi
STRAPI_ADMIN_JWT_SECRET=your-jwt-secret
API_TOKEN_SALT=your-token-salt
NODE_ENV=production

# AWS S3 (recommended for production)
S3_BUCKET=your-s3-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_ACCESS_SECRET=your-secret-key
```

#### Storefront (.env.local)
```env
# Medusa
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.your-domain.com

# Strapi
NEXT_PUBLIC_STRAPI_URL=https://cms.your-domain.com
NEXT_PUBLIC_STRAPI_READ_TOKEN=your-read-token

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_HOTJAR_ID=your-hotjar-id

# Other
NEXT_PUBLIC_SITE_URL=https://your-domain.com
STRAPI_WEBHOOK_REVALIDATION_SECRET=your-webhook-secret
```

### 2. Generate Secrets

Use these commands to generate secure secrets:

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Cookie Secret
openssl rand -base64 32

# Webhook Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Storefront Deployment (Vercel)

### 1. Connect to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 2. Vercel Configuration

Create `vercel.json` in the root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/storefront/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "apps/storefront/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY": "@medusa-publishable-key",
    "NEXT_PUBLIC_MEDUSA_BACKEND_URL": "@medusa-backend-url",
    "NEXT_PUBLIC_STRAPI_URL": "@strapi-url",
    "NEXT_PUBLIC_STRAPI_READ_TOKEN": "@strapi-read-token"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY": "@medusa-publishable-key",
      "NEXT_PUBLIC_MEDUSA_BACKEND_URL": "@medusa-backend-url",
      "NEXT_PUBLIC_STRAPI_URL": "@strapi-url",
      "NEXT_PUBLIC_STRAPI_READ_TOKEN": "@strapi-read-token"
    }
  }
}
```

### 3. Set Environment Variables in Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings > Environment Variables
4. Add all required variables

### 4. Deploy

```bash
# Deploy to production
vercel --prod

# Check deployment
vercel inspect
```

## Backend Deployment

### Option 1: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Add PostgreSQL plugin
railway add postgresql

# Add Redis plugin
railway add redis

# Set environment variables
railway variables set MEDUSA_ADMIN_ONBOARDING_TYPE=default
railway variables set NODE_ENV=production

# Deploy
railway up
```

### Option 2: AWS/EC2

```bash
# 1. Create EC2 instance (Ubuntu 20.04 LTS recommended)

# 2. SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 3. Setup server
sudo apt update
sudo apt install -y nodejs npm postgresql redis-server nginx

# 4. Install pnpm
npm install -g pnpm

# 5. Clone repository
git clone https://github.com/your-org/3dbyte-tech-store.git
cd 3dbyte-tech-store

# 6. Install dependencies
pnpm install

# 7. Build backend
cd apps/backend
pnpm build

# 8. Setup PM2
npm install -g pm2
pm2 start npm --name "medusa-backend" -- start

# 9. Setup Nginx reverse proxy
sudo nano /etc/nginx/sites-available/medusa
```

Nginx configuration:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/medusa /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

## CMS Deployment

### Option 1: Railway

Similar to backend deployment:

```bash
# Create new Railway project for CMS
railway login
railway init
railway add postgresql
railway up
```

### Option 2: DigitalOcean App Platform

1. Create a new App in DigitalOcean
2. Connect your GitHub repository
3. Set build command: `cd apps/cms && pnpm build`
4. Set run command: `cd apps/cms && pnpm start`
5. Add environment variables
6. Deploy

### Webhook Configuration (Strapi → Medusa)

When Strapi runs in Docker and needs to send webhooks to Medusa (or vice versa), special network configuration is required.

**IMPORTANT: Webhook Events Configuration**
========================================

ONLY enable **"Entry publish"** and **"Entry unpublish"** events in Strapi webhook settings. Do NOT enable "Entry create" or "Entry update":

| Event | Enable? | Reason |
|-------|---------|--------|
| **Entry publish** | ✅ YES | Fires when content becomes live. Index with full Strapi enrichment (descriptions, features, etc.). |
| **Entry unpublish** | ✅ YES | Fires when content is unpublished. Re-index with Medusa data only (product remains searchable with base info). |
| **Entry create** | ❌ NO | Causes redundant re-indexing. Medusa subscriber already indexes when products are created. |
| **Entry update** | ❌ NO | Fires on save (draft state). Strapi API only returns published content, so this re-indexes old content without updates. |

#### Development (Docker Desktop / Colima)

If Medusa runs on host and Strapi runs in Docker:

| Component | URL Format | Example |
|-----------|------------|---------|
| **Medusa** (host) | `http://host.docker.internal:9000` | Backend accessible from Docker |
| **Strapi** (Docker) | `http://localhost:1337` | CMS accessible from host |

**Strapi Webhook Configuration:**
```
URL: http://host.docker.internal:9000/webhooks/strapi
Method: POST
Headers: X-Webhook-Secret: your-secret
Events: Entry publish, Entry unpublish (see table above)
```

#### Production (Docker Network)

If both run in Docker Compose:

| Component | URL Format | Example |
|-----------|------------|---------|
| **Medusa** | `http://backend:9000` | Use service name |
| **Strapi** | `http://cms:1337` | Use service name |

**Strapi Webhook Configuration:**
```
URL: http://backend:9000/webhooks/strapi
Method: POST
Headers: X-Webhook-Secret: ${STRAPI_WEBHOOK_SECRET}
Events: Entry publish, Entry unpublish (see table above)
```

#### Production (Separate Servers)

If deployed on different servers:

| Component | URL Format | Example |
|-----------|------------|---------|
| **Medusa** | `https://api.your-domain.com` | Public URL |
| **Strapi** | `https://cms.your-domain.com` | Public URL |

**Strapi Webhook Configuration:**
```
URL: https://api.your-domain.com/webhooks/strapi
Method: POST
Headers: X-Webhook-Secret: ${STRAPI_WEBHOOK_SECRET}
Events: Entry publish, Entry unpublish (see table above)
```

**Important:** Always use HTTPS in production for webhook security.

## Database Setup

### PostgreSQL Production

#### Managed Services (Recommended)
- **AWS RDS**
- **Google Cloud SQL**
- **Railway PostgreSQL**
- **Heroku Postgres**

#### Self-hosted PostgreSQL

```bash
# On Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# Secure PostgreSQL
sudo -u postgres psql
CREATE DATABASE medusa;
CREATE DATABASE cms;
CREATE USER medusa_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE medusa TO medusa_user;
GRANT ALL PRIVILEGES ON DATABASE cms TO medusa_user;
\q

# Configure PostgreSQL
sudo nano /etc/postgresql/*/main/postgresql.conf
# Set: listen_addresses = 'localhost'

# Allow connections
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Add: local all all md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Redis Production

#### Managed Services
- **AWS ElastiCache**
- **Redis Labs**
- **Railway Redis**

#### Self-hosted Redis

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: bind 127.0.0.1
# Set: requirepass your-redis-password

# Restart Redis
sudo systemctl restart redis-server
```

## Docker Deployment

### 1. Production Dockerfile

Create `apps/backend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @3dbyte-tech-store/backend build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 medusa

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

USER medusa

EXPOSE 9000

ENV PORT 9000

CMD ["npm", "start"]
```

### 2. Docker Compose Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${DATABASE_NAME}
      POSTGRES_USER: ${DATABASE_USER}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    restart: always

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@postgres:5432/${DATABASE_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      - postgres
      - redis
    restart: always

  cms:
    build:
      context: .
      dockerfile: apps/cms/Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_CLIENT: postgres
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: ${CMS_DATABASE_NAME}
      DATABASE_USERNAME: ${DATABASE_USER}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD}
    depends_on:
      - postgres
    restart: always

  storefront:
    build:
      context: .
      dockerfile: apps/storefront/Dockerfile
    environment:
      NODE_ENV: production
    depends_on:
      - backend
      - cms
    restart: always

volumes:
  postgres_data:
```

### 3. Deploy with Docker

```bash
# Create production environment file
cp .env.example .env.production
# Edit .env.production with production values

# Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm run test

      - name: Build applications
        run: pnpm run build

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: railway-app/railway-action@v1
        with:
          api-token: ${{ secrets.RAILWAY_TOKEN }}
          service: medusa-backend
```

## Monitoring and Maintenance

### 1. Health Checks

Add health check endpoints to each service:

#### Backend (`apps/backend/src/api/health/route.ts`):
```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
}
```

#### CMS (`apps/cms/config/routes.js`):
```javascript
module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'health.check',
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
}
```

### 2. Monitoring Services

- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry
- **Performance monitoring**: Vercel Analytics, New Relic
- **Log aggregation**: Logtail, Papertrail

### 3. Backup Strategy

#### Database Backups

```bash
# PostgreSQL backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_$DATE.sql
gzip backup_$DATE.sql

# Upload to S3
aws s3 cp backup_$DATE.sql.gz s3://your-backups/postgres/
```

#### CMS Media Backups

```bash
# Sync S3 bucket to backup location
aws s3 sync s3://your-cms-bucket s3://your-cms-backup-bucket
```

### 4. SSL/TLS Setup

#### With Nginx (using Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### With Cloudflare

1. Sign up for Cloudflare
2. Add your domain
3. Update nameservers
4. Enable SSL/TLS in Cloudflare dashboard
5. Set SSL/TLS mode to "Full (strict)"

### 5. Performance Optimization

#### CDN Setup

```javascript
// Next.js config for CDN
module.exports = {
  async rewrites() {
    return [
      {
        source: '/_next/static/(.*)',
        destination: 'https://your-cdn.com/_next/static/$1',
      },
    ]
  },
  assetPrefix: 'https://your-cdn.com',
}
```

#### Image Optimization

```javascript
// apps/storefront/next.config.js
module.exports = {
  images: {
    domains: ['your-cms-domain.com', 'your-s3-bucket.s3.amazonaws.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] SSL certificates installed
- [ ] DNS records configured
- [ ] Database backups enabled
- [ ] Monitoring alerts configured
- [ ] Health checks passing
- [ ] Performance tests passing
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Team notified of deployment

## Troubleshooting

### Common Issues

1. **CORS errors**: Verify CORS origins in backend
2. **Database connection errors**: Check credentials and network
3. **Build failures**: Review build logs
4. **Slow performance**: Enable caching and CDN
5. **Memory issues**: Check server resources
6. **Webhook "fetch failed" errors**: Docker networking issue

### Docker Networking for Webhooks

**Problem**: Strapi webhook test fails with "fetch failed" error.

**Cause**: Strapi running in Docker tries to connect to `localhost:9000`, which refers to the container itself, not the host machine where Medusa runs.

**Solutions by Deployment Type:**

| Deployment | Webhook URL | Notes |
|------------|--------------|-------|
| **Docker Desktop** | `http://host.docker.internal:9000/webhooks/strapi` | Special DNS for host |
| **Colima (Mac)** | `http://192.168.5.2:9000/webhooks/strapi` | Get IP with `colima ssh` |
| **Docker Compose** | `http://backend:9000/webhooks/strapi` | Use service name |
| **Separate servers** | `https://api.your-domain.com/webhooks/strapi` | Use public URL |

**Get Colima IP:**
```bash
colima ssh
ip addr show eth0 | grep inet
```

**Verify connectivity from Strapi container:**
```bash
docker exec -it strapi sh
wget -O- http://host.docker.internal:9000/webhooks/strapi
```

### Debug Commands

```bash
# Check service status
systemctl status nginx postgresql redis

# Check logs
journalctl -u nginx -f
docker-compose logs -f

# Test API endpoints
curl -I https://api.your-domain.com/health
curl -I https://cms.your-domain.com/health
```