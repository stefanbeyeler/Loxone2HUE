import { useState, useEffect } from 'react';
import { Mapping, Light, Group, Scene } from '../types';
import * as api from '../services/api';
import { Link2, Plus, Trash2, Edit2, Save, X, Lightbulb, Home, Play, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

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
      if (scene) {
        const groupName = getGroupNameForScene(scene);
        return groupName ? `${scene.name} (${groupName})` : scene.name;
      }
      return hueId;
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

  const getGroupNameForScene = (scene: Scene) => {
    const group = groups.find((g) => g.id === scene.group_id);
    return group?.name || '';
  };

  const getScenesWithGroupName = () => {
    return [...scenes]
      .map((s) => ({
        ...s,
        groupName: getGroupNameForScene(s),
      }))
      .sort((a, b) => {
        // Zuerst nach Gruppenname sortieren, dann nach Szenenname
        const groupCompare = a.groupName.localeCompare(b.groupName, 'de');
        if (groupCompare !== 0) return groupCompare;
        return a.name.localeCompare(b.name, 'de');
      });
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

  const getBaseUrl = () => {
    return `${window.location.protocol}//${window.location.host}`;
  };

  const getTestUrls = (mapping: Mapping) => {
    const baseUrl = getBaseUrl();
    const loxoneId = mapping.loxone_id;
    const hueType = mapping.hue_type;

    if (hueType === 'scene') {
      return [
        {
          label: 'Szene aktivieren',
          url: `${baseUrl}/ws?cmd=SCENE ${loxoneId}`,
        }
      ];
    }

    // Check if this is a mood mapping (pattern: *_mood_*)
    const isMoodMapping = loxoneId.includes('_mood_');
    if (isMoodMapping) {
      return [
        {
          label: 'Mood aktivieren (Szene)',
          url: `${baseUrl}/ws?cmd=SCENE ${loxoneId}`,
        }
      ];
    }

    // For groups, add MOOD test URLs
    if (hueType === 'group') {
      return [
        {
          label: 'Einschalten',
          url: `${baseUrl}/ws?cmd=SET ${loxoneId} ON`,
        },
        {
          label: 'Ausschalten',
          url: `${baseUrl}/ws?cmd=SET ${loxoneId} OFF`,
        },
        {
          label: 'Helligkeit 50%',
          url: `${baseUrl}/ws?cmd=SET ${loxoneId} BRI 50`,
        },
        {
          label: 'MOOD 0 (Aus)',
          url: `${baseUrl}/ws?cmd=MOOD ${loxoneId} 0`,
        },
        {
          label: 'MOOD 1',
          url: `${baseUrl}/ws?cmd=MOOD ${loxoneId} 1`,
        },
        {
          label: 'MOOD 2',
          url: `${baseUrl}/ws?cmd=MOOD ${loxoneId} 2`,
        }
      ];
    }

    // Light
    return [
      {
        label: 'Einschalten',
        url: `${baseUrl}/ws?cmd=SET ${loxoneId} ON`,
      },
      {
        label: 'Ausschalten',
        url: `${baseUrl}/ws?cmd=SET ${loxoneId} OFF`,
      },
      {
        label: 'Helligkeit 50%',
        url: `${baseUrl}/ws?cmd=SET ${loxoneId} BRI 50`,
      },
      {
        label: 'Farbtemperatur 4000K',
        url: `${baseUrl}/ws?cmd=SET ${loxoneId} CT 4000`,
      }
    ];
  };

  const getLoxoneGuide = (mapping: Mapping) => {
    const loxoneId = mapping.loxone_id;
    const hueType = mapping.hue_type;

    if (hueType === 'scene') {
      // Check if this is a mood scene mapping
      const isMoodMapping = loxoneId.includes('_mood_');
      if (isMoodMapping) {
        return {
          title: 'Mood-Szene (für Lichtsteuerungs-Baustein)',
          commands: [
            {
              label: 'Direkt aktivieren',
              value: `/ws?cmd=SCENE ${loxoneId}`,
              description: 'Szene direkt aktivieren (ohne Lichtsteuerungs-Baustein)'
            }
          ],
          note: `Diese Szene ist Teil eines MOOD-Mappings. Sie wird automatisch aktiviert, wenn der Lichtsteuerungs-Baustein die entsprechende Stimmungsnummer sendet. Verwende den MOOD-Befehl am Gruppen-Mapping.`
        };
      }
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

    if (hueType === 'group') {
      return {
        title: 'Gruppe/Raum steuern',
        commands: [
          {
            label: 'Befehl bei EIN',
            value: `/ws?cmd=SET ${loxoneId} ON`,
            description: 'Virtueller Ausgang Befehl - Gruppe einschalten'
          },
          {
            label: 'Befehl bei AUS',
            value: `/ws?cmd=SET ${loxoneId} OFF`,
            description: 'Virtueller Ausgang Befehl - Gruppe ausschalten'
          },
          {
            label: 'Helligkeit (0-100%)',
            value: `/ws?cmd=SET ${loxoneId} BRI <v>`,
            description: 'Virtueller Ausgang Befehl (Analog) - <v> wird durch Wert ersetzt'
          },
          {
            label: 'Lichtsteuerungs-Baustein (MOOD)',
            value: `/ws?cmd=MOOD ${loxoneId} <v>`,
            description: 'AQ-Ausgang → Virtueller Ausgang (Analog) - <v> = Stimmungsnummer'
          }
        ],
        note: `Für den Lichtsteuerungs-Baustein: Erstelle zusätzlich Szenen-Mappings mit dem Muster "${loxoneId}_mood_1", "${loxoneId}_mood_2", etc. MOOD 0 schaltet diese Gruppe aus.`
      };
    }

    // Light
    return {
      title: 'Einzelnes Licht steuern',
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
        },
        {
          label: 'Farbe (Hex)',
          value: `/ws?cmd=SET ${loxoneId} COLOR #FF5500`,
          description: 'Virtueller Ausgang Befehl - Farbe als Hex-Wert'
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
                getScenesWithGroupName().map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.groupName ? ` (${s.groupName})` : ''}
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
                      getScenesWithGroupName().map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}{s.groupName ? ` (${s.groupName})` : ''}
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

                    {/* Test URLs */}
                    <div className="mt-4 border-t border-gray-700 pt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <ExternalLink size={16} className="text-green-500" />
                        <h4 className="text-sm font-medium text-white">Test URLs</h4>
                        <span className="text-xs text-gray-500">(zum Testen im Browser)</span>
                      </div>
                      <div className="space-y-2">
                        {getTestUrls(mapping).map((test, idx) => (
                          <div key={idx} className="bg-gray-900 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">{test.label}</span>
                              <div className="flex gap-2">
                                <CopyButton text={test.url} fieldId={`${mapping.id}-test-${idx}`} />
                                <a
                                  href={test.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded bg-green-700 text-white hover:bg-green-600 transition-colors flex items-center gap-1 text-xs"
                                  title="Im Browser öffnen"
                                >
                                  <ExternalLink size={12} />
                                  <span>Testen</span>
                                </a>
                              </div>
                            </div>
                            <code className="block text-sm text-green-400 font-mono break-all">
                              {test.url}
                            </code>
                          </div>
                        ))}
                      </div>
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
