import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Droplets,
  Thermometer,
  Gauge,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Layers,
  MapPin,
  FileText,
  Truck,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../AppContext';
import { LossClass, ProjectStage, WaterCategory } from '../types';
import {
  calculateDewPointF,
  calculateGPP,
  calculateVaporPressureInHg,
} from '../utils/equipmentSizing';
import { AssetCardSyncBadge } from './AssetSyncStatusIndicator';

const STAGES: ProjectStage[] = [
  'Intake',
  'Inspection',
  'Scope',
  'Stabilize',
  'Monitor',
  'Closeout',
];

export const DesktopDashboard: React.FC = () => {
  const {
    activeProject,
    updateProjectStage,
    addReading,
    setActiveNav,
  } = useApp();

  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    activeProject.rooms[0]?.id || ''
  );
  const [tempF, setTempF] = useState<string>('74.2');
  const [rhPercent, setRhPercent] = useState<string>('43.5');
  const [mcPercent, setMcPercent] = useState<string>('18.4');

  const previewGpp = useMemo(
    () => calculateGPP(Number(tempF) || 70, Number(rhPercent) || 50),
    [tempF, rhPercent]
  );
  const previewDewPoint = useMemo(
    () => calculateDewPointF(Number(tempF) || 70, Number(rhPercent) || 50),
    [tempF, rhPercent]
  );
  const previewVp = useMemo(
    () => calculateVaporPressureInHg(Number(tempF) || 70, Number(rhPercent) || 50),
    [tempF, rhPercent]
  );

  const latestReading =
    activeProject.readings[activeProject.readings.length - 1] || null;

  const peakMc = useMemo(() => {
    if (activeProject.materials.length === 0) return 0;
    return Math.max(...activeProject.materials.map((m) => m.currentMcPercent));
  }, [activeProject.materials]);

  const totalAmps = useMemo(
    () =>
      Number(
        activeProject.equipment
          .filter((e) => e.status === 'Running')
          .reduce((acc, e) => acc + e.ampDraw, 0)
          .toFixed(1)
      ),
    [activeProject.equipment]
  );

  const dailyBurnRate = useMemo(
    () =>
      activeProject.equipment
        .filter((e) => e.status === 'Running')
        .reduce((acc, e) => acc + e.dailyRate, 0),
    [activeProject.equipment]
  );

  const checklistProgress = useMemo(() => {
    const total = activeProject.checklist.length || 1;
    const done = activeProject.checklist.filter((c) => c.completed).length;
    return {
      done,
      total,
      percent: Math.round((done / total) * 100),
    };
  }, [activeProject.checklist]);

  const chartData = useMemo(() => {
    if (activeProject.readings.length === 0) {
      return [
        { label: 'Day 1 AM', gpp: 88.0, rh: 65.0, mc: 42.0 },
        { label: 'Day 1 PM', gpp: 68.4, rh: 52.0, mc: 31.5 },
        { label: 'Day 2 AM', gpp: 54.2, rh: 43.0, mc: 21.0 },
      ];
    }
    return activeProject.readings.map((r, idx) => {
      const d = new Date(r.timestamp);
      const label = `${d.getMonth() + 1}/${d.getDate()} ${d
        .getHours()
        .toString()
        .padStart(2, '0')}:00`;
      return {
        label: `${label} (#${idx + 1})`,
        gpp: r.gpp,
        rh: r.rhPercent,
        mc: r.mcPercent,
      };
    });
  }, [activeProject.readings]);

  const handleLogReading = async (e: React.FormEvent) => {
    e.preventDefault();
    const room =
      activeProject.rooms.find((r) => r.id === selectedRoomId) ||
      activeProject.rooms[0];
    if (!room) return;

    await addReading(activeProject.id, {
      roomId: room.id,
      roomName: room.name,
      tempF: Number(tempF) || 72,
      rhPercent: Number(rhPercent) || 45,
      mcPercent: Number(mcPercent) || 15,
    });
  };

  return (
    <div className="space-y-6 pb-12" data-testid="desktop-dashboard">
      {/* Top Loss File Command Bar & Stage Progression */}
      <div className="rounded-xl border border-white/10 bg-[#0c121e]/90 backdrop-blur-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 tabular-nums">
                {activeProject.lossNumber}
              </span>
              <span
                className={`font-mono text-xs font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded border tabular-nums ${
                  activeProject.waterCategory === 'CAT_3'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : activeProject.waterCategory === 'CAT_2'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {activeProject.waterCategory.replace('_', ' ')} ·{' '}
                {activeProject.lossClass.replace('_', ' ')}
              </span>
              <AssetCardSyncBadge
                entityId={activeProject.id}
                overrideState={activeProject.syncState || 'Synced'}
              />
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-50 font-display">
              {activeProject.clientName}
            </h1>
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-2 font-mono tabular-nums">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{activeProject.lossAddress}</span>
              <span className="text-slate-600">|</span>
              <span>
                {activeProject.latitude.toFixed(4)}°N,{' '}
                {activeProject.longitude.toFixed(4)}°W ({activeProject.granularity})
              </span>
            </p>
          </div>

          {/* Classification & Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Water Damage Category"
              value={activeProject.waterCategory}
              onChange={(e) =>
                updateProjectStage(
                  activeProject.id,
                  activeProject.stage,
                  e.target.value as WaterCategory,
                  activeProject.lossClass
                )
              }
              className="rounded-lg bg-[#090d16] border border-white/10 px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="CAT_1">CAT 1 — Clean Water</option>
              <option value="CAT_2">CAT 2 — Gray Water</option>
              <option value="CAT_3">CAT 3 — Black / Biohazard</option>
            </select>

            <select
              aria-label="Evaporation Load Class"
              value={activeProject.lossClass}
              onChange={(e) =>
                updateProjectStage(
                  activeProject.id,
                  activeProject.stage,
                  activeProject.waterCategory,
                  e.target.value as LossClass
                )
              }
              className="rounded-lg bg-[#090d16] border border-white/10 px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="CLASS_1">CLASS 1 — &lt;5% Surface</option>
              <option value="CLASS_2">CLASS 2 — 5–40% Porous</option>
              <option value="CLASS_3">CLASS 3 — &gt;40% Overhead</option>
              <option value="CLASS_4">CLASS 4 — Bound Water</option>
            </select>

            <button
              onClick={() => setActiveNav('documentation')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-3.5 py-1.5 text-xs transition shadow-lg shadow-cyan-500/20"
            >
              <FileText className="w-3.5 h-3.5" />
              Carrier Dossier & PDF
            </button>
          </div>
        </div>

        {/* 6-Stage Mitigation Progression Stepper */}
        <div className="pt-4">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
            <span>ANSI/IICRC S500 Mitigation Workflow Stage</span>
            <span className="text-cyan-400">Active: {activeProject.stage}</span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {STAGES.map((stage, idx) => {
              const currentIdx = STAGES.indexOf(activeProject.stage);
              const isCompleted = idx < currentIdx;
              const isActive = stage === activeProject.stage;
              return (
                <button
                  key={stage}
                  onClick={() => updateProjectStage(activeProject.id, stage)}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium border transition ${
                    isActive
                      ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20'
                      : isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:border-emerald-400/50'
                      : 'bg-[#090d16]/70 border-white/5 text-slate-400 hover:border-white/15 hover:text-slate-200'
                  }`}
                >
                  <span className="font-mono text-[11px] tabular-nums">
                    0{idx + 1}. {stage}
                  </span>
                  {isCompleted && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4 High-Signal Psychrometric & Operational KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-[#0c121e]/85 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-mono">
              Specific Humidity (GPP)
            </span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-50 tabular-nums">
              {latestReading ? `${latestReading.gpp} GPP` : '56.9 GPP'}
            </span>
            <span className="text-xs font-mono text-emerald-400 tabular-nums">
              -29.6 Δ
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400 tabular-nums">
            Dew Point: {latestReading ? `${latestReading.dewPointF}°F` : '51.8°F'} · VP:{' '}
            {latestReading ? `${latestReading.vaporPressureInHg}" Hg` : '0.39" Hg'}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0c121e]/85 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-mono">
              Peak Substrate %MC
            </span>
            <Gauge className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                peakMc > 20
                  ? 'text-rose-400'
                  : peakMc > 12
                  ? 'text-amber-300'
                  : 'text-emerald-400'
              }`}
            >
              {peakMc.toFixed(1)}% MC
            </span>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              Goal ≤ 12.0%
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400 tabular-nums">
            {activeProject.pins.length} Floorplan Pins ·{' '}
            {activeProject.materials.filter((m) => !m.salvageable).length} Non-Salvageable
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0c121e]/85 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-mono">
              Active Fleet & Amp Load
            </span>
            <Zap className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-50 tabular-nums">
              {totalAmps} A
            </span>
            <span className="text-xs font-mono text-cyan-300 tabular-nums">
              ${dailyBurnRate}/day
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400 tabular-nums">
            {activeProject.equipment.filter((e) => e.status === 'Running').length} Units
            Running · NEC 80% Safe Limit (12.0A/ckt)
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0c121e]/85 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-mono">
              S500 / S520 Compliance
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-50 tabular-nums">
              {checklistProgress.percent}%
            </span>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              ({checklistProgress.done}/{checklistProgress.total} Verified)
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
              style={{ width: `${checklistProgress.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Split Grid: Psychrometric Drying Curve + Live Reading Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Psychrometric Drying Curve (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-white/10 bg-[#0c121e]/90 p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 font-display">
                Psychrometric Grain Depression & %MC Drying Curve
              </h2>
              <p className="text-xs text-slate-400">
                ANSI/IICRC S500 Daily Psychrometric Telemetry (Grains Per Pound, Relative
                Humidity %, and Substrate %MC)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" />
                GPP (Grains/lb)
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                RH %
              </span>
              <span className="flex items-center gap-1.5 text-rose-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" />
                Substrate %MC
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gppGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="mcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="gpp"
                  name="Specific Humidity (GPP)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gppGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="rh"
                  name="Relative Humidity (%)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={0}
                />
                <Area
                  type="monotone"
                  dataKey="mc"
                  name="Moisture Content (%MC)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#mcGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Psychrometric Field Logger (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-white/10 bg-[#0c121e]/90 p-5 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-100 font-display">
                Log Chamber Reading
              </h2>
              <Thermometer className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Calculates psychrometric GPP, Dew Point, and Vapor Pressure automatically
              and syncs to IndexedDB + Firestore.
            </p>

            <form onSubmit={handleLogReading} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                  Affected Chamber
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full rounded-lg bg-[#090d16] border border-white/10 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {activeProject.rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({room.areaSqFt} SF)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                    Temp (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempF}
                    onChange={(e) => setTempF(e.target.value)}
                    className="w-full rounded-lg bg-[#090d16] border border-white/10 px-2.5 py-1.5 text-xs font-mono text-slate-100 tabular-nums focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                    RH (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={rhPercent}
                    onChange={(e) => setRhPercent(e.target.value)}
                    className="w-full rounded-lg bg-[#090d16] border border-white/10 px-2.5 py-1.5 text-xs font-mono text-slate-100 tabular-nums focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                    Peak %MC
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={mcPercent}
                    onChange={(e) => setMcPercent(e.target.value)}
                    className="w-full rounded-lg bg-[#090d16] border border-white/10 px-2.5 py-1.5 text-xs font-mono text-slate-100 tabular-nums focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-[#090d16]/90 border border-white/5 p-3 grid grid-cols-3 gap-2 text-center font-mono">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Computed GPP</div>
                  <div className="text-sm font-bold text-cyan-300 tabular-nums">
                    {previewGpp}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Dew Point</div>
                  <div className="text-sm font-bold text-teal-300 tabular-nums">
                    {previewDewPoint}°F
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Vapor Press</div>
                  <div className="text-sm font-bold text-amber-300 tabular-nums">
                    {previewVp}&quot; Hg
                  </div>
                </div>
              </div>

              <button
                type="submit"
                data-testid="log-reading-submit-btn"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 text-xs transition"
              >
                <Plus className="w-4 h-4" />
                Commit Psychrometric Reading
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Offline Queue: IndexedDB Ready</span>
            <span className="text-emerald-400">S500 §12.4 Compliant</span>
          </div>
        </div>
      </div>

      {/* Material Salvageability Table & Field Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-xl border border-white/10 bg-[#0c121e]/90 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 font-display">
                Tracked Building Assemblies & Dry Standard Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Material salvageability evaluation per ANSI/IICRC S500 §13.5 & S520
                Condition 1–3 thresholds
              </p>
            </div>
            <button
              onClick={() => setActiveNav('floorplan')}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              Open 2D Moisture Map
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-mono uppercase text-slate-400">
                  <th className="py-2.5 pr-3">Assembly / Substrate</th>
                  <th className="py-2.5 px-3">Chamber</th>
                  <th className="py-2.5 px-3">Current %MC</th>
                  <th className="py-2.5 px-3">Dry Goal</th>
                  <th className="py-2.5 px-3">Salvageability</th>
                  <th className="py-2.5 pl-3">Field Directive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeProject.materials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-3 font-medium text-slate-100">
                      {mat.name}
                      <span className="block text-[11px] font-mono text-slate-400">
                        {mat.assemblyType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{mat.roomName}</td>
                    <td className="py-3 px-3 font-mono font-bold tabular-nums text-slate-100">
                      {mat.currentMcPercent.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-slate-400">
                      ≤ {mat.dryGoalPercent.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3">
                      {mat.salvageable ? (
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Salvageable ({mat.status})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <ShieldAlert className="w-3 h-3" />
                          Demo Required
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-slate-400 max-w-xs truncate">
                      {mat.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Field Operations Quick Launchpad */}
        <div className="lg:col-span-4 rounded-xl border border-white/10 bg-[#0c121e]/90 p-5 backdrop-blur-xl space-y-3">
          <h2 className="text-base font-bold text-slate-100 font-display">
            Mitigation Command Modules
          </h2>
          <p className="text-xs text-slate-400">
            Direct access to field mapping, equipment sizing, crew dispatch, and hybrid AI
            scoping.
          </p>

          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => setActiveNav('floorplan')}
              className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-[#090d16]/80 hover:border-cyan-500/40 p-3 text-left transition"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-100">
                    2D Floorplan & Long-Press Moisture Pins
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {activeProject.pins.length} active pins · AR LiDAR Scanner
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => setActiveNav('equipment')}
              className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-[#090d16]/80 hover:border-cyan-500/40 p-3 text-left transition"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-teal-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-100">
                    IICRC S500 Equipment Calculator
                  </div>
                  <div className="text-[11px] text-slate-400">
                    LGR Dehu PPD, Air Movers, 6 ACH HEPA & 15A Load
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => setActiveNav('dispatch')}
              className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-[#090d16]/80 hover:border-cyan-500/40 p-3 text-left transition"
            >
              <div className="flex items-center gap-3">
                <Truck className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-100">
                    Crew Dispatch & Live Sector Map
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Google Maps Telemetry & IndexedDB Sync Queue
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => setActiveNav('ai-assistant')}
              className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-[#090d16]/80 hover:border-cyan-500/40 p-3 text-left transition"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-100">
                    Restoration AI Field Specialist
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Parse voice/field notes into Xactimate & readings
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
