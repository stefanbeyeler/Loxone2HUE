import { useState, useEffect, useCallback } from 'react';
import { Light, Group, Scene, StatusMessage } from '../types';
import * as api from '../services/api';
import { useWebSocket } from './useWebSocket';

export function useHueDevices() {
  const [lights, setLights] = useState<Light[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleMessage = useCallback((message: StatusMessage) => {
    if (message.type === 'status') {
      setLights((prev) =>
        prev.map((light) =>
          light.id === message.device
            ? { ...light, state: { ...light.state, ...message.state } }
            : light
        )
      );
    }
  }, []);

  const { isConnected, sendCommand } = useWebSocket({ onMessage: handleMessage });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [devicesRes, groupsRes, scenesRes] = await Promise.all([
        api.getDevices(),
        api.getGroups(),
        api.getScenes(),
      ]);

      setLights(devicesRes.devices || []);
      setGroups(groupsRes.groups || []);
      setScenes(scenesRes.scenes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setLightState = useCallback(
    async (id: string, on?: boolean, brightness?: number) => {
      try {
        await api.setDevice(id, { on, brightness });
        // Optimistic update
        setLights((prev) =>
          prev.map((light) =>
            light.id === id
              ? {
                  ...light,
                  state: {
                    ...light.state,
                    ...(on !== undefined && { on }),
                    ...(brightness !== undefined && { brightness }),
                  },
                }
              : light
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update light');
      }
    },
    []
  );

  const setGroupState = useCallback(
    async (id: string, on?: boolean, brightness?: number) => {
      try {
        // Optimistic update for group state
        setGroups((prev) =>
          prev.map((group) =>
            group.id === id
              ? {
                  ...group,
                  state: {
                    ...group.state,
                    ...(on !== undefined && { any_on: on, all_on: on }),
                  },
                }
              : group
          )
        );

        await api.setGroup(id, { on, brightness });

        // Refresh data after a short delay to get actual state
        setTimeout(() => fetchData(), 1000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update group');
        // Revert on error
        fetchData();
      }
    },
    [fetchData]
  );

  const activateScene = useCallback(async (id: string) => {
    try {
      await api.activateScene(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate scene');
    }
  }, []);

  return {
    lights,
    groups,
    scenes,
    loading,
    error,
    isConnected,
    refresh: fetchData,
    setLightState,
    setGroupState,
    activateScene,
    sendCommand,
  };
}
