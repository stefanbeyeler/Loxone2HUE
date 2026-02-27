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
VOLUME_NAME="loxone2hue-data"
BACKUP_DIR="$SCRIPT_DIR/config-backup"

echo "========================================"
echo " Loxone2HUE Deployment"
echo "========================================"

# Check tar file exists
if [ ! -f "$TAR_FILE" ]; then
  echo "ERROR: $TAR_FILE nicht gefunden!"
  echo "Stelle sicher, dass loxone2hue.tar im selben Ordner liegt."
  exit 1
fi

# Backup existing config from volume
echo ""
echo "[1/5] Konfiguration sichern..."
mkdir -p "$BACKUP_DIR"
if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  docker run --rm -v "$VOLUME_NAME":/data -v "$BACKUP_DIR":/backup alpine \
    sh -c 'if [ -f /data/config.yaml ]; then cp /data/config.yaml /backup/config.yaml.bak; echo "Config gesichert nach config-backup/config.yaml.bak"; else echo "Keine bestehende Config gefunden"; fi'
else
  echo "Kein bestehendes Volume gefunden, ueberspringe Backup"
fi

# Load new image
echo ""
echo "[2/5] Image importieren..."
docker load -i "$TAR_FILE"

# Stop old container (ignore error if not running)
echo ""
echo "[3/5] Container stoppen..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true

# Remove old container (ignore error if not exists)
echo ""
echo "[4/5] Alten Container entfernen..."
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Start new container
echo ""
echo "[5/5] Neuen Container starten..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --network host \
  -v "$VOLUME_NAME":/data \
  -e TZ=Europe/Zurich \
  --restart unless-stopped \
  "$IMAGE_NAME"

# Verify config was preserved
echo ""
if docker exec "$CONTAINER_NAME" sh -c '[ -f /data/config.yaml ] && grep -q "application_key" /data/config.yaml && ! grep -q "application_key: \"\"" /data/config.yaml' 2>/dev/null; then
  echo "Config mit Bridge-Konfiguration erkannt."
else
  # Restore from backup if config is empty/default
  if [ -f "$BACKUP_DIR/config.yaml.bak" ] && grep -q 'application_key: ".\+"' "$BACKUP_DIR/config.yaml.bak" 2>/dev/null; then
    echo "Config ist leer, stelle Backup wieder her..."
    docker cp "$BACKUP_DIR/config.yaml.bak" "$CONTAINER_NAME":/data/config.yaml
    docker restart "$CONTAINER_NAME"
    echo "Config aus Backup wiederhergestellt."
  else
    echo "HINWEIS: Keine Bridge konfiguriert. Bitte in der Web-UI pairen."
  fi
fi

# Show status
echo ""
echo "========================================"
echo " Deployment erfolgreich!"
echo "========================================"
echo ""
echo " Container: $CONTAINER_NAME"
echo " Volume:    $VOLUME_NAME"
echo " Backup:    $BACKUP_DIR/"
echo " Web-UI:    http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo '<NAS-IP>'):8080"
echo " Logs:      docker logs -f $CONTAINER_NAME"
echo ""
