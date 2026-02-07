#!/bin/sh
# Deploy script for Loxone2HUE on Synology NAS
# Usage: sudo sh deploy.sh
#
# Kopiere diese Datei zusammen mit loxone2hue.tar auf das NAS
# und führe sie per SSH aus.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TAR_FILE="$SCRIPT_DIR/loxone2hue.tar"
CONTAINER_NAME="loxone2hue"
IMAGE_NAME="loxone2hue:latest"

echo "========================================"
echo " Loxone2HUE Deployment"
echo "========================================"

# Check tar file exists
if [ ! -f "$TAR_FILE" ]; then
  echo "ERROR: $TAR_FILE nicht gefunden!"
  echo "Stelle sicher, dass loxone2hue.tar im selben Ordner liegt."
  exit 1
fi

# Load new image
echo ""
echo "[1/4] Image importieren..."
docker load -i "$TAR_FILE"

# Stop old container (ignore error if not running)
echo ""
echo "[2/4] Container stoppen..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true

# Remove old container (ignore error if not exists)
echo ""
echo "[3/4] Alten Container entfernen..."
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Start new container
echo ""
echo "[4/4] Neuen Container starten..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --network host \
  -v loxone2hue-data:/data \
  -e TZ=Europe/Zurich \
  --restart unless-stopped \
  "$IMAGE_NAME"

# Show status
echo ""
echo "========================================"
echo " Deployment erfolgreich!"
echo "========================================"
echo ""
echo " Container: $CONTAINER_NAME"
echo " Web-UI:    http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo '<NAS-IP>'):8080"
echo " Logs:      docker logs -f $CONTAINER_NAME"
echo ""
