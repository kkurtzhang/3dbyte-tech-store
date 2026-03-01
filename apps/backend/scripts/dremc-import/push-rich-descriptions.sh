#!/bin/bash

# Strapi config
STRAPI_URL="http://192.168.0.45:1337"
STRAPI_TOKEN="0fe54a2a66615700eca2265a6420ca9b7df81856eababd43c61b2fbac4608b3c48b3b7a771f79aade1c1e232bcf3191cf98981a9fa9c1295cd3873eeeb552191c4164a066bd4111c4d40de8ee1f29caf977d57d38b7bc08cf76d16e55519d635554ae04b0c632ac78d2765ccedfa3f2c999c68f924b731ff9c80a3791a441a47"

# Read products
PRODUCTS_FILE="/Users/3dbyte-tech/claw_ws/3dbyte-tech-store/apps/backend/scripts/dremc-import/data/products-batch-1-with-images.json"

# Function to generate rich description
generate_description() {
  local title="$1"
  local vendor="$2"
  local type="$3"
  
  case "$type" in
    "Nozzle")
      echo "<p>The ${title} by ${vendor} is a precision-engineered nozzle designed for consistent filament extrusion in 3D printing applications.</p><p>Manufactured to exacting tolerances, this nozzle ensures smooth material flow and reliable print quality. Compatible with a wide range of filament types including PLA, PETG, and ABS.</p><p>Easy to install and maintain, it's an essential spare part for maintaining optimal print performance.</p>"
      ;;
    "Hotend Assembly"|"Hotend Kit")
      echo "<p>The ${title} by ${vendor} delivers reliable high-temperature printing performance for demanding 3D printing applications.</p><p>Featuring an all-metal construction, this hotend enables printing at temperatures up to 300°C, perfect for engineering-grade filaments. The precision-machined heat break minimizes heat creep for consistent extrusion.</p><p>Designed for easy installation, this upgrade enhances print quality and expands your material compatibility.</p>"
      ;;
    "Mainboard"|"Electronics")
      echo "<p>The ${title} by ${vendor} is a powerful control board designed to enhance your 3D printer's performance and capabilities.</p><p>Featuring a 32-bit processor for faster computation and smoother motion control, this mainboard supports advanced features like silent stepper drivers and connectivity options.</p><p>An excellent upgrade for improving print quality, reliability, and enabling modern firmware features.</p>"
      ;;
    "Thermistor")
      echo "<p>The ${title} by ${vendor} is a precision temperature sensor essential for accurate hotend and bed temperature monitoring.</p><p>With high accuracy and fast response time, this thermistor ensures your printer maintains precise temperature control for optimal print quality.</p><p>A critical spare part to keep on hand for maintaining your 3D printer's performance.</p>"
      ;;
    "Filament"|"3D Printing Consumable")
      echo "<p>${title} by ${vendor} offers consistent diameter tolerance and reliable print performance for your 3D printing projects.</p><p>Manufactured with quality raw materials, this filament delivers excellent layer adhesion and minimal warping. Available in a variety of colors to suit your creative needs.</p><p>Suitable for both beginners and experienced makers seeking reliable print results.</p>"
      ;;
    *)
      echo "<p>The ${title} by ${vendor} is a quality 3D printing component designed for reliable performance.</p><p>Built to exacting standards, this product offers excellent value and compatibility with popular 3D printer models.</p><p>An essential addition to your 3D printing toolkit or spare parts collection.</p>"
      ;;
  esac
}

# Process first 5 products as a test
TOTAL=0
CREATED=0

echo "Creating rich descriptions in Strapi..."

# Get first 5 products
cat "$PRODUCTS_FILE" | jq -r '.products[0:5][] | @base64' | while read -r product_b64; do
  product=$(echo "$product_b64" | base64 -d)
  
  title=$(echo "$product" | jq -r '.title')
  vendor=$(echo "$product" | jq -r '.vendor')
  handle=$(echo "$product" | jq -r '.handle')
  type=$(echo "$product" | jq -r '.product_type // "Spare Parts"')
  
  # Generate handle prefix (dremc-)
  strapi_handle="dremc-${handle}"
  
  # Generate description
  description=$(generate_description "$title" "$vendor" "$type")
  
  # Escape for JSON
  description_escaped=$(echo "$description" | jq -Rs .)
  
  # Create in Strapi
  response=$(curl -s -X POST "${STRAPI_URL}/api/product-descriptions" \
    -H "Authorization: Bearer ${STRAPI_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"data\": {
        \"product_handle\": \"${strapi_handle}\",
        \"product_title\": \"${title}\",
        \"rich_description\": ${description_escaped},
        \"seo_title\": \"${title} | 3DByte Tech\",
        \"seo_description\": \"Shop ${title} by ${vendor} at 3DByte Tech. Quality 3D printing parts and accessories.\",
        \"sync_status\": \"synced\"
      }
    }")
  
  if echo "$response" | jq -e '.data.id' > /dev/null 2>&1; then
    echo "✅ Created: ${title:0:40}..."
    CREATED=$((CREATED + 1))
  else
    echo "❌ Failed: ${title:0:40}... - $(echo "$response" | jq -r '.error.message // "unknown error"')"
  fi
  
  TOTAL=$((TOTAL + 1))
  sleep 0.5
done

echo ""
echo "Done. Processed: $TOTAL, Created: $CREATED"
