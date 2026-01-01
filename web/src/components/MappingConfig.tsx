import { useState, useEffect } from 'react';
import { Mapping, Light, Group, Scene } from '../types';
import * as api from '../services/api';
import { Link2, Plus, Trash2, Edit2, Save, X, Lightbulb, Home, Play, Copy, Check, Terminal } from 'lucide-react';

interface MappingConfigProps {
  lights: Light[];
  groups: Group[];
  scenes: Scene[];
}

export function MappingConfig({ lights, groups, scenes }: MappingConfigProps) {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState<Partial<Mapping>>({});
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      const response = await api.getMappings();
      setMappings(response.mappings || []);
    } catch (error) {
      console.error('Failed to load mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.loxone_id || !formData.hue_id) return;

    try {
      const newMapping = await api.createMapping({
        name: formData.name,
        loxone_id: formData.loxone_id,
        hue_id: formData.hue_id,
        hue_type: formData.hue_type || 'light',
        enabled: true,
        description: formData.description,
      });
      setMappings([...mappings, newMapping]);
      setShowAdd(false);
      setFormData({});
    } catch (error) {
      console.error('Failed to create mapping:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const updated = await api.updateMapping(id, formData);
      setMappings(mappings.map((m) => (m.id === id ? updated : m)));
      setEditingId(null);
      setFormData({});
    } catch (error) {
      console.error('Failed to update mapping:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Mapping wirklich löschen?')) return;

    try {
      await api.deleteMapping(id);
      setMappings(mappings.filter((m) => m.id !== id));
    } catch (error) {
      console.error('Failed to delete mapping:', error);
    }
  };

  const startEdit = (mapping: Mapping) => {
    setEditingId(mapping.id);
    setFormData(mapping);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  const getHueResourceName = (hueId: string, hueType: string) => {
    if (hueType === 'group') {
      const group = groups.find((g) => g.id === hueId);
      return group?.name || hueId;
    }
    if (hueType === 'scene') {
      const scene = scenes.find((s) => s.id === hueId);
      return scene?.name || hueId;
    }
    const light = lights.find((l) => l.id === hueId);
    return light?.name || hueId;
  };

  const getTypeIcon = (hueType: string) => {
    switch (hueType) {
      case 'group':
        return <Home size={20} className="text-hue-orange" />;
      case 'scene':
        return <Play size={20} className="text-hue-orange" />;
      default:
        return <Lightbulb size={20} className="text-hue-orange" />;
    }
  };

  const getTypeLabel = (hueType: string) => {
    switch (hueType) {
      case 'group':
        return 'Gruppe';
      case 'scene':
        return 'Szene';
      default:
        return 'Licht';
    }
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts (HTTP)
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const CopyButton = ({ text, fieldId }: { text: string; fieldId: string }) => (
    <button
      type="button"
      onClick={() => copyToClipboard(text, fieldId)}
      className={`
        px-2 py-1 rounded transition-all flex items-center gap-1 text-xs
        ${copiedField === fieldId
          ? 'bg-green-600 text-white'
          : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}
      `}
      title="In Zwischenablage kopieren"
    >
      {copiedField === fieldId ? (
        <>
          <Check size={12} />
          <span>Kopiert!</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>Kopieren</span>
        </>
      )}
    </button>
  );

  const getLoxoneGuide = (mapping: Mapping) => {
    const loxoneId = mapping.loxone_id;
    const isScene = mapping.hue_type === 'scene';

    if (isScene) {
      return {
        title: 'Szene aktivieren (Impuls-Taster)',
        commands: [
          {
            label: 'Befehl bei EIN',
            value: `/ws?cmd=SCENE ${loxoneId}`,
            description: 'Virtueller Ausgang Befehl - wird bei Impuls ausgeführt'
          }
        ],
        note: 'Für Szenen empfiehlt sich ein Taster/Impuls in Loxone. Die Szene wird bei jedem Impuls aktiviert.'
      };
    }

    return {
      title: 'Licht/Gruppe steuern',
      commands: [
        {
          label: 'Befehl bei EIN',
          value: `/ws?cmd=SET ${loxoneId} ON`,
          description: 'Virtueller Ausgang Befehl - Licht einschalten'
        },
        {
          label: 'Befehl bei AUS',
          value: `/ws?cmd=SET ${loxoneId} OFF`,
          description: 'Virtueller Ausgang Befehl - Licht ausschalten'
        },
        {
          label: 'Helligkeit (0-100%)',
          value: `/ws?cmd=SET ${loxoneId} BRI <v>`,
          description: 'Virtueller Ausgang Befehl (Analog) - <v> wird durch Wert ersetzt'
        },
        {
          label: 'Farbtemperatur (2000-6500K)',
          value: `/ws?cmd=SET ${loxoneId} CT <v>`,
          description: 'Virtueller Ausgang Befehl (Analog) - optional'
        }
      ],
      note: 'Erstelle einen Virtuellen Ausgang mit Adresse http://GATEWAY_IP:8080 und füge die Befehle als Virtuelle Ausgang Befehle hinzu.'
    };
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Lade Mappings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Loxone Mappings</h2>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-hue-orange text-gray-900 rounded-lg hover:bg-orange-400 transition-colors"
        >
          <Plus size={18} />
          Neu
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-white">Neues Mapping</h3>
          <input
            type="text"
            placeholder="Name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
          />
          <input
            type="text"
            placeholder="Loxone ID"
            value={formData.loxone_id || ''}
            onChange={(e) => setFormData({ ...formData, loxone_id: e.target.value })}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              title="HUE Ressourcentyp"
              value={formData.hue_type || 'light'}
              onChange={(e) => setFormData({ ...formData, hue_type: e.target.value, hue_id: '' })}
              className="bg-gray-700 text-white rounded-lg px-3 py-2"
            >
              <option value="light">Licht</option>
              <option value="group">Gruppe/Raum</option>
              <option value="scene">Szene</option>
            </select>
            <select
              title="HUE Ressource"
              value={formData.hue_id || ''}
              onChange={(e) => setFormData({ ...formData, hue_id: e.target.value })}
              className="bg-gray-700 text-white rounded-lg px-3 py-2"
            >
              <option value="">HUE Ressource wählen...</option>
              {formData.hue_type === 'group' &&
                [...groups].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.type})
                  </option>
                ))}
              {formData.hue_type === 'scene' &&
                [...scenes].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              {formData.hue_type !== 'group' && formData.hue_type !== 'scene' &&
                [...lights].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>
          <textarea
            placeholder="Beschreibung (optional)"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
            >
              <Save size={18} />
              Speichern
            </button>
            <button
              type="button"
              title="Abbrechen"
              onClick={() => {
                setShowAdd(false);
                setFormData({});
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {[...mappings].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((mapping) => (
          <div
            key={mapping.id}
            className={`bg-gray-800 rounded-xl p-4 ${!mapping.enabled ? 'opacity-50' : ''}`}
          >
            {editingId === mapping.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Loxone ID"
                  value={formData.loxone_id || ''}
                  onChange={(e) => setFormData({ ...formData, loxone_id: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    title="HUE Ressourcentyp"
                    value={formData.hue_type || 'light'}
                    onChange={(e) => setFormData({ ...formData, hue_type: e.target.value, hue_id: '' })}
                    className="bg-gray-700 text-white rounded-lg px-3 py-2"
                  >
                    <option value="light">Licht</option>
                    <option value="group">Gruppe/Raum</option>
                    <option value="scene">Szene</option>
                  </select>
                  <select
                    title="HUE Ressource"
                    value={formData.hue_id || ''}
                    onChange={(e) => setFormData({ ...formData, hue_id: e.target.value })}
                    className="bg-gray-700 text-white rounded-lg px-3 py-2"
                  >
                    <option value="">HUE Ressource wählen...</option>
                    {formData.hue_type === 'group' &&
                      [...groups].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.type})
                        </option>
                      ))}
                    {formData.hue_type === 'scene' &&
                      [...scenes].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    {formData.hue_type !== 'group' && formData.hue_type !== 'scene' &&
                      [...lights].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </div>
                <textarea
                  placeholder="Beschreibung (optional)"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdate(mapping.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
                  >
                    <Save size={18} />
                    Speichern
                  </button>
                  <button
                    type="button"
                    title="Abbrechen"
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      {getTypeIcon(mapping.hue_type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{mapping.name}</h3>
                      <p className="text-xs text-gray-400">
                        {mapping.loxone_id} → {getHueResourceName(mapping.hue_id, mapping.hue_type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Typ: {getTypeLabel(mapping.hue_type)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedGuide(expandedGuide === mapping.id ? null : mapping.id)}
                      className={`p-2 transition-colors ${expandedGuide === mapping.id ? 'text-hue-orange' : 'text-gray-400 hover:text-white'}`}
                      title="Loxone Konfiguration anzeigen"
                    >
                      <Terminal size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(mapping)}
                      className="p-2 text-gray-400 hover:text-white"
                      title="Bearbeiten"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(mapping.id)}
                      className="p-2 text-gray-400 hover:text-red-400"
                      title="Löschen"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Loxone Konfigurationsanleitung */}
                {expandedGuide === mapping.id && (
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal size={16} className="text-hue-orange" />
                      <h4 className="text-sm font-medium text-white">
                        Loxone Config - {getLoxoneGuide(mapping).title}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {getLoxoneGuide(mapping).commands.map((cmd, idx) => (
                        <div key={idx} className="bg-gray-900 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">{cmd.label}</span>
                            <CopyButton text={cmd.value} fieldId={`${mapping.id}-${idx}`} />
                          </div>
                          <code className="block text-sm text-hue-orange font-mono break-all">
                            {cmd.value}
                          </code>
                          <p className="text-xs text-gray-500 mt-1">{cmd.description}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                      <p className="text-xs text-blue-300">
                        <strong>Hinweis:</strong> {getLoxoneGuide(mapping).note}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {mappings.length === 0 && !showAdd && (
          <div className="text-center py-8">
            <Link2 className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400">Keine Mappings konfiguriert</p>
            <p className="text-xs text-gray-500 mt-2">
              Mappings verbinden Loxone IDs mit HUE Geräten
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
