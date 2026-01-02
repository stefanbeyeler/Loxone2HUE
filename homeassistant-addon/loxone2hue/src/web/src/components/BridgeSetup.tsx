import { useState, useEffect } from 'react';
import { BridgeInfo } from '../types';
import * as api from '../services/api';
import { Wifi, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface BridgeSetupProps {
  onComplete: () => void;
}

export function BridgeSetup({ onComplete }: BridgeSetupProps) {
  const [bridges, setBridges] = useState<BridgeInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [selectedBridge, setSelectedBridge] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const discoverBridges = async () => {
    setSearching(true);
    setError(null);

    try {
      const response = await api.discoverBridges();
      setBridges(response.bridges || []);
      if (response.bridges?.length === 1) {
        setSelectedBridge(response.bridges[0].ip);
      }
    } catch (err) {
      setError('Bridge-Suche fehlgeschlagen');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    discoverBridges();
  }, []);

  const handlePair = async () => {
    if (!selectedBridge) return;

    setPairing(true);
    setError(null);

    try {
      await api.pairBridge(selectedBridge);
      setSuccess(true);
      setTimeout(onComplete, 2000);
    } catch (err) {
      if (err instanceof Error && err.message.includes('link button')) {
        setError('Bitte drücke den Link-Button auf der HUE Bridge und versuche es erneut');
      } else {
        setError(err instanceof Error ? err.message : 'Pairing fehlgeschlagen');
      }
    } finally {
      setPairing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-white mb-2">Verbunden!</h1>
          <p className="text-gray-400">Die HUE Bridge wurde erfolgreich verbunden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-hue-orange rounded-full flex items-center justify-center mx-auto mb-4">
            <Wifi size={40} className="text-gray-900" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">HUE Bridge verbinden</h1>
          <p className="text-gray-400">
            Verbinde den Gateway mit deiner Philips HUE Bridge
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Gefundene Bridges
            </label>
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="animate-spin text-hue-orange" size={24} />
                <span className="ml-2 text-gray-400">Suche...</span>
              </div>
            ) : bridges.length > 0 ? (
              <div className="space-y-2">
                {bridges.map((bridge) => (
                  <button
                    key={bridge.ip}
                    onClick={() => setSelectedBridge(bridge.ip)}
                    className={`
                      w-full p-4 rounded-lg text-left transition-colors
                      ${selectedBridge === bridge.ip
                        ? 'bg-hue-orange text-gray-900'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                      }
                    `}
                  >
                    <div className="font-medium">{bridge.name || 'HUE Bridge'}</div>
                    <div className="text-sm opacity-75">{bridge.ip}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Keine Bridges gefunden</p>
                <button
                  onClick={discoverBridges}
                  className="text-hue-orange hover:underline"
                >
                  Erneut suchen
                </button>
              </div>
            )}
          </div>

          <div className="text-center">
            <span className="text-gray-500">oder</span>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              IP-Adresse manuell eingeben
            </label>
            <input
              type="text"
              placeholder="192.168.1.x"
              value={selectedBridge}
              onChange={(e) => setSelectedBridge(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
            />
          </div>

          <button
            onClick={handlePair}
            disabled={!selectedBridge || pairing}
            className={`
              w-full py-3 rounded-lg font-medium transition-colors
              ${selectedBridge && !pairing
                ? 'bg-hue-orange text-gray-900 hover:bg-orange-400'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {pairing ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="animate-spin" size={18} />
                Verbinde...
              </span>
            ) : (
              'Verbinden'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Drücke vor dem Verbinden den Link-Button auf deiner HUE Bridge
          </p>
        </div>
      </div>
    </div>
  );
}
