import { useState } from 'react';
import { useHueDevices } from '../hooks/useHueDevices';
import { DeviceList } from './DeviceList';
import { GroupList } from './GroupList';
import { SceneList } from './SceneList';
import { MappingConfig } from './MappingConfig';
import { LoxoneGuide } from './LoxoneGuide';
import {
  Lightbulb,
  Home,
  Palette,
  Link2,
  BookOpen,
  Code2,
  RefreshCw,
  Wifi,
  WifiOff,
  Menu,
  X,
  Layers,
} from 'lucide-react';

type Tab = 'devices' | 'rooms' | 'zones' | 'scenes' | 'mappings' | 'guide' | 'api';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('devices');
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    lights,
    groups,
    scenes,
    loading,
    error,
    isConnected,
    refresh,
    setLightState,
    setGroupState,
    activateScene,
  } = useHueDevices();

  const handleLightToggle = (id: string, on: boolean) => {
    setLightState(id, on);
  };

  const handleLightBrightness = (id: string, brightness: number) => {
    setLightState(id, undefined, brightness);
  };

  const handleGroupToggle = (id: string, on: boolean) => {
    setGroupState(id, on);
  };

  // Separate rooms and zones
  const rooms = groups.filter((g) => g.type === 'room');
  const zones = groups.filter((g) => g.type === 'zone');

  const tabs = [
    { id: 'devices' as Tab, label: 'Geräte', icon: Lightbulb, count: lights.length },
    { id: 'rooms' as Tab, label: 'Räume', icon: Home, count: rooms.length },
    { id: 'zones' as Tab, label: 'Zonen', icon: Layers, count: zones.length },
    { id: 'scenes' as Tab, label: 'Szenen', icon: Palette, count: scenes.length },
    { id: 'mappings' as Tab, label: 'Mappings', icon: Link2 },
    { id: 'guide' as Tab, label: 'Anleitung', icon: BookOpen },
    { id: 'api' as Tab, label: 'API', icon: Code2 },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-hue-orange rounded-lg flex items-center justify-center">
                <Lightbulb size={24} className="text-gray-900" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Loxone2HUE</h1>
                <p className="text-xs text-gray-400">Gateway Service</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="hidden sm:flex items-center gap-2">
                {isConnected ? (
                  <Wifi size={18} className="text-green-500" />
                ) : (
                  <WifiOff size={18} className="text-red-500" />
                )}
                <span className="text-sm text-gray-400">
                  {isConnected ? 'Verbunden' : 'Getrennt'}
                </span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={refresh}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="sm:hidden p-2 text-gray-400"
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex gap-1 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                  ${activeTab === tab.id
                    ? 'bg-hue-orange text-gray-900'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }
                `}
              >
                <tab.icon size={18} />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${activeTab === tab.id ? 'bg-gray-900/20' : 'bg-gray-700'}
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Mobile Navigation */}
          {menuOpen && (
            <nav className="sm:hidden flex flex-col gap-1 mt-4 pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMenuOpen(false);
                  }}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${activeTab === tab.id
                      ? 'bg-hue-orange text-gray-900'
                      : 'text-gray-400 hover:bg-gray-700'
                    }
                  `}
                >
                  <tab.icon size={20} />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full ml-auto">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/30 border-b border-red-500 px-4 py-3">
          <div className="max-w-6xl mx-auto">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'devices' && (
          <DeviceList
            devices={lights}
            loading={loading}
            onToggle={handleLightToggle}
            onBrightness={handleLightBrightness}
            onRefresh={refresh}
          />
        )}

        {activeTab === 'rooms' && (
          <GroupList
            groups={rooms}
            scenes={scenes}
            onToggle={handleGroupToggle}
            onActivateScene={activateScene}
            title="Räume"
          />
        )}

        {activeTab === 'zones' && (
          <GroupList
            groups={zones}
            scenes={scenes}
            onToggle={handleGroupToggle}
            onActivateScene={activateScene}
            title="Zonen"
          />
        )}

        {activeTab === 'scenes' && (
          <SceneList
            scenes={scenes}
            groups={groups}
            onActivateScene={activateScene}
          />
        )}

        {activeTab === 'mappings' && (
          <MappingConfig lights={lights} groups={groups} scenes={scenes} />
        )}

        {activeTab === 'guide' && <LoxoneGuide />}

        {activeTab === 'api' && (
          <div className="bg-gray-800 rounded-xl overflow-hidden h-[calc(100vh-220px)]">
            <iframe
              src="/api/swagger"
              title="API Dokumentation"
              className="w-full h-full border-0 min-h-[600px]"
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-gray-500">
          Loxone2HUE Gateway &bull; {lights.length} Geräte &bull; {rooms.length} Räume &bull; {zones.length} Zonen
        </div>
      </footer>
    </div>
  );
}
