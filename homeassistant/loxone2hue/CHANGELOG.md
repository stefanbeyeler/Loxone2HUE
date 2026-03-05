# Changelog

## 1.3.0

- Sensoren & Taster: Vollstaendige Unterstuetzung fuer HUE Sensoren, Taster und Zubehoer
  - Bewegungsmelder, Temperatursensoren, Helligkeitssensoren
  - Taster (Hue Dimmer Switch, Hue Tap, etc.)
  - Kontaktsensoren, Drehregler (Hue Tap Dial)
  - Batteriestand-Anzeige
- Neuer Sensoren-Tab im Dashboard mit Live-Status und Geraete-Gruppierung
- Sensor-Mappings: Sensoren koennen als HUE-Ressource in Mappings verwendet werden
- UDP-Feedback fuer Sensoren: Automatische Weiterleitung von Sensor-Events an Loxone
  - motion:0/1, temperature:22.5, light_level:1234, button:0-4, contact:0/1, rotary:steps, battery:0-100
- API: Neuer GET /api/sensors Endpoint
- SSE Event Stream: Sensor-Events werden erkannt und verarbeitet

## 1.2.3

- Anleitung: Architektur-Diagramm mit UDP-Feedback erweitert, Multi-Miniserver und Auto-ID-Generierung dokumentiert
- API-Dokumentation: Swagger-Schemas für Multi-Miniserver und miniserver_id in Mappings aktualisiert
- Fix: Loxone ID wird jetzt auch bei vorausgefülltem Namen aus Ressourcen-Auswahl automatisch generiert

## 1.2.2

- Release Notes: Klickbare Versionsnummer öffnet Popup mit komplettem Release-Verlauf
- Mapping-Wizard: Loxone ID wird automatisch aus dem Namen generiert (Kleinbuchstaben, Umlaute konvertiert, Leerzeichen → Unterstriche)

## 1.2.1

- Fix: Config-Migration für bestehende Mappings (loxoneid → loxone_id YAML-Feldnamen)
- Fix: Auto-Refresh schliesst aufgeklappte UDP-Bereiche nicht mehr
- Fix: UDP Test-Spalten (Werte/Test) in Geräte- und Gruppen-Kacheln sichtbar
- Fix: miniserverId an UdpInfoSection in DeviceCard und GroupList übergeben

## 1.2.0

- Mehrere Loxone Miniserver: Dynamische Liste von Miniservers in den Einstellungen (Hinzufügen, Bearbeiten, Löschen)
- Jeder Miniserver hat eigene IP, Port, UDP-Feedback und "Alle Geräte senden" Einstellungen
- Mappings: Zuordnung zu einem bestimmten Miniserver (bei nur einem Miniserver automatisch zugewiesen)
- UDP-Feedback: Nachrichten werden gezielt an den Miniserver des jeweiligen Mappings gesendet
- Config-Migration: Bestehende Konfiguration wird automatisch ins neue Format konvertiert

## 1.1.18

- UDP Status-Feedback: Test-Funktion — pro Eigenschaft kann eine Test-UDP-Nachricht an Loxone gesendet werden (mit Werte-Validierung)

## 1.1.17

- UDP Status-Feedback: Neue Einstellung "Alle Geräte senden" — sendet UDP auch für Geräte ohne Mapping (Gerätename als Loxone-ID)
- Geräte-/Gruppen-Kacheln: UDP-Info-Button wird für alle Elemente angezeigt wenn die Einstellung aktiv ist

## 1.1.16

- Geräte- und Gruppen-Kacheln: Aufklappbarer UDP Status-Feedback Bereich mit Check-Patterns und Loxone Config Anleitung

## 1.1.15

- Loxone Config Export: Mood-Mappings (_mood_N) werden nicht mehr als virtuelle UDP-Eingänge exportiert
- UDP-Feedback: Mood-Mappings erhalten keine UDP-Nachrichten mehr

## 1.1.14

- UDP-Feedback: Szenen-/Mood-Mappings werden nicht mehr per UDP gesendet (kein Empfänger in Loxone)

## 1.1.13

- UDP-Feedback: Statusänderungen einzelner Lichter werden jetzt auch an Gruppen-Mappings weitergeleitet

## 1.1.12

- Server Logs: Neuer UDP-Filter-Button zeigt nur UDP-Feedback-Meldungen an

## 1.1.11

- UDP-Feedback: Gesendete UDP-Meldungen werden jetzt im Server-Log auf INFO-Level protokolliert

## 1.1.10

- Einstellungen: Doppelte Miniserver-IP entfernt – UDP-Feedback verwendet jetzt automatisch die oben konfigurierte Miniserver-IP
- UDP-Feedback: Separates IP-Feld aus Konfiguration entfernt

## 1.1.9

- Loxone Config Export: Adresse verwendet jetzt den konfigurierten Server-Port statt den Port aus dem Request (korrigiert falschen Port bei Zugriff über HA-Proxy)

## 1.1.8

- Loxone Config Export: Helligkeits-Befehle erhalten den Suffix " (Br)" im Titel zur besseren Unterscheidung von Mood-Befehlen

## 1.1.7

- Loxone Config Export: Umlaute werden jetzt als native UTF-8-Zeichen statt als numerische XML-Entities ausgegeben (z.B. "Büro" statt "B&#252;ro")

## 1.1.6

- Loxone Config Export: Mood-Titel verwendet jetzt den Mapping-Namen mit korrekten Umlauten (statt abgeleiteter LoxoneID)
- Loxone Config Export: Szenen-Zählung im Mood-Kommentar korrigiert (mood_0 wird nicht mehr als Szene gezählt)

## 1.1.5

- Loxone Config Export: Sonderzeichen (Umlaute ä, ö, ü etc.) werden als XML-Entities kodiert für fehlerfreien Import
- Loxone Config Export: Info-Tag mit templateType wieder hinzugefügt, damit Vorlagen beim Import erkannt werden

## 1.1.3

- Backend: Duplikat-Schutz bei Mapping-Erstellung (verhindert doppelte loxone_id)
- Mood-Szenen: Einzelne Szenen nachträglich löschen (mit automatischer Neunummerierung)
- Mood-Szenen: Neue Szenen zu bestehenden Mood-Mappings hinzufügen

## 1.1.2

- Loxone Config Export: XML-Vorlagen können jetzt fehlerfrei importiert werden (Info-Tag entfernt)
- Mood-Wizard: Doppelklick-Schutz beim Erstellen verhindert doppelte Einträge

## 1.1.1

- Mapping-Links aus Geräte-, Raum- und Szenen-Tabs entfernt (Mappings nur noch im Mappings-Tab)
- Mood-Szenen: Reihenfolge wird beim Erstellen korrekt übernommen
- Mood-Szenen: Bezeichnungen verschwinden nicht mehr beim nachträglichen Verschieben
- Gruppen-Löschung und Mood-Tausch in Mapping-Verwaltung

## 1.1.0

- UDP Status-Feedback: Automatische Rückmeldung von HUE-Statusänderungen an Loxone per UDP
- Loxone Config Export: XML-Vorlagen (Virtual UDP Input, Virtual HTTP Output) zum direkten Import
- Einstellungen-Tab in der Web UI (Loxone-Konfiguration, UDP-Feedback, XML-Export)
- Swagger API-Dokumentation erweitert (Export-Endpoints, UDP-Feedback-Config)

## 1.0.0

- Initial Release
- HUE Bridge Discovery und Pairing
- Gerätesteuerung (Lights, Groups, Scenes)
- Loxone WebSocket Integration
- Web UI Dashboard
- Mapping Export/Import
