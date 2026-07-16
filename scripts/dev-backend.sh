#!/bin/bash

# Development script for backend only
echo "🚀 Starting Medusa backend..."

# Check environment file
if [ ! -f "apps/backend/.env" ]; then
    echo "⚠️  No .env file found in apps/backend"
    echo "Creating from template..."
    cp apps/backend/.env.template apps/backend/.env
fi

# Start backend
cd apps/backend
pnpm run dev
