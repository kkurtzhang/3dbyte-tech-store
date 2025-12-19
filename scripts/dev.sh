#!/bin/bash

# Development script for 3D Byte Tech Store monorepo
echo "🚀 Starting 3D Byte Tech Store in development mode..."

# Start Docker container for CMS services (Strapi, Redis, Meilisearch)
echo "🐳 Starting Docker container for CMS services..."
cd apps/cms
docker-compose -p 3dbyte-tech-cms up -d
cd ../..

# Wait a moment for services to start
sleep 5

# Start backend and storefront services in parallel
echo "🏃 Running backend and storefront in parallel..."
pnpm run dev:turbo --filter=!@3dbyte-tech-store/cms

echo "✅ All services started!"
echo "📊 Backend: http://localhost:9000"
echo "🔧 CMS Admin: http://localhost:1337/admin"
echo "🛍️  Storefront: http://localhost:8000"
echo "🔍 Meilisearch: http://localhost:7700"