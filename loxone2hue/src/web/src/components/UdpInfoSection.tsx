import { useState } from 'react';
import { Radio, Send, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { Capabilities } from '../types';
import { testUDP } from '../services/api';

/** Converts a HUE device name to a Loxone-safe identifier (mirrors Go sanitizeName in export.go) */
export function sanitizeName(name: string): string {
  let s = name.toLowerCase();
  s = s.replace(/[\s-]/g, '_');
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  return s.replace(/[^a-z0-9_]/g, '');
}

export interface UdpProperty {
  pattern: string;
  label: string;
  range: string;
  property: string;
}

export function getUdpProperties(loxoneId: string, capabilities: Capabilities): UdpProperty[] {
  const props: UdpProperty[] = [
    { pattern: `${loxoneId}/on:\\v`, label: 'Ein/Aus', range: '0 | 1', property: 'on' },
  ];
  if (capabilities.supports_dimming) {
    props.push({ pattern: `${loxoneId}/bri:\\v`, label: 'Helligkeit', range: '0–100', property: 'bri' });
  }
  if (capabilities.supports_color_temp) {
    props.push({ pattern: `${loxoneId}/ct:\\v`, label: 'Farbtemperatur (Mirek)', range: '153–500', property: 'ct' });
  }
  if (capabilities.supports_color) {
    props.push({ pattern: `${loxoneId}/color_x:\\v`, label: 'Farbe X', range: '0–1', property: 'color_x' });
    props.push({ pattern: `${loxoneId}/color_y:\\v`, label: 'Farbe Y', range: '0–1', property: 'color_y' });
  }
  return props;
}

export function getGroupUdpProperties(loxoneId: string): UdpProperty[] {
  return [
    { pattern: `${loxoneId}/on:\\v`, label: 'Ein/Aus', range: '0 | 1', property: 'on' },
    { pattern: `${loxoneId}/bri:\\v`, label: 'Helligkeit', range: '0–100', property: 'bri' },
    { pattern: `${loxoneId}/ct:\\v`, label: 'Farbtemperatur (Mirek)', range: '153–500', property: 'ct' },
    { pattern: `${loxoneId}/color_x:\\v`, label: 'Farbe X', range: '0–1', property: 'color_x' },
    { pattern: `${loxoneId}/color_y:\\v`, label: 'Farbe Y', range: '0–1', property: 'color_y' },
  ];
}

function validateValue(property: string, value: string): string | null {
  if (value.trim() === '') return 'Wert eingeben';
  switch (property) {
    case 'on':
      if (value !== '0' && value !== '1') return '0 oder 1';
      break;
    case 'bri': {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 100) return '0–100';
      break;
    }
    case 'ct': {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 153 || n > 500) return '153–500';
      break;
    }
    case 'color_x':
    case 'color_y': {
      const n = Number(value);
      if (isNaN(n) || n < 0 || n > 1) return '0–1';
      break;
    }
  }
  return null;
}

type RowStatus = 'idle' | 'sending' | 'sent' | 'error';

interface RowState {
  value: string;
  status: RowStatus;
  message: string;
}

function TestCell({ loxoneId, prop }: { loxoneId: string; prop: UdpProperty }) {
  const [state, setState] = useState<RowState>({ value: '', status: 'idle', message: '' });

  const handleSend = async () => {
    const err = validateValue(prop.property, state.value);
    if (err) {
      setState(s => ({ ...s, status: 'error', message: err }));
      return;
    }

    setState(s => ({ ...s, status: 'sending', message: '' }));
    try {
      const result = await testUDP(loxoneId, prop.property, state.value);
      setState(s => ({ ...s, status: 'sent', message: result.message }));
      setTimeout(() => setState(s => s.status === 'sent' ? { ...s, status: 'idle', message: '' } : s), 3000);
    } catch (e) {
      setState(s => ({ ...s, status: 'error', message: e instanceof Error ? e.message : 'Fehler' }));
    }
  };

  return (
    <td className="px-3 py-1.5">
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={state.value}
          onChange={e => setState({ value: e.target.value, status: 'idle', message: '' })}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={prop.range}
          className="w-16 px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={state.status === 'sending'}
          title="Test-UDP senden"
          className="p-0.5 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.status === 'sending' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : state.status === 'sent' ? (
            <Check size={12} className="text-green-400" />
          ) : state.status === 'error' ? (
            <AlertCircle size={12} className="text-red-400" />
          ) : (
            <Send size={12} />
          )}
        </button>
        {state.status === 'sent' && (
          <span className="text-[10px] text-green-400 truncate max-w-[120px]">{state.message}</span>
        )}
        {state.status === 'error' && (
          <span className="text-[10px] text-red-400 truncate max-w-[120px]">{state.message}</span>
        )}
      </div>
    </td>
  );
}

export function UdpInfoSection({ loxoneId, properties }: { loxoneId: string; properties: UdpProperty[] }) {
  return (
    <div className="border-t border-gray-700 pt-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Radio size={14} className="text-green-400" />
        <span className="text-sm font-medium text-green-400">UDP Status-Feedback</span>
      </div>
      <div className="text-xs text-gray-400 mb-2">
        Loxone ID: <span className="font-mono text-white">{loxoneId}</span>
      </div>

      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left px-3 py-1.5 font-medium">Check-Pattern</th>
              <th className="text-left px-3 py-1.5 font-medium">Eigenschaft</th>
              <th className="text-left px-3 py-1.5 font-medium">Werte</th>
              <th className="text-left px-3 py-1.5 font-medium">Test</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((prop) => (
              <tr key={prop.pattern} className="border-b border-gray-800/50 last:border-0">
                <td className="px-3 py-1.5 font-mono text-green-400">{prop.pattern}</td>
                <td className="px-3 py-1.5 text-gray-300">{prop.label}</td>
                <td className="px-3 py-1.5 text-gray-500">{prop.range}</td>
                <TestCell loxoneId={loxoneId} prop={prop} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 bg-blue-900/20 border border-blue-500/30 rounded-lg px-3 py-2">
        <p className="text-xs text-blue-300">
          <strong>Loxone Config:</strong> Erstelle einen <em>Virtuellen UDP Eingang</em> und
          trage das Check-Pattern als Befehlserkennung ein.
          Die Vorlage kann unter Einstellungen &gt; Loxone Config Export heruntergeladen werden.
        </p>
      </div>
    </div>
  );
}
