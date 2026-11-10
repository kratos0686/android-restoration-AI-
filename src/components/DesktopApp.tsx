import React from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  Layers,
  Truck,
  Zap,
  CheckSquare,
  FileText,
  Sparkles,
  ShieldCheck,
  Command,
  Droplets,
  UserCheck,
  LogIn,
} from 'lucide-react';
import { ActiveNavTab, useApp } from '../AppContext';
import { Role, ROLE_PERMISSIONS } from '../types';
import { DesktopDashboard } from './DesktopDashboard';
import { NewProject } from './NewProject';
import { FloorplanViewer } from './FloorplanViewer';
import { CrewDispatch } from './CrewDispatch';
import { EquipmentManager } from './EquipmentManager';
import { DigitalChecklist } from './DigitalChecklist';
import { ProjectDocumentationCenter } from './ProjectDocumentationCenter';
import { GeminiAssistant } from './GeminiAssistant';
import { AssetSyncStatusIndicator } from './AssetSyncStatusIndicator';

const NAV_ITEMS: {
  id: ActiveNavTab;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'dashboard',
    label: 'Psychrometric Overview',
    sublabel: 'GPP Curve & Field Telemetry',
    icon: LayoutDashboard,
  },
  {
    id: 'intake',
    label: 'Client Intake & GPS',
    sublabel: 'Lat/Lng Reverse Geocode',
    icon: FilePlus2,
  },
  {
    id: 'floorplan',
    label: '2D Moisture Floorplan',
    sublabel: 'Long-Press Pins & AR Scan',
    icon: Layers,
  },
  {
    id: 'dispatch',
    label: 'Crew Dispatch Center',
    sublabel: 'Live Fleet & Offline Queue',
    icon: Truck,
  },
  {
    id: 'equipment',
    label: 'S500 Equipment Sizing',
    sublabel: 'PPD, CFM & 15A Load Calc',
    icon: Zap,
  },
  {
    id: 'checklist',
    label: '7-Phase S500/S520 Log',
    sublabel: 'Adaptive Protocol Gates',
    icon: CheckSquare,
  },
  {
    id: 'documentation',
    label: 'Documentation & PDF',
    sublabel: 'Claude 3.7 Scope & Sign',
    icon: FileText,
  },
  {
    id: 'ai-assistant',
    label: 'Restoration AI Specialist',
    sublabel: 'Voice/Text Intent Parser',
    icon: Sparkles,
  },
  {
    id: 'admin',
    label: 'Multi-Tenant RBAC',
    sublabel: 'Company Isolation & Rules',
    icon: ShieldCheck,
  },
];

export const DesktopApp: React.FC = () => {
  const {
    currentUser,
    switchRole,
    signInWithGoogle,
    projects,
    activeProject,
    setActiveProjectId,
    activeNav,
    setActiveNav,
    setCommandCenterOpen,
  } = useApp();

  return (
    <div className="hidden md:flex min-h-screen w-full bg-[#090d16] text-slate-100">
      {/* Left Fixed Command Sidebar (268px) */}
      <aside className="w-[268px] shrink-0 border-r border-white/10 bg-[#0c121e]/95 backdrop-blur-xl flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-slate-50 font-display">
                  RESTORATION-AI
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                  ANSI/IICRC S500 · S520
                </div>
              </div>
            </div>
          </div>

          {/* Active Loss File Selector */}
          <div className="p-3.5 border-b border-white/10 bg-[#090d16]/50">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Active Loss Dossier ({projects.length})
            </label>
            <select
              data-testid="active-loss-file-select"
              value={activeProject.id}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="w-full rounded-lg bg-[#0c121e] border border-white/10 px-2.5 py-2 text-xs font-mono text-slate-100 focus:border-cyan-500 focus:outline-none tabular-nums"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lossNumber} · {p.waterCategory.replace('_', ' ')} ({p.stage})
                </option>
              ))}
            </select>

            <button
              onClick={() => setCommandCenterOpen(true)}
              data-testid="open-command-center-btn"
              className="mt-2.5 w-full flex items-center justify-between rounded-lg border border-white/10 bg-[#0c121e]/80 hover:border-cyan-500/40 px-3 py-1.5 text-xs text-slate-300 transition"
            >
              <span className="flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5 text-cyan-400" />
                <span>CLI Command Bar</span>
              </span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="p-2.5 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  data-testid={`nav-${item.id}`}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    isActive
                      ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 shadow-sm'
                      : 'border border-transparent text-slate-300 hover:bg-white/[0.04] hover:text-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {item.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Tenant RBAC & Auth Footer */}
        <div className="p-3.5 border-t border-white/10 bg-[#090d16]/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-100 truncate">
                {currentUser.displayName}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                Tenant: {currentUser.companyId}
              </div>
            </div>
            <button
              onClick={signInWithGoogle}
              title="Authenticate with Firebase Google Auth"
              className="p-1.5 rounded-lg border border-white/10 bg-[#0c121e] hover:border-cyan-500/40 text-cyan-300"
            >
              <LogIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              Active RBAC Role
            </label>
            <select
              data-testid="rbac-role-select"
              value={currentUser.role}
              onChange={(e) => switchRole(e.target.value as Role)}
              className="w-full rounded-lg bg-[#0c121e] border border-white/10 px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="SuperAdmin">SuperAdmin (All Capabilities)</option>
              <option value="CompanyAdmin">CompanyAdmin (Ops & Billing)</option>
              <option value="Technician">Technician (Field Telemetry)</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Telemetry & Sync Header */}
        <header className="sticky top-0 z-20 h-14 border-b border-white/10 bg-[#090d16]/90 backdrop-blur-xl px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              {NAV_ITEMS.find((n) => n.id === activeNav)?.label}
            </span>
            <span className="text-slate-700">/</span>
            <span className="text-xs font-mono text-cyan-300 truncate tabular-nums">
              {activeProject.lossNumber} — {activeProject.clientName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <AssetSyncStatusIndicator contextLabel="Telemetry Sync" compact />
            <div className="hidden lg:flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0c121e] px-2.5 py-1 text-[11px] font-mono text-slate-300">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentUser.role}</span>
            </div>
          </div>
        </header>

        {/* Active View Container */}
        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
          {activeNav === 'dashboard' && <DesktopDashboard />}
          {activeNav === 'intake' && <NewProject />}
          {activeNav === 'floorplan' && <FloorplanViewer />}
          {activeNav === 'dispatch' && <CrewDispatch />}
          {activeNav === 'equipment' && <EquipmentManager />}
          {activeNav === 'checklist' && <DigitalChecklist />}
          {activeNav === 'documentation' && <ProjectDocumentationCenter />}
          {activeNav === 'ai-assistant' && <GeminiAssistant />}
          {activeNav === 'admin' && (
            <div
              className="rounded-xl border border-white/10 bg-[#0c121e]/90 p-6 space-y-6"
              data-testid="admin-rbac-view"
            >
              <div>
                <h1 className="text-xl font-bold text-slate-50 font-display">
                  Multi-Tenant RBAC & Firestore Security Posture
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Strict tenant isolation enforced by companyId ({currentUser.companyId})
                  and role-based access control across IndexedDB and Firestore.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['SuperAdmin', 'CompanyAdmin', 'Technician'] as Role[]).map((role) => {
                  const isCurrent = currentUser.role === role;
                  return (
                    <div
                      key={role}
                      className={`rounded-xl border p-4 ${
                        isCurrent
                          ? 'border-cyan-500/50 bg-cyan-500/10'
                          : 'border-white/10 bg-[#090d16]/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-slate-100">
                          {role}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                            Active Session
                          </span>
                        )}
                      </div>
                      <ul className="mt-3 space-y-1.5 text-xs font-mono text-slate-300">
                        {ROLE_PERMISSIONS[role].map((perm) => (
                          <li key={perm} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {perm}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => switchRole(role)}
                        className="mt-4 w-full rounded-lg border border-white/10 bg-[#0c121e] hover:border-cyan-500/40 py-1.5 text-xs font-mono text-cyan-300"
                      >
                        Assume {role} Role
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
