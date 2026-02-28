import { useState } from 'react';
import { Lightbulb, Power, Link2, Plus } from 'lucide-react';
import { Light, Mapping } from '../types';

interface DeviceCardProps {
  device: Light;
  mapping?: Mapping;
  onToggle: (id: string, on: boolean) => void;
  onBrightness: (id: string, brightness: number) => void;
  onNavigateToMapping?: (mappingId: string) => void;
  onCreateMapping?: (prefill: { hue_id: string; hue_type: string; name: string }) => void;
}

export function DeviceCard({ device, mapping, onToggle, onBrightness, onNavigateToMapping, onCreateMapping }: DeviceCardProps) {
  const [localBrightness, setLocalBrightness] = useState(device.state.brightness);

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setLocalBrightness(value);
  };

  const handleBrightnessCommit = () => {
    onBrightness(device.id, localBrightness);
  };

  const getColorStyle = () => {
    if (!device.state.on) {
      return { backgroundColor: '#374151' };
    }

    if (device.state.color?.hex_rgb) {
      return { backgroundColor: device.state.color.hex_rgb };
    }

    // Default warm white
    const warmth = device.state.color_temp
      ? Math.min(1, (device.state.color_temp - 153) / 347)
      : 0.5;
    const r = 255;
    const g = Math.round(180 + (75 * (1 - warmth)));
    const b = Math.round(100 + (155 * (1 - warmth)));
    return { backgroundColor: `rgb(${r}, ${g}, ${b})` };
  };

  return (
    <div className={`
      bg-gray-800 rounded-xl p-4 transition-all duration-200
      ${device.state.on ? 'ring-2 ring-hue-orange' : ''}
      ${!device.state.reachable ? 'opacity-50' : ''}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={getColorStyle()}
          >
            <Lightbulb
              size={20}
              className={device.state.on ? 'text-gray-900' : 'text-gray-400'}
            />
          </div>
          <div>
            <h3 className="font-medium text-white">{device.name}</h3>
            <p className="text-xs text-gray-400">{device.product_name || device.type}</p>
            <p className="text-xs text-gray-500 font-mono">{device.id}</p>
            {mapping ? (
              <button
                onClick={(e) => { e.stopPropagation(); onNavigateToMapping?.(mapping.id); }}
                className="flex items-center gap-1 mt-0.5 hover:opacity-80 transition-opacity"
                title="Zum Mapping springen"
              >
                <Link2 size={12} className="text-hue-orange" />
                <span className="text-xs text-hue-orange">{mapping.loxone_id}</span>
              </button>
            ) : onCreateMapping && (
              <button
                onClick={(e) => { e.stopPropagation(); onCreateMapping({ hue_id: device.id, hue_type: 'light', name: device.name }); }}
                className="flex items-center gap-1 mt-0.5 text-gray-500 hover:text-hue-orange transition-colors"
                title="Mapping erstellen"
              >
                <Plus size={12} />
                <span className="text-xs">Mapping erstellen</span>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => onToggle(device.id, !device.state.on)}
          className={`
            p-2 rounded-lg transition-colors
            ${device.state.on
              ? 'bg-hue-orange text-gray-900'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }
          `}
          disabled={!device.state.reachable}
        >
          <Power size={20} />
        </button>
      </div>

      {device.capabilities.supports_dimming && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Helligkeit</span>
            <span>{Math.round(localBrightness)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={localBrightness}
            onChange={handleBrightnessChange}
            onMouseUp={handleBrightnessCommit}
            onTouchEnd={handleBrightnessCommit}
            className="w-full"
            disabled={!device.state.reachable || !device.state.on}
          />
        </div>
      )}

      {!device.state.reachable && (
        <p className="text-xs text-red-400 mt-2">Nicht erreichbar</p>
      )}
    </div>
  );
}
