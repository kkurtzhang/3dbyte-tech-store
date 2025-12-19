#!/bin/bash

# Development script for CMS only
echo "🚀 Starting Strapi CMS..."

# Check environment file
if [ ! -f "apps/cms/.env" ]; then
    echo "⚠️  No .env file found in apps/cms"
    echo "Creating from example..."
    cp apps/cms/.env.example apps/cms/.env
fi

# Start CMS
cd apps/cms
pnpm run dev