#!/bin/bash

# Development script for storefront only
echo "🚀 Starting Next.js storefront..."

# Check environment file
if [ ! -f "apps/storefront/.env.local" ]; then
    echo "⚠️  No .env.local file found in apps/storefront"
    echo "Creating from example..."
    cp apps/storefront/.env.example apps/storefront/.env.local
fi

# Start storefront
cd apps/storefront
pnpm run dev