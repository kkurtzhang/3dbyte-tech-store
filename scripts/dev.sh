#!/bin/bash

# Define the location of the CMS docker-compose file for easier reference
COMPOSE_FILE="docker/docker-compose.yml"
PROJECT_NAME="3dbyte-cms"

# Development script for 3D Byte Tech Store monorepo
echo "🚀 Starting 3D Byte Tech Store in development mode..."

# Check if CMS Docker containers are already running
CMS_CONTAINERS=$(docker ps -q -f name=$PROJECT_NAME)
if [ -n "$CMS_CONTAINERS" ]; then
    echo "✅ CMS Docker containers are already running!"
    echo "📦 Services detected:"
    docker ps -f name=$PROJECT_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
else
    # Start Docker container for CMS services (Strapi, Redis, Meilisearch)
    echo "🐳 Starting Docker container for CMS services..."
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d

    # Wait a moment for services to start
    echo "⏳ Waiting for CMS services to initialize..."
    sleep 5
fi

# Start backend and storefront services in parallel
echo "🏃 Running backend and storefront in parallel..."
pnpm run dev:turbo --filter=!@3dbyte-tech-store/cms

echo ""
echo "✅ Development services started!"
echo "📊 Backend: http://localhost:9000"
echo "🛍️  Storefront: http://localhost:3001"
if [ -n "$CMS_CONTAINERS" ]; then
    echo "🔧 CMS Admin: http://localhost:1337/admin (reused existing container)"
else
    echo "🔧 CMS Admin: http://localhost:1337/admin"
fi
echo "🔍 Meilisearch: http://localhost:7700"
