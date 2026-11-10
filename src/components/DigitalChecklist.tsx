import React from 'react';
import { CheckSquare, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useApp } from '../AppContext';
import { LossClass, WaterCategory } from '../types';

export const DigitalChecklist: React.FC = () => {
  const {
    activeProject,
    toggleChecklistTask,
    updateProjectStage,
  } = useApp();

  const completedCount = activeProject.checklist.filter((t) => t.completed).length;
  const totalCount = activeProject.checklist.length;
  const completionPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            7-Phase Adaptive ANSI/IICRC S500 & S520 Mitigation Checklist
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Protocols adapt dynamically to {activeProject.lossNumber}&apos;s Water Contamination Category ({activeProject.waterCategory}) and Evaporation Class ({activeProject.lossClass}).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label htmlFor="chk-cat-select" className="sr-only">
              Water Category
            </label>
            <select
              id="chk-cat-select"
              value={activeProject.waterCategory}
              onChange={(e) =>
                void updateProjectStage(
                  activeProject.id,
                  activeProject.stage,
                  e.target.value as WaterCategory,
                  activeProject.lossClass
                )
              }
              className="px-3 py-2 rounded-lg bg-[#0c121e] border border-white/10 text-xs font-mono text-white"
            >
              <option value="CAT_1">CAT_1 — Sanitary</option>
              <option value="CAT_2">CAT_2 — Gray Water</option>
              <option value="CAT_3">CAT_3 — Black Water Biohazard</option>
            </select>
          </div>

          <div>
            <label htmlFor="chk-class-select" className="sr-only">
              Loss Class
            </label>
            <select
              id="chk-class-select"
              value={activeProject.lossClass}
              onChange={(e) =>
                void updateProjectStage(
                  activeProject.id,
                  activeProject.stage,
                  activeProject.waterCategory,
                  e.target.value as LossClass
                )
              }
              className="px-3 py-2 rounded-lg bg-[#0c121e] border border-white/10 text-xs font-mono text-white"
            >
              <option value="CLASS_1">CLASS_1</option>
              <option value="CLASS_2">CLASS_2</option>
              <option value="CLASS_3">CLASS_3</option>
              <option value="CLASS_4">CLASS_4</option>
            </select>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="obsidian-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">
            Adaptive Compliance Completion ({completedCount} / {totalCount} Tasks Verified)
          </span>
          <span className="font-mono font-bold tabular-nums text-cyan-400">
            {completionPct}%
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* 7-Phase Tasks */}
      <div className="space-y-3">
        {activeProject.checklist.map((task) => (
          <div
            key={task.id}
            onClick={() => void toggleChecklistTask(activeProject.id, task.id)}
            role="checkbox"
            aria-checked={task.completed}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                void toggleChecklistTask(activeProject.id, task.id);
              }
            }}
            className={`cursor-pointer p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
              task.completed
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'obsidian-card hover:border-cyan-500/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <CheckSquare className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                  <span className="text-cyan-400 font-semibold">{task.phaseTitle}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-300">{task.code}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400">{task.standardRef}</span>
                </div>
                <div
                  className={`text-sm font-medium ${
                    task.completed ? 'text-slate-300 line-through' : 'text-white'
                  }`}
                >
                  {task.title}
                </div>
              </div>
            </div>

            {task.safetyCritical && (
              <div className="flex items-center gap-1 text-xs font-mono text-rose-400 shrink-0">
                <ShieldAlert className="w-4 h-4" />
                <span>OSHA / S520 Critical</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
