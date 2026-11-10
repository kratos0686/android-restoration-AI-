import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Zap,
  QrCode,
  Plus,
  DollarSign,
  Wind,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useApp } from '../AppContext';
import { LossClass, WaterCategory } from '../types';
import {
  calculateCircuitLoad,
  calculateS500EquipmentSizing,
} from '../utils/equipmentSizing';
import {
  AssetCardSyncBadge,
  AssetSyncStatusIndicator,
} from './AssetSyncStatusIndicator';

export const EquipmentManager: React.FC = () => {
  const {
    activeProject,
    deployEquipmentBatch,
    updateEquipmentRuntime,
  } = useApp();

  const totalChamberSqFt = useMemo(
    () =>
      activeProject.rooms.reduce((sum, r) => sum + r.areaSqFt, 0) || 600,
    [activeProject.rooms]
  );

  const [areaSqFt, setAreaSqFt] = useState<string>(String(totalChamberSqFt));
  const [heightFt, setHeightFt] = useState<string>('10');
  const [calcLossClass, setCalcLossClass] = useState<LossClass>(
    activeProject.lossClass
  );
  const [calcWaterCat, setCalcWaterCat] = useState<WaterCategory>(
    activeProject.waterCategory
  );
  const [ahamPpdRating, setAhamPpdRating] = useState<string>('125');
  const [scrubberCfmRating, setScrubberCfmRating] = useState<string>('500');

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scannedSerial, setScannedSerial] = useState('LGR-7000XLI-9941');
  const [scannedType, setScannedType] = useState<'LGR_DEHU' | 'AIR_MOVER' | 'HEPA_SCRUBBER'>('LGR_DEHU');
  const [scannedCircuit, setScannedCircuit] = useState('PANEL-A CKT-04 (15A)');

  const sizing = useMemo(
    () =>
      calculateS500EquipmentSizing({
        areaSqFt: Number(areaSqFt) || 600,
        heightFt: Number(heightFt) || 10,
        lossClass: calcLossClass,
        waterCategory: calcWaterCat,
        ahamPpdRating: Number(ahamPpdRating) || 125,
        scrubberCfmRating: Number(scrubberCfmRating) || 500,
      }),
    [areaSqFt, heightFt, calcLossClass, calcWaterCat, ahamPpdRating, scrubberCfmRating]
  );

  const circuitBurn = useMemo(
    () => calculateCircuitLoad(activeProject.equipment),
    [activeProject.equipment]
  );

  const handleOneClickDeployS500Fleet = async () => {
    const primaryRoom = activeProject.rooms[0] || {
      id: 'room_1',
      name: 'Main Chamber',
    };

    const batch = [
      {
        roomId: primaryRoom.id,
        roomName: primaryRoom.name,
        type: 'LGR_DEHU' as const,
        model: `Dri-Eaz LGR 7000XLi (${ahamPpdRating} PPD AHAM)`,
        serialNumber: `D7000-${Math.floor(1000 + Math.random() * 9000)}`,
        ampDraw: 8.3,
        dailyRate: 145,
        runtimeHours: 24,
        ahamPpd: Number(ahamPpdRating) || 125,
        status: 'Running' as const,
        circuitId: 'PANEL-C CKT-11 (15A)',
      },
      {
        roomId: primaryRoom.id,
        roomName: primaryRoom.name,
        type: 'AIR_MOVER' as const,
        model: 'Phoenix AirMax Radial High-Velocity',
        serialNumber: `PAM-${Math.floor(1000 + Math.random() * 9000)}`,
        ampDraw: 1.9,
        dailyRate: 38,
        runtimeHours: 24,
        cfm: 925,
        status: 'Running' as const,
        circuitId: 'PANEL-C CKT-11 (15A)',
      },
      {
        roomId: primaryRoom.id,
        roomName: primaryRoom.name,
        type: 'HEPA_SCRUBBER' as const,
        model: `DefendAir HEPA 500 AFD (6 ACH = ${sizing.requiredHepaCfm6Ach} CFM)`,
        serialNumber: `HEPA-${Math.floor(1000 + Math.random() * 9000)}`,
        ampDraw: 3.0,
        dailyRate: 120,
        runtimeHours: 24,
        cfm: Number(scrubberCfmRating) || 500,
        status: 'Running' as const,
        circuitId: 'PANEL-D CKT-12 (15A)',
      },
    ];

    await deployEquipmentBatch(activeProject.id, batch);
  };

  const handleQrDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    const primaryRoom = activeProject.rooms[0] || {
      id: 'room_1',
      name: 'Main Chamber',
    };
    await deployEquipmentBatch(activeProject.id, [
      {
        roomId: primaryRoom.id,
        roomName: primaryRoom.name,
        type: scannedType,
        model:
          scannedType === 'LGR_DEHU'
            ? 'Dri-Eaz LGR 7000XLi'
            : scannedType === 'HEPA_SCRUBBER'
            ? 'DefendAir HEPA 500 AFD'
            : 'Phoenix AirMax Radial',
        serialNumber: scannedSerial,
        ampDraw: scannedType === 'LGR_DEHU' ? 8.3 : scannedType === 'HEPA_SCRUBBER' ? 3.0 : 1.9,
        dailyRate: scannedType === 'LGR_DEHU' ? 145 : scannedType === 'HEPA_SCRUBBER' ? 120 : 38,
        runtimeHours: 24,
        status: 'Running',
        circuitId: scannedCircuit,
      },
    ]);
    setQrModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Visual Sync Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ANSI/IICRC S500 Equipment Manager & Psychrometric Sizing
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Calculate AHAM Pints/Day dehumidification, Air Movers (1 per 50–70 SF), 6 ACH HEPA CFM, and 15A circuit loads.
          </p>
        </div>

        <AssetSyncStatusIndicator contextLabel="Equipment Telemetry Sync" />
      </div>

      {/* Top KPI Row: Burn Rate & Circuit Load Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="obsidian-card rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Active Running Fleet</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {circuitBurn.activeUnits} Units
          </div>
          <div className="text-xs font-mono tabular-nums text-cyan-400">
            Dossier: {activeProject.lossNumber}
          </div>
        </div>

        <div className="obsidian-card rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Aggregate Amp Draw</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
            {circuitBurn.totalAmps.toFixed(1)} A
          </div>
          <div className="text-xs text-slate-400">
            Across {circuitBurn.circuits.length} branch circuit(s)
          </div>
        </div>

        <div className="obsidian-card rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Daily Equipment Burn Rate</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            ${circuitBurn.dailyBurnRate.toFixed(2)} / day
          </div>
          <div className="text-xs text-slate-400">Xactimate WTR Billing Schedule</div>
        </div>

        <div className="obsidian-card rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400">Accrued Project Fleet Total</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            ${circuitBurn.accruedTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400">Verified runtime telemetry</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Columns: ANSI/IICRC S500 Sizing Calculator & 15A Circuit Load */}
        <div className="lg:col-span-5 space-y-6">
          <div
            className="obsidian-card rounded-2xl p-5 space-y-4"
            data-testid="s500-sizing-calculator"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">
                  ANSI/IICRC S500 Equipment Sizing Calculator
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-cyan-400">
                Divisor: ÷{sizing.classDivisor}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="calc-area" className="block text-slate-300 mb-1">
                  Affected Floor Area (SF)
                </label>
                <input
                  id="calc-area"
                  type="number"
                  value={areaSqFt}
                  onChange={(e) => setAreaSqFt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 font-mono tabular-nums text-white"
                />
              </div>
              <div>
                <label htmlFor="calc-height" className="block text-slate-300 mb-1">
                  Ceiling Height (FT)
                </label>
                <input
                  id="calc-height"
                  type="number"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 font-mono tabular-nums text-white"
                />
              </div>
              <div>
                <label htmlFor="calc-class" className="block text-slate-300 mb-1">
                  Evaporation Load Class
                </label>
                <select
                  id="calc-class"
                  value={calcLossClass}
                  onChange={(e) => setCalcLossClass(e.target.value as LossClass)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 font-mono text-white"
                >
                  <option value="CLASS_1">CLASS_1 (÷100 Divisor)</option>
                  <option value="CLASS_2">CLASS_2 (÷50 Divisor)</option>
                  <option value="CLASS_3">CLASS_3 (÷40 Divisor)</option>
                  <option value="CLASS_4">CLASS_4 (÷40 Specialty)</option>
                </select>
              </div>
              <div>
                <label htmlFor="calc-cat" className="block text-slate-300 mb-1">
                  Water Contamination
                </label>
                <select
                  id="calc-cat"
                  value={calcWaterCat}
                  onChange={(e) => setCalcWaterCat(e.target.value as WaterCategory)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 font-mono text-white"
                >
                  <option value="CAT_1">CAT_1 (Sanitary)</option>
                  <option value="CAT_2">CAT_2 (Gray Water)</option>
                  <option value="CAT_3">CAT_3 (Black Water)</option>
                </select>
              </div>
              <div>
                <label htmlFor="calc-aham" className="block text-slate-300 mb-1">
                  Unit AHAM Rating (PPD)
                </label>
                <input
                  id="calc-aham"
                  type="number"
                  value={ahamPpdRating}
                  onChange={(e) => setAhamPpdRating(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 font-mono tabular-nums text-white"
                />
              </div>
              <div>
                <label htmlFor="calc-cfm" className="block text-slate-300 mb-1">
                  HEPA AFD Rating (CFM)
                </label>
                <input
                  id="calc-cfm"
                  type="number"
                  value={scrubberCfmRating}
                  onChange={(e) => setScrubberCfmRating(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 font-mono tabular-nums text-white"
                />
              </div>
            </div>

            {/* S500 Computed Output Matrix */}
            <div className="p-4 rounded-xl bg-[#090d16] border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Chamber Volume</span>
                <span className="font-mono font-semibold tabular-nums text-white">
                  {sizing.cubicFeet.toLocaleString()} CF
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Required Dehumidification (AHAM)</span>
                <span
                  data-testid="s500-required-ppd"
                  className="font-mono font-bold tabular-nums text-cyan-400"
                >
                  {sizing.requiredAhamPpd} Pints/Day ({sizing.recommendedDehumidifiers} LGR Units)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Air Movers (1 per 50–70 SF)</span>
                <span
                  data-testid="s500-recommended-airmovers"
                  className="font-mono font-bold tabular-nums text-emerald-400"
                >
                  {sizing.recommendedAirMoversMin}–{sizing.recommendedAirMoversMax} Units (Target: {sizing.recommendedAirMoversTarget})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">HEPA Scrubbers (6 ACH CFM)</span>
                <span
                  data-testid="s500-required-hepa-cfm"
                  className="font-mono font-bold tabular-nums text-amber-400"
                >
                  {sizing.requiredHepaCfm6Ach} CFM ({sizing.recommendedHepaScrubbers} AFD Units)
                </span>
              </div>
              <div className="pt-2 border-t border-white/5 text-[11px] font-mono tabular-nums text-slate-400">
                {sizing.iicrcFormulaNote}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleOneClickDeployS500Fleet()}
              data-testid="one-click-deploy-fleet-btn"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>One-Click Deploy Calculated S500 Fleet to Loss</span>
            </button>
          </div>

          {/* 15A Circuit Breaker Load Calculator */}
          <div className="obsidian-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">
                  15A Circuit Breaker Load Monitor (NEC 80% = 12.0A)
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {circuitBurn.circuits.map((ckt) => (
                <div
                  key={ckt.circuitId}
                  className="p-3.5 rounded-xl bg-[#090d16] border border-white/10 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-white">
                      {ckt.circuitId} ({ckt.equipmentCount} units)
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        ckt.status.startsWith('Overload')
                          ? 'text-rose-400'
                          : ckt.status.startsWith('Warning')
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {ckt.totalAmps.toFixed(1)}A / 15.0A ({ckt.utilizationPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        ckt.status.startsWith('Overload')
                          ? 'bg-rose-500'
                          : ckt.status.startsWith('Warning')
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, ckt.utilizationPercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{ckt.status}</span>
                    <span>Safe Continuous Limit: 12.0A</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Deployed Fleet Roster, QR Scanner & Runtime Hours Editor */}
        <div className="lg:col-span-7 obsidian-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">
                Deployed Equipment Roster ({activeProject.equipment.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              data-testid="open-qr-scanner-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan Asset QR Tag</span>
            </button>
          </div>

          <div className="space-y-3">
            {activeProject.equipment.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No drying or HEPA filtration assets deployed yet. Run the S500 Calculator on the left to deploy a fleet.
              </div>
            ) : (
              activeProject.equipment.map((eq) => {
                const daysBilled = Math.max(1, Math.ceil(eq.runtimeHours / 24));
                const lineTotal = daysBilled * eq.dailyRate;
                return (
                  <div
                    key={eq.id}
                    data-testid={`equipment-card-${eq.id}`}
                    className="p-4 rounded-xl bg-[#090d16] border border-white/10 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-400">
                            {eq.type}
                          </span>
                          <span className="text-slate-600" aria-hidden="true">·</span>
                          <span className="text-xs font-mono tabular-nums text-slate-300">
                            SN: {eq.serialNumber}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-white mt-0.5">
                          {eq.model}
                        </div>
                        <div className="text-xs text-slate-400">
                          Chamber: {eq.roomName} · Circuit: {eq.circuitId}
                        </div>
                      </div>

                      <AssetCardSyncBadge entityId={eq.id} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/5 text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Amp Draw</span>
                        <span className="text-white font-semibold">{eq.ampDraw.toFixed(1)} A</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Daily Burn</span>
                        <span className="text-emerald-400 font-semibold">${eq.dailyRate}/day</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Runtime Hours</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <input
                            type="number"
                            aria-label={`Runtime hours for ${eq.serialNumber}`}
                            value={eq.runtimeHours}
                            onChange={(e) =>
                              void updateEquipmentRuntime(
                                activeProject.id,
                                eq.id,
                                Number(e.target.value) || 0,
                                eq.status
                              )
                            }
                            className="w-16 px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-white font-mono tabular-nums"
                          />
                          <span className="text-slate-400">hrs</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Status / Total</span>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <select
                            aria-label={`Status for ${eq.serialNumber}`}
                            value={eq.status}
                            onChange={(e) =>
                              void updateEquipmentRuntime(
                                activeProject.id,
                                eq.id,
                                eq.runtimeHours,
                                e.target.value as 'Running' | 'Standby' | 'Extracted'
                              )
                            }
                            className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-xs text-white"
                          >
                            <option value="Running">Running</option>
                            <option value="Standby">Standby</option>
                            <option value="Extracted">Extracted</option>
                          </select>
                          <span className="text-white font-semibold">${lineTotal}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* QR Code Asset Scanner Modal */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleQrDeploy}
            className="w-full max-w-md rounded-2xl obsidian-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  QR Asset Tag Telemetry Scanner
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
                aria-label="Close QR scanner modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="qr-serial" className="block text-slate-300 mb-1">
                  Scanned Asset Serial Number
                </label>
                <input
                  id="qr-serial"
                  type="text"
                  value={scannedSerial}
                  onChange={(e) => setScannedSerial(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 font-mono text-white"
                />
              </div>

              <div>
                <label htmlFor="qr-type" className="block text-slate-300 mb-1">
                  Asset Classification
                </label>
                <select
                  id="qr-type"
                  value={scannedType}
                  onChange={(e) =>
                    setScannedType(
                      e.target.value as 'LGR_DEHU' | 'AIR_MOVER' | 'HEPA_SCRUBBER'
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 text-white"
                >
                  <option value="LGR_DEHU">LGR Dehumidifier (8.3A · $145/day)</option>
                  <option value="AIR_MOVER">High-Velocity Air Mover (1.9A · $38/day)</option>
                  <option value="HEPA_SCRUBBER">HEPA Air Scrubber 500 CFM (3.0A · $120/day)</option>
                </select>
              </div>

              <div>
                <label htmlFor="qr-ckt" className="block text-slate-300 mb-1">
                  Assigned 15A Branch Circuit
                </label>
                <input
                  id="qr-ckt"
                  type="text"
                  value={scannedCircuit}
                  onChange={(e) => setScannedCircuit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 font-mono text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg"
              >
                Bind & Deploy Asset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
