import { Light, Group, Scene, Mapping, BridgeInfo, DeviceCommand } from '../types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Bridge endpoints
export async function getBridge(): Promise<{ configured: boolean; info?: unknown }> {
  return fetchJSON(`${API_BASE}/bridge`);
}

export async function discoverBridges(): Promise<{ bridges: BridgeInfo[] }> {
  return fetchJSON(`${API_BASE}/bridge/discover`);
}

export async function pairBridge(bridgeIP: string): Promise<{ success: boolean; application_key: string }> {
  return fetchJSON(`${API_BASE}/bridge/pair`, {
    method: 'POST',
    body: JSON.stringify({ bridge_ip: bridgeIP }),
  });
}

// Device endpoints
export async function getDevices(): Promise<{ devices: Light[] }> {
  return fetchJSON(`${API_BASE}/devices`);
}

export async function getDevice(id: string): Promise<Light> {
  return fetchJSON(`${API_BASE}/devices/${id}`);
}

export async function setDevice(id: string, command: DeviceCommand): Promise<void> {
  await fetchJSON(`${API_BASE}/devices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(command),
  });
}

// Group endpoints
export async function getGroups(): Promise<{ groups: Group[] }> {
  return fetchJSON(`${API_BASE}/groups`);
}

export async function setGroup(id: string, command: DeviceCommand): Promise<void> {
  await fetchJSON(`${API_BASE}/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(command),
  });
}

// Scene endpoints
export async function getScenes(): Promise<{ scenes: Scene[] }> {
  return fetchJSON(`${API_BASE}/scenes`);
}

export async function activateScene(id: string): Promise<void> {
  await fetchJSON(`${API_BASE}/scenes/${id}/activate`, {
    method: 'POST',
  });
}

// Mapping endpoints
export async function getMappings(): Promise<{ mappings: Mapping[] }> {
  return fetchJSON(`${API_BASE}/mappings`);
}

export async function createMapping(mapping: Omit<Mapping, 'id'>): Promise<Mapping> {
  return fetchJSON(`${API_BASE}/mappings`, {
    method: 'POST',
    body: JSON.stringify(mapping),
  });
}

export async function updateMapping(id: string, mapping: Partial<Mapping>): Promise<Mapping> {
  return fetchJSON(`${API_BASE}/mappings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(mapping),
  });
}

export async function deleteMapping(id: string): Promise<void> {
  await fetchJSON(`${API_BASE}/mappings/${id}`, {
    method: 'DELETE',
  });
}

// Backup types
export interface MappingsBackup {
  version: string;
  created_at: string;
  mappings: Mapping[];
}

export interface ImportResult {
  status: string;
  imported: number;
  updated: number;
  skipped: number;
  total: number;
}

// Export mappings - triggers file download
export async function exportMappings(): Promise<MappingsBackup> {
  return fetchJSON(`${API_BASE}/mappings/export`);
}

// Import mappings
export async function importMappings(
  backup: MappingsBackup,
  mode: 'replace' | 'merge'
): Promise<ImportResult> {
  return fetchJSON(`${API_BASE}/mappings/import`, {
    method: 'POST',
    body: JSON.stringify({ mode, backup }),
  });
}

// Config endpoint
export interface ConfigResponse {
  server: {
    host: string;
    port: number;
  };
  hue: {
    bridge_ip: string;
    configured: boolean;
  };
  loxone: {
    host: string;
    port: number;
  };
  logging: {
    level: string;
  };
}

export async function getConfig(): Promise<ConfigResponse> {
  return fetchJSON(`${API_BASE}/config`);
}

// Health check
export async function getHealth(): Promise<{ status: string; hue_configured: boolean }> {
  return fetchJSON(`${API_BASE}/health`);
}

// Bridge connection test
export interface BridgeTestResult {
  bridge_ip: string;
  dns_lookup: {
    success: boolean;
    addresses?: string[];
    error?: string;
  };
  tcp_443: {
    success: boolean;
    error?: string;
  };
  tcp_80: {
    success: boolean;
    error?: string;
  };
  https_request: {
    success: boolean;
    status_code?: number;
    error?: string;
  };
}

export async function testBridgeConnection(bridgeIP: string): Promise<BridgeTestResult> {
  return fetchJSON(`${API_BASE}/bridge/test`, {
    method: 'POST',
    body: JSON.stringify({ bridge_ip: bridgeIP }),
  });
}
