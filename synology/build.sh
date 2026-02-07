#!/bin/sh
# Build script for Loxone2HUE Synology Docker image
# Reads version from ../VERSION and builds the Docker image

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Read version from VERSION file
VERSION_FILE="$PROJECT_DIR/VERSION"
if [ ! -f "$VERSION_FILE" ]; then
  echo "ERROR: VERSION file not found at $VERSION_FILE"
  exit 1
fi
VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')

# Build date
BUILD_DATE=$(date +%Y-%m-%d)

echo "========================================"
echo " Loxone2HUE Docker Build"
echo " Version:    $VERSION"
echo " Build Date: $BUILD_DATE"
echo "========================================"

# Build Docker image
echo ""
echo "Building Docker image..."
docker build \
  --no-cache \
  --build-arg VERSION="$VERSION" \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  -t loxone2hue:latest \
  -t "loxone2hue:$VERSION" \
  -f "$SCRIPT_DIR/Dockerfile" \
  "$PROJECT_DIR"

# Save as tar
TAR_FILE="$SCRIPT_DIR/loxone2hue.tar"
echo ""
echo "Saving image to $TAR_FILE..."
docker save loxone2hue:latest -o "$TAR_FILE"

TAR_SIZE=$(du -h "$TAR_FILE" | cut -f1)

echo ""
echo "========================================"
echo " Build complete!"
echo " Image: loxone2hue:latest"
echo " Tag:   loxone2hue:$VERSION"
echo " File:  $TAR_FILE ($TAR_SIZE)"
echo "========================================"
