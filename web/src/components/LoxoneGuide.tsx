import { BookOpen, Settings, Code, Link2, Terminal, Lightbulb, Home, Play, CheckCircle2, AlertTriangle, Zap, HelpCircle } from 'lucide-react';

export function LoxoneGuide() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Übersicht */}
      <section className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-hue-orange rounded-lg flex items-center justify-center">
            <BookOpen size={20} className="text-gray-900" />
          </div>
          <h2 className="text-xl font-bold text-white">Loxone Integration</h2>
        </div>
        <p className="text-gray-300 leading-relaxed">
          Der Loxone2HUE Gateway ermöglicht die bidirektionale Kommunikation zwischen deinem
          Loxone Miniserver und der Philips HUE Bridge. Du kannst HUE Lampen, Gruppen und
          Szenen direkt aus Loxone steuern.
        </p>
      </section>

      {/* Architektur */}
      <section className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings size={20} className="text-hue-orange" />
          Funktionsweise
        </h3>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
          <pre>{`┌─────────────────┐         ┌─────────────────────────┐         ┌───────────────┐
│     Loxone      │   WS    │    Loxone2HUE Gateway   │   API   │   HUE Bridge  │
│   Miniserver    │◄───────►│        (Port 8080)      │◄───────►│               │
└─────────────────┘         └─────────────────────────┘         └───────────────┘
                                       │
                                       │ WebSocket /ws
                                       ▼
                            ┌─────────────────────────┐
                            │   Frontend (Browser)    │
                            └─────────────────────────┘`}</pre>
        </div>
      </section>

      {/* Mapping erstellen */}
      <section className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Link2 size={20} className="text-hue-orange" />
          Schritt 1: Mappings erstellen
        </h3>
        <div className="space-y-4 text-gray-300">
          <p>
            Ein Mapping verbindet eine <strong>Loxone ID</strong> (frei wählbar) mit einer
            <strong> HUE Ressource</strong> (Licht, Gruppe oder Szene).
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={18} className="text-hue-orange" />
                <span className="font-medium text-white">Licht</span>
              </div>
              <p className="text-sm text-gray-400">
                Einzelne Lampe steuern (Ein/Aus, Helligkeit, Farbe)
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Home size={18} className="text-hue-orange" />
                <span className="font-medium text-white">Gruppe/Raum</span>
              </div>
              <p className="text-sm text-gray-400">
                Alle Lampen eines Raums gleichzeitig steuern
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Play size={18} className="text-hue-orange" />
                <span className="font-medium text-white">Szene</span>
              </div>
              <p className="text-sm text-gray-400">
                Vordefinierte Lichtstimmung aktivieren
              </p>
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">Beispiel-Mappings:</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Loxone ID</th>
                  <th className="pb-2">HUE Ressource</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr>
                  <td className="py-1">Wohnzimmer Decke</td>
                  <td className="py-1 font-mono text-xs">wz_decke</td>
                  <td className="py-1">Deckenlampe (Licht)</td>
                </tr>
                <tr>
                  <td className="py-1">Küche komplett</td>
                  <td className="py-1 font-mono text-xs">kueche_all</td>
                  <td className="py-1">Küche (Gruppe)</td>
                </tr>
                <tr>
                  <td className="py-1">Abend-Stimmung</td>
                  <td className="py-1 font-mono text-xs">sz_relax</td>
                  <td className="py-1">Relax (Szene)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Loxone Konfiguration */}
      <section className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Terminal size={20} className="text-hue-orange" />
          Schritt 2: Loxone Miniserver konfigurieren
        </h3>
        <div className="space-y-6 text-gray-300">
          <div>
            <h4 className="font-medium text-white mb-3">2.1 Virtuellen Ausgang erstellen</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
              <li>Öffne <strong>Loxone Config</strong></li>
              <li>Erstelle einen neuen <strong>Virtuellen Ausgang</strong></li>
              <li>Konfiguriere die Adresse: <code className="bg-gray-900 px-2 py-0.5 rounded">http://GATEWAY_IP:8080</code></li>
              <li>Speichere den Virtuellen Ausgang</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium text-white mb-3">2.2 Virtuelle Ausgang-Befehle erstellen</h4>
            <p className="text-sm mb-3">
              Für jedes Mapping erstellst du einen <strong>Virtuellen Ausgang Befehl</strong>:
            </p>

            <div className="space-y-4">
              {/* Ein/Aus Steuerung */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h5 className="font-medium text-hue-orange mb-2">Ein/Aus Steuerung (Digital)</h5>
                <div className="grid gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Befehl bei EIN:</span>
                    <code className="block bg-gray-800 px-3 py-2 rounded mt-1 font-mono">
                      /ws?cmd=SET wz_decke ON
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-400">Befehl bei AUS:</span>
                    <code className="block bg-gray-800 px-3 py-2 rounded mt-1 font-mono">
                      /ws?cmd=SET wz_decke OFF
                    </code>
                  </div>
                </div>
              </div>

              {/* Helligkeit */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h5 className="font-medium text-hue-orange mb-2">Helligkeit (Analog 0-100%)</h5>
                <div className="text-sm">
                  <span className="text-gray-400">Befehl:</span>
                  <code className="block bg-gray-800 px-3 py-2 rounded mt-1 font-mono">
                    /ws?cmd=SET wz_decke BRI &lt;v&gt;
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    &lt;v&gt; wird automatisch durch den aktuellen Wert (0-100) ersetzt
                  </p>
                </div>
              </div>

              {/* Szene aktivieren */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h5 className="font-medium text-hue-orange mb-2">Szene aktivieren (Impuls)</h5>
                <div className="text-sm">
                  <span className="text-gray-400">Befehl bei EIN:</span>
                  <code className="block bg-gray-800 px-3 py-2 rounded mt-1 font-mono">
                    /ws?cmd=SCENE sz_relax
                  </code>
                </div>
              </div>

              {/* Lichtsteuerungs-Baustein */}
              <div className="bg-gray-900 rounded-lg p-4 border-2 border-hue-orange/50">
                <h5 className="font-medium text-hue-orange mb-2">Lichtsteuerungs-Baustein (MOOD)</h5>
                <p className="text-sm text-gray-400 mb-3">
                  Für den Loxone Lichtsteuerungs-Baustein verwendest du den MOOD-Befehl.
                  Der AQ-Ausgang (Stimmungsnummer) wird automatisch übergeben.
                </p>
                <div className="text-sm">
                  <span className="text-gray-400">Befehl (Analog, AQ → Virtueller Ausgang):</span>
                  <code className="block bg-gray-800 px-3 py-2 rounded mt-1 font-mono">
                    /ws?cmd=MOOD wohnzimmer &lt;v&gt;
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    &lt;v&gt; = Stimmungsnummer (0=Aus, 1=Mood 1, 2=Mood 2, ...)
                  </p>
                </div>
                <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/30 rounded">
                  <h6 className="text-xs font-medium text-blue-400 mb-2">Benötigte Mappings:</h6>
                  <ul className="text-xs text-blue-300 space-y-1">
                    <li><code className="bg-blue-900/50 px-1 rounded">wohnzimmer</code> → Gruppe (für Mood 0 = Aus)</li>
                    <li><code className="bg-blue-900/50 px-1 rounded">wohnzimmer_mood_1</code> → Szene (Mood 1)</li>
                    <li><code className="bg-blue-900/50 px-1 rounded">wohnzimmer_mood_2</code> → Szene (Mood 2)</li>
                    <li>... weitere Moods nach Bedarf</li>
                  </ul>
                </div>
              </div>

              {/* Farbtemperatur */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h5 className="font-medium text-hue-orange mb-2">Farbtemperatur (Analog 2000-6500K)</h5>
                <div className="text-sm">
                  <span className="text-gray-400">Befehl:</span>
                  <code className="block bg-gray-800 px-3 py-2 rounded mt-1 font-mono">
                    /ws?cmd=SET wz_decke CT &lt;v&gt;
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-white mb-3">2.3 Alternative: WebSocket direkt</h4>
            <p className="text-sm mb-3">
              Für Echtzeit-Kommunikation kann der Miniserver auch direkt per WebSocket verbunden werden:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 text-sm">
              <div className="mb-2">
                <span className="text-gray-400">WebSocket URL:</span>
                <code className="block bg-gray-800 px-3 py-2 rounded mt-1 font-mono">
                  ws://GATEWAY_IP:8080/ws
                </code>
              </div>
              <div>
                <span className="text-gray-400">JSON Befehl senden:</span>
                <pre className="bg-gray-800 px-3 py-2 rounded mt-1 font-mono overflow-x-auto">{`{
  "type": "command",
  "target": "wz_decke",
  "action": "set",
  "params": {
    "on": true,
    "brightness": 80
  }
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kommando-Referenz */}
      <section className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Code size={20} className="text-hue-orange" />
          Kommando-Referenz
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3 pr-4">Kommando</th>
                <th className="pb-3 pr-4">Beschreibung</th>
                <th className="pb-3">Beispiel</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-700/50">
                <td className="py-3 pr-4 font-mono text-hue-orange">SET &lt;id&gt; ON</td>
                <td className="py-3 pr-4">Licht/Gruppe einschalten</td>
                <td className="py-3 font-mono text-xs">SET wz_decke ON</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 pr-4 font-mono text-hue-orange">SET &lt;id&gt; OFF</td>
                <td className="py-3 pr-4">Licht/Gruppe ausschalten</td>
                <td className="py-3 font-mono text-xs">SET wz_decke OFF</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 pr-4 font-mono text-hue-orange">SET &lt;id&gt; BRI &lt;0-100&gt;</td>
                <td className="py-3 pr-4">Helligkeit setzen (%)</td>
                <td className="py-3 font-mono text-xs">SET wz_decke BRI 75</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 pr-4 font-mono text-hue-orange">SET &lt;id&gt; CT &lt;2000-6500&gt;</td>
                <td className="py-3 pr-4">Farbtemperatur (Kelvin)</td>
                <td className="py-3 font-mono text-xs">SET wz_decke CT 4000</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 pr-4 font-mono text-hue-orange">SET &lt;id&gt; COLOR &lt;hex&gt;</td>
                <td className="py-3 pr-4">Farbe setzen (RGB Hex)</td>
                <td className="py-3 font-mono text-xs">SET wz_decke COLOR #FF5500</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 pr-4 font-mono text-hue-orange">SCENE &lt;id&gt;</td>
                <td className="py-3 pr-4">Szene aktivieren</td>
                <td className="py-3 font-mono text-xs">SCENE sz_relax</td>
              </tr>
              <tr className="border-b border-gray-700/50 bg-hue-orange/10">
                <td className="py-3 pr-4 font-mono text-hue-orange">MOOD &lt;id&gt; &lt;nr&gt;</td>
                <td className="py-3 pr-4">Stimmung aktivieren (Lichtsteuerung)</td>
                <td className="py-3 font-mono text-xs">MOOD wohnzimmer 1</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono text-hue-orange">GET &lt;id&gt; STATUS</td>
                <td className="py-3 pr-4">Status abfragen</td>
                <td className="py-3 font-mono text-xs">GET wz_decke STATUS</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Praxis-Beispiel: Lichtsteuerungs-Baustein */}
      <section className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={20} className="text-hue-orange" />
          Praxis-Beispiel: Lichtsteuerungs-Baustein
        </h3>
        <div className="space-y-4 text-gray-300">
          <p className="text-sm">
            Komplettes Beispiel für einen Raum "Wohnzimmer" mit dem Loxone Lichtsteuerungs-Baustein
            und 3 HUE-Szenen.
          </p>

          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium text-hue-orange mb-3">1. Benötigte Mappings erstellen</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-2 pr-4">Loxone ID</th>
                  <th className="pb-2 pr-4">HUE Typ</th>
                  <th className="pb-2">HUE Ressource</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 pr-4 font-mono text-xs text-hue-orange">wohnzimmer</td>
                  <td className="py-2 pr-4">Gruppe</td>
                  <td className="py-2">Wohnzimmer (Raum)</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 pr-4 font-mono text-xs text-hue-orange">wohnzimmer_mood_1</td>
                  <td className="py-2 pr-4">Szene</td>
                  <td className="py-2">Entspannen</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 pr-4 font-mono text-xs text-hue-orange">wohnzimmer_mood_2</td>
                  <td className="py-2 pr-4">Szene</td>
                  <td className="py-2">Konzentrieren</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs text-hue-orange">wohnzimmer_mood_3</td>
                  <td className="py-2 pr-4">Szene</td>
                  <td className="py-2">Energie tanken</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium text-hue-orange mb-3">2. Loxone Config: Virtueller Ausgang</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">Adresse:</span>
                <code className="block bg-gray-800 px-3 py-2 rounded mt-1 font-mono">
                  http://192.168.1.100:8080
                </code>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium text-hue-orange mb-3">3. Loxone Config: Virtueller Ausgang Befehl</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">Bezeichnung:</span>
                <span className="ml-2">Wohnzimmer HUE</span>
              </div>
              <div>
                <span className="text-gray-400">Befehl (Analog vom AQ-Ausgang):</span>
                <code className="block bg-gray-800 px-3 py-2 rounded mt-1 font-mono">
                  /ws?cmd=MOOD wohnzimmer &lt;v&gt;
                </code>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium text-hue-orange mb-3">4. Loxone Config: Lichtsteuerungs-Baustein</h4>
            <div className="space-y-2 text-sm">
              <p className="text-gray-400">
                Verbinde den <strong>AQ</strong>-Ausgang (Stimmungsnummer) mit dem Virtuellen Ausgang Befehl.
              </p>
              <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/30 rounded">
                <p className="text-xs text-blue-300">
                  Der AQ-Ausgang gibt die aktuelle Stimmungsnummer aus:
                  <strong> 0</strong> = Aus,
                  <strong> 1</strong> = Mood 1,
                  <strong> 2</strong> = Mood 2, etc.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-medium text-green-400 mb-2">Ergebnis</h4>
            <ul className="text-sm text-green-300 space-y-1">
              <li>• Mood 0 → Wohnzimmer-Gruppe wird ausgeschaltet</li>
              <li>• Mood 1 → Szene "Entspannen" wird aktiviert</li>
              <li>• Mood 2 → Szene "Konzentrieren" wird aktiviert</li>
              <li>• Mood 3 → Szene "Energie tanken" wird aktiviert</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-yellow-500" />
          Troubleshooting
        </h3>
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium text-yellow-400 mb-2">Befehl wird nicht ausgeführt</h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Prüfe die Gateway-IP-Adresse im Virtuellen Ausgang</span>
              </li>
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Stelle sicher, dass der Gateway-Container läuft (Port 8080 erreichbar)</span>
              </li>
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Teste die URL direkt im Browser: <code className="bg-gray-800 px-1 rounded">http://GATEWAY_IP:8080/ws?cmd=SET test ON</code></span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium text-yellow-400 mb-2">"no mapping found" Fehler</h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Die Loxone ID im Befehl stimmt nicht mit einem Mapping überein</span>
              </li>
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Bei MOOD: Prüfe, ob sowohl Gruppen-Mapping als auch Szenen-Mappings (<code className="bg-gray-800 px-1 rounded">*_mood_1</code>, <code className="bg-gray-800 px-1 rounded">*_mood_2</code>, ...) existieren</span>
              </li>
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Prüfe, ob das Mapping aktiviert ist (Enabled = true)</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium text-yellow-400 mb-2">HUE reagiert nicht</h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Prüfe, ob die HUE Bridge verbunden ist (Dashboard: "Verbunden")</span>
              </li>
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Teste die HUE-Steuerung direkt über das Dashboard (Geräte/Räume)</span>
              </li>
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Prüfe die HUE Bridge IP in der Konfiguration</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium text-yellow-400 mb-2">Helligkeit/MOOD-Wert wird nicht übertragen</h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Stelle sicher, dass <code className="bg-gray-800 px-1 rounded">&lt;v&gt;</code> im Befehl enthalten ist (wird durch den Wert ersetzt)</span>
              </li>
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Der Virtuelle Ausgang Befehl muss als "Analog" konfiguriert sein</span>
              </li>
              <li className="flex items-start gap-2">
                <HelpCircle size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>Prüfe den Wertebereich: Helligkeit 0-100, MOOD 0-9</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Checkliste */}
      <section className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 size={20} className="text-hue-orange" />
          Checkliste
        </h3>
        <ul className="space-y-3 text-gray-300">
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 mt-0.5"></div>
            <span>HUE Bridge im Gateway gepairt (grüner Status "Verbunden")</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 mt-0.5"></div>
            <span>Mappings im Tab "Mappings" erstellt</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 mt-0.5"></div>
            <span>Gateway-IP notiert (Docker Host oder Container IP)</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 mt-0.5"></div>
            <span>Virtueller Ausgang in Loxone Config erstellt</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 mt-0.5"></div>
            <span>Virtuelle Ausgang-Befehle mit korrekten Loxone IDs konfiguriert</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 mt-0.5"></div>
            <span>Loxone Config gespeichert und auf Miniserver übertragen</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 mt-0.5"></div>
            <span>Test: URL im Browser testen (Mappings → Test URLs)</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0 mt-0.5"></div>
            <span>Test: Licht über Loxone schalten</span>
          </li>
        </ul>
      </section>

      {/* Quick Reference Card */}
      <section className="bg-gradient-to-br from-hue-orange/20 to-orange-600/10 rounded-xl p-6 border border-hue-orange/30">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={20} className="text-hue-orange" />
          Schnellreferenz
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-hue-orange mb-2">Licht Ein/Aus</h4>
            <code className="text-xs text-gray-300 font-mono">/ws?cmd=SET id ON|OFF</code>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-hue-orange mb-2">Helligkeit</h4>
            <code className="text-xs text-gray-300 font-mono">/ws?cmd=SET id BRI &lt;v&gt;</code>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-hue-orange mb-2">Szene</h4>
            <code className="text-xs text-gray-300 font-mono">/ws?cmd=SCENE id</code>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-hue-orange mb-2">Lichtsteuerung (MOOD)</h4>
            <code className="text-xs text-gray-300 font-mono">/ws?cmd=MOOD id &lt;v&gt;</code>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-hue-orange mb-2">Farbtemperatur</h4>
            <code className="text-xs text-gray-300 font-mono">/ws?cmd=SET id CT &lt;v&gt;</code>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-hue-orange mb-2">Farbe</h4>
            <code className="text-xs text-gray-300 font-mono">/ws?cmd=SET id COLOR #hex</code>
          </div>
        </div>
      </section>
    </div>
  );
}
