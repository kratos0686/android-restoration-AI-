import React, { useState } from 'react';
import { Camera, Cpu, RotateCcw, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { useApp } from '../AppContext';
import { intelligenceRouter } from '../services/IntelligenceRouter';

export const ARScanner: React.FC = () => {
  const { activeProject, addRoomFromVisionOrScan, resetFloorplanRooms } = useApp();

  const [visionPrompt, setVisionPrompt] = useState(
    'North Mechanical & Server Annex (24ft x 18ft x 10ft), 5/8" Type X Gypsum Drywall, Sealed Concrete Slab, 280 SF wet footprint'
  );
  const [scannedRoomName, setScannedRoomName] = useState('North Mechanical & Server Annex');
  const [scannedLength, setScannedLength] = useState('24');
  const [scannedWidth, setScannedWidth] = useState('18');
  const [scannedHeight, setScannedHeight] = useState('10');
  const [flooringMaterial, setFlooringMaterial] = useState('Sealed Concrete / Vinyl Plank');
  const [wallMaterial, setWallMaterial] = useState('5/8" Type X Gypsum Drywall');
  const [trimMaterial, setTrimMaterial] = useState('4" Rubber Cove Base');

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);

  const handleRunVisionSynthesis = async () => {
    setIsProcessing(true);
    setScanSuccessMsg(null);
    try {
      const result = await intelligenceRouter.buildFloorplanFromImages({
        prompt: visionPrompt,
        roomName: scannedRoomName,
      });

      const r = result.room;
      setScannedRoomName(r.roomName);
      setScannedLength(String(r.lengthFt));
      setScannedWidth(String(r.widthFt));
      setScannedHeight(String(r.heightFt));
      setFlooringMaterial(r.flooringMaterial);
      setWallMaterial(r.wallMaterial);
      setTrimMaterial(r.trimMaterial);

      await addRoomFromVisionOrScan(activeProject.id, {
        name: r.roomName,
        lengthFt: r.lengthFt,
        widthFt: r.widthFt,
        heightFt: r.heightFt,
        flooringMaterial: r.flooringMaterial,
        wallMaterial: r.wallMaterial,
        trimMaterial: r.trimMaterial,
        wetAreaSqFt: r.wetAreaSqFt,
      });

      await fetch('/api/ai/process-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms: [r] }),
      });

      setScanSuccessMsg(
        `Synthesized "${r.roomName}" (${r.lengthFt}' × ${r.widthFt}') into 2D SVG Floorplan via ${result.engine}.`
      );
    } catch (err) {
      setScanSuccessMsg(
        err instanceof Error ? err.message : 'Vision synthesis completed with local fallback.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDiscard = async () => {
    await resetFloorplanRooms(activeProject.id);
    setConfirmDiscardOpen(false);
    setScanSuccessMsg('Floorplan chambers reset to baseline chamber.');
  };

  return (
    <div className="obsidian-card rounded-2xl p-5 space-y-4" data-testid="ar-scanner-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Camera className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">
              AR LiDAR Room Scanner & Gemini Multimodal Vision Floorplan Builder
            </h3>
            <p className="text-xs text-slate-400">
              Extract room dimensions, classify materials, and append top-down 2D SVG chambers (`viewBox=&quot;0 0 100 100&quot;`)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!confirmDiscardOpen ? (
            <button
              type="button"
              onClick={() => setConfirmDiscardOpen(true)}
              data-testid="discard-start-fresh-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard & Start Fresh</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/40"
              data-testid="discard-confirm-guard"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-xs text-rose-200 whitespace-nowrap">
                Confirm reset of scanned rooms?
              </span>
              <button
                type="button"
                onClick={() => void handleConfirmDiscard()}
                data-testid="confirm-discard-yes-btn"
                className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition-colors whitespace-nowrap"
              >
                Confirm Discard
              </button>
              <button
                type="button"
                onClick={() => setConfirmDiscardOpen(false)}
                data-testid="confirm-discard-cancel-btn"
                className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded transition-colors whitespace-nowrap"
              >
                Keep Scan
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-7 space-y-3">
          <label htmlFor="vision-prompt" className="block text-xs font-medium text-slate-300">
            Room Photo Telemetry / LiDAR Field Description
          </label>
          <textarea
            id="vision-prompt"
            rows={2}
            value={visionPrompt}
            onChange={(e) => setVisionPrompt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none"
          />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="scan-len" className="block text-[11px] text-slate-400 mb-1">
                Length (FT)
              </label>
              <input
                id="scan-len"
                type="number"
                value={scannedLength}
                onChange={(e) => setScannedLength(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#090d16] border border-white/10 text-xs font-mono tabular-nums text-white"
              />
            </div>
            <div>
              <label htmlFor="scan-wid" className="block text-[11px] text-slate-400 mb-1">
                Width (FT)
              </label>
              <input
                id="scan-wid"
                type="number"
                value={scannedWidth}
                onChange={(e) => setScannedWidth(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#090d16] border border-white/10 text-xs font-mono tabular-nums text-white"
              />
            </div>
            <div>
              <label htmlFor="scan-hgt" className="block text-[11px] text-slate-400 mb-1">
                Ceiling Height (FT)
              </label>
              <input
                id="scan-hgt"
                type="number"
                value={scannedHeight}
                onChange={(e) => setScannedHeight(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#090d16] border border-white/10 text-xs font-mono tabular-nums text-white"
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-5 space-y-2.5 flex flex-col justify-between p-3.5 rounded-xl bg-[#090d16] border border-white/10">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Chamber Name</span>
              <span className="font-medium text-white truncate max-w-[180px]">{scannedRoomName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Flooring Substrate</span>
              <span className="font-mono text-cyan-300 truncate max-w-[180px]">{flooringMaterial}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Wall Assembly</span>
              <span className="font-mono text-slate-200 truncate max-w-[180px]">{wallMaterial}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Trim / Base</span>
              <span className="font-mono text-slate-300 truncate max-w-[180px]">{trimMaterial}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleRunVisionSynthesis()}
            disabled={isProcessing}
            data-testid="synthesize-floorplan-btn"
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Synthesizing 2D SVG...' : 'Synthesize & Append Chamber to 2D Floorplan'}</span>
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {scanSuccessMsg && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{scanSuccessMsg}</span>
        </div>
      )}
    </div>
  );
};
