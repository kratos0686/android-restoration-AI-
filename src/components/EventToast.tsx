import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { CloudEventMessage } from '../types';
import { eventBus } from '../services/EventBus';

export const EventToast: React.FC = () => {
  const [toasts, setToasts] = useState<CloudEventMessage[]>([]);

  useEffect(() => {
    return eventBus.subscribe((event) => {
      setToasts((prev) => [event, ...prev].slice(0, 3));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== event.id));
      }, 4500);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl obsidian-card shadow-2xl"
        >
          {toast.severity === 'hazard' ? (
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : toast.severity === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white truncate">{toast.title}</span>
              <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                {new Date(toast.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-slate-400 hover:text-white p-1"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
