import { Light, Group } from '../types';
import { DeviceCard } from './DeviceCard';
import { Lightbulb, RefreshCw, Home, HelpCircle } from 'lucide-react';

interface DeviceListProps {
  devices: Light[];
  groups: Group[];
  loading: boolean;
  onToggle: (id: string, on: boolean) => void;
  onBrightness: (id: string, brightness: number) => void;
  onRefresh: () => void;
}

export function DeviceList({
  devices,
  groups,
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

  // Only use rooms (not zones) for grouping
  const rooms = groups.filter((g) => g.type === 'room');

  // Create a map of device ID to room name
  const deviceToRoom = new Map<string, string>();
  rooms.forEach((room) => {
    room.lights.forEach((lightId) => {
      deviceToRoom.set(lightId, room.name);
    });
  });

  // Group devices by room
  const devicesByRoom = new Map<string, Light[]>();
  const unassignedDevices: Light[] = [];

  devices.forEach((device) => {
    const roomName = deviceToRoom.get(device.id);
    if (roomName) {
      const existing = devicesByRoom.get(roomName) || [];
      existing.push(device);
      devicesByRoom.set(roomName, existing);
    } else {
      unassignedDevices.push(device);
    }
  });

  // Sort rooms alphabetically
  const sortedRoomNames = [...devicesByRoom.keys()].sort((a, b) =>
    a.localeCompare(b, 'de')
  );

  // Sort devices within each room
  sortedRoomNames.forEach((roomName) => {
    const roomDevices = devicesByRoom.get(roomName);
    if (roomDevices) {
      roomDevices.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    }
  });

  // Sort unassigned devices
  unassignedDevices.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return (
    <div className="space-y-6">
      {sortedRoomNames.map((roomName) => {
        const roomDevices = devicesByRoom.get(roomName) || [];
        return (
          <div key={roomName}>
            <div className="flex items-center gap-2 mb-3">
              <Home size={18} className="text-hue-orange" />
              <h3 className="text-lg font-medium text-white">{roomName}</h3>
              <span className="text-xs text-gray-500">({roomDevices.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roomDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onToggle={onToggle}
                  onBrightness={onBrightness}
                />
              ))}
            </div>
          </div>
        );
      })}

      {unassignedDevices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle size={18} className="text-gray-500" />
            <h3 className="text-lg font-medium text-gray-400">Nicht zugewiesen</h3>
            <span className="text-xs text-gray-500">({unassignedDevices.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unassignedDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onToggle={onToggle}
                onBrightness={onBrightness}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
