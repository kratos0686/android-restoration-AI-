import { useEffect, useState, useCallback } from 'react';
import { AssetSyncState, SyncQueueItem } from '../types';
import { syncService } from '../services/SyncService';

export function useAssetSyncStatus() {
  const [state, setState] = useState<{
    isOnline: boolean;
    isSyncing: boolean;
    pendingItems: SyncQueueItem[];
    assetStatuses: Record<string, AssetSyncState>;
    lastSyncedAt: string | null;
  }>({
    isOnline: syncService.effectiveOnline,
    isSyncing: false,
    pendingItems: [],
    assetStatuses: {},
    lastSyncedAt: new Date().toISOString(),
  });

  useEffect(() => {
    return syncService.subscribe((snapshot) => {
      setState(snapshot);
    });
  }, []);

  const syncNow = useCallback(async () => {
    if (syncService.isSimulatedOffline()) {
      syncService.setSimulatedOffline(false);
    }
    await syncService.flushQueue();
  }, []);

  const toggleOfflineSimulation = useCallback(() => {
    syncService.setSimulatedOffline(!syncService.isSimulatedOffline());
  }, []);

  const getBadgeStatus = useCallback(
    (entityId: string): AssetSyncState => {
      if (state.assetStatuses[entityId]) {
        return state.assetStatuses[entityId];
      }
      if (!state.isOnline) {
        return 'Queued in IDB';
      }
      return 'Synced';
    },
    [state.assetStatuses, state.isOnline]
  );

  return {
    ...state,
    pendingCount: state.pendingItems.length,
    syncNow,
    toggleOfflineSimulation,
    getBadgeStatus,
  };
}
