import { X, Tag, Wrench, Sparkles, Rocket } from 'lucide-react';

interface Release {
  version: string;
  items: string[];
}

const releases: Release[] = [
  {
    version: '1.2.1',
    items: [
      'Fix: Config-Migration für bestehende Mappings (loxoneid → loxone_id YAML-Feldnamen)',
      'Fix: Auto-Refresh schliesst aufgeklappte UDP-Bereiche nicht mehr',
      'Fix: UDP Test-Spalten (Werte/Test) in Geräte- und Gruppen-Kacheln sichtbar',
      'Fix: miniserverId an UdpInfoSection in DeviceCard und GroupList übergeben',
    ],
  },
  {
    version: '1.2.0',
    items: [
      'Mehrere Loxone Miniserver: Dynamische Liste von Miniservers in den Einstellungen (Hinzufügen, Bearbeiten, Löschen)',
      'Jeder Miniserver hat eigene IP, Port, UDP-Feedback und "Alle Geräte senden" Einstellungen',
      'Mappings: Zuordnung zu einem bestimmten Miniserver (bei nur einem Miniserver automatisch zugewiesen)',
      'UDP-Feedback: Nachrichten werden gezielt an den Miniserver des jeweiligen Mappings gesendet',
      'Config-Migration: Bestehende Konfiguration wird automatisch ins neue Format konvertiert',
    ],
  },
  {
    version: '1.1.18',
    items: [
      'UDP Status-Feedback: Test-Funktion — pro Eigenschaft kann eine Test-UDP-Nachricht an Loxone gesendet werden (mit Werte-Validierung)',
    ],
  },
  {
    version: '1.1.17',
    items: [
      'UDP Status-Feedback: Neue Einstellung "Alle Geräte senden" — sendet UDP auch für Geräte ohne Mapping (Gerätename als Loxone-ID)',
      'Geräte-/Gruppen-Kacheln: UDP-Info-Button wird für alle Elemente angezeigt wenn die Einstellung aktiv ist',
    ],
  },
  {
    version: '1.1.16',
    items: [
      'Geräte- und Gruppen-Kacheln: Aufklappbarer UDP Status-Feedback Bereich mit Check-Patterns und Loxone Config Anleitung',
    ],
  },
  {
    version: '1.1.15',
    items: [
      'Loxone Config Export: Mood-Mappings (_mood_N) werden nicht mehr als virtuelle UDP-Eingänge exportiert',
      'UDP-Feedback: Mood-Mappings erhalten keine UDP-Nachrichten mehr',
    ],
  },
  {
    version: '1.1.14',
    items: [
      'UDP-Feedback: Szenen-/Mood-Mappings werden nicht mehr per UDP gesendet (kein Empfänger in Loxone)',
    ],
  },
  {
    version: '1.1.13',
    items: [
      'UDP-Feedback: Statusänderungen einzelner Lichter werden jetzt auch an Gruppen-Mappings weitergeleitet',
    ],
  },
  {
    version: '1.1.12',
    items: [
      'Server Logs: Neuer UDP-Filter-Button zeigt nur UDP-Feedback-Meldungen an',
    ],
  },
  {
    version: '1.1.11',
    items: [
      'UDP-Feedback: Gesendete UDP-Meldungen werden jetzt im Server-Log auf INFO-Level protokolliert',
    ],
  },
  {
    version: '1.1.10',
    items: [
      'Einstellungen: Doppelte Miniserver-IP entfernt – UDP-Feedback verwendet jetzt automatisch die oben konfigurierte Miniserver-IP',
      'UDP-Feedback: Separates IP-Feld aus Konfiguration entfernt',
    ],
  },
  {
    version: '1.1.9',
    items: [
      'Loxone Config Export: Adresse verwendet jetzt den konfigurierten Server-Port statt den Port aus dem Request (korrigiert falschen Port bei Zugriff über HA-Proxy)',
    ],
  },
  {
    version: '1.1.8',
    items: [
      'Loxone Config Export: Helligkeits-Befehle erhalten den Suffix " (Br)" im Titel zur besseren Unterscheidung von Mood-Befehlen',
    ],
  },
  {
    version: '1.1.7',
    items: [
      'Loxone Config Export: Umlaute werden jetzt als native UTF-8-Zeichen statt als numerische XML-Entities ausgegeben (z.B. "Büro" statt "B&#252;ro")',
    ],
  },
  {
    version: '1.1.6',
    items: [
      'Loxone Config Export: Mood-Titel verwendet jetzt den Mapping-Namen mit korrekten Umlauten (statt abgeleiteter LoxoneID)',
      'Loxone Config Export: Szenen-Zählung im Mood-Kommentar korrigiert (mood_0 wird nicht mehr als Szene gezählt)',
    ],
  },
  {
    version: '1.1.5',
    items: [
      'Loxone Config Export: Sonderzeichen (Umlaute ä, ö, ü etc.) werden als XML-Entities kodiert für fehlerfreien Import',
      'Loxone Config Export: Info-Tag mit templateType wieder hinzugefügt, damit Vorlagen beim Import erkannt werden',
    ],
  },
  {
    version: '1.1.3',
    items: [
      'Backend: Duplikat-Schutz bei Mapping-Erstellung (verhindert doppelte loxone_id)',
      'Mood-Szenen: Einzelne Szenen nachträglich löschen (mit automatischer Neunummerierung)',
      'Mood-Szenen: Neue Szenen zu bestehenden Mood-Mappings hinzufügen',
    ],
  },
  {
    version: '1.1.2',
    items: [
      'Loxone Config Export: XML-Vorlagen können jetzt fehlerfrei importiert werden (Info-Tag entfernt)',
      'Mood-Wizard: Doppelklick-Schutz beim Erstellen verhindert doppelte Einträge',
    ],
  },
  {
    version: '1.1.1',
    items: [
      'Mapping-Links aus Geräte-, Raum- und Szenen-Tabs entfernt (Mappings nur noch im Mappings-Tab)',
      'Mood-Szenen: Reihenfolge wird beim Erstellen korrekt übernommen',
      'Mood-Szenen: Bezeichnungen verschwinden nicht mehr beim nachträglichen Verschieben',
      'Gruppen-Löschung und Mood-Tausch in Mapping-Verwaltung',
    ],
  },
  {
    version: '1.1.0',
    items: [
      'UDP Status-Feedback: Automatische Rückmeldung von HUE-Statusänderungen an Loxone per UDP',
      'Loxone Config Export: XML-Vorlagen (Virtual UDP Input, Virtual HTTP Output) zum direkten Import',
      'Einstellungen-Tab in der Web UI (Loxone-Konfiguration, UDP-Feedback, XML-Export)',
      'Swagger API-Dokumentation erweitert (Export-Endpoints, UDP-Feedback-Config)',
    ],
  },
  {
    version: '1.0.0',
    items: [
      'Initial Release',
      'HUE Bridge Discovery und Pairing',
      'Gerätesteuerung (Lights, Groups, Scenes)',
      'Loxone WebSocket Integration',
      'Web UI Dashboard',
      'Mapping Export/Import',
    ],
  },
];

function getVersionIcon(version: string) {
  if (version.endsWith('.0') && version.split('.').length === 3 && version.split('.')[2] === '0') {
    const minor = parseInt(version.split('.')[1], 10);
    if (minor === 0) return <Rocket size={16} className="text-green-400" />;
    return <Sparkles size={16} className="text-hue-orange" />;
  }
  return <Wrench size={14} className="text-gray-400" />;
}

function isMinorRelease(version: string): boolean {
  const parts = version.split('.');
  return parts.length === 3 && parts[2] === '0';
}

interface ReleaseNotesProps {
  currentVersion: string;
  onClose: () => void;
}

export function ReleaseNotes({ currentVersion, onClose }: ReleaseNotesProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Tag size={20} className="text-hue-orange" />
            <div>
              <h2 className="text-lg font-semibold text-white">Release Notes</h2>
              <p className="text-xs text-gray-400">Aktuelle Version: v{currentVersion}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-4 space-y-4">
          {releases.map((release) => (
            <div key={release.version}>
              <div className="flex items-center gap-2 mb-2">
                {getVersionIcon(release.version)}
                <h3 className={`font-mono font-semibold ${
                  release.version === currentVersion
                    ? 'text-hue-orange'
                    : isMinorRelease(release.version)
                      ? 'text-white'
                      : 'text-gray-300'
                }`}>
                  v{release.version}
                </h3>
                {release.version === currentVersion && (
                  <span className="text-[10px] bg-hue-orange/20 text-hue-orange px-1.5 py-0.5 rounded-full">
                    aktuell
                  </span>
                )}
              </div>
              <ul className="space-y-1 ml-6">
                {release.items.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-400 relative before:content-['•'] before:absolute before:-left-3 before:text-gray-600">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700">
          <a
            href="https://github.com/stefanbeyeler/Loxone2HUE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-hue-orange transition-colors"
          >
            github.com/stefanbeyeler/Loxone2HUE
          </a>
        </div>
      </div>
    </div>
  );
}
