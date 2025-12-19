#!/bin/bash

# Stop script for 3D Byte Tech Store monorepo
echo "🛑 Stopping 3D Byte Tech Store services..."

# Stop Docker container for CMS services
echo "🐳 Stopping Docker container for CMS services..."
cd apps/cms
docker-compose -p 3dbyte-tech-cms down
cd ../..

echo "✅ All services stopped!"