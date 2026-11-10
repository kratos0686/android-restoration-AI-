import React, { useState } from 'react';
import { RefreshCw, Wifi, WifiOff, Database, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useAssetSyncStatus } from '../hooks/useAssetSyncStatus';
import { AssetSyncState } from '../types';

export const AssetCardSyncBadge: React.FC<{
  entityId: string;
  overrideState?: AssetSyncState;
}> = ({ entityId, overrideState }) => {
  const { getBadgeStatus } = useAssetSyncStatus();
  const state = overrideState || getBadgeStatus(entityId);

  if (state === 'Synced') {
    return (
      <span
        data-testid={`sync-badge-${entityId}`}
        className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-emerald-400 whitespace-nowrap shrink-0"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Synced</span>
      </span>
    );
  }

  if (state === 'Syncing') {
    return (
      <span
        data-testid={`sync-badge-${entityId}`}
        className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-cyan-400 whitespace-nowrap shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
        <span>Syncing</span>
      </span>
    );
  }

  if (state === 'Sync Retry') {
    return (
      <span
        data-testid={`sync-badge-${entityId}`}
        className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-rose-400 whitespace-nowrap shrink-0"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>Sync Retry</span>
      </span>
    );
  }

  return (
    <span
      data-testid={`sync-badge-${entityId}`}
      className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-amber-400 whitespace-nowrap shrink-0"
    >
      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Queued in IDB</span>
    </span>
  );
};

export const AssetSyncStatusIndicator: React.FC<{
  contextLabel?: string;
  compact?: boolean;
}> = ({ contextLabel = 'Firestore / IDB Telemetry', compact = false }) => {
  const {
    isOnline,
    isSyncing,
    pendingItems,
    pendingCount,
    lastSyncedAt,
    syncNow,
    toggleOfflineSimulation,
  } = useAssetSyncStatus();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="relative" data-testid="asset-sync-status-indicator">
      <div
        className={`flex items-center ${
          compact
            ? 'flex-nowrap gap-2 px-2.5 py-1 rounded-lg bg-[#0c121e] border border-white/10'
            : 'flex-wrap gap-3 px-3.5 py-2 rounded-lg obsidian-surface'
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span
            className={`font-medium text-slate-200 whitespace-nowrap ${
              compact ? 'hidden sm:inline' : ''
            }`}
          >
            {contextLabel}
          </span>
          <span
            className={`text-slate-600 ${compact ? 'hidden sm:inline' : ''}`}
            aria-hidden="true"
          >
            ·
          </span>
          <span
            className={`font-mono tabular-nums whitespace-nowrap ${
              !isOnline
                ? 'text-amber-400'
                : pendingCount > 0
                ? 'text-cyan-400'
                : 'text-emerald-400'
            }`}
          >
            {!isOnline
              ? `Offline (${pendingCount})`
              : pendingCount > 0
              ? `Syncing (${pendingCount})`
              : 'Synced'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen((prev) => !prev)}
          className="px-2 py-0.5 text-[11px] font-mono tabular-nums text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded transition-colors whitespace-nowrap shrink-0"
          aria-expanded={drawerOpen}
        >
          Queue ({pendingCount})
        </button>

        {!compact && (
          <button
            type="button"
            onClick={toggleOfflineSimulation}
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded transition-colors whitespace-nowrap shrink-0"
          >
            {isOnline ? 'Simulate Offline' : 'Go Online'}
          </button>
        )}

        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{compact ? 'Sync' : 'Sync Now'}</span>
        </button>
      </div>

      {drawerOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[92vw] rounded-xl obsidian-card p-4 shadow-2xl z-40">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-semibold text-white">
                RestorationAIOfflineDB FIFO Replay Queue
              </h4>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {pendingCount} item(s)
            </span>
          </div>

          {pendingItems.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              All field psychrometric readings, equipment logs, and dispatches are synchronized with Firestore.
              {lastSyncedAt && (
                <div className="mt-1 font-mono tabular-nums text-[11px] text-slate-500">
                  Last commit: {new Date(lastSyncedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pendingItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/90 border border-white/5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-mono tabular-nums text-cyan-300 truncate">
                      #{idx + 1} · {item.entityType.toUpperCase()} · {item.action}
                    </div>
                    <div className="font-mono tabular-nums text-[11px] text-slate-400 truncate">
                      ID: {item.entityId} · {new Date(item.queuedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-amber-400 shrink-0">
                    {item.status === 'failed' ? 'Retry' : 'Queued'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
