import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Radio, Save, CheckCircle, AlertCircle, ScrollText, Search, RefreshCw } from 'lucide-react';
import * as api from '../services/api';
import type { UDPFeedbackConfig, LoxoneConfig, LogEntry } from '../services/api';

const LEVEL_STYLES: Record<string, string> = {
  DEBUG: 'bg-gray-600 text-gray-200',
  INFO: 'bg-blue-900/80 text-blue-300',
  WARN: 'bg-yellow-900/80 text-yellow-300',
  ERROR: 'bg-red-900/80 text-red-300',
  FATAL: 'bg-red-800 text-red-200',
};

const LEVEL_FILTERS = ['Alle', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'UDP'] as const;

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export function SettingsPanel() {
  const [loxoneConfig, setLoxoneConfig] = useState<LoxoneConfig>({
    enabled: true,
    miniserver_ip: '',
    udp_feedback: {
      enabled: false,
      port: 7777,
      send_all: false,
    },
  });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
  const [loading, setLoading] = useState(true);

  // Server logs state
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logLevel, setLogLevel] = useState<string>('');
  const [logSearch, setLogSearch] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const isUDP = logLevel === 'UDP';
      const result = await api.getLogs({
        level: (!isUDP && logLevel) || undefined,
        search: isUDP ? 'UDP feedback' : logSearch || undefined,
        limit: 200,
      });
      setLogEntries(result.entries || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [logLevel, logSearch]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadLogs, 3000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, loadLogs]);

  const loadConfig = async () => {
    try {
      const config = await api.getConfig();
      setLoxoneConfig({
        enabled: config.loxone?.enabled ?? true,
        miniserver_ip: config.loxone?.miniserver_ip || '',
        udp_feedback: {
          enabled: config.loxone?.udp_feedback?.enabled ?? false,
          port: config.loxone?.udp_feedback?.port || 7777,
          send_all: config.loxone?.udp_feedback?.send_all ?? false,
        },
      });
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      await api.updateConfig({ loxone: loxoneConfig });
      setSaveResult('success');
      setTimeout(() => setSaveResult(null), 3000);
    } catch (err) {
      setSaveResult('error');
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateUDP = (update: Partial<UDPFeedbackConfig>) => {
    setLoxoneConfig((prev) => ({
      ...prev,
      udp_feedback: { ...prev.udp_feedback, ...update },
    }));
  };

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Lade Konfiguration...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={24} className="text-hue-orange" />
        <h2 className="text-xl font-semibold text-white">Einstellungen</h2>
      </div>

      {/* Loxone General Settings */}
      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-medium text-white">Loxone Miniserver</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={loxoneConfig.enabled}
              onChange={(e) => setLoxoneConfig({ ...loxoneConfig, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-gray-600 rounded-full peer-checked:bg-hue-orange transition-colors"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
          </div>
          <span className="text-gray-300">Loxone-Integration aktiviert</span>
        </label>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Miniserver IP</label>
          <input
            type="text"
            value={loxoneConfig.miniserver_ip}
            onChange={(e) => setLoxoneConfig({ ...loxoneConfig, miniserver_ip: e.target.value })}
            placeholder="192.168.1.10"
            disabled={!loxoneConfig.enabled}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-hue-orange focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500"
          />
        </div>
      </div>

      {/* UDP Feedback Section */}
      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Radio size={20} className="text-hue-orange" />
          <h3 className="text-lg font-medium text-white">UDP Status-Feedback</h3>
        </div>
        <p className="text-sm text-gray-400">
          Sendet Status-Änderungen von HUE-Geräten per UDP an die oben konfigurierte Miniserver IP.
          Für jede Eigenschaftsänderung wird ein UDP-Paket gesendet.
        </p>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-400 font-mono">
            Format: &lt;loxone_id&gt;/&lt;eigenschaft&gt;:&lt;wert&gt;
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Beispiel: buero_stefan/on:1 &bull; buero_stefan/bri:80 &bull; buero_stefan/ct:250
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={loxoneConfig.udp_feedback.enabled}
              onChange={(e) => updateUDP({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-gray-600 rounded-full peer-checked:bg-hue-orange transition-colors"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
          </div>
          <span className="text-gray-300">UDP Feedback aktivieren</span>
        </label>

        <div className="max-w-xs">
          <label className="block text-sm text-gray-400 mb-1">UDP Port</label>
          <input
            type="number"
            value={loxoneConfig.udp_feedback.port}
            onChange={(e) => updateUDP({ port: parseInt(e.target.value) || 7777 })}
            placeholder="7777"
            min={1}
            max={65535}
            disabled={!loxoneConfig.udp_feedback.enabled}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-hue-orange focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={loxoneConfig.udp_feedback.send_all}
              onChange={(e) => updateUDP({ send_all: e.target.checked })}
              disabled={!loxoneConfig.udp_feedback.enabled}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-gray-600 rounded-full peer-checked:bg-hue-orange transition-colors peer-disabled:opacity-50"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
          </div>
          <div>
            <span className="text-gray-300">UDP Feedback für alle Geräte senden</span>
            <p className="text-xs text-gray-500">Auch für Geräte ohne Mapping (Gerätename wird als Loxone-ID verwendet)</p>
          </div>
        </label>

        {loxoneConfig.udp_feedback.enabled && !loxoneConfig.miniserver_ip && (
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <AlertCircle size={16} />
            <span>Bitte oben eine Miniserver IP eingeben</span>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-hue-orange hover:bg-hue-orange/90 text-gray-900 font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {saving ? 'Speichern...' : 'Einstellungen speichern'}
        </button>

        {saveResult === 'success' && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle size={16} />
            <span>Gespeichert</span>
          </div>
        )}
        {saveResult === 'error' && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            <span>Fehler beim Speichern</span>
          </div>
        )}
      </div>

      {/* Server Logs */}
      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ScrollText size={20} className="text-hue-orange" />
          <h3 className="text-lg font-medium text-white">Server Logs</h3>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {LEVEL_FILTERS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLogLevel(lvl === 'Alle' ? '' : lvl)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                (lvl === 'Alle' && logLevel === '') || logLevel === lvl
                  ? 'bg-hue-orange text-gray-900'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {lvl}
            </button>
          ))}

          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Suche (z.B. 'EventStream')..."
              className="w-full bg-gray-700 text-white rounded-lg pl-9 pr-4 py-1.5 text-sm border border-gray-600 focus:border-hue-orange focus:outline-none placeholder-gray-500"
            />
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-Refresh aktiv (3s)' : 'Auto-Refresh aus'}
            className={`p-1.5 rounded-md transition-colors ${
              autoRefresh
                ? 'bg-hue-orange/20 text-hue-orange'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <RefreshCw size={16} className={autoRefresh ? 'animate-spin [animation-duration:3s]' : ''} />
          </button>
        </div>

        {/* Log entries */}
        <div
          ref={logContainerRef}
          className="bg-gray-900 rounded-lg border border-gray-700 overflow-auto max-h-[420px] font-mono text-[13px] leading-relaxed"
        >
          {logsLoading && logEntries.length === 0 ? (
            <div className="text-gray-500 text-center py-8 text-sm">Lade Logs...</div>
          ) : logEntries.length === 0 ? (
            <div className="text-gray-500 text-center py-8 text-sm">Keine Log-Einträge gefunden</div>
          ) : (
            <table className="w-full">
              <tbody>
                {logEntries.map((entry, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/40"
                  >
                    <td className="px-3 py-1 text-gray-500 whitespace-nowrap align-top">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap align-top">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-gray-700 text-gray-400">
                        {entry.source}
                      </span>
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap align-top">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          LEVEL_STYLES[entry.level] || 'bg-gray-600 text-gray-300'
                        }`}
                      >
                        {entry.level}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-gray-300 break-all">
                      {entry.message}
                      {entry.fields && Object.keys(entry.fields).length > 0 && (
                        <span className="text-gray-500 ml-2">
                          {Object.entries(entry.fields)
                            .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join(' ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
