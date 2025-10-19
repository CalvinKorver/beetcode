#!/bin/bash

# Beetcode Extension Packaging Script
# This script creates a clean ZIP package ready for Chrome Web Store submission

set -e  # Exit on error

echo "🎯 Beetcode Extension Packaging Script"
echo "========================================"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/dist"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="beetcode-extension-$TIMESTAMP.zip"

# Files and directories to INCLUDE in the package
INCLUDE_FILES=(
  "manifest.json"
  "popup.html"
  "popup.js"
  "background.js"
  "content.js"
  "config.js"
  "supabase-client.js"
  "AuthenticationService.js"
  "BackendClient.js"
  "logout.html"
  "logout.js"
  "styles.css"
  "icons/"
)

# Files and directories to EXCLUDE (even if matched above)
EXCLUDE_PATTERNS=(
  "*.md"
  "*.test.js"
  ".DS_Store"
  ".env.config.js"
  ".env.config.*.js"
  "package-extension.sh"
  "dist/"
  "node_modules/"
  "*.ai"
  "*.png.old"
  "title.html"
  "attio.png"
  "beetcode.ai"
  "BeetcodeServiceClient.js.old"
  "AUTH_FIX_SUMMARY.md"
  "DEBUGGING_GUIDE.md"
  "OAUTH_SETUP.md"
  "QUICK_START.md"
  "README.md"
  "PRIVACY_POLICY.md"
  "STORE_LISTING.md"
  "IMPLEMENTATION_PLAN.md"
  "get-redirect-url.js"
)

echo "📦 Preparing package..."
echo ""

# Create dist directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Check if .env.config.js exists
if [ -f "$SCRIPT_DIR/.env.config.js" ]; then
  echo "✅ Found .env.config.js - production configuration detected"

  # Read the config to show current URLs (basic check)
  if grep -q "localhost" "$SCRIPT_DIR/.env.config.js"; then
    echo "⚠️  WARNING: .env.config.js contains 'localhost' - is this intentional for production?"
    echo "   Current config:"
    grep -E "dashboardUrl|serviceUrl" "$SCRIPT_DIR/.env.config.js" | sed 's/^/   /'
    echo ""
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "❌ Packaging cancelled"
      exit 1
    fi
  fi
else
  echo "⚠️  WARNING: .env.config.js not found!"
  echo "   Extension will use default localhost URLs."
  echo "   For production, copy .env.config.prod.js to .env.config.js and update URLs."
  echo ""
  read -p "   Continue anyway? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Packaging cancelled"
    exit 1
  fi
fi

# Create temporary directory for staging
TEMP_DIR=$(mktemp -d)
STAGE_DIR="$TEMP_DIR/beetcode-tracker"
mkdir -p "$STAGE_DIR"

echo "📋 Copying files to staging area..."

# Copy included files
for item in "${INCLUDE_FILES[@]}"; do
  if [ -e "$SCRIPT_DIR/$item" ]; then
    # If it's a directory, copy recursively
    if [ -d "$SCRIPT_DIR/$item" ]; then
      cp -R "$SCRIPT_DIR/$item" "$STAGE_DIR/"
      echo "   ✓ Copied directory: $item"
    else
      cp "$SCRIPT_DIR/$item" "$STAGE_DIR/"
      echo "   ✓ Copied file: $item"
    fi
  else
    echo "   ⚠️  Not found (skipping): $item"
  fi
done

# Remove excluded patterns
echo ""
echo "🧹 Cleaning up excluded files..."
cd "$STAGE_DIR"

for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  # Use find to locate and remove matches
  find . -name "$pattern" -type f -delete 2>/dev/null || true
  find . -name "$pattern" -type d -exec rm -rf {} + 2>/dev/null || true
done

# Remove .DS_Store files specifically
find . -name ".DS_Store" -delete 2>/dev/null || true

echo ""
echo "📊 Package contents:"
echo "-------------------"
find . -type f | sed 's|^\./||' | sort

# Count files
FILE_COUNT=$(find . -type f | wc -l | tr -d ' ')
echo "-------------------"
echo "Total files: $FILE_COUNT"
echo ""

# Create ZIP file
echo "🗜️  Creating ZIP archive..."
cd "$STAGE_DIR"
zip -r "$OUTPUT_DIR/$OUTPUT_FILE" . -q

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Get file size
FILE_SIZE=$(du -h "$OUTPUT_DIR/$OUTPUT_FILE" | cut -f1)

echo ""
echo "✅ Package created successfully!"
echo ""
echo "📦 Output: $OUTPUT_DIR/$OUTPUT_FILE"
echo "📏 Size: $FILE_SIZE"
echo ""
echo "🚀 Next Steps:"
echo "   1. Review the package contents above"
echo "   2. Test by loading as unpacked extension in Chrome"
echo "   3. Upload to Chrome Web Store Developer Dashboard"
echo "   4. After publishing, update OAuth redirect URLs with new extension ID"
echo ""
echo "📚 See DEPLOYMENT_GUIDE.md for complete deployment instructions"
echo ""
