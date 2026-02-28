import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { BridgeSetup } from './components/BridgeSetup';
import * as api from './services/api';
import { RefreshCw } from 'lucide-react';

function App() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBridge();
  }, []);

  const checkBridge = async () => {
    try {
      const response = await api.getBridge();
      setConfigured(response.configured);
    } catch (error) {
      console.error('Failed to check bridge:', error);
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="animate-spin text-hue-orange" size={48} />
      </div>
    );
  }

  if (!configured) {
    return <BridgeSetup onComplete={() => setConfigured(true)} />;
  }

  return <Dashboard />;
}

export default App;
