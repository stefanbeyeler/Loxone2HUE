# Loxone2HUE Gateway

Gateway Service für die bidirektionale Kommunikation zwischen Loxone Miniserver und Philips HUE Bridge.

## Funktionen

- **HUE Bridge Discovery**: Automatische Erkennung der HUE Bridge im Netzwerk
- **Gerätesteuerung**: Ein/Aus, Helligkeit, Farbe, Farbtemperatur
- **Gruppen & Zonen**: Räume und Zonen gemeinsam steuern
- **Szenen**: HUE Szenen über Loxone aktivieren
- **Echtzeit-Updates**: Bidirektionale Synchronisation via WebSocket
- **Web UI**: Übersichtliches Dashboard zur Konfiguration

## Erste Schritte

### 1. Add-on starten

Starte das Add-on und warte, bis es bereit ist.

### 2. HUE Bridge verbinden

1. Öffne die Web UI
2. Die Bridge wird automatisch erkannt
3. Drücke den **Link-Button** auf deiner HUE Bridge
4. Klicke auf "Bridge verbinden"
5. Das Pairing ist abgeschlossen

### 3. Mappings erstellen

Mappings verbinden Loxone IDs mit HUE Geräten:

1. Gehe zum Tab "Mappings"
2. Klicke auf "Neu"
3. Wähle:
   - **Name**: Beschreibender Name
   - **Loxone ID**: ID aus Loxone Config
   - **HUE Typ**: light, group oder scene
   - **HUE Gerät**: Das zu steuernde Gerät

### 4. Loxone konfigurieren

Erstelle in Loxone Config:

1. **Virtuellen Ausgang**:
   - Adresse: `http://<home-assistant-ip>:8080`

2. **Virtuelle Ausgang-Befehle**:
   ```
   Ein: /ws?cmd=SET <mapping-id> ON
   Aus: /ws?cmd=SET <mapping-id> OFF
   Helligkeit: /ws?cmd=SET <mapping-id> BRI <v>
   ```

## Befehlsreferenz

| Befehl | Beschreibung | Beispiel |
|--------|--------------|----------|
| `SET id ON` | Gerät einschalten | `SET licht1 ON` |
| `SET id OFF` | Gerät ausschalten | `SET licht1 OFF` |
| `SET id BRI x` | Helligkeit (0-100) | `SET licht1 BRI 75` |
| `SET id COLOR #hex` | RGB Farbe | `SET licht1 COLOR #FF5500` |
| `SET id CT x` | Farbtemperatur (2000-6500K) | `SET licht1 CT 4000` |
| `SET id SCENE x` | Szene aktivieren | `SET wohnzimmer SCENE 1` |

## Backup & Restore

Die Mappings können exportiert und importiert werden:

1. Gehe zum Tab "Mappings"
2. Klicke auf "Export" für ein JSON-Backup
3. Zum Wiederherstellen: "Import" → Datei wählen → Modus auswählen

## Fehlerbehebung

### Bridge wird nicht gefunden

- Stelle sicher, dass die HUE Bridge im selben Netzwerk ist
- Prüfe, ob mDNS funktioniert (Port 5353 UDP)
- Gib die IP-Adresse manuell in den Add-on-Optionen an

### Verbindung zu Loxone schlägt fehl

- Prüfe die Firewall-Einstellungen
- Stelle sicher, dass Port 8080 erreichbar ist
- Prüfe die WebSocket-URL im Virtuellen Ausgang

### Gerät reagiert nicht

- Prüfe, ob das Mapping korrekt erstellt wurde
- Stelle sicher, dass die Loxone ID übereinstimmt
- Prüfe die Gateway-Logs auf Fehlermeldungen

## Logs

Die Logs sind über die Home Assistant Add-on-Seite einsehbar oder via:

```bash
docker logs addon_local_loxone2hue
```

## Updates

Das Add-on wird automatisch aktualisiert, wenn eine neue Version im Repository verfügbar ist. Die Konfiguration und Mappings bleiben erhalten.
