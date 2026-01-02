import { useState, useEffect } from 'react';
import { BridgeInfo } from '../types';
import * as api from '../services/api';
import { Wifi, RefreshCw, CheckCircle, AlertCircle, TestTube, XCircle } from 'lucide-react';

// Version - should match config.yaml
const VERSION = '1.0.12';

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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<api.BridgeTestResult | null>(null);

  const discoverBridges = async () => {
    setSearching(true);
    setError(null);

    try {
      const response = await api.discoverBridges();
      setBridges(response.bridges || []);
      if (response.bridges?.length === 1) {
        setSelectedBridge(response.bridges[0].ip);
      }
      // Don't show error if no bridges found - user can enter IP manually
    } catch (err) {
      // mDNS discovery often fails in Docker containers - this is expected
      // User can still enter IP address manually
      console.log('Bridge discovery failed (expected in Docker):', err);
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
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Pairing error:', message);

      if (message.includes('link button') || message.includes('101')) {
        setError('Bitte drücke den Link-Button auf der HUE Bridge und versuche es erneut (innerhalb von 30 Sekunden)');
      } else if (message.includes('timeout') || message.includes('ETIMEDOUT') || message.includes('ECONNREFUSED')) {
        setError(`Verbindung zur Bridge ${selectedBridge} fehlgeschlagen. Bitte prüfe, ob die IP-Adresse korrekt ist und die Bridge erreichbar ist.`);
      } else if (message.includes('certificate') || message.includes('TLS')) {
        setError('TLS-Verbindungsfehler zur Bridge. Bitte versuche es erneut.');
      } else {
        setError(`Pairing fehlgeschlagen: ${message}`);
      }
    } finally {
      setPairing(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedBridge) return;

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await api.testBridgeConnection(selectedBridge);
      setTestResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test fehlgeschlagen';
      setError(`Verbindungstest fehlgeschlagen: ${message}`);
    } finally {
      setTesting(false);
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

          {/* Test Connection Button */}
          <button
            onClick={handleTestConnection}
            disabled={!selectedBridge || testing}
            className={`
              w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
              ${selectedBridge && !testing
                ? 'bg-gray-600 text-white hover:bg-gray-500'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {testing ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Teste Verbindung...
              </>
            ) : (
              <>
                <TestTube size={16} />
                Verbindung testen
              </>
            )}
          </button>

          {/* Test Results */}
          {testResult && (
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="font-medium text-white mb-3">Verbindungstest: {testResult.bridge_ip}</div>

              <div className="flex items-center gap-2">
                {testResult.dns_lookup?.success ? (
                  <CheckCircle className="text-green-500" size={16} />
                ) : (
                  <XCircle className="text-red-500" size={16} />
                )}
                <span className="text-gray-300">DNS Lookup</span>
                {testResult.dns_lookup?.addresses && (
                  <span className="text-gray-500 text-xs">({testResult.dns_lookup.addresses.join(', ')})</span>
                )}
                {testResult.dns_lookup?.error && (
                  <span className="text-red-400 text-xs">{testResult.dns_lookup.error}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {testResult.tcp_80?.success ? (
                  <CheckCircle className="text-green-500" size={16} />
                ) : (
                  <XCircle className="text-red-500" size={16} />
                )}
                <span className="text-gray-300">TCP Port 80</span>
                {testResult.tcp_80?.error && (
                  <span className="text-red-400 text-xs">{testResult.tcp_80.error}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {testResult.tcp_443?.success ? (
                  <CheckCircle className="text-green-500" size={16} />
                ) : (
                  <XCircle className="text-red-500" size={16} />
                )}
                <span className="text-gray-300">TCP Port 443 (HTTPS)</span>
                {testResult.tcp_443?.error && (
                  <span className="text-red-400 text-xs">{testResult.tcp_443.error}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {testResult.https_request?.success ? (
                  <CheckCircle className="text-green-500" size={16} />
                ) : (
                  <XCircle className="text-red-500" size={16} />
                )}
                <span className="text-gray-300">HUE API Erreichbar</span>
                {testResult.https_request?.status_code && (
                  <span className="text-gray-500 text-xs">(HTTP {testResult.https_request.status_code})</span>
                )}
                {testResult.https_request?.error && (
                  <span className="text-red-400 text-xs">{testResult.https_request.error}</span>
                )}
              </div>

              {/* Summary */}
              <div className="pt-2 mt-2 border-t border-gray-600">
                {testResult.dns_lookup?.success && testResult.tcp_443?.success && testResult.https_request?.success ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle size={16} />
                    <span>Bridge ist erreichbar - Pairing möglich</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={16} />
                    <span>Bridge nicht erreichbar - Netzwerk prüfen</span>
                  </div>
                )}
              </div>
            </div>
          )}

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

        {/* Version footer */}
        <div className="mt-6 text-center text-xs text-gray-600">
          Loxone2HUE Gateway v{VERSION}
        </div>
      </div>
    </div>
  );
}
