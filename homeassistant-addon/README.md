# Loxone2HUE Home Assistant Add-on

Gateway Service für die bidirektionale Kommunikation zwischen Loxone und Philips HUE.

## Installation

### Methode 1: Add-on Repository (Empfohlen)

1. Öffne Home Assistant
2. Gehe zu **Einstellungen** → **Add-ons** → **Add-on Store**
3. Klicke auf die drei Punkte oben rechts → **Repositories**
4. Füge diese URL hinzu:
   ```
   https://github.com/sbeyeler/loxone2hue
   ```
5. Klicke auf **Hinzufügen**
6. Schliesse den Dialog und suche nach "Loxone2HUE Gateway"
7. Klicke auf **Installieren**

### Methode 2: Lokale Installation

1. Kopiere den Ordner `homeassistant-addon/loxone2hue` nach `/addons/loxone2hue` auf deinem Home Assistant
2. Führe das Build-Script aus:
   ```bash
   cd /addons/loxone2hue
   ./build-addon.sh
   ```
3. Gehe zu **Einstellungen** → **Add-ons** → **Add-on Store**
4. Klicke auf die drei Punkte → **Reload**
5. Das Add-on erscheint unter "Lokale Add-ons"

## Konfiguration

Nach der Installation kannst du folgende Optionen konfigurieren:

| Option | Beschreibung | Standard |
|--------|--------------|----------|
| `hue_bridge_ip` | IP-Adresse der HUE Bridge (leer für Auto-Discovery) | `""` |
| `hue_application_key` | HUE API Key (wird beim Pairing generiert) | `""` |
| `log_level` | Log-Level: debug, info, warn, error | `info` |

### Erstkonfiguration

1. Starte das Add-on
2. Öffne die Web-Oberfläche über **Web UI öffnen**
3. Folge dem Setup-Wizard zum Pairing mit der HUE Bridge:
   - Die Bridge wird automatisch erkannt
   - Drücke den Button auf der HUE Bridge
   - Klicke auf "Bridge verbinden"
4. Konfiguriere die Loxone Mappings in der Web-Oberfläche

## Loxone Integration

Das Gateway stellt einen WebSocket-Server bereit, über den der Loxone Miniserver kommunizieren kann.

### WebSocket URL

```
ws://<homeassistant-ip>:8080/ws
```

### Befehle

Sende Befehle als URL-Parameter:

```
/ws?cmd=SET <loxone_id> ON
/ws?cmd=SET <loxone_id> OFF
/ws?cmd=SET <loxone_id> BRI <0-100>
/ws?cmd=SET <loxone_id> COLOR #RRGGBB
/ws?cmd=SET <loxone_id> CT <2000-6500>
/ws?cmd=SET <loxone_id> SCENE <nummer>
```

### Loxone Config Beispiel

1. Erstelle einen **Virtuellen Ausgang** mit der Adresse `http://<homeassistant-ip>:8080`
2. Erstelle **Virtuelle Ausgang-Befehle**:
   - Ein: `/ws?cmd=SET wohnzimmer_licht ON`
   - Aus: `/ws?cmd=SET wohnzimmer_licht OFF`
   - Helligkeit: `/ws?cmd=SET wohnzimmer_licht BRI <v>`

## Ports

| Port | Beschreibung |
|------|--------------|
| 8080 | Web UI, REST API und WebSocket |

## Datenpersistenz

Die Konfiguration und Mappings werden unter `/config/loxone2hue/` gespeichert und bleiben bei Add-on-Updates erhalten.

## Support

Bei Problemen oder Feature-Requests: https://github.com/sbeyeler/loxone2hue/issues

## Lizenz

© 2026 Stefan Beyeler
