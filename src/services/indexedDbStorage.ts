import { PlacedEquipment, Project, Reading, SyncQueueItem } from '../types';

export const DB_NAME = 'RestorationAIOfflineDB';
export const DB_VERSION = 1;

export const STORES = {
  SYNC_QUEUE: 'sync_queue',
  MITIGATION_READINGS: 'mitigation_readings',
  EQUIPMENT_LOGS: 'equipment_logs',
  PROJECT_DOSSIERS: 'project_dossiers',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

// In-memory fallback for environments without IndexedDB
const memoryStore: Record<StoreName, Record<string, unknown>> = {
  sync_queue: {},
  mitigation_readings: {},
  equipment_logs: {},
  project_dossiers: {},
};

function openOfflineDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const qStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        qStore.createIndex('queuedAt', 'queuedAt', { unique: false });
        qStore.createIndex('entityId', 'entityId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.MITIGATION_READINGS)) {
        const rStore = db.createObjectStore(STORES.MITIGATION_READINGS, { keyPath: 'id' });
        rStore.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.EQUIPMENT_LOGS)) {
        const eStore = db.createObjectStore(STORES.EQUIPMENT_LOGS, { keyPath: 'id' });
        eStore.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.PROJECT_DOSSIERS)) {
        db.createObjectStore(STORES.PROJECT_DOSSIERS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putRecord<T extends { id: string }>(storeName: StoreName, record: T): Promise<void> {
  memoryStore[storeName][record.id] = record;
  const db = await openOfflineDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllRecords<T>(storeName: StoreName): Promise<T[]> {
  const db = await openOfflineDB();
  if (!db) {
    return Object.values(memoryStore[storeName]) as T[];
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteRecord(storeName: StoreName, id: string): Promise<void> {
  delete memoryStore[storeName][id];
  const db = await openOfflineDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const indexedDbStorage = {
  async enqueueSyncItem(item: SyncQueueItem): Promise<void> {
    await putRecord(STORES.SYNC_QUEUE, item);
  },

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const items = await getAllRecords<SyncQueueItem>(STORES.SYNC_QUEUE);
    return [...items].reverse().sort((a, b) => a.queuedAt - b.queuedAt);
  },

  async removeSyncItem(id: string): Promise<void> {
    await deleteRecord(STORES.SYNC_QUEUE, id);
  },

  async updateSyncItem(item: SyncQueueItem): Promise<void> {
    await putRecord(STORES.SYNC_QUEUE, item);
  },

  async saveReadingOffline(reading: Reading): Promise<void> {
    await putRecord(STORES.MITIGATION_READINGS, reading);
  },

  async getOfflineReadings(projectId?: string): Promise<Reading[]> {
    const all = await getAllRecords<Reading>(STORES.MITIGATION_READINGS);
    return projectId ? all.filter((r) => r.projectId === projectId) : all;
  },

  async saveEquipmentLogOffline(equipment: PlacedEquipment): Promise<void> {
    await putRecord(STORES.EQUIPMENT_LOGS, equipment);
  },

  async getOfflineEquipmentLogs(projectId?: string): Promise<PlacedEquipment[]> {
    const all = await getAllRecords<PlacedEquipment>(STORES.EQUIPMENT_LOGS);
    return projectId ? all.filter((e) => e.projectId === projectId) : all;
  },

  async saveProjectDossierOffline(project: Project): Promise<void> {
    await putRecord(STORES.PROJECT_DOSSIERS, project);
  },

  async getOfflineProjectDossiers(): Promise<Project[]> {
    return getAllRecords<Project>(STORES.PROJECT_DOSSIERS);
  },
};
