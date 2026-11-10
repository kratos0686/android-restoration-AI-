import React, { useState } from 'react';
import {
  Droplets,
  Gauge,
  Zap,
  CheckCircle2,
  MapPin,
  Plus,
  Layers,
  Truck,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../AppContext';
import { calculateGPP } from '../utils/equipmentSizing';
import { AssetCardSyncBadge } from './AssetSyncStatusIndicator';

export const MobileDashboard: React.FC = () => {
  const { activeProject, addReading, setActiveNav } = useApp();
  const [tempF, setTempF] = useState('74.5');
  const [rhPercent, setRhPercent] = useState('44.0');
  const [mcPercent, setMcPercent] = useState('19.2');

  const latestReading =
    activeProject.readings[activeProject.readings.length - 1] || null;
  const gppPreview = calculateGPP(Number(tempF) || 72, Number(rhPercent) || 45);

  const handleQuickReading = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = activeProject.rooms[0];
    if (!room) return;
    await addReading(activeProject.id, {
      roomId: room.id,
      roomName: room.name,
      tempF: Number(tempF) || 72,
      rhPercent: Number(rhPercent) || 45,
      mcPercent: Number(mcPercent) || 18,
    });
  };

  return (
    <div className="space-y-4 pb-24" data-testid="mobile-dashboard">
      {/* Compact Active Loss Card */}
      <div className="rounded-xl border border-white/10 bg-[#0c121e]/95 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 tabular-nums">
            {activeProject.lossNumber}
          </span>
          <AssetCardSyncBadge
            entityId={activeProject.id}
            overrideState={activeProject.syncState || 'Synced'}
          />
        </div>
        <h2 className="mt-2 text-base font-bold text-slate-100 font-display">
          {activeProject.clientName}
        </h2>
        <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5 font-mono tabular-nums">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">{activeProject.lossAddress}</span>
        </p>
        <div className="mt-3 flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {activeProject.waterCategory.replace('_', ' ')}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
            {activeProject.lossClass.replace('_', ' ')}
          </span>
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            Stage: {activeProject.stage}
          </span>
        </div>
      </div>

      {/* 2x2 Field Telemetry Strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#0c121e]/90 p-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>GRAINS / LB</span>
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-slate-50 tabular-nums">
            {latestReading ? `${latestReading.gpp} GPP` : '56.9 GPP'}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0c121e]/90 p-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>PEAK %MC</span>
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-rose-400 tabular-nums">
            {latestReading ? `${latestReading.mcPercent}%` : '31.4%'}
          </div>
        </div>
      </div>

      {/* Field Quick Psychrometric Logger */}
      <form
        onSubmit={handleQuickReading}
        className="rounded-xl border border-white/10 bg-[#0c121e]/90 p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-100 font-display">
            Quick Field Psychrometric Log
          </span>
          <span className="text-xs font-mono text-cyan-300 tabular-nums">
            {gppPreview} GPP
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase">
              Temp °F
            </label>
            <input
              type="number"
              step="0.1"
              value={tempF}
              onChange={(e) => setTempF(e.target.value)}
              className="mt-1 w-full rounded bg-[#090d16] border border-white/10 px-2 py-1.5 text-xs font-mono text-slate-100 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase">
              RH %
            </label>
            <input
              type="number"
              step="0.1"
              value={rhPercent}
              onChange={(e) => setRhPercent(e.target.value)}
              className="mt-1 w-full rounded bg-[#090d16] border border-white/10 px-2 py-1.5 text-xs font-mono text-slate-100 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase">
              %MC
            </label>
            <input
              type="number"
              step="0.1"
              value={mcPercent}
              onChange={(e) => setMcPercent(e.target.value)}
              className="mt-1 w-full rounded bg-[#090d16] border border-white/10 px-2 py-1.5 text-xs font-mono text-slate-100 tabular-nums"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500 text-slate-950 font-semibold py-2 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Reading (Offline-Safe)
        </button>
      </form>

      {/* Mobile Field Action Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setActiveNav('floorplan')}
          className="rounded-xl border border-white/10 bg-[#0c121e]/90 p-3 text-left flex items-center gap-2.5"
        >
          <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-slate-100">2D Moisture Map</div>
            <div className="text-[10px] text-slate-400 font-mono">
              {activeProject.pins.length} Pins Active
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveNav('equipment')}
          className="rounded-xl border border-white/10 bg-[#0c121e]/90 p-3 text-left flex items-center gap-2.5"
        >
          <Zap className="w-4 h-4 text-teal-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-slate-100">S500 Sizing</div>
            <div className="text-[10px] text-slate-400 font-mono">
              {activeProject.equipment.length} Units Placed
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveNav('dispatch')}
          className="rounded-xl border border-white/10 bg-[#0c121e]/90 p-3 text-left flex items-center gap-2.5"
        >
          <Truck className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-slate-100">Crew Dispatch</div>
            <div className="text-[10px] text-slate-400 font-mono">Live Fleet GPS</div>
          </div>
        </button>

        <button
          onClick={() => setActiveNav('documentation')}
          className="rounded-xl border border-white/10 bg-[#0c121e]/90 p-3 text-left flex items-center gap-2.5"
        >
          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-slate-100">PDF Dossier</div>
            <div className="text-[10px] text-slate-400 font-mono">SHA-256 Sign</div>
          </div>
        </button>
      </div>
    </div>
  );
};
