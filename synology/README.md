# Loxone2HUE Gateway für Synology NAS

Standalone Docker-Deployment ohne Home Assistant Abhängigkeiten.

## Schnellstart

### Option A: Vorgebautes Image importieren

1. **Image importieren:**
   ```bash
   docker load -i loxone2hue.tar
   ```

2. **Container starten:**
   ```bash
   docker run -d \
     --name loxone2hue \
     --network host \
     -v loxone2hue-data:/data \
     --restart unless-stopped \
     loxone2hue:latest
   ```

### Option B: Aus Quellcode bauen

1. **Repository klonen:**
   ```bash
   git clone https://github.com/stefanbeyeler/Loxone2HUE.git
   cd Loxone2HUE/synology
   ```

2. **Container bauen und starten:**
   ```bash
   docker-compose up -d --build
   ```

## Zugriff

- **Web-UI:** `http://<NAS-IP>:8080`
- **API:** `http://<NAS-IP>:8080/api/`

## Konfiguration

Die Konfiguration wird persistent im Docker-Volume `loxone2hue-data` gespeichert.

Nach dem ersten Start:
1. Web-UI öffnen
2. HUE Bridge IP eingeben
3. Link-Button auf der Bridge drücken
4. "Verbinden" klicken

## Container Manager (DSM 7.2+)

1. **Container Manager** → **Projekt** → **Erstellen**
2. Projektname: `loxone2hue`
3. Pfad: Ordner mit diesen Dateien auswählen
4. Quelle: `docker-compose.yml` verwenden

## Logs anzeigen

```bash
docker logs -f loxone2hue
```

## Update

```bash
cd Loxone2HUE
git pull
cd synology
docker-compose up -d --build
```

## Ports

| Port | Beschreibung |
|------|--------------|
| 8080 | Web-UI & API |
