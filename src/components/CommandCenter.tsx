import React, { useState, useMemo } from 'react';
import { Search, Terminal, ArrowRight, X } from 'lucide-react';
import { useApp, ActiveNavTab } from '../AppContext';
import { Role } from '../types';

export const CommandCenter: React.FC = () => {
  const {
    commandCenterOpen,
    setCommandCenterOpen,
    projects,
    setActiveProjectId,
    setActiveNav,
    switchRole,
  } = useApp();
  const [query, setQuery] = useState('');

  const commands = useMemo(() => {
    const navItems: Array<{
      id: string;
      category: string;
      label: string;
      detail: string;
      action: () => void;
    }> = [
      {
        id: 'cmd-nav-dashboard',
        category: 'Workspace',
        label: 'Open Psychrometric & Loss Command Dashboard',
        detail: 'View active loss files, GPP drying curves, and moisture matrix',
        action: () => setActiveNav('dashboard'),
      },
      {
        id: 'cmd-nav-intake',
        category: 'Intake & Geocoding',
        label: 'New Client Loss Intake & GPS-to-Address Converter',
        detail: 'Reverse-geocode Lat/Lng coordinates & initialize S500 dossier',
        action: () => setActiveNav('intake'),
      },
      {
        id: 'cmd-nav-floorplan',
        category: 'Spatial Telemetry',
        label: 'Open Interactive 2D Floorplan & AR LiDAR Room Scanner',
        detail: 'Drop moisture pins, long-press context menu, and synthesize SVG chambers',
        action: () => setActiveNav('floorplan'),
      },
      {
        id: 'cmd-nav-dispatch',
        category: 'Fleet Operations',
        label: 'Open Crew Dispatch Command Center',
        detail: 'Assign field units, SLA priorities, and view Field Map',
        action: () => setActiveNav('dispatch'),
      },
      {
        id: 'cmd-nav-equipment',
        category: 'IICRC S500 Sizing',
        label: 'Open Equipment Manager & S500 AHAM / 6 ACH Calculator',
        detail: 'Calculate LGR Dehumidifiers, Air Movers, HEPA AFDs & 15A circuit load',
        action: () => setActiveNav('equipment'),
      },
      {
        id: 'cmd-nav-checklist',
        category: 'Compliance',
        label: 'Open 7-Phase Adaptive S500 / S520 Mitigation Checklist',
        detail: 'Track CAT 1–3 and Class 1–4 mandatory field protocols',
        action: () => setActiveNav('checklist'),
      },
      {
        id: 'cmd-nav-docs',
        category: 'Dossier & PDF',
        label: 'Open Project Documentation Center, Signature Pad & IICRC PDF Generator',
        detail: 'Capture SHA-256 digital authorizations and export 6-section PDF report',
        action: () => setActiveNav('documentation'),
      },
      {
        id: 'cmd-nav-ai',
        category: 'Hybrid AI',
        label: 'Open Restoration-AI Field Assistant & Claude 3.7 Report Pipeline',
        detail: 'Parse voice/text telemetry notes and generate carrier reports',
        action: () => setActiveNav('ai-assistant'),
      },
    ];

    const projectCommands = projects.map((p) => ({
      id: `cmd-proj-${p.id}`,
      category: 'Loss Dossier',
      label: `Switch Active Dossier: ${p.lossNumber} — ${p.clientName}`,
      detail: `${p.waterCategory} · ${p.lossClass} · ${p.lossAddress}`,
      action: () => {
        setActiveProjectId(p.id);
        setActiveNav('dashboard' as ActiveNavTab);
      },
    }));

    const roleCommands: Array<{
      id: string;
      category: string;
      label: string;
      detail: string;
      action: () => void;
    }> = (['SuperAdmin', 'CompanyAdmin', 'Technician'] as Role[]).map((r) => ({
      id: `cmd-role-${r}`,
      category: 'RBAC Simulation',
      label: `Switch Active Role to ${r}`,
      detail: `Test multi-tenant permission boundaries for ${r}`,
      action: () => switchRole(r),
    }));

    const all = [...navItems, ...projectCommands, ...roleCommands];
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q)
    );
  }, [projects, query, setActiveNav, setActiveProjectId, switchRole]);

  if (!commandCenterOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Restoration-AI Command Center"
    >
      <div className="w-full max-w-2xl rounded-2xl obsidian-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, loss number (LOSS-2026-8841), S500 tool, or RBAC role..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setCommandCenterOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded"
            aria-label="Close Command Center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
          {commands.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => {
                cmd.action();
                setCommandCenterOpen(false);
              }}
              className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-xs font-mono text-cyan-400">{cmd.category}</div>
                <div className="text-sm font-medium text-white truncate">{cmd.label}</div>
                <div className="text-xs text-slate-400 truncate">{cmd.detail}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
