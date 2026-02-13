#!/bin/bash

# Build script for 3D Byte Tech Store monorepo
echo "🚀 Building 3D Byte Tech Store monorepo..."

# Build shared packages first
echo "📦 Building shared packages..."
# shared-config is config-only, typically just needs copy or nothing if it has no build script.
# shared-types needs tsc.
pnpm run build --filter="@3dbyte-tech-store/shared-types"
pnpm run build --filter="@3dbyte-tech-store/shared-utils"

# Build applications
# Note: We don't run 'pnpm run build' here because that would trigger turbo which calls this script.
# Instead, we run the underlying build command for the specific package if known,
# or if we are just "verifying", we might just rely on the fact that we ran the above.
# But we actually want to build the apps.

# However, if we are in a context where this script was called by turbo for a specific package,
# we shouldn't re-trigger the whole pipeline.
# But since this script is the entry point, we should probably just do the apps.
# Let's assume we want to build ALL apps when run directly.
# If run by turbo for "backend", turbo will ensure dependencies (shared-types) are built first.

echo "🏗️  Building applications..."
# We use 'npx turbo run build' to respect the pipeline but NOT call this script again?
# No, 'turbo run build' calls 'task = ./scripts/build.sh'.
# We need to break the cycle.
# If we are here, we want to run the build for the apps.
# We can use the native build commands directly to be safe.

# Wait, if I just remove 'pnpm run build', I need to make sure the apps are built.
# But which apps?
# This script is called by turbo for a specific filter.
# If I remove the loop, I just echo.
# I need to identify the package from the arguments or context?
# No, I can't easily.

# Alternative: The script simply builds the dependencies, and then invokes the specific build command?
# No.

# Correct fix:
# This script should ONLY be called as the "entry point" for the user or CI.
# Turbo should NOT call this script if it causes a loop.
# But the config says "build": { "task": "./scripts/build.sh" }.
# This is the loop.

# I should change turbo.json to NOT use this script as the task command.
# "build": { "task": "build", "inputs": ["."], "outputs": ["dist/**", ".next/**", "build/**"] }
# Then "build" in package.json of apps should just be "tsc" or "next build".
# BUT, the package.json in apps says "build": "./scripts/build.sh". This is WRONG.
# The package.json "build" script in apps should be the actual build command (tsc/next build).
# Then "turbo.json" "build" task should just run "pnpm run build" (which calls the app's build script).
# And "scripts/build.sh" is for a FULL REBUILD or just a helper?
# It seems "scripts/build.sh" was intended to orchestrate order.
# But if "turbo" is orchestrating order, "scripts/build.sh" should just be the build command for the package.

# Let's assume the intent is:
# 1. User runs `pnpm build` (calls scripts/build.sh).
# 2. scripts/build.sh runs `turbo run build`.
# 3. turbo runs "build" task for each package.
# 4. "build" task runs the "build" script in package.json.
# 5. "build" script in package.json SHOULD be "tsc" or "next build".
# 6. Currently, "build" script in package.json of apps is "./scripts/build.sh". THIS IS THE MISTAKE.

# If I change turbo.json to "task": "build", then `turbo run build` runs `pnpm run build` in each package.
# `pnpm run build` in a package runs `./scripts/build.sh`.
# `./scripts/build.sh` runs `turbo run build`.
# LOOP AGAIN.

# The only way to break the loop is:
# A) `turbo run build` calls `./scripts/build.sh`.
# B) `./scripts/build.sh` calls `turbo run build`.
# This is the loop.

# Remove `turbo run build` from `./scripts/build.sh`.
# `./scripts/build.sh` should just build the things it is supposed to build directly.
# But `./scripts/build.sh` is generic. It doesn't know what to build unless passed args.

# Let's stick to the original simpler interpretation:
# `scripts/build.sh` is the entry point.
# It runs `turbo run build`.
# `turbo.json` should NOT call `scripts/build.sh`.
# `turbo.json` should run the package's native build script (tsc/next build).

# FIX 1: Change turbo.json "build" task to NOT use ./scripts/build.sh.
# FIX 2: Ensure apps/package.json "build" script is the actual build command.

# Let's see what apps/backend/package.json says.
pnpm run build --filter="@3dbyte-tech-store/backend"
#pnpm run build --filter="@3dbyte-tech-store/cms"
pnpm run build --filter="@3dbyte-tech-store/storefront-v3"

echo "✅ Build complete!"
