#!/bin/bash
# Patch script for medusa-media-manager to add basePath/prefix support

SERVICE_FILE="node_modules/@lodashventure/medusa-media-manager/.medusa/server/src/modules/media-manager/service.js"

# Check if file exists
if [ ! -f "$SERVICE_FILE" ]; then
  echo "Warning: Media manager service file not found. Skipping patch."
  exit 0
fi

# Check if already patched
if grep -q "basePath.*this.options_.storage" "$SERVICE_FILE"; then
  echo "Media manager already patched. Skipping."
  exit 0
fi

# Apply the patch
sed -i.bak 's/const storageKey = path_1.default\n            .join("media", assetId, "original", safeName)/const basePath = this.options_.storage?.basePath || this.options_.storage?.prefix || "media";\n        const storageKey = path_1.default\n            .join(basePath, assetId, "original", safeName)/g' "$SERVICE_FILE"

sed -i.bak 's/const storageKey = path_1.default\n            .join("media", asset.id, "original", `v\${nextVersion}`, safeName)/const basePath = this.options_.storage?.basePath || this.options_.storage?.prefix || "media";\n        const storageKey = path_1.default\n            .join(basePath, asset.id, "original", `v\${nextVersion}`, safeName)/g' "$SERVICE_FILE"

echo "Media manager patch applied successfully!"
