import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { AssetSyncState, SyncQueueItem } from '../types';
import { eventBus } from './EventBus';
import { indexedDbStorage } from './indexedDbStorage';

type SyncListener = (snapshot: {
  isOnline: boolean;
  isSyncing: boolean;
  pendingItems: SyncQueueItem[];
  assetStatuses: Record<string, AssetSyncState>;
  lastSyncedAt: string | null;
}) => void;

class BackgroundSyncService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private simulatedOffline: boolean = false;
  private isSyncing: boolean = false;
  private pendingItems: SyncQueueItem[] = [];
  private assetStatuses: Record<string, AssetSyncState> = {};
  private lastSyncedAt: string | null = new Date().toISOString();
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        if (!this.simulatedOffline) {
          eventBus.publish({
            source: 'SyncService',
            type: 'network.online',
            severity: 'nominal',
            title: 'Telemetry Link Restored',
            message: 'Replaying queued IndexedDB mutations to Firestore in FIFO order.',
          });
          void this.flushQueue();
        }
        this.notify();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        eventBus.publish({
          source: 'SyncService',
          type: 'network.offline',
          severity: 'warning',
          title: 'Offline Field Mode Active',
          message: 'Mutations are persisted locally in RestorationAIOfflineDB.',
        });
        this.notify();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.effectiveOnline) {
          void this.flushQueue();
        }
      });

      void this.hydrateQueue();
    }
  }

  public get effectiveOnline(): boolean {
    return this.isOnline && !this.simulatedOffline;
  }

  public setSimulatedOffline(offline: boolean): void {
    this.simulatedOffline = offline;
    if (offline) {
      eventBus.publish({
        source: 'SyncService',
        type: 'network.simulated_offline',
        severity: 'warning',
        title: 'Offline Queue Mode Engaged',
        message: 'Field mutations will queue in IndexedDB until connectivity resumes.',
      });
    } else {
      eventBus.publish({
        source: 'SyncService',
        type: 'network.simulated_online',
        severity: 'nominal',
        title: 'Online Sync Resumed',
        message: 'Flushing queued IndexedDB records to Firestore.',
      });
      void this.flushQueue();
    }
    this.notify();
  }

  public isSimulatedOffline(): boolean {
    return this.simulatedOffline;
  }

  private async hydrateQueue(): Promise<void> {
    const items = await indexedDbStorage.getSyncQueue();
    this.pendingItems = [...items].reverse().sort((a, b) => a.queuedAt - b.queuedAt);
    for (const item of this.pendingItems) {
      this.assetStatuses[item.entityId] =
        item.status === 'failed' ? 'Sync Retry' : 'Queued in IDB';
    }
    this.notify();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener({
      isOnline: this.effectiveOnline,
      isSyncing: this.isSyncing,
      pendingItems: this.pendingItems,
      assetStatuses: this.assetStatuses,
      lastSyncedAt: this.lastSyncedAt,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = {
      isOnline: this.effectiveOnline,
      isSyncing: this.isSyncing,
      pendingItems: [...this.pendingItems],
      assetStatuses: { ...this.assetStatuses },
      lastSyncedAt: this.lastSyncedAt,
    };
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  public getAssetStatus(entityId: string): AssetSyncState {
    return this.assetStatuses[entityId] || 'Synced';
  }

  public async queueOrSyncMutation(params: {
    entityType: SyncQueueItem['entityType'];
    entityId: string;
    projectId: string;
    action: SyncQueueItem['action'];
    payload: Record<string, unknown>;
  }): Promise<void> {
    const item: SyncQueueItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      entityType: params.entityType,
      entityId: params.entityId,
      projectId: params.projectId,
      action: params.action,
      payload: params.payload,
      queuedAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await indexedDbStorage.enqueueSyncItem(item);
    const allItems = await indexedDbStorage.getSyncQueue();
    this.pendingItems = [...allItems].reverse().sort((a, b) => a.queuedAt - b.queuedAt);
    this.assetStatuses[params.entityId] = 'Queued in IDB';
    this.notify();

    if (this.effectiveOnline) {
      await this.flushQueue();
    }
  }

  public async flushQueue(): Promise<void> {
    if (this.isSyncing || !this.effectiveOnline) return;

    const rawItems = await indexedDbStorage.getSyncQueue();
    const pendingItems = [...rawItems].reverse().sort((a, b) => a.queuedAt - b.queuedAt);
    if (pendingItems.length === 0) {
      this.pendingItems = [];
      this.notify();
      return;
    }

    this.isSyncing = true;
    for (const item of pendingItems) {
      this.assetStatuses[item.entityId] = 'Syncing';
    }
    this.notify();

    for (const item of pendingItems) {
      try {
        await this.replayItemToFirestore(item);
        await indexedDbStorage.removeSyncItem(item.id);
        this.assetStatuses[item.entityId] = 'Synced';
      } catch (err) {
        item.retryCount += 1;
        item.status = 'failed';
        item.lastError = err instanceof Error ? err.message : String(err);
        await indexedDbStorage.updateSyncItem(item);
        this.assetStatuses[item.entityId] = 'Sync Retry';
      }
    }

    const remaining = await indexedDbStorage.getSyncQueue();
    this.pendingItems = [...remaining].reverse().sort((a, b) => a.queuedAt - b.queuedAt);
    this.isSyncing = false;
    this.lastSyncedAt = new Date().toISOString();
    this.notify();
  }

  private async replayItemToFirestore(item: SyncQueueItem): Promise<void> {
    const currentUser = auth.currentUser;
    // When running in demo mode without authenticated Firebase session, simulate immediate commit after brief telemetry sync
    if (!currentUser || !currentUser.emailVerified) {
      await new Promise((r) => setTimeout(r, 120));
      return;
    }

    const uid = currentUser.uid;
    if (item.entityType === 'project') {
      const path = `projects/${item.entityId}`;
      try {
        await setDoc(doc(db, 'projects', item.entityId), {
          id: String(item.payload.id || item.entityId).slice(0, 128),
          ownerId: uid,
          companyId: String(item.payload.companyId || 'comp_obsidian_01').slice(0, 64),
          clientName: String(item.payload.clientName || 'Client').slice(0, 160),
          lossAddress: String(item.payload.lossAddress || 'Address').slice(0, 300),
          latitude: Number(item.payload.latitude ?? 30.2672),
          longitude: Number(item.payload.longitude ?? -97.7431),
          granularity: String(item.payload.granularity || 'ROOFTOP'),
          waterCategory: String(item.payload.waterCategory || 'CAT_2'),
          lossClass: String(item.payload.lossClass || 'CLASS_2'),
          stage: String(item.payload.stage || 'Inspection'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else if (item.entityType === 'reading') {
      const path = `projects/${item.projectId}/readings/${item.entityId}`;
      try {
        await setDoc(doc(db, 'projects', item.projectId, 'readings', item.entityId), {
          id: String(item.entityId).slice(0, 128),
          projectId: String(item.projectId).slice(0, 128),
          ownerId: uid,
          roomName: String(item.payload.roomName || 'Main Area').slice(0, 100),
          tempF: Number(item.payload.tempF ?? 72),
          rhPercent: Number(item.payload.rhPercent ?? 50),
          gpp: Number(item.payload.gpp ?? 58),
          mcPercent: Number(item.payload.mcPercent ?? 18),
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else if (item.entityType === 'equipment') {
      const path = `projects/${item.projectId}/equipment/${item.entityId}`;
      try {
        await setDoc(doc(db, 'projects', item.projectId, 'equipment', item.entityId), {
          id: String(item.entityId).slice(0, 128),
          projectId: String(item.projectId).slice(0, 128),
          ownerId: uid,
          type: String(item.payload.type || 'LGR_DEHU'),
          serialNumber: String(item.payload.serialNumber || 'SN-100').slice(0, 64),
          roomName: String(item.payload.roomName || 'Main Area').slice(0, 100),
          ampDraw: Number(item.payload.ampDraw ?? 8.0),
          dailyRate: Number(item.payload.dailyRate ?? 140),
          runtimeHours: Number(item.payload.runtimeHours ?? 24),
          status: String(item.payload.status || 'Running'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else if (item.entityType === 'dispatch') {
      const path = `field_units/${item.entityId}`;
      try {
        await setDoc(doc(db, 'field_units', item.entityId), {
          id: String(item.entityId).slice(0, 128),
          ownerId: uid,
          companyId: String(item.payload.companyId || 'comp_obsidian_01').slice(0, 64),
          callsign: String(item.payload.callsign || 'UNIT-01').slice(0, 64),
          leadTech: String(item.payload.leadTech || 'Technician').slice(0, 100),
          vehicle: String(item.payload.vehicle || 'Sprinter').slice(0, 100),
          status: String(item.payload.status || 'Dispatched'),
          activeProjectId: String(item.payload.activeProjectId || '').slice(0, 128),
          directive: String(item.payload.directive || '').slice(0, 500),
          slaPriority: String(item.payload.slaPriority || 'Emergency 60m'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  }
}

export const syncService = new BackgroundSyncService();
