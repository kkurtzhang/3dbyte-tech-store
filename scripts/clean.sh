#!/bin/bash

# Clean script for 3D Byte Tech Store monorepo
echo "🧹 Cleaning monorepo..."

# Clean all packages
pnpm run clean

# Remove node_modules
echo "📦 Removing node_modules..."
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# Remove build outputs
echo "🏗️  Removing build outputs..."
rm -rf apps/*/dist
rm -rf apps/*/.next
rm -rf packages/*/dist

# Remove cache
echo "💾 Removing cache..."
rm -rf .turbo
rm -rf .eslintcache
rm -rf .next

echo "✅ Clean complete!"