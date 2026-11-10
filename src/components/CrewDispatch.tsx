import React, { useState, useMemo, useEffect } from 'react';
import {
  Radio,
  Truck,
  Plus,
  Search,
  Map as MapIcon,
  Clock,
  Activity,
  Send,
  X,
  CheckCircle2,
} from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useApp } from '../AppContext';
import { CloudEventMessage, FieldUnit } from '../types';
import { AssetCardSyncBadge, AssetSyncStatusIndicator } from './AssetSyncStatusIndicator';
import { eventBus } from '../services/EventBus';

export const CrewDispatch: React.FC = () => {
  const {
    projects,
    fieldUnits,
    registerFieldUnit,
    dispatchFieldUnit,
    updateFieldUnitStatus,
    mapsApiKey,
  } = useApp();

  const [unitSearch, setUnitSearch] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newCallsign, setNewCallsign] = useState('STRIKE-DELTA-04');
  const [newLeadTech, setNewLeadTech] = useState('Devon Brooks, WRT / AMRT');
  const [newVehicle, setNewVehicle] = useState('Ford E-350 Box Desiccant Unit');

  const [boardViewMode, setBoardViewMode] = useState<'timeline' | 'map'>('timeline');
  const [dispatchModalUnit, setDispatchModalUnit] = useState<FieldUnit | null>(null);
  const [selectedLossId, setSelectedLossId] = useState<string>(projects[1]?.id || projects[0]?.id || '');
  const [selectedSla, setSelectedSla] = useState<'Emergency 60m' | 'Urgent 2h' | 'Standard 4h'>(
    'Emergency 60m'
  );
  const [selectedDirective, setSelectedDirective] = useState(
    'ANSI/IICRC S500 §12.1 Negative Air Containment + Weighted Extraction & LGR Stabilization'
  );

  const [pulseEvents, setPulseEvents] = useState<CloudEventMessage[]>(() =>
    eventBus.getHistory()
  );

  useEffect(() => {
    return eventBus.subscribe((evt) => {
      setPulseEvents((prev) => [evt, ...prev].slice(0, 30));
    });
  }, []);

  const filteredUnits = useMemo(() => {
    if (!unitSearch.trim()) return fieldUnits;
    const q = unitSearch.toLowerCase();
    return fieldUnits.filter(
      (u) =>
        u.callsign.toLowerCase().includes(q) ||
        u.leadTech.toLowerCase().includes(q) ||
        u.vehicle.toLowerCase().includes(q)
    );
  }, [fieldUnits, unitSearch]);

  const unassignedProjects = useMemo(
    () => projects.filter((p) => !p.assignedUnitId),
    [projects]
  );

  const assignedSectors = useMemo(
    () => projects.filter((p) => Boolean(p.assignedUnitId)),
    [projects]
  );

  const handleRegisterUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCallsign.trim() || !newLeadTech.trim()) return;
    await registerFieldUnit({
      callsign: newCallsign,
      leadTech: newLeadTech,
      vehicle: newVehicle,
      certifications: ['IICRC WRT', 'IICRC AMRT'],
    });
    setShowRegisterForm(false);
  };

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalUnit || !selectedLossId) return;
    await dispatchFieldUnit({
      unitId: dispatchModalUnit.id,
      projectId: selectedLossId,
      slaPriority: selectedSla,
      directive: selectedDirective,
    });
    setDispatchModalUnit(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with Visual Sync Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Crew Dispatch Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Coordinate ANSI/IICRC S500 & S520 strike units, unassigned loss radar, and live field telemetry.
          </p>
        </div>

        <AssetSyncStatusIndicator contextLabel="Crew Dispatch Sync" />
      </div>

      {/* 3-Column Command Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1 (4 cols): Field Assets Roster */}
        <div className="lg:col-span-4 obsidian-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">
                Field Assets Roster ({filteredUnits.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowRegisterForm((prev) => !prev)}
              data-testid="register-field-unit-toggle-btn"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Field Unit</span>
            </button>
          </div>

          {showRegisterForm && (
            <form
              onSubmit={handleRegisterUnit}
              className="p-3.5 rounded-xl bg-[#090d16] border border-cyan-500/30 space-y-3 text-xs"
            >
              <div className="font-semibold text-cyan-300">Register New Mitigation Unit</div>
              <div>
                <label htmlFor="unit-callsign" className="block text-slate-400 mb-1">
                  Unit Callsign
                </label>
                <input
                  id="unit-callsign"
                  type="text"
                  value={newCallsign}
                  onChange={(e) => setNewCallsign(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-white/10 font-mono text-white"
                />
              </div>
              <div>
                <label htmlFor="unit-lead" className="block text-slate-400 mb-1">
                  Lead Certified Technician
                </label>
                <input
                  id="unit-lead"
                  type="text"
                  value={newLeadTech}
                  onChange={(e) => setNewLeadTech(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-white/10 text-white"
                />
              </div>
              <div>
                <label htmlFor="unit-veh" className="block text-slate-400 mb-1">
                  Vehicle / Rig Specification
                </label>
                <input
                  id="unit-veh"
                  type="text"
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-white/10 text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterForm(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-cyan-400 text-slate-950 font-semibold"
                >
                  Save Unit
                </button>
              </div>
            </form>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              placeholder="Search callsign, lead tech, or rig..."
              aria-label="Search field units"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#090d16] border border-white/10 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {filteredUnits.map((unit) => (
              <div
                key={unit.id}
                data-testid={`crew-card-${unit.id}`}
                className="p-4 rounded-xl bg-[#090d16] border border-white/10 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono font-bold text-cyan-400">
                      {unit.callsign}
                    </div>
                    <div className="text-sm font-semibold text-white">{unit.leadTech}</div>
                    <div className="text-xs text-slate-400">{unit.vehicle}</div>
                  </div>
                  <AssetCardSyncBadge entityId={unit.id} />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-300">
                  <span
                    className={
                      unit.status === 'Available'
                        ? 'text-emerald-400'
                        : unit.status === 'StandDown'
                        ? 'text-slate-400'
                        : 'text-amber-400'
                    }
                  >
                    Status: {unit.status}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    GPS: {unit.latitude.toFixed(3)}°N, {unit.longitude.toFixed(3)}°W
                  </span>
                </div>

                <div className="text-xs text-slate-400 line-clamp-2">{unit.directive}</div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    data-testid={`dispatch-unit-btn-${unit.id}`}
                    onClick={() => {
                      setDispatchModalUnit(unit);
                      setSelectedLossId(
                        unassignedProjects[0]?.id || projects[0]?.id || ''
                      );
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {unit.activeProjectId ? 'Reassign' : 'DISPATCH UNIT'}
                  </button>

                  {unit.status !== 'StandDown' ? (
                    <button
                      type="button"
                      onClick={() => void updateFieldUnitStatus(unit.id, 'StandDown')}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Stand Down
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void updateFieldUnitStatus(unit.id, 'Available')}
                      className="px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Activate Unit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 (5 cols): Unassigned Radar & Sector Activity Board */}
        <div className="lg:col-span-5 obsidian-card rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">
                Unassigned Radar & Sector Activity Board
              </h2>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#090d16] border border-white/10">
              <button
                type="button"
                onClick={() => setBoardViewMode('timeline')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  boardViewMode === 'timeline'
                    ? 'bg-cyan-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Sector Timeline
              </button>
              <button
                type="button"
                onClick={() => setBoardViewMode('map')}
                data-testid="toggle-field-map-btn"
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  boardViewMode === 'map'
                    ? 'bg-cyan-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <MapIcon className="w-3 h-3" />
                <span>Field Map</span>
              </button>
            </div>
          </div>

          {boardViewMode === 'map' ? (
            <div className="space-y-3">
              <div className="w-full h-80 rounded-xl overflow-hidden border border-white/10 bg-[#090d16]">
                {mapsApiKey ? (
                  <APIProvider apiKey={mapsApiKey}>
                    <GoogleMap
                      mapId="DEMO_MAP_ID"
                      defaultCenter={{ lat: 30.2686, lng: -97.7426 }}
                      defaultZoom={12}
                      gestureHandling="greedy"
                      disableDefaultUI={false}
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      style={{ width: '100%', height: '100%' }}
                    >
                      {projects.map((proj) => (
                        <AdvancedMarker
                          key={proj.id}
                          position={{ lat: proj.latitude, lng: proj.longitude }}
                          title={`${proj.lossNumber} — ${proj.clientName}`}
                        >
                          <Pin
                            background={
                              proj.waterCategory === 'CAT_3'
                                ? '#f43f5e'
                                : proj.waterCategory === 'CAT_2'
                                ? '#f59e0b'
                                : '#10b981'
                            }
                            glyphColor="#090d16"
                            borderColor="#ffffff"
                          />
                        </AdvancedMarker>
                      ))}
                    </GoogleMap>
                  </APIProvider>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400">
                    <MapIcon className="w-6 h-6 text-cyan-400 mb-2" />
                    <div className="font-semibold text-white">
                      Austin Metro Geospatial Sector Overlay
                    </div>
                    <div className="mt-1 font-mono tabular-nums">
                      Tracking {projects.length} active losses & {fieldUnits.length} field units
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Unassigned Radar */}
              <div className="space-y-2.5" data-testid="unassigned-radar-section">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-400">
                    Unassigned Loss Radar ({unassignedProjects.length})
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">
                    Awaiting Strike Unit Assignment
                  </span>
                </div>

                {unassignedProjects.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#090d16] border border-white/10 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>All active loss files have assigned mitigation units on-site.</span>
                  </div>
                ) : (
                  unassignedProjects.map((loss) => (
                    <div
                      key={loss.id}
                      data-testid={`unassigned-loss-${loss.id}`}
                      className="p-3.5 rounded-xl bg-[#090d16] border border-amber-500/30 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold tabular-nums text-amber-400">
                          {loss.lossNumber} · {loss.waterCategory} / {loss.lossClass}
                        </span>
                        <AssetCardSyncBadge entityId={loss.id} />
                      </div>
                      <div className="text-sm font-semibold text-white">{loss.clientName}</div>
                      <div className="text-xs text-slate-400">{loss.lossAddress}</div>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          GPS: {loss.latitude.toFixed(4)}°N, {loss.longitude.toFixed(4)}°W
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const available =
                              fieldUnits.find((u) => u.status === 'Available') ||
                              fieldUnits[0];
                            if (available) {
                              setDispatchModalUnit(available);
                              setSelectedLossId(loss.id);
                            }
                          }}
                          className="px-3 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg"
                        >
                          Assign Unit
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Active Sector Activity Board */}
              <div className="space-y-2.5" data-testid="sector-activity-section">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-cyan-400">
                    Active Sector Activity ({assignedSectors.length})
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">
                    Live S500 Stabilization
                  </span>
                </div>

                <div className="space-y-2.5">
                  {assignedSectors.map((sector) => {
                    const unit = fieldUnits.find((u) => u.id === sector.assignedUnitId);
                    return (
                      <div
                        key={sector.id}
                        data-testid={`active-sector-${sector.id}`}
                        className="p-3.5 rounded-xl bg-[#090d16] border border-white/10 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold tabular-nums text-emerald-400">
                            {sector.lossNumber} ← {unit?.callsign || sector.assignedUnitId}
                          </span>
                          <AssetCardSyncBadge entityId={sector.id} />
                        </div>
                        <div className="text-sm font-semibold text-white">{sector.clientName}</div>
                        <div className="text-xs text-slate-300">
                          Directive: {sector.dispatchDirective || 'S500 Stabilization & Grain Depression'}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                          <span>SLA: {sector.slaPriority || 'Emergency 60m'}</span>
                          <span>Stage: {sector.stage}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column 3 (3 cols): Service Pulse Event Log */}
        <div className="lg:col-span-3 obsidian-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Service Pulse Event Log</h2>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">CloudEvents 1.0</span>
          </div>

          <div className="space-y-2.5 max-h-[540px] overflow-y-auto">
            {pulseEvents.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                Listening for field dispatch, psychrometric, and IndexedDB sync events...
              </div>
            ) : (
              pulseEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-[#090d16] border border-white/5 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 font-mono tabular-nums text-[11px]">
                    <span
                      className={
                        evt.severity === 'hazard'
                          ? 'text-rose-400'
                          : evt.severity === 'warning'
                          ? 'text-amber-400'
                          : 'text-cyan-400'
                      }
                    >
                      {evt.source}
                    </span>
                    <span className="text-slate-500">
                      {new Date(evt.time).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="font-semibold text-white">{evt.title}</div>
                  <div className="text-slate-400 leading-relaxed">{evt.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dispatch Assignment Modal (`data-testid="dispatch-unit-modal"`) */}
      {dispatchModalUnit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          data-testid="dispatch-unit-modal"
        >
          <form
            onSubmit={handleConfirmDispatch}
            className="w-full max-w-lg rounded-2xl obsidian-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <div className="text-xs font-mono text-cyan-400">
                  STRIKE UNIT ASSIGNMENT PROTOCOL
                </div>
                <h3 className="text-base font-bold text-white">
                  Dispatch {dispatchModalUnit.callsign} ({dispatchModalUnit.leadTech})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalUnit(null)}
                className="p-1 text-slate-400 hover:text-white"
                aria-label="Close dispatch modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="dispatch-loss" className="block text-slate-300 mb-1">
                  Target Loss Dossier
                </label>
                <select
                  id="dispatch-loss"
                  value={selectedLossId}
                  onChange={(e) => setSelectedLossId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#090d16] border border-white/10 text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.lossNumber} — {p.clientName} ({p.waterCategory} / {p.lossClass})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dispatch-sla" className="block text-slate-300 mb-1">
                  Response SLA Priority
                </label>
                <select
                  id="dispatch-sla"
                  value={selectedSla}
                  onChange={(e) =>
                    setSelectedSla(
                      e.target.value as 'Emergency 60m' | 'Urgent 2h' | 'Standard 4h'
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-[#090d16] border border-white/10 font-mono text-white"
                >
                  <option value="Emergency 60m">Emergency 60m — Immediate Biohazard / CAT 3 Extraction</option>
                  <option value="Urgent 2h">Urgent 2h — Same-Shift Stabilization</option>
                  <option value="Standard 4h">Standard 4h — Scheduled Monitoring</option>
                </select>
              </div>

              <div>
                <label htmlFor="dispatch-directive" className="block text-slate-300 mb-1">
                  ANSI/IICRC S500 Field Directive
                </label>
                <textarea
                  id="dispatch-directive"
                  rows={3}
                  value={selectedDirective}
                  onChange={(e) => setSelectedDirective(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDispatchModalUnit(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="confirm-dispatch-submit-btn"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm Dispatch & Sync</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
