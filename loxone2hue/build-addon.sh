#!/bin/bash
# Build script for Loxone2HUE Home Assistant Add-on
# This script copies the source files and prepares the add-on for building

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ADDON_DIR="${SCRIPT_DIR}"

echo "Loxone2HUE Add-on Build Script"
echo "==============================="
echo "Project root: ${PROJECT_ROOT}"
echo "Add-on dir: ${ADDON_DIR}"
echo ""

# Clean previous build
echo "Cleaning previous build..."
rm -rf "${ADDON_DIR}/src"
mkdir -p "${ADDON_DIR}/src"

# Copy Go source files
echo "Copying Go source files..."
cp "${PROJECT_ROOT}/go.mod" "${ADDON_DIR}/src/"
# go.sum may not exist yet, it will be generated during build
if [ -f "${PROJECT_ROOT}/go.sum" ]; then
    cp "${PROJECT_ROOT}/go.sum" "${ADDON_DIR}/src/"
else
    echo "Note: go.sum not found, will be generated during build"
    touch "${ADDON_DIR}/src/go.sum"
fi
cp -r "${PROJECT_ROOT}/cmd" "${ADDON_DIR}/src/"
cp -r "${PROJECT_ROOT}/internal" "${ADDON_DIR}/src/"
cp -r "${PROJECT_ROOT}/configs" "${ADDON_DIR}/src/"

# Copy web source files
echo "Copying web source files..."
cp -r "${PROJECT_ROOT}/web" "${ADDON_DIR}/src/"

echo ""
echo "Build preparation complete!"
echo ""
echo "To build locally, run:"
echo "  docker build --build-arg BUILD_FROM=ghcr.io/home-assistant/aarch64-base:3.18 -t loxone2hue-addon ."
echo ""
echo "To install in Home Assistant:"
echo "  1. Push this repository to GitHub"
echo "  2. In HA, go to Settings > Add-ons > Add-on Store"
echo "  3. Click the three dots menu > Repositories"
echo "  4. Add: https://github.com/YOUR_USERNAME/loxone2hue"
echo "  5. Find and install 'Loxone2HUE Gateway'"
