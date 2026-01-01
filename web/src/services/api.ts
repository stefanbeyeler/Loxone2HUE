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

// Health check
export async function getHealth(): Promise<{ status: string; hue_configured: boolean }> {
  return fetchJSON(`${API_BASE}/health`);
}
