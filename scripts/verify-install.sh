#!/bin/bash

# Verify installation was successful
echo "✅ Verifying monorepo installation..."

# Check if packages exist
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found. Installation may have failed."
    exit 1
fi

# Check shared packages
echo "📦 Checking shared packages..."
ls -la packages/*/src/index.ts

# Check if we can run turbo
echo "🚀 Testing turbo..."
pnpm run dev:turbo --version

echo ""
echo "✅ Installation verified successfully!"
echo ""
echo "Next steps:"
echo "  pnpm run type-check    # Check types"
echo "  pnpm run build        # Build all packages"
echo "  pnpm run dev          # Start development"