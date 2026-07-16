#!/bin/bash

# Docker support services for local development
echo "🐳 Starting CMS and local support services with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker compose -f docker/docker-compose.yml build

echo "🚀 Starting services..."
docker compose -f docker/docker-compose.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Show status
docker compose -f docker/docker-compose.yml ps

echo ""
echo "✅ CMS and support services are running!"
echo "🔧 CMS Admin: http://localhost:1337/admin"
echo "🔍 Meilisearch: http://localhost:7700"
echo "📦 Karrio API: http://localhost:5002"
echo "📦 Karrio dashboard: http://localhost:3002"
echo "Start the backend and storefront separately with pnpm run dev:backend and pnpm run dev:storefront."
echo ""
echo "To view logs: docker compose -f docker/docker-compose.yml logs -f [service-name]"
echo "To stop: docker compose -f docker/docker-compose.yml down"
