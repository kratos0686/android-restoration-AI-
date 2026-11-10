import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Cpu,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useApp } from '../AppContext';
import { calculateCircuitLoad } from '../utils/equipmentSizing';
import { intelligenceRouter } from '../services/IntelligenceRouter';
import { SignaturePad } from './SignaturePad';

export const ProjectDocumentationCenter: React.FC = () => {
  const {
    activeProject,
    addScopeLineItem,
    saveAiReport,
  } = useApp();

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiEngineUsed, setAiEngineUsed] = useState<string>(
    'Claude 3.7 Sonnet / Gemini 3.1 Pro Hybrid Pipeline'
  );

  // Add Xactimate Line Item Form
  const [xactCode, setXactCode] = useState('WTR FCV');
  const [xactDesc, setXactDesc] = useState(
    'Remove & bag non-salvageable carpet pad — CAT 2/3 mitigation'
  );
  const [xactQty, setXactQty] = useState('340');
  const [xactUnit, setXactUnit] = useState<'SF' | 'LF' | 'EA' | 'DA' | 'HR'>('SF');
  const [xactPrice, setXactPrice] = useState('1.15');
  const [xactJust, setXactJust] = useState(
    'ANSI/IICRC S500 §13.5.2 — Porous carpet cushion is unconditionally non-salvageable in CAT 2/3 water intrusions.'
  );

  const fleetBurn = useMemo(
    () => calculateCircuitLoad(activeProject.equipment),
    [activeProject.equipment]
  );

  const scopeTotal = useMemo(
    () =>
      activeProject.scopeItems.reduce((sum, item) => sum + item.total, 0),
    [activeProject.scopeItems]
  );

  const handleRunClaudePipeline = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await intelligenceRouter.generateClaudeReport(activeProject);
      setAiEngineUsed(res.engine);
      await saveAiReport(activeProject.id, res.reportMarkdown);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAddScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xactCode.trim() || !xactDesc.trim()) return;
    await addScopeLineItem(activeProject.id, {
      xactCode: xactCode.trim().toUpperCase(),
      category: 'Mitigation',
      description: xactDesc.trim(),
      quantity: Number(xactQty) || 1,
      unit: xactUnit,
      unitPrice: Number(xactPrice) || 1,
      roomName: activeProject.rooms[0]?.name || 'Main Chamber',
      iicrcJustification: xactJust.trim(),
    });
  };

  const handleDownloadJsPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    let y = 44;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(
      `RESTORATION-AI — ANSI/IICRC S500 & S520 COMPLIANCE DOSSIER`,
      40,
      y
    );
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
      `Loss File: ${activeProject.lossNumber} | Client: ${activeProject.clientName}`,
      40,
      y
    );
    y += 14;
    doc.text(
      `Verified Loss Address: ${activeProject.lossAddress} (${activeProject.granularity})`,
      40,
      y
    );
    y += 14;
    doc.text(
      `GPS: ${activeProject.latitude.toFixed(4)} N, ${activeProject.longitude.toFixed(4)} W | Classification: ${activeProject.waterCategory} / ${activeProject.lossClass}`,
      40,
      y
    );
    y += 22;

    doc.setFont('helvetica', 'bold');
    doc.text('1. Executive Summary & Psychrometric Narrative', 40, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    const summaryText =
      activeProject.aiSummaryReport ||
      `Mitigation performed in strict compliance with ANSI/IICRC S500 (${activeProject.waterCategory} / ${activeProject.lossClass}) and S520 containment protocols.`;
    const splitSummary = doc.splitTextToSize(summaryText.replace(/#/g, ''), 520);
    doc.text(splitSummary.slice(0, 12), 40, y);
    y += Math.min(12, splitSummary.length) * 12 + 16;

    doc.setFont('helvetica', 'bold');
    doc.text('2. Psychrometric & Moisture Matrix', 40, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    for (const r of activeProject.readings.slice(0, 5)) {
      doc.text(
        `${r.roomName}: ${r.tempF}F | ${r.rhPercent}% RH | ${r.gpp} GPP | Dew Point: ${r.dewPointF}F | ${r.mcPercent}% MC`,
        40,
        y
      );
      y += 12;
    }
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.text(
      `3. Deployed Equipment (${fleetBurn.activeUnits} Active | $${fleetBurn.dailyBurnRate}/day | Total: $${fleetBurn.accruedTotalCost})`,
      40,
      y
    );
    y += 14;
    doc.setFont('helvetica', 'normal');
    for (const eq of activeProject.equipment.slice(0, 5)) {
      doc.text(
        `${eq.type} (${eq.serialNumber}) - ${eq.model}: ${eq.ampDraw}A | ${eq.runtimeHours} hrs | $${eq.dailyRate}/day`,
        40,
        y
      );
      y += 12;
    }
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.text(
      `4. Xactimate Scope of Work (Subtotal: $${scopeTotal.toFixed(2)})`,
      40,
      y
    );
    y += 14;
    doc.setFont('helvetica', 'normal');
    for (const item of activeProject.scopeItems.slice(0, 5)) {
      doc.text(
        `${item.xactCode} - ${item.description}: ${item.quantity} ${item.unit} @ $${item.unitPrice} = $${item.total.toFixed(2)}`,
        40,
        y
      );
      y += 12;
    }
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('5. Cryptographic Digital Authorizations (SHA-256)', 40, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    for (const auth of activeProject.authorizations) {
      doc.text(
        `${auth.signerName} (${auth.signerRole}) - ${auth.authorizationType} | SHA-256: ${auth.verificationHash.slice(0, 24)}...`,
        40,
        y
      );
      y += 12;
    }

    doc.save(`${activeProject.lossNumber}_IICRC_S500_Dossier.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Project Documentation Center & IICRC PDF Dossier Generator
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Compile 6-section carrier-ready ANSI/IICRC S500 & S520 reports, Xactimate line items, and SHA-256 digital signatures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleRunClaudePipeline()}
            disabled={isGeneratingAi}
            data-testid="run-claude-report-btn"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap"
          >
            <Cpu className="w-4 h-4" />
            <span>
              {isGeneratingAi
                ? 'Synthesizing Claude 3.7 Report...'
                : 'Synthesize Claude 3.7 / Gemini S500 Narrative'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            data-testid="generate-pdf-report-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>Generate PDF Report</span>
          </button>
        </div>
      </div>

      {/* 6-Section Dossier Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* Executive Summary Narrative */}
          <div className="obsidian-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white">
                Section 1 & 2: Loss Classification & Claude 3.7 / Gemini Technical Narrative
              </h2>
              <span className="text-xs font-mono text-cyan-400">{aiEngineUsed}</span>
            </div>
            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-[#090d16] p-4 rounded-xl border border-white/5">
              {activeProject.aiSummaryReport ||
                `Loss File ${activeProject.lossNumber} (${activeProject.clientName}) classified as ANSI/IICRC S500 ${activeProject.waterCategory} / ${activeProject.lossClass} at ${activeProject.lossAddress}.\n\nClick "Synthesize Claude 3.7 / Gemini S500 Narrative" above to generate a full carrier-ready psychrometric and scope justification report.`}
            </div>
          </div>

          {/* Xactimate Scope of Work Table + Add Line Item */}
          <div className="obsidian-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white">
                Section 5: Xactimate Scope of Work ({activeProject.scopeItems.length} Line Items)
              </h2>
              <span className="text-sm font-mono font-bold tabular-nums text-emerald-400">
                Subtotal: ${scopeTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Description & S500 Justification</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                    <th className="py-2 pr-3 text-right">Unit</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activeProject.scopeItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-3 font-mono font-semibold text-cyan-400 whitespace-nowrap">
                        {item.xactCode}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="text-white font-medium">{item.description}</div>
                        <div className="text-[11px] text-slate-400">{item.iicrcJustification}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-200">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-300">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-white">
                        ${item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form
              onSubmit={handleAddScope}
              className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-xs"
            >
              <input
                type="text"
                value={xactCode}
                onChange={(e) => setXactCode(e.target.value)}
                placeholder="Xact Code"
                aria-label="Xactimate code"
                className="px-2.5 py-2 rounded bg-[#090d16] border border-white/10 font-mono text-white"
              />
              <input
                type="text"
                value={xactDesc}
                onChange={(e) => setXactDesc(e.target.value)}
                placeholder="Line item description"
                aria-label="Line item description"
                className="sm:col-span-2 px-2.5 py-2 rounded bg-[#090d16] border border-white/10 text-white"
              />
              <input
                type="number"
                value={xactQty}
                onChange={(e) => setXactQty(e.target.value)}
                placeholder="Qty"
                aria-label="Quantity"
                className="px-2.5 py-2 rounded bg-[#090d16] border border-white/10 font-mono tabular-nums text-white"
              />
              <input
                type="number"
                step="0.01"
                value={xactPrice}
                onChange={(e) => setXactPrice(e.target.value)}
                placeholder="Unit $"
                aria-label="Unit price"
                className="px-2.5 py-2 rounded bg-[#090d16] border border-white/10 font-mono tabular-nums text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 px-3 py-2 font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right 5 Columns: Signature Pad & Verified Authorizations */}
        <div className="lg:col-span-5 space-y-6">
          <SignaturePad />

          <div className="obsidian-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                Section 6: Cryptographic Digital Authorizations ({activeProject.authorizations.length})
              </h3>
            </div>
            <div className="space-y-2.5">
              {activeProject.authorizations.map((auth) => (
                <div
                  key={auth.id}
                  className="p-3 rounded-xl bg-[#090d16] border border-white/10 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {auth.signerName} · {auth.signerRole}
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-400">
                      {new Date(auth.signedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-cyan-400">{auth.authorizationType}</div>
                  <div className="font-mono tabular-nums text-[11px] text-emerald-400 truncate">
                    SHA-256: {auth.verificationHash}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Printable 6-Section IICRC PDF Dossier Preview Modal */}
      {previewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          data-testid="pdf-report-preview-modal"
        >
          <div className="w-full max-w-4xl rounded-2xl obsidian-card p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10 no-print">
              <div>
                <div className="text-xs font-mono text-cyan-400">
                  ANSI/IICRC S500 & S520 FORMAL CARRIER DOSSIER
                </div>
                <h2 className="text-lg font-bold text-white">
                  {activeProject.lossNumber} — 6-Section Printable Mitigation Report
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Dossier</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJsPdf}
                  data-testid="download-jspdf-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF (jsPDF)</span>
                </button>
                <button
                  type="button"
                  data-testid="close-pdf-preview-btn"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                  aria-label="Close PDF preview modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 6-Section Printable Body */}
            <div className="space-y-5 text-xs bg-[#090d16] p-6 rounded-xl border border-white/10">
              {/* 1. Loss Metadata & Hazard Classification */}
              <section className="space-y-2 pb-4 border-b border-white/10">
                <h3 className="text-sm font-bold text-cyan-400">
                  1. Loss Metadata & ANSI/IICRC S500 Hazard Classification
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono tabular-nums">
                  <div>
                    <span className="text-slate-400 block">Loss File:</span>
                    <span className="text-white font-semibold">{activeProject.lossNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Client:</span>
                    <span className="text-white font-semibold">{activeProject.clientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Carrier & Claim:</span>
                    <span className="text-white font-semibold">
                      {activeProject.insuranceCarrier} ({activeProject.claimNumber})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Verified Address:</span>
                    <span className="text-white">{activeProject.lossAddress}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">GPS & Granularity:</span>
                    <span className="text-white">
                      {activeProject.latitude.toFixed(4)}°N, {activeProject.longitude.toFixed(4)}°W ({activeProject.granularity})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">S500 Classification:</span>
                    <span className="text-amber-400 font-bold">
                      {activeProject.waterCategory} / {activeProject.lossClass}
                    </span>
                  </div>
                </div>
              </section>

              {/* 2. Executive Summary */}
              <section className="space-y-2 pb-4 border-b border-white/10">
                <h3 className="text-sm font-bold text-cyan-400">
                  2. Executive Summary & Technical Drying Narrative
                </h3>
                <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                  {activeProject.aiSummaryReport ||
                    `Emergency mitigation and psychrometric stabilization executed per ANSI/IICRC S500 (${activeProject.waterCategory} / ${activeProject.lossClass}) and ANSI/IICRC S520 negative-pressure containment standards.`}
                </p>
              </section>

              {/* 3. Psychrometric & Moisture Matrix */}
              <section className="space-y-2 pb-4 border-b border-white/10">
                <h3 className="text-sm font-bold text-cyan-400">
                  3. Psychrometric & Substrate Moisture Matrix
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono tabular-nums">
                  {activeProject.readings.map((r) => (
                    <div key={r.id} className="p-2.5 rounded bg-slate-900/90 border border-white/5">
                      <div className="text-white font-semibold">{r.roomName}</div>
                      <div className="text-slate-300">
                        {r.tempF.toFixed(1)}°F · {r.rhPercent.toFixed(1)}% RH · {r.gpp.toFixed(1)} GPP · Dew: {r.dewPointF.toFixed(1)}°F · {r.mcPercent.toFixed(1)}% MC
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 4. Deployed Equipment & Burn Rate */}
              <section className="space-y-2 pb-4 border-b border-white/10">
                <h3 className="text-sm font-bold text-cyan-400">
                  4. Deployed Equipment Fleet & Burn Rate (${fleetBurn.dailyBurnRate.toFixed(2)}/day · Total: ${fleetBurn.accruedTotalCost.toFixed(2)})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono tabular-nums">
                  {activeProject.equipment.map((eq) => (
                    <div key={eq.id} className="p-2.5 rounded bg-slate-900/90 border border-white/5">
                      <div className="text-white font-semibold">
                        {eq.type} — {eq.model} ({eq.serialNumber})
                      </div>
                      <div className="text-slate-400">
                        {eq.roomName} · {eq.ampDraw.toFixed(1)}A · {eq.runtimeHours} hrs · ${eq.dailyRate}/day
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 5. Xactimate Scope of Work */}
              <section className="space-y-2 pb-4 border-b border-white/10">
                <h3 className="text-sm font-bold text-cyan-400">
                  5. Xactimate Scope of Work (${scopeTotal.toFixed(2)})
                </h3>
                <div className="space-y-1.5 font-mono tabular-nums">
                  {activeProject.scopeItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span>
                        {item.xactCode} — {item.description} ({item.quantity} {item.unit})
                      </span>
                      <span className="text-white font-semibold">${item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* 6. Cryptographic Digital Authorizations */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-cyan-400">
                  6. Cryptographic Digital Authorizations (SHA-256 Verified)
                </h3>
                <div className="space-y-2 font-mono tabular-nums">
                  {activeProject.authorizations.map((a) => (
                    <div key={a.id} className="p-2.5 rounded bg-slate-900/90 border border-white/5">
                      <div className="text-white font-semibold">
                        {a.signerName} ({a.signerRole}) — {a.authorizationType}
                      </div>
                      <div className="text-emerald-400 text-[11px] break-all">
                        SHA-256: {a.verificationHash}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
