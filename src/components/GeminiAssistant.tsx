import React, { useState } from 'react';
import { Mic, Send, Cpu, CheckCircle2, FileText } from 'lucide-react';
import { useApp } from '../AppContext';
import { intelligenceRouter } from '../services/IntelligenceRouter';

export const GeminiAssistant: React.FC = () => {
  const {
    activeProject,
    addReading,
    addScopeLineItem,
    saveAiReport,
  } = useApp();

  const [transcript, setTranscript] = useState(
    'Executive Boardroom reading 74.2°F, 48.5% RH, North drywall wicking at 27.6% MC. Add 32 LF of 24-inch CAT 2 flood cut.'
  );
  const [isParsing, setIsParsing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleParseAndCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;
    setIsParsing(true);
    setLastResult(null);

    try {
      const parsed = await intelligenceRouter.parseFieldIntent(transcript);
      const primaryRoom = activeProject.rooms[0] || {
        id: 'room_1',
        name: parsed.reading.roomName || 'Primary Chamber',
      };

      await addReading(activeProject.id, {
        roomId: primaryRoom.id,
        roomName: parsed.reading.roomName || primaryRoom.name,
        tempF: parsed.reading.tempF,
        rhPercent: parsed.reading.rhPercent,
        mcPercent: parsed.reading.mcPercent,
      });

      await addScopeLineItem(activeProject.id, {
        xactCode: parsed.scopeItem.xactCode,
        category: 'Field Voice Intent',
        description: parsed.scopeItem.description,
        quantity: parsed.scopeItem.quantity,
        unit: (parsed.scopeItem.unit as 'SF' | 'LF' | 'EA' | 'DA' | 'HR') || 'LF',
        unitPrice: parsed.scopeItem.unitPrice,
        roomName: parsed.reading.roomName || primaryRoom.name,
        iicrcJustification: parsed.scopeItem.iicrcJustification,
      });

      setLastResult(parsed.summary);
    } catch (err) {
      setLastResult(
        err instanceof Error ? err.message : 'Field intent parsed via local S500 fallback.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateClaudeReport = async () => {
    setIsParsing(true);
    try {
      const report = await intelligenceRouter.generateClaudeReport(activeProject);
      await saveAiReport(activeProject.id, report.reportMarkdown);
      setLastResult(`Generated formal IICRC S500 & S520 report via ${report.engine}.`);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Hybrid AI Field Intelligence (Gemini 3 Flash + Claude 3.7 Sonnet Pipeline)
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Parse unstructured technician voice/text field logs into psychrometric readings (`Type.OBJECT` JSON schema) and Xactimate line items.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleGenerateClaudeReport()}
          disabled={isParsing}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg"
        >
          <FileText className="w-4 h-4" />
          <span>Run Claude 3.7 Sonnet Carrier Report Pipeline</span>
        </button>
      </div>

      <form
        onSubmit={handleParseAndCommit}
        className="obsidian-card rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">
              Technician Voice / Text Telemetry Parser (`gemini-3-flash-preview`)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Active Dossier: {activeProject.lossNumber}
          </span>
        </div>

        <textarea
          rows={3}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          aria-label="Technician field log input"
          className="w-full px-4 py-3 rounded-xl bg-[#090d16] border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setTranscript(
                'IDF Breakroom chamber at 72.8°F, 41.0% RH, sill plate at 17.5% MC. Add 2 HEPA air scrubber days.'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
          >
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Load Sample Voice Dictation</span>
          </button>

          <button
            type="submit"
            disabled={isParsing}
            data-testid="parse-field-intent-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isParsing
                ? 'Extracting Telemetry...'
                : 'Parse Intent → Log Psychrometrics & Scope'}
            </span>
          </button>
        </div>

        {lastResult && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{lastResult}</span>
          </div>
        )}
      </form>

      {activeProject.aiSummaryReport && (
        <div className="obsidian-card rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-white">
            Latest Synthesized Carrier Dossier Narrative
          </h3>
          <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-[#090d16] p-4 rounded-xl border border-white/5">
            {activeProject.aiSummaryReport}
          </div>
        </div>
      )}
    </div>
  );
};
