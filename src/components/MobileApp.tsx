import React, { useState } from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  Layers,
  Truck,
  Zap,
  FileText,
  Lock,
  Unlock,
  Droplets,
} from 'lucide-react';
import { ActiveNavTab, useApp } from '../AppContext';
import { MobileDashboard } from './MobileDashboard';
import { NewProject } from './NewProject';
import { FloorplanViewer } from './FloorplanViewer';
import { CrewDispatch } from './CrewDispatch';
import { EquipmentManager } from './EquipmentManager';
import { ProjectDocumentationCenter } from './ProjectDocumentationCenter';
import { AssetSyncStatusIndicator } from './AssetSyncStatusIndicator';

const MOBILE_TABS: {
  id: ActiveNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Field', icon: LayoutDashboard },
  { id: 'intake', label: 'Intake', icon: FilePlus2 },
  { id: 'floorplan', label: '2D Map', icon: Layers },
  { id: 'dispatch', label: 'Dispatch', icon: Truck },
  { id: 'equipment', label: 'S500 Calc', icon: Zap },
  { id: 'documentation', label: 'Dossier', icon: FileText },
];

export const MobileApp: React.FC = () => {
  const { activeProject, activeNav, setActiveNav } = useApp();
  const [portraitLocked, setPortraitLocked] = useState<boolean>(true);

  const togglePortraitLock = async () => {
    const next = !portraitLocked;
    setPortraitLocked(next);
    try {
      const orientation = (screen as unknown as {
        orientation?: { lock?: (mode: string) => Promise<void>; unlock?: () => void };
      }).orientation;
      if (next && orientation?.lock) {
        await orientation.lock('portrait');
      } else if (!next && orientation?.unlock) {
        orientation.unlock();
      }
    } catch {
      // Orientation lock API fallback in desktop/iFrame preview
    }
  };

  return (
    <div
      className="flex md:hidden flex-col min-h-screen w-full bg-[#090d16] text-slate-100"
      data-testid="mobile-app-shell"
    >
      {/* Mobile Field Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0c121e]/95 backdrop-blur-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-950 font-bold shrink-0">
            <Droplets className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-50 truncate font-display">
              RESTORATION-AI
            </div>
            <div className="text-[10px] font-mono text-cyan-400 truncate tabular-nums">
              {activeProject.lossNumber}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AssetSyncStatusIndicator contextLabel="Field" compact />
          <button
            type="button"
            data-testid="portrait-lock-toggle"
            onClick={togglePortraitLock}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-mono transition ${
              portraitLocked
                ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                : 'border-white/10 bg-[#090d16] text-slate-400'
            }`}
          >
            {portraitLocked ? (
              <>
                <Lock className="w-3 h-3" />
                <span>Portrait</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3" />
                <span>Auto</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Main Content Area */}
      <main className="flex-1 p-3.5 overflow-x-hidden">
        {activeNav === 'dashboard' && <MobileDashboard />}
        {activeNav === 'intake' && <NewProject />}
        {activeNav === 'floorplan' && <FloorplanViewer />}
        {activeNav === 'dispatch' && <CrewDispatch />}
        {activeNav === 'equipment' && <EquipmentManager />}
        {activeNav === 'documentation' && <ProjectDocumentationCenter />}
        {activeNav !== 'dashboard' &&
          activeNav !== 'intake' &&
          activeNav !== 'floorplan' &&
          activeNav !== 'dispatch' &&
          activeNav !== 'equipment' &&
          activeNav !== 'documentation' && <MobileDashboard />}
      </main>

      {/* Fixed Bottom Technician Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-[#0c121e]/95 backdrop-blur-xl px-1.5 py-1.5 grid grid-cols-6 gap-1">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeNav === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`mobile-nav-${tab.id}`}
              onClick={() => setActiveNav(tab.id)}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[10px] font-medium transition ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-full px-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
