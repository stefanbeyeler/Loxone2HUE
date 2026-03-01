import { Radio } from 'lucide-react';
import type { Capabilities } from '../types';

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
}

export function getUdpProperties(loxoneId: string, capabilities: Capabilities): UdpProperty[] {
  const props: UdpProperty[] = [
    { pattern: `${loxoneId}/on:\\v`, label: 'Ein/Aus', range: '0 | 1' },
  ];
  if (capabilities.supports_dimming) {
    props.push({ pattern: `${loxoneId}/bri:\\v`, label: 'Helligkeit', range: '0–100' });
  }
  if (capabilities.supports_color_temp) {
    props.push({ pattern: `${loxoneId}/ct:\\v`, label: 'Farbtemperatur (Mirek)', range: '153–500' });
  }
  if (capabilities.supports_color) {
    props.push({ pattern: `${loxoneId}/color_x:\\v`, label: 'Farbe X', range: '0–1' });
    props.push({ pattern: `${loxoneId}/color_y:\\v`, label: 'Farbe Y', range: '0–1' });
  }
  return props;
}

export function getGroupUdpProperties(loxoneId: string): UdpProperty[] {
  return [
    { pattern: `${loxoneId}/on:\\v`, label: 'Ein/Aus', range: '0 | 1' },
    { pattern: `${loxoneId}/bri:\\v`, label: 'Helligkeit', range: '0–100' },
    { pattern: `${loxoneId}/ct:\\v`, label: 'Farbtemperatur (Mirek)', range: '153–500' },
    { pattern: `${loxoneId}/color_x:\\v`, label: 'Farbe X', range: '0–1' },
    { pattern: `${loxoneId}/color_y:\\v`, label: 'Farbe Y', range: '0–1' },
  ];
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
            </tr>
          </thead>
          <tbody>
            {properties.map((prop) => (
              <tr key={prop.pattern} className="border-b border-gray-800/50 last:border-0">
                <td className="px-3 py-1.5 font-mono text-green-400">{prop.pattern}</td>
                <td className="px-3 py-1.5 text-gray-300">{prop.label}</td>
                <td className="px-3 py-1.5 text-gray-500">{prop.range}</td>
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
