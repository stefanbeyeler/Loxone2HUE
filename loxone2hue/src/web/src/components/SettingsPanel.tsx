import { useState, useEffect } from 'react';
import { Settings, Radio, Save, CheckCircle, AlertCircle, Download, FileDown } from 'lucide-react';
import * as api from '../services/api';
import type { UDPFeedbackConfig, LoxoneConfig } from '../services/api';

export function SettingsPanel() {
  const [loxoneConfig, setLoxoneConfig] = useState<LoxoneConfig>({
    enabled: true,
    miniserver_ip: '',
    udp_feedback: {
      enabled: false,
      ip: '',
      port: 7777,
    },
  });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await api.getConfig();
      setLoxoneConfig({
        enabled: config.loxone?.enabled ?? true,
        miniserver_ip: config.loxone?.miniserver_ip || '',
        udp_feedback: {
          enabled: config.loxone?.udp_feedback?.enabled ?? false,
          ip: config.loxone?.udp_feedback?.ip || '',
          port: config.loxone?.udp_feedback?.port || 7777,
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
          Sendet Status-Änderungen von HUE-Geräten per UDP an den Loxone Miniserver.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ziel-IP (Miniserver)</label>
            <input
              type="text"
              value={loxoneConfig.udp_feedback.ip}
              onChange={(e) => updateUDP({ ip: e.target.value })}
              placeholder="192.168.1.10"
              disabled={!loxoneConfig.udp_feedback.enabled}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-hue-orange focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500"
            />
          </div>

          <div>
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
        </div>

        {loxoneConfig.udp_feedback.enabled && !loxoneConfig.udp_feedback.ip && (
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <AlertCircle size={16} />
            <span>Bitte eine Ziel-IP eingeben</span>
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

      {/* Loxone Config XML Export */}
      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Download size={20} className="text-hue-orange" />
          <h3 className="text-lg font-medium text-white">Loxone Config Export</h3>
        </div>
        <p className="text-sm text-gray-400">
          XML-Vorlagen zum Import in Loxone Config. Unter
          <span className="text-gray-300"> Gerätevorlagen &rarr; Vorlage importieren</span> laden.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Virtual UDP Input */}
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileDown size={16} className="text-hue-orange" />
              <h4 className="text-sm font-medium text-white">Virtual UDP Input</h4>
            </div>
            <p className="text-xs text-gray-400">
              Empfängt Status-Feedback (On/Off, Helligkeit, Farbtemperatur, Farbe) für gemappte Geräte.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="./api/export/inputs"
                download="loxone2hue_inputs.xml"
                className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={14} />
                Gemappte Geräte
              </a>
              <a
                href="./api/export/inputs?all=true"
                download="loxone2hue_inputs_all.xml"
                className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={14} />
                Alle HUE-Geräte
              </a>
            </div>
          </div>

          {/* Virtual HTTP Output */}
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileDown size={16} className="text-hue-orange" />
              <h4 className="text-sm font-medium text-white">Virtual HTTP Output</h4>
            </div>
            <p className="text-xs text-gray-400">
              Steuert HUE-Geräte von Loxone aus (Mood-Befehle, Helligkeit). Basierend auf den Mappings.
            </p>
            <a
              href="./api/export/outputs"
              download="loxone2hue_outputs.xml"
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={14} />
              Ausgänge exportieren
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
