#!/bin/bash

# Docker development script
echo "🐳 Starting 3D Byte Tech Store with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose -f docker/docker-compose.yml build

echo "🚀 Starting services..."
docker-compose -f docker/docker-compose.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Show status
docker-compose -f docker/docker-compose.yml ps

echo ""
echo "✅ Services are running!"
echo "📊 Backend: http://localhost:9000"
echo "🔧 CMS Admin: http://localhost:1337/admin"
echo "🛍️  Storefront: http://localhost:8000"
echo ""
echo "To view logs: docker-compose -f docker/docker-compose.yml logs -f [service-name]"
echo "To stop: docker-compose -f docker/docker-compose.yml down"