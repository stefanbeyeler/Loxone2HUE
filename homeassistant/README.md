# Loxone2HUE Home Assistant Add-on

Home Assistant Add-on für die bidirektionale Kommunikation zwischen Loxone und Philips HUE.

## Installation

### 1. Repository hinzufügen

1. Gehe zu **Einstellungen** → **Add-ons** → **Add-on Store**
2. Klicke auf **⋮** (drei Punkte oben rechts) → **Repositories**
3. Füge diese URL hinzu:
   ```
   https://github.com/stefanbeyeler/Loxone2HUE
   ```
4. Klicke auf **Hinzufügen**

### 2. Add-on installieren

1. Suche nach "Loxone2HUE Gateway" im Add-on Store
2. Klicke auf **Installieren**
3. Warte bis die Installation abgeschlossen ist
4. Klicke auf **Starten**

### 3. HUE Bridge verbinden

1. Öffne die Web-UI über die Sidebar oder den **Web UI öffnen** Button
2. Gib die IP-Adresse deiner HUE Bridge ein
3. Drücke den **Link-Button** auf der HUE Bridge
4. Klicke auf **Verbinden**

## Konfiguration

Die Konfiguration kann optional über die Add-on Einstellungen vorgenommen werden:

| Option | Beschreibung |
|--------|--------------|
| `hue_bridge_ip` | IP-Adresse der HUE Bridge (optional, kann auch über Web-UI gesetzt werden) |
| `hue_application_key` | HUE Application Key (wird beim Pairing automatisch generiert) |
| `log_level` | Log-Level: `debug`, `info`, `warn`, `error` |

## Features

- Web-UI zur Verwaltung von HUE Geräten
- Automatische Bridge-Erkennung (mDNS)
- Bidirektionale Kommunikation Loxone ↔ HUE
- Szenen-Aktivierung
- Gruppen-Steuerung
- Mapping-Konfiguration für Loxone Virtual Outputs

## Netzwerk

Das Add-on verwendet `host_network: true` für:
- mDNS Bridge-Erkennung
- Direkte Kommunikation mit der HUE Bridge
- Empfang von Loxone HTTP-Befehlen

**Port:** 8080 (Web-UI und API)

## Fehlerbehebung

### Bridge nicht erreichbar

1. Prüfe ob die HUE Bridge im selben Netzwerk ist
2. Nutze den "Verbindung testen" Button in der Web-UI
3. Prüfe die Firewall-Einstellungen

### Add-on startet nicht

```bash
# Logs anzeigen
ha addons logs local_loxone2hue
```

### Konfiguration zurücksetzen

Die Konfiguration wird in `/config/loxone2hue/config.yaml` gespeichert.
Um sie zurückzusetzen:
1. Add-on stoppen
2. Datei löschen: `rm /config/loxone2hue/config.yaml`
3. Add-on neu starten

## Support

- GitHub Issues: https://github.com/stefanbeyeler/Loxone2HUE/issues
