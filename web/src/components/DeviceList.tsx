import { Light } from '../types';
import { DeviceCard } from './DeviceCard';
import { Lightbulb, RefreshCw } from 'lucide-react';

interface DeviceListProps {
  devices: Light[];
  loading: boolean;
  onToggle: (id: string, on: boolean) => void;
  onBrightness: (id: string, brightness: number) => void;
  onRefresh: () => void;
}

export function DeviceList({
  devices,
  loading,
  onToggle,
  onBrightness,
  onRefresh,
}: DeviceListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin text-hue-orange" size={32} />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="mx-auto text-gray-600 mb-4" size={48} />
        <p className="text-gray-400">Keine Geräte gefunden</p>
        <button
          onClick={onRefresh}
          className="mt-4 text-hue-orange hover:underline"
        >
          Erneut suchen
        </button>
      </div>
    );
  }

  const sortedDevices = [...devices].sort((a, b) =>
    a.name.localeCompare(b.name, 'de')
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedDevices.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          onToggle={onToggle}
          onBrightness={onBrightness}
        />
      ))}
    </div>
  );
}
