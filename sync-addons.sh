#!/bin/sh
# Syncs current source code into both add-on directories
set -e

DIRS="loxone2hue/src homeassistant/loxone2hue/src"

for TARGET in $DIRS; do
  echo "Syncing to $TARGET..."
  rm -rf "$TARGET"
  mkdir -p "$TARGET"

  # Copy Go source
  cp -r cmd "$TARGET/"
  cp -r internal "$TARGET/"
  cp -r configs "$TARGET/"
  cp go.mod go.sum VERSION "$TARGET/"

  # Copy web source (without node_modules/dist)
  cp -r web "$TARGET/"
  rm -rf "$TARGET/web/node_modules" "$TARGET/web/dist"

  echo "  Done: $TARGET"
done

echo "Sync complete."
