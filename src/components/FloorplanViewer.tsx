import React, { useState, useRef } from 'react';
import {
  MapPin,
  History,
  CheckCircle2,
  Trash2,
  Plus,
  X,
  Layers,
  ScanLine,
} from 'lucide-react';
import { useApp } from '../AppContext';
import { MoistureMapPin } from '../types';
import { ARScanner } from './ARScanner';

export const FloorplanViewer: React.FC = () => {
  const {
    activeProject,
    dropMoisturePin,
    markPinAsDry,
    removeMoisturePin,
  } = useApp();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    activeProject.rooms[0]?.id || 'room_main_salon'
  );
  const [newPinMaterial, setNewPinMaterial] = useState('West Partition 5/8" Drywall');
  const [newPinSubstrate, setNewPinSubstrate] = useState('Gypsum over Wood Stud');
  const [newPinMc, setNewPinMc] = useState('26.4');
  const [newPinGoal, setNewPinGoal] = useState('12.0');

  const [contextMenuPin, setContextMenuPin] = useState<{
    pin: MoistureMapPin;
    clientX: number;
    clientY: number;
  } | null>(null);

  const [historyDrawerPin, setHistoryDrawerPin] = useState<MoistureMapPin | null>(null);
  const [showArScanner, setShowArScanner] = useState<boolean>(true);

  const handleSvgClick = async (e: React.MouseEvent<SVGSVGElement>) => {
    if (contextMenuPin) {
      setContextMenuPin(null);
      return;
    }
    const target = e.target as Element;
    if (target.closest('[data-pin-node="true"]')) {
      return;
    }

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const normX = Math.round(((e.clientX - rect.left) / rect.width) * 100) / 100;
    const normY = Math.round(((e.clientY - rect.top) / rect.height) * 100) / 100;

    const room =
      activeProject.rooms.find((r) => r.id === selectedRoomId) || activeProject.rooms[0];

    await dropMoisturePin(activeProject.id, {
      roomId: room?.id || 'room_1',
      roomName: room?.name || 'Primary Chamber',
      x: normX,
      y: normY,
      materialName: newPinMaterial.trim() || 'Perimeter Drywall Assembly',
      substrate: newPinSubstrate.trim() || '5/8" Gypsum Board',
      mcPercent: Number(newPinMc) || 24.0,
      dryGoalPercent: Number(newPinGoal) || 12.0,
    });
  };

  const openPinContextMenu = (
    pin: MoistureMapPin,
    clientX: number,
    clientY: number
  ) => {
    setContextMenuPin({ pin, clientX, clientY });
  };

  const startLongPress = (pin: MoistureMapPin, clientX: number, clientY: number) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      openPinContextMenu(pin, clientX, clientY);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Interactive 2D SVG Floorplan & Moisture Pin Telemetry
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Click anywhere on the floorplan to drop a numbered moisture pin. Right-click or long-press (500ms) any pin for context actions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowArScanner((prev) => !prev)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <ScanLine className="w-3.5 h-3.5" />
          <span>{showArScanner ? 'Hide AR & Vision Scanner' : 'Open AR & Vision Scanner'}</span>
        </button>
      </div>

      {showArScanner && <ARScanner />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Interactive 2D SVG Floorplan (`viewBox="0 0 100 100"`) */}
        <div className="lg:col-span-8 obsidian-card rounded-2xl p-5 space-y-4 relative">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">
                {activeProject.lossNumber} — 2D Spatial Moisture Matrix
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <span className="text-rose-400">
                Wet: {activeProject.pins.filter((p) => p.status === 'wet').length}
              </span>
              <span className="text-amber-400">
                Drying: {activeProject.pins.filter((p) => p.status === 'drying').length}
              </span>
              <span className="text-emerald-400">
                Dry: {activeProject.pins.filter((p) => p.status === 'dry').length}
              </span>
            </div>
          </div>

          <div className="relative w-full aspect-[16/10] bg-[#090d16] rounded-xl border border-white/10 overflow-hidden select-none">
            <svg
              ref={svgRef}
              viewBox="0 0 100 100"
              data-testid="floorplan-svg-canvas"
              onClick={(e) => void handleSvgClick(e)}
              className="w-full h-full cursor-crosshair"
            >
              <defs>
                <pattern
                  id="s500-grid"
                  width="5"
                  height="5"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 5 0 L 0 0 0 5"
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.08)"
                    strokeWidth="0.2"
                  />
                </pattern>
              </defs>

              <rect x="0" y="0" width="100" height="100" fill="url(#s500-grid)" />

              {/* Render Rooms */}
              {activeProject.rooms.map((room) => (
                <g key={room.id}>
                  <rect
                    x={room.svgRect.x}
                    y={room.svgRect.y}
                    width={room.svgRect.width}
                    height={room.svgRect.height}
                    fill="rgba(6, 182, 212, 0.06)"
                    stroke="rgba(6, 182, 212, 0.45)"
                    strokeWidth="0.6"
                    rx="1"
                  />
                  {/* Wet Footprint Zone */}
                  <rect
                    x={room.svgRect.x + 2}
                    y={room.svgRect.y + 2}
                    width={Math.max(8, room.svgRect.width * 0.6)}
                    height={Math.max(8, room.svgRect.height * 0.55)}
                    fill="rgba(244, 63, 94, 0.08)"
                    stroke="rgba(244, 63, 94, 0.3)"
                    strokeDasharray="1.5 1"
                    strokeWidth="0.35"
                    rx="0.8"
                  />
                  <text
                    x={room.svgRect.x + 3}
                    y={room.svgRect.y + 5.5}
                    fill="#e2e8f0"
                    fontSize="2.7"
                    fontWeight="600"
                  >
                    {room.name}
                  </text>
                  <text
                    x={room.svgRect.x + 3}
                    y={room.svgRect.y + 9}
                    fill="#94a3b8"
                    fontSize="2.1"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {room.lengthFt}&apos; × {room.widthFt}&apos; ({room.areaSqFt} SF · Wet: {room.wetAreaSqFt} SF)
                  </text>
                </g>
              ))}

              {/* Render Dropped Moisture Map Pins */}
              {activeProject.pins.map((pin) => {
                const cx = pin.x * 100;
                const cy = pin.y * 100;
                const fill =
                  pin.status === 'dry'
                    ? '#10b981'
                    : pin.status === 'drying'
                    ? '#f59e0b'
                    : '#f43f5e';

                return (
                  <g
                    key={pin.id}
                    data-pin-node="true"
                    data-testid={`floorplan-pin-${pin.number}`}
                    transform={`translate(${cx}, ${cy})`}
                    className="cursor-pointer"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openPinContextMenu(pin, e.clientX, e.clientY);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startLongPress(pin, e.clientX, e.clientY);
                    }}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      if (touch) {
                        startLongPress(pin, touch.clientX, touch.clientY);
                      }
                    }}
                    onTouchEnd={cancelLongPress}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPinContextMenu(pin, e.clientX, e.clientY);
                    }}
                  >
                    <circle
                      r="4.2"
                      fill={fill}
                      fillOpacity="0.22"
                      stroke={fill}
                      strokeWidth="0.4"
                    />
                    <circle r="2.7" fill={fill} stroke="#090d16" strokeWidth="0.45" />
                    <text
                      y="0.9"
                      textAnchor="middle"
                      fill="#090d16"
                      fontSize="2.3"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pin.number}
                    </text>
                    <text
                      y="6.4"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="2.0"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pin.mcPercent.toFixed(1)}%
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Long-Press / Right-Click Contextual Menu */}
            {contextMenuPin && (
              <div
                data-testid="pin-context-menu"
                className="absolute top-4 right-4 w-72 rounded-xl obsidian-card p-3.5 shadow-2xl z-30 border border-cyan-500/40"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <div>
                    <div className="text-xs font-mono tabular-nums text-cyan-400">
                      PIN #{contextMenuPin.pin.number} · {contextMenuPin.pin.status.toUpperCase()}
                    </div>
                    <div className="text-xs font-semibold text-white truncate max-w-[200px]">
                      {contextMenuPin.pin.materialName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContextMenuPin(null)}
                    className="p-1 text-slate-400 hover:text-white"
                    aria-label="Close pin context menu"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mb-3 flex items-center justify-between text-xs font-mono tabular-nums text-slate-300">
                  <span>Current: {contextMenuPin.pin.mcPercent.toFixed(1)}% MC</span>
                  <span>Dry Goal: {contextMenuPin.pin.dryGoalPercent.toFixed(1)}% MC</span>
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    data-testid="context-menu-view-history"
                    onClick={() => {
                      setHistoryDrawerPin(contextMenuPin.pin);
                      setContextMenuPin(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/10 rounded-lg transition-colors text-left"
                  >
                    <History className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>View History</span>
                  </button>

                  <button
                    type="button"
                    data-testid="context-menu-mark-dry"
                    onClick={() => {
                      void markPinAsDry(activeProject.id, contextMenuPin.pin.id);
                      setContextMenuPin(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/15 rounded-lg transition-colors text-left"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Mark as Dry ({contextMenuPin.pin.dryGoalPercent.toFixed(1)}% MC)</span>
                  </button>

                  <button
                    type="button"
                    data-testid="context-menu-remove-pin"
                    onClick={() => {
                      void removeMoisturePin(activeProject.id, contextMenuPin.pin.id);
                      setContextMenuPin(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Remove Pin</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Columns: Pin Placement Configuration & Active Pins Roster */}
        <div className="lg:col-span-4 space-y-5">
          <div className="obsidian-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">
                Pin Drop Telemetry Configuration
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="pin-room" className="block text-slate-300 mb-1">
                  Target Chamber
                </label>
                <select
                  id="pin-room"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 text-white"
                >
                  {activeProject.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.areaSqFt} SF)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pin-mat" className="block text-slate-300 mb-1">
                  Material / Assembly Name
                </label>
                <input
                  id="pin-mat"
                  type="text"
                  value={newPinMaterial}
                  onChange={(e) => setNewPinMaterial(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pin-mc" className="block text-slate-300 mb-1">
                    Measured %MC
                  </label>
                  <input
                    id="pin-mc"
                    type="number"
                    step="0.1"
                    value={newPinMc}
                    onChange={(e) => setNewPinMc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 font-mono tabular-nums text-white"
                  />
                </div>
                <div>
                  <label htmlFor="pin-goal" className="block text-slate-300 mb-1">
                    Dry Goal %MC
                  </label>
                  <input
                    id="pin-goal"
                    type="number"
                    step="0.1"
                    value={newPinGoal}
                    onChange={(e) => setNewPinGoal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 font-mono tabular-nums text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                data-testid="quick-drop-pin-btn"
                onClick={() => {
                  const room =
                    activeProject.rooms.find((r) => r.id === selectedRoomId) ||
                    activeProject.rooms[0];
                  void dropMoisturePin(activeProject.id, {
                    roomId: room?.id || 'room_1',
                    roomName: room?.name || 'Primary Chamber',
                    x: 0.35 + Math.random() * 0.3,
                    y: 0.35 + Math.random() * 0.3,
                    materialName: newPinMaterial,
                    substrate: newPinSubstrate,
                    mcPercent: Number(newPinMc) || 26.4,
                    dryGoalPercent: Number(newPinGoal) || 12.0,
                  });
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Drop Numbered Moisture Pin</span>
              </button>
            </div>
          </div>

          {/* Active Moisture Pins List with direct Context Menu Trigger */}
          <div className="obsidian-card rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Active Moisture Pins ({activeProject.pins.length})
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activeProject.pins.map((pin) => (
                <div
                  key={pin.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openPinContextMenu(pin, e.clientX, e.clientY);
                  }}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#090d16] border border-white/10 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-mono tabular-nums font-semibold text-white truncate">
                      Pin #{pin.number} · {pin.materialName}
                    </div>
                    <div className="font-mono tabular-nums text-[11px] text-slate-400">
                      Coords: ({pin.x.toFixed(2)}, {pin.y.toFixed(2)}) · Goal: {pin.dryGoalPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        pin.status === 'dry'
                          ? 'text-emerald-400'
                          : pin.status === 'drying'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {pin.mcPercent.toFixed(1)}% MC
                    </span>
                    <button
                      type="button"
                      data-testid={`open-pin-actions-${pin.number}`}
                      onClick={(e) => openPinContextMenu(pin, e.clientX, e.clientY)}
                      className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 rounded"
                    >
                      Actions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pin Historical %MC Drawer / Modal */}
      {historyDrawerPin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          data-testid="pin-history-modal"
        >
          <div className="w-full max-w-lg rounded-2xl obsidian-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <div className="text-xs font-mono tabular-nums text-cyan-400">
                  PIN #{historyDrawerPin.number} HISTORICAL TELEMETRY
                </div>
                <h3 className="text-base font-bold text-white">
                  {historyDrawerPin.materialName}
                </h3>
                <p className="text-xs text-slate-400">
                  {historyDrawerPin.roomName} · Substrate: {historyDrawerPin.substrate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDrawerPin(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                aria-label="Close pin history modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#090d16] border border-white/10 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-400">Current %MC</div>
                <div className="text-base font-bold text-white">
                  {historyDrawerPin.mcPercent.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-slate-400">Dry Standard Goal</div>
                <div className="text-base font-bold text-emerald-400">
                  {historyDrawerPin.dryGoalPercent.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-slate-400">Status</div>
                <div className="text-base font-bold text-cyan-400 uppercase">
                  {historyDrawerPin.status}
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {historyDrawerPin.history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#090d16] border border-white/5 text-xs font-mono tabular-nums"
                >
                  <div>
                    <div className="text-white font-semibold">
                      {entry.mcPercent.toFixed(1)}% MC · {entry.gpp.toFixed(1)} GPP
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {entry.tempF.toFixed(1)}°F · {entry.rhPercent.toFixed(1)}% RH · {entry.technician}
                    </div>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    {new Date(entry.recordedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  void markPinAsDry(activeProject.id, historyDrawerPin.id);
                  setHistoryDrawerPin(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
              >
                Mark as Dry Now
              </button>
              <button
                type="button"
                onClick={() => setHistoryDrawerPin(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
