import { useState, useEffect } from 'react';
import { Mapping, Light, Group, Scene } from '../types';
import * as api from '../services/api';
import { Link2, Plus, Trash2, Edit2, Save, X, Lightbulb, Home, Play, Copy, Check, Terminal, ExternalLink, Download, Upload, AlertCircle, FileDown, ChevronUp, ChevronDown, Power, Layers } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface MappingConfigProps {
  lights: Light[];
  groups: Group[];
  scenes: Scene[];
  onNavigateToHueElement?: (hueId: string, hueType: string) => void;
}

export function MappingConfig({ lights, groups, scenes, onNavigateToHueElement }: MappingConfigProps) {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Mapping>>({});
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<'single' | 'mood' | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<api.MappingsBackup | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [importResult, setImportResult] = useState<api.ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [moodEnabled, setMoodEnabled] = useState(false);
  const [moodOrder, setMoodOrder] = useState<string[]>([]);

  useEffect(() => {
    loadMappings();
  }, []);

  // Initialize mood order when mood is enabled or group changes
  useEffect(() => {
    if (!moodEnabled || formData.hue_type !== 'group' || !formData.hue_id) {
      setMoodOrder([]);
      return;
    }
    const groupScenes = scenes
      .filter((s) => s.group_id === formData.hue_id)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    setMoodOrder(groupScenes.map((s) => s.id));
  }, [moodEnabled, formData.hue_id, formData.hue_type, scenes]);

  const moveMoodScene = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...moodOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setMoodOrder(newOrder);
  };

  // Wizard helpers
  const closeWizard = () => {
    setWizardOpen(false);
    setWizardMode(null);
    setWizardStep(0);
    setFormData({});
    setMoodEnabled(false);
    setMoodOrder([]);
  };

  const selectWizardMode = (mode: 'single' | 'mood') => {
    setWizardMode(mode);
    if (mode === 'mood') {
      setFormData((prev) => ({ ...prev, hue_type: 'group' }));
      setMoodEnabled(true);
    } else {
      setMoodEnabled(false);
      if (!formData.hue_type) {
        setFormData((prev) => ({ ...prev, hue_type: 'light' }));
      }
    }
    // If resource already selected (from prefill), skip to details
    if (formData.hue_id) {
      setWizardStep(2);
    } else {
      setWizardStep(1);
    }
  };

  const wizardTotalSteps = wizardMode === 'mood' ? 4 : 3;
  const isLastWizardStep = wizardStep === wizardTotalSteps;

  const canWizardProceed = (): boolean => {
    if (wizardMode === 'single') {
      if (wizardStep === 1) return !!formData.hue_type && !!formData.hue_id;
      if (wizardStep === 2) return !!formData.name && !!formData.loxone_id;
    }
    if (wizardMode === 'mood') {
      if (wizardStep === 1) return !!formData.hue_id;
      if (wizardStep === 2) return !!formData.name && !!formData.loxone_id;
      if (wizardStep === 3) return true;
    }
    return true;
  };

  const getWizardStepLabel = (): string => {
    if (wizardStep === 0) return 'Modus wählen';
    if (wizardMode === 'single') {
      return ['', 'Ressource wählen', 'Details eingeben', 'Zusammenfassung'][wizardStep] || '';
    }
    if (wizardMode === 'mood') {
      return ['', 'Gruppe wählen', 'Details eingeben', 'Szenen-Reihenfolge', 'Zusammenfassung'][wizardStep] || '';
    }
    return '';
  };

  const wizardBack = () => {
    if (wizardStep === 1) {
      setWizardStep(0);
      setWizardMode(null);
      setMoodEnabled(false);
    } else {
      setWizardStep((s) => s - 1);
    }
  };

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
      const newMappings = [...mappings, newMapping];

      // Auto-create mood scene mappings if mood wizard mode
      if (wizardMode === 'mood' && formData.hue_type === 'group') {
        // Mood 0: Turn off all lights in group
        try {
          const mood0Mapping = await api.createMapping({
            name: `${formData.name} - Alle Lichter aus`,
            loxone_id: `${formData.loxone_id}_mood_0`,
            hue_id: formData.hue_id,
            hue_type: 'group',
            enabled: true,
            description: `Mood 0 für ${formData.name} (Gruppe ausschalten)`,
          });
          newMappings.push(mood0Mapping);
        } catch (err) {
          console.error('Failed to create mood 0 mapping:', err);
        }

        // Mood 1..N: scenes in user-defined order
        for (let i = 0; i < moodOrder.length; i++) {
          const scene = scenes.find((s) => s.id === moodOrder[i]);
          if (!scene) continue;
          try {
            const moodMapping = await api.createMapping({
              name: `${formData.name} - ${scene.name}`,
              loxone_id: `${formData.loxone_id}_mood_${i + 1}`,
              hue_id: scene.id,
              hue_type: 'scene',
              enabled: true,
              description: `Mood ${i + 1} für ${formData.name}`,
            });
            newMappings.push(moodMapping);
          } catch (err) {
            console.error(`Failed to create mood mapping ${i + 1}:`, err);
          }
        }
      }

      setMappings(newMappings);
      closeWizard();
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

  const handleDeleteGroup = async (parentMapping: Mapping) => {
    const children = mappings.filter((m) =>
      m.loxone_id.startsWith(`${parentMapping.loxone_id}_mood_`)
    );
    const message = children.length > 0
      ? `Mapping "${parentMapping.name}" und ${children.length} zugehörige Mood-Mappings löschen?`
      : 'Mapping wirklich löschen?';
    if (!confirm(message)) return;

    try {
      for (const child of children) {
        await api.deleteMapping(child.id);
      }
      await api.deleteMapping(parentMapping.id);
      const deletedIds = new Set([parentMapping.id, ...children.map((c) => c.id)]);
      setMappings(mappings.filter((m) => !deletedIds.has(m.id)));
    } catch (error) {
      console.error('Failed to delete mapping group:', error);
    }
  };

  const handleSwapMoods = async (moodA: Mapping, moodB: Mapping) => {
    const numA = getMoodNumber(moodA.loxone_id);
    const numB = getMoodNumber(moodB.loxone_id);
    const parentLoxoneId = getParentLoxoneId(moodA.loxone_id);
    if (!parentLoxoneId) return;

    const parentMapping = mappings.find((m) => m.loxone_id === parentLoxoneId);
    const parentName = parentMapping?.name || parentLoxoneId;

    try {
      await api.updateMapping(moodA.id, {
        loxone_id: `${parentLoxoneId}_mood_${numB}`,
        description: `Mood ${numB} für ${parentName}`,
      });
      await api.updateMapping(moodB.id, {
        loxone_id: `${parentLoxoneId}_mood_${numA}`,
        description: `Mood ${numA} für ${parentName}`,
      });
      await loadMappings();
    } catch (err) {
      console.error('Failed to swap mood order:', err);
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backup = await api.exportMappings();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loxone-mappings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export mappings:', error);
      alert('Export fehlgeschlagen');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content) as api.MappingsBackup;

        // Validate backup structure
        if (!backup.version || !backup.mappings || !Array.isArray(backup.mappings)) {
          throw new Error('Ungültiges Backup-Format');
        }

        setImportFile(backup);
        setShowImportModal(true);
      } catch (error) {
        setImportError('Die Datei konnte nicht gelesen werden. Bitte wähle eine gültige Backup-Datei.');
      }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await api.importMappings(importFile, importMode);
      setImportResult(result);
      // Reload mappings after import
      await loadMappings();
    } catch (error) {
      console.error('Failed to import mappings:', error);
      setImportError('Import fehlgeschlagen. Bitte überprüfe die Backup-Datei.');
    } finally {
      setIsImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
    setImportError(null);
    setImportMode('merge');
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
        return groupName ? `${groupName} - ${scene.name}` : scene.name;
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
    <Tooltip content="In Zwischenablage kopieren" position="top">
      <button
        type="button"
        aria-label="In Zwischenablage kopieren"
        onClick={() => copyToClipboard(text, fieldId)}
        className={`
          px-2 py-1 rounded transition-all flex items-center gap-1 text-xs
          ${copiedField === fieldId
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}
        `}
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
    </Tooltip>
  );

  const buildTestUrl = (cmd: string) => {
    return `./ws?cmd=${encodeURIComponent(cmd)}`;
  };

  const getTestUrls = (mapping: Mapping) => {
    const loxoneId = mapping.loxone_id;
    const hueType = mapping.hue_type;

    if (hueType === 'scene') {
      return [
        {
          label: 'Szene aktivieren',
          url: buildTestUrl(`SCENE ${loxoneId}`),
        }
      ];
    }

    // Check if this is a mood mapping (pattern: *_mood_*)
    const isMoodMapping = loxoneId.includes('_mood_');
    if (isMoodMapping) {
      return [
        {
          label: 'Mood aktivieren (Szene)',
          url: buildTestUrl(`SCENE ${loxoneId}`),
        }
      ];
    }

    // For groups, add MOOD test URLs
    if (hueType === 'group') {
      return [
        {
          label: 'Einschalten',
          url: buildTestUrl(`SET ${loxoneId} ON`),
        },
        {
          label: 'Ausschalten',
          url: buildTestUrl(`SET ${loxoneId} OFF`),
        },
        {
          label: 'Helligkeit 50%',
          url: buildTestUrl(`SET ${loxoneId} BRI 50`),
        },
        {
          label: 'MOOD 0 (Aus)',
          url: buildTestUrl(`MOOD ${loxoneId} 0`),
        },
        {
          label: 'MOOD 1',
          url: buildTestUrl(`MOOD ${loxoneId} 1`),
        },
        {
          label: 'MOOD 2',
          url: buildTestUrl(`MOOD ${loxoneId} 2`),
        }
      ];
    }

    // Light
    return [
      {
        label: 'Einschalten',
        url: buildTestUrl(`SET ${loxoneId} ON`),
      },
      {
        label: 'Ausschalten',
        url: buildTestUrl(`SET ${loxoneId} OFF`),
      },
      {
        label: 'Helligkeit 50%',
        url: buildTestUrl(`SET ${loxoneId} BRI 50`),
      },
      {
        label: 'Farbtemperatur 4000K',
        url: buildTestUrl(`SET ${loxoneId} CT 4000`),
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

  // Mood grouping helpers
  const isMoodChild = (loxoneId: string) => /_mood_\d+$/.test(loxoneId);

  const getParentLoxoneId = (moodLoxoneId: string) => {
    const match = moodLoxoneId.match(/^(.+)_mood_\d+$/);
    return match ? match[1] : null;
  };

  const getMoodNumber = (loxoneId: string): number => {
    const match = loxoneId.match(/_mood_(\d+)$/);
    return match ? parseInt(match[1], 10) : -1;
  };

  const getMoodChildren = (parentLoxoneId: string): Mapping[] => {
    return mappings
      .filter((m) => m.loxone_id.startsWith(`${parentLoxoneId}_mood_`))
      .sort((a, b) => getMoodNumber(a.loxone_id) - getMoodNumber(b.loxone_id));
  };

  const topLevelMappings = mappings.filter((m) => !isMoodChild(m.loxone_id));

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Lade Mappings...</div>;
  }

  return (
    <div className="space-y-4">
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
                download="VIU_Loxone2HUE.xml"
                className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={14} />
                Gemappte Geräte
              </a>
              <a
                href="./api/export/inputs?all=true"
                download="VIU_Loxone2HUE_all.xml"
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
              download="VO_Loxone2HUE.xml"
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={14} />
              Ausgänge exportieren
            </a>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Loxone Mappings</h2>
        <div className="flex gap-2">
          <Tooltip content="Backup exportieren" position="bottom">
            <button
              type="button"
              aria-label="Mappings exportieren"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </Tooltip>
          <Tooltip content="Backup importieren" position="bottom">
            <label className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
              <Upload size={18} />
              <span className="hidden sm:inline">Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </Tooltip>
          <button
            type="button"
            onClick={() => { setWizardOpen(true); setWizardStep(0); setWizardMode(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-hue-orange text-gray-900 rounded-lg hover:bg-orange-400 transition-colors"
          >
            <Plus size={18} />
            Neu
          </button>
        </div>
      </div>

      {/* Import Error Display */}
      {importError && !showImportModal && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-300">{importError}</p>
            <button
              type="button"
              onClick={() => setImportError(null)}
              className="text-red-400 text-sm hover:text-red-300 mt-1"
            >
              Schliessen
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Mappings importieren</h3>
              <button
                type="button"
                aria-label="Schliessen"
                onClick={closeImportModal}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {!importResult ? (
              <>
                {/* File Info */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    <strong>Version:</strong> {importFile?.version}
                  </p>
                  <p className="text-sm text-gray-300">
                    <strong>Erstellt:</strong> {importFile?.created_at ? new Date(importFile.created_at).toLocaleString('de-CH') : '-'}
                  </p>
                  <p className="text-sm text-gray-300">
                    <strong>Mappings:</strong> {importFile?.mappings.length || 0}
                  </p>
                </div>

                {/* Import Mode Selection */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Import-Modus:</p>
                  <label className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-white font-medium">Zusammenführen</p>
                      <p className="text-xs text-gray-400">
                        Bestehende Mappings bleiben erhalten. Nur neue werden hinzugefügt, vorhandene (gleiche Loxone ID) werden aktualisiert.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-white font-medium">Ersetzen</p>
                      <p className="text-xs text-gray-400">
                        Alle bestehenden Mappings werden gelöscht und durch die importierten ersetzt.
                      </p>
                    </div>
                  </label>
                </div>

                {importError && (
                  <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-300 text-sm">{importError}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-hue-orange text-gray-900 rounded-lg hover:bg-orange-400 disabled:opacity-50"
                  >
                    {isImporting ? 'Importiere...' : 'Importieren'}
                  </button>
                  <button
                    type="button"
                    onClick={closeImportModal}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    Abbrechen
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Import Result */}
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                  <p className="text-green-300 font-medium mb-2">Import erfolgreich!</p>
                  <div className="space-y-1 text-sm text-gray-300">
                    <p><strong>Importiert:</strong> {importResult.imported} neue Mappings</p>
                    <p><strong>Aktualisiert:</strong> {importResult.updated} bestehende Mappings</p>
                    {importResult.skipped > 0 && (
                      <p><strong>Übersprungen:</strong> {importResult.skipped}</p>
                    )}
                    <p className="text-gray-400 mt-2">Gesamt: {importResult.total} Mappings verarbeitet</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeImportModal}
                  className="w-full px-4 py-2 bg-hue-orange text-gray-900 rounded-lg hover:bg-orange-400"
                >
                  Schliessen
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Wizard for new mappings */}
      {wizardOpen && (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          {/* Wizard Header */}
          <div className="bg-gray-700/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-medium text-white">Neues Mapping</h3>
              {wizardMode && (
                <span className="text-xs text-gray-500">
                  Schritt {wizardStep} von {wizardTotalSteps} &mdash; {getWizardStepLabel()}
                </span>
              )}
            </div>
            <button type="button" onClick={closeWizard} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Step 0: Mode Selection */}
            {wizardStep === 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-3">Welche Art von Mapping möchtest du erstellen?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => selectWizardMode('single')}
                    className="p-5 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left space-y-2"
                  >
                    <Lightbulb size={28} className="text-hue-orange" />
                    <span className="font-medium text-white block">Einzelsteuerung</span>
                    <span className="text-xs text-gray-400 block">Ein einzelnes Licht, eine Gruppe oder Szene steuern</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectWizardMode('mood')}
                    className="p-5 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left space-y-2"
                  >
                    <Layers size={28} className="text-hue-orange" />
                    <span className="font-medium text-white block">Mood-Steuerung</span>
                    <span className="text-xs text-gray-400 block">Lichtsteuerungs-Baustein mit Szenen-Stimmungen</span>
                  </button>
                </div>
              </div>
            )}

            {/* Single Step 1: Type + Resource */}
            {wizardMode === 'single' && wizardStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Wähle den Typ und die HUE-Ressource:</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'group', 'scene'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, hue_type: type, hue_id: '', name: '' }))}
                      className={`p-3 rounded-lg text-center transition-colors ${
                        formData.hue_type === type
                          ? 'bg-hue-orange text-gray-900'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {type === 'light' && <Lightbulb size={20} className="mx-auto mb-1" />}
                      {type === 'group' && <Home size={20} className="mx-auto mb-1" />}
                      {type === 'scene' && <Play size={20} className="mx-auto mb-1" />}
                      <span className="text-sm block">{getTypeLabel(type)}</span>
                    </button>
                  ))}
                </div>
                <select
                  title="HUE Ressource"
                  value={formData.hue_id || ''}
                  onChange={(e) => {
                    const hueId = e.target.value;
                    let name = '';
                    if (formData.hue_type === 'light') {
                      name = lights.find((l) => l.id === hueId)?.name || '';
                    } else if (formData.hue_type === 'group') {
                      name = groups.find((g) => g.id === hueId)?.name || '';
                    } else if (formData.hue_type === 'scene') {
                      const sc = scenes.find((s) => s.id === hueId);
                      if (sc) {
                        const gn = getGroupNameForScene(sc);
                        name = gn ? `${gn} - ${sc.name}` : sc.name;
                      }
                    }
                    setFormData((prev) => ({ ...prev, hue_id: hueId, name: prev.name || name }));
                  }}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2.5"
                >
                  <option value="">Ressource wählen...</option>
                  {formData.hue_type === 'group' &&
                    [...groups].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((g) => (
                      <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                    ))}
                  {formData.hue_type === 'scene' &&
                    getScenesWithGroupName().map((s) => (
                      <option key={s.id} value={s.id}>{s.groupName ? `${s.groupName} - ${s.name}` : s.name}</option>
                    ))}
                  {formData.hue_type !== 'group' && formData.hue_type !== 'scene' &&
                    [...lights].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
              </div>
            )}

            {/* Single Step 2: Details */}
            {wizardMode === 'single' && wizardStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Gib Name und Loxone ID ein:</p>
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
                <textarea
                  placeholder="Beschreibung (optional)"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>
            )}

            {/* Single Step 3: Summary */}
            {wizardMode === 'single' && wizardStep === 3 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Überprüfe die Angaben:</p>
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      {getTypeIcon(formData.hue_type || 'light')}
                    </div>
                    <div>
                      <span className="text-white font-medium block">{formData.name}</span>
                      <span className="text-xs text-gray-400">{getTypeLabel(formData.hue_type || 'light')}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs block">HUE Ressource</span>
                      <span className="text-gray-300">{getHueResourceName(formData.hue_id || '', formData.hue_type || 'light')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block">Loxone ID</span>
                      <code className="text-hue-orange font-mono">{formData.loxone_id}</code>
                    </div>
                  </div>
                  {formData.description && (
                    <div className="text-sm">
                      <span className="text-gray-500 text-xs block">Beschreibung</span>
                      <span className="text-gray-300">{formData.description}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mood Step 1: Group */}
            {wizardMode === 'mood' && wizardStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Wähle die Gruppe / den Raum für die Mood-Steuerung:</p>
                <select
                  title="Gruppe wählen"
                  value={formData.hue_id || ''}
                  onChange={(e) => {
                    const hueId = e.target.value;
                    const group = groups.find((g) => g.id === hueId);
                    setFormData((prev) => ({ ...prev, hue_id: hueId, hue_type: 'group', name: prev.name || group?.name || '' }));
                  }}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2.5"
                >
                  <option value="">Gruppe wählen...</option>
                  {[...groups].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                  ))}
                </select>
                {formData.hue_id && (
                  <div className="bg-gray-700/30 rounded-lg p-3 flex items-center gap-2">
                    <Play size={14} className="text-hue-orange" />
                    <span className="text-xs text-gray-400">
                      {scenes.filter((s) => s.group_id === formData.hue_id).length} Szenen verfügbar
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Mood Step 2: Details */}
            {wizardMode === 'mood' && wizardStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Gib Name und Loxone ID ein:</p>
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Loxone ID (Basis)"
                  value={formData.loxone_id || ''}
                  onChange={(e) => setFormData({ ...formData, loxone_id: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500">
                  Die Loxone ID wird als Basis verwendet. Mood-Szenen erhalten automatisch Suffixe: _mood_0, _mood_1, etc.
                </p>
              </div>
            )}

            {/* Mood Step 3: Scene Order */}
            {wizardMode === 'mood' && wizardStep === 3 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Ordne die Szenen-Reihenfolge an:</p>
                {/* Mood 0 - fixed */}
                <div className="flex items-center gap-2 text-sm bg-gray-700/40 rounded-lg px-3 py-2">
                  <span className="w-7 text-center text-xs font-mono font-bold rounded px-1 py-0.5 bg-red-900/50 text-red-400 flex-shrink-0">0</span>
                  <Power size={14} className="text-red-400 flex-shrink-0" />
                  <span className="text-gray-300">Alle Lichter aus</span>
                  <code className="text-xs text-gray-500 font-mono ml-auto">{formData.loxone_id}_mood_0</code>
                </div>
                {/* Mood 1..N */}
                {moodOrder.map((sceneId, idx) => {
                  const scene = scenes.find((s) => s.id === sceneId);
                  if (!scene) return null;
                  return (
                    <div key={sceneId} className="flex items-center gap-2 text-sm bg-gray-700/40 rounded-lg px-3 py-2">
                      <span className="w-7 text-center text-xs font-mono font-bold rounded px-1 py-0.5 bg-hue-orange/20 text-hue-orange flex-shrink-0">{idx + 1}</span>
                      <Play size={14} className="text-hue-orange flex-shrink-0" />
                      <span className="text-gray-300 truncate">{scene.name}</span>
                      <code className="text-xs text-gray-500 font-mono ml-auto flex-shrink-0">{formData.loxone_id}_mood_{idx + 1}</code>
                      <div className="flex flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => moveMoodScene(idx, 'up')}
                          disabled={idx === 0}
                          className={`p-0.5 ${idx === 0 ? 'text-gray-600' : 'text-gray-400 hover:text-white'}`}
                          title="Nach oben"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMoodScene(idx, 'down')}
                          disabled={idx === moodOrder.length - 1}
                          className={`p-0.5 ${idx === moodOrder.length - 1 ? 'text-gray-600' : 'text-gray-400 hover:text-white'}`}
                          title="Nach unten"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {moodOrder.length === 0 && (
                  <p className="text-xs text-gray-500">Keine Szenen für diese Gruppe gefunden</p>
                )}
              </div>
            )}

            {/* Mood Step 4: Summary */}
            {wizardMode === 'mood' && wizardStep === 4 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Folgende Mappings werden erstellt:</p>
                {/* Parent mapping */}
                <div className="bg-gray-700/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Home size={16} className="text-hue-orange" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-white font-medium block truncate">{formData.name}</span>
                    <span className="text-xs text-gray-400">{getHueResourceName(formData.hue_id!, 'group')}</span>
                  </div>
                  <code className="text-hue-orange text-xs font-mono ml-auto flex-shrink-0">{formData.loxone_id}</code>
                </div>
                {/* Mood 0 */}
                <div className="bg-gray-700/30 rounded-lg p-2 ml-6 flex items-center gap-2 text-sm">
                  <span className="w-6 text-center text-xs font-mono font-bold bg-red-900/50 text-red-400 rounded px-1">0</span>
                  <Power size={12} className="text-red-400" />
                  <span className="text-gray-400">Alle Lichter aus</span>
                  <code className="text-[10px] text-gray-500 font-mono ml-auto">{formData.loxone_id}_mood_0</code>
                </div>
                {/* Mood 1..N */}
                {moodOrder.map((sceneId, idx) => {
                  const scene = scenes.find((s) => s.id === sceneId);
                  if (!scene) return null;
                  return (
                    <div key={sceneId} className="bg-gray-700/30 rounded-lg p-2 ml-6 flex items-center gap-2 text-sm">
                      <span className="w-6 text-center text-xs font-mono font-bold bg-hue-orange/20 text-hue-orange rounded px-1">{idx + 1}</span>
                      <Play size={12} className="text-hue-orange" />
                      <span className="text-gray-400 truncate">{scene.name}</span>
                      <code className="text-[10px] text-gray-500 font-mono ml-auto flex-shrink-0">{formData.loxone_id}_mood_{idx + 1}</code>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-500 pt-1">
                  Gesamt: {moodOrder.length + 2} Mappings (1 Gruppe + 1 Aus + {moodOrder.length} Szenen)
                </p>
              </div>
            )}

            {/* Navigation */}
            {wizardStep > 0 && (
              <div className="flex gap-2 pt-2 border-t border-gray-700">
                <button
                  type="button"
                  onClick={wizardBack}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Zurück
                </button>
                <div className="flex-1" />
                {isLastWizardStep ? (
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                  >
                    <Save size={18} />
                    Erstellen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => s + 1)}
                    disabled={!canWizardProceed()}
                    className="flex items-center gap-1 px-6 py-2 bg-hue-orange text-gray-900 rounded-lg hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Weiter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {[...topLevelMappings].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((mapping) => {
          const moodChildren = getMoodChildren(mapping.loxone_id);
          const hasMoods = moodChildren.length > 0;
          return (
          <div key={mapping.id}>
          <div
            className={`bg-gray-800 rounded-xl p-4 transition-all ${!mapping.enabled ? 'opacity-50' : ''} ${hasMoods ? 'rounded-b-none' : ''}`}
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
                          {s.groupName ? `${s.groupName} - ${s.name}` : s.name}
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
                  <Tooltip content="Abbrechen" position="top">
                    <button
                      type="button"
                      aria-label="Abbrechen"
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                    >
                      <X size={18} />
                    </button>
                  </Tooltip>
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
                      <h3 className="font-medium text-white flex items-center gap-2">
                        {mapping.name}
                        {hasMoods && (
                          <span className="text-[10px] bg-hue-orange/20 text-hue-orange px-1.5 py-0.5 rounded-full font-normal">
                            {moodChildren.length} Moods
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {mapping.loxone_id} →{' '}
                        {onNavigateToHueElement ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToHueElement(mapping.hue_id, mapping.hue_type)}
                            className="text-hue-orange hover:underline"
                          >
                            {getHueResourceName(mapping.hue_id, mapping.hue_type)}
                          </button>
                        ) : (
                          getHueResourceName(mapping.hue_id, mapping.hue_type)
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        Typ: {getTypeLabel(mapping.hue_type)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip content="Loxone Config" position="bottom">
                      <button
                        type="button"
                        aria-label="Loxone Konfiguration anzeigen"
                        onClick={() => setExpandedGuide(expandedGuide === mapping.id ? null : mapping.id)}
                        className={`p-2 transition-colors ${expandedGuide === mapping.id ? 'text-hue-orange' : 'text-gray-400 hover:text-white'}`}
                      >
                        <Terminal size={18} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Bearbeiten" position="bottom">
                      <button
                        type="button"
                        aria-label="Bearbeiten"
                        onClick={() => startEdit(mapping)}
                        className="p-2 text-gray-400 hover:text-white"
                      >
                        <Edit2 size={18} />
                      </button>
                    </Tooltip>
                    <Tooltip content={hasMoods ? 'Gruppe löschen' : 'Löschen'} position="bottom">
                      <button
                        type="button"
                        aria-label="Löschen"
                        onClick={() => hasMoods ? handleDeleteGroup(mapping) : handleDelete(mapping.id)}
                        className="p-2 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    </Tooltip>
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
                        <h4 className="text-sm font-medium text-white">Befehle</h4>
                        <span className="text-xs text-gray-500">(Loxone Virtueller Ausgang Befehl)</span>
                      </div>
                      <div className="space-y-2">
                        {getTestUrls(mapping).map((test, idx) => (
                          <div key={idx} className="bg-gray-900 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">{test.label}</span>
                              <div className="flex gap-2">
                                <CopyButton text={test.url} fieldId={`${mapping.id}-test-${idx}`} />
                                <Tooltip content="Im Browser testen" position="top">
                                  <a
                                    href={test.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded bg-green-700 text-white hover:bg-green-600 transition-colors flex items-center gap-1 text-xs"
                                  >
                                    <ExternalLink size={12} />
                                    <span>Testen</span>
                                  </a>
                                </Tooltip>
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
          {/* Mood children - indented under parent */}
          {hasMoods && (
            <div className="bg-gray-800/60 rounded-b-xl border-t border-gray-700 px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Play size={14} className="text-hue-orange" />
                <span className="text-xs font-medium text-gray-400">Mood-Szenen ({moodChildren.length})</span>
              </div>
              {moodChildren.map((mood) => {
                const moodNum = getMoodNumber(mood.loxone_id);
                const isOff = moodNum === 0;
                const sceneMoods = moodChildren.filter((m) => getMoodNumber(m.loxone_id) > 0);
                const sceneIdx = sceneMoods.indexOf(mood);
                return (
                  <div key={mood.id} className="flex items-center gap-2 text-sm bg-gray-700/40 rounded-lg px-3 py-2">
                    <span className={`w-7 text-center text-xs font-mono font-bold rounded px-1 py-0.5 flex-shrink-0 ${isOff ? 'bg-red-900/50 text-red-400' : 'bg-hue-orange/20 text-hue-orange'}`}>
                      {moodNum}
                    </span>
                    {isOff ? (
                      <Power size={14} className="text-red-400 flex-shrink-0" />
                    ) : (
                      <Play size={14} className="text-hue-orange flex-shrink-0" />
                    )}
                    <span className="text-gray-300 truncate">
                      {isOff ? 'Alle Lichter aus' : (
                        onNavigateToHueElement ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToHueElement(mood.hue_id, mood.hue_type)}
                            className="text-hue-orange hover:underline"
                          >
                            {getHueResourceName(mood.hue_id, mood.hue_type)}
                          </button>
                        ) : getHueResourceName(mood.hue_id, mood.hue_type)
                      )}
                    </span>
                    <code className="text-[10px] text-gray-500 font-mono ml-auto flex-shrink-0">
                      {mood.loxone_id}
                    </code>
                    {!isOff && (
                      <div className="flex flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => sceneIdx > 0 && handleSwapMoods(mood, sceneMoods[sceneIdx - 1])}
                          disabled={sceneIdx <= 0}
                          className={`p-0.5 ${sceneIdx <= 0 ? 'text-gray-600' : 'text-gray-400 hover:text-white'}`}
                          title="Nach oben"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => sceneIdx < sceneMoods.length - 1 && handleSwapMoods(mood, sceneMoods[sceneIdx + 1])}
                          disabled={sceneIdx >= sceneMoods.length - 1}
                          className={`p-0.5 ${sceneIdx >= sceneMoods.length - 1 ? 'text-gray-600' : 'text-gray-400 hover:text-white'}`}
                          title="Nach unten"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
          );
        })}

        {mappings.length === 0 && !wizardOpen && (
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
