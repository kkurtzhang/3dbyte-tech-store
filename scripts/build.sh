#!/bin/bash

# Build script for 3D Byte Tech Store monorepo
echo "🚀 Building 3D Byte Tech Store monorepo..."

# Build shared packages first
echo "📦 Building shared packages..."
pnpm run build --filter="@3dbyte-tech-store/shared-types"
pnpm run build --filter="@3dbyte-tech-store/shared-utils"

# Build applications
echo "🏗️  Building applications..."
pnpm run build --filter="@3dbyte-tech-store/backend"
pnpm run build --filter="@3dbyte-tech-store/cms"
pnpm run build --filter="@3dbyte-tech-store/storefront"

echo "✅ Build complete!"