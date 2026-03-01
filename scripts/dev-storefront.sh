#!/bin/bash

# Development script for storefront only
echo "🚀 Starting Next.js storefront..."

# Check environment file
if [ ! -f "apps/storefront-v3/.env" ]; then
    echo "⚠️  No .env file found in apps/storefront-v3"
    echo "Creating from example..."
    cp apps/storefront-v3/.env.example apps/storefront-v3/.env
fi

# Start storefront
cd apps/storefront-v3
pnpm run dev
