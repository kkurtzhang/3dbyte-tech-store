#!/bin/bash

# Development script for backend only
echo "🚀 Starting Medusa backend..."

# Check environment file
if [ ! -f "apps/backend/.env" ]; then
    echo "⚠️  No .env file found in apps/backend"
    echo "Creating from example..."
    cp apps/backend/.env.example apps/backend/.env
fi

# Start backend
cd apps/backend
pnpm run dev