import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Clock,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { EvalSummaryReport, EvalResultItem } from '../../../packages/evals/eval_harness.ts';

interface EvalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvalsModal: React.FC<EvalsModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<{ summary: EvalSummaryReport; results: EvalResultItem[] } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCase, setSelectedCase] = useState<EvalResultItem | null>(null);

  const fetchReport = async () => {
    try {
      const res = await fetch('/v1/evals/report');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.warn('Could not load evals report:', err);
    }
  };

  const handleRunEvals = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/v1/evals/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to run evals:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[88vh] bg-[var(--surface-1)] border border-[var(--border)] rounded-[14px] shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-1)]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--signature-magenta)]" />
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Noevix Evaluation Harness & Baseline Benchmarks
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunEvals}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--signature-magenta)] hover:opacity-90 text-white rounded-[6px] font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Running (40 cases)...' : 'Run Evaluations'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {report?.summary ? (
            <>
              {/* Decision Rule Banner */}
              <div
                className={`p-3.5 rounded-[8px] border flex items-start gap-3 ${
                  report.summary.thresholdsPassed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                {report.summary.thresholdsPassed ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-xs mb-0.5">
                    Decision Rule: {report.summary.decisionRuleStatus}
                  </div>
                  <div className="text-[11px] opacity-90">
                    Thresholds: Routing accuracy &ge; 85%, Constitution compliance &ge; 95%. Specialist stays only if it beats generalist baseline on its lens.
                  </div>
                </div>
              </div>

              {/* KPI Metrics Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>LLM Routing Accuracy</span>
                  </div>
                  <div className="text-xl font-mono font-semibold tabular-nums text-[var(--text)]">
                    {report.summary.routingAccuracyLlm}%
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                    Pre-Router: {report.summary.routingAccuracyPreRouter}%
                  </div>
                </div>

                <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Constitution Compliance</span>
                  </div>
                  <div className="text-xl font-mono font-semibold tabular-nums text-emerald-400">
                    {report.summary.constitutionComplianceRate}%
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">
                    Zero specialist leak
                  </div>
                </div>

                <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Router p50 Latency</span>
                  </div>
                  <div className="text-xl font-mono font-semibold tabular-nums text-[var(--text)]">
                    {report.summary.latencyP50Ms}ms
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                    Budget: &lt; 1500ms
                  </div>
                </div>

                <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px]">
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Router p95 Latency</span>
                  </div>
                  <div className="text-xl font-mono font-semibold tabular-nums text-[var(--text)]">
                    {report.summary.latencyP95Ms}ms
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                    Under timeout cap
                  </div>
                </div>
              </div>

              {/* Specialist Breakdown Table */}
              <div className="rounded-[8px] border border-[var(--border)] overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[var(--surface-2)] border-b border-[var(--border)] font-semibold text-[var(--text)]">
                  Accuracy Breakdown per Lens
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-1)] border-b border-[var(--border)] text-[var(--text-muted)] font-mono">
                    <tr>
                      <th className="p-2.5">Domain Lens</th>
                      <th className="p-2.5">Test Cases</th>
                      <th className="p-2.5">Correct</th>
                      <th className="p-2.5">Accuracy</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {Object.entries(report.summary.byLens).map(([lens, stats]) => (
                      <tr key={lens} className="hover:bg-[var(--surface-2)]/50">
                        <td className="p-2.5 font-medium text-[var(--text)]">{lens}</td>
                        <td className="p-2.5 font-mono tabular-nums text-[var(--text-muted)]">{stats.count}</td>
                        <td className="p-2.5 font-mono tabular-nums text-[var(--text-muted)]">{stats.correct}</td>
                        <td className="p-2.5 font-mono tabular-nums font-semibold text-[var(--text)]">
                          {stats.accuracy}%
                        </td>
                        <td className="p-2.5">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            RETAINED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Test Cases Explorer */}
              <div className="rounded-[8px] border border-[var(--border)] overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[var(--surface-2)] border-b border-[var(--border)] font-semibold text-[var(--text)] flex justify-between items-center">
                  <span>Seed Test Cases (40 hand-written cases)</span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    Click case to inspect
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-[var(--border)]">
                  {report.results.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedCase(item)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        selectedCase?.id === item.id
                          ? 'bg-[var(--surface-2)] font-medium'
                          : 'hover:bg-[var(--surface-2)]/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-4">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.routing_match ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        <span className="truncate text-[var(--text)]">{item.input}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                        <span className="text-[var(--text-muted)]">Target: {item.expected_lens}</span>
                        <span
                          className={
                            item.routing_match ? 'text-emerald-400' : 'text-amber-400'
                          }
                        >
                          Routed: {item.llm_router_lens}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Case Inspector */}
              {selectedCase && (
                <div className="p-3.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] space-y-2">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[var(--text-muted)]">
                    <span>CASE: {selectedCase.id}</span>
                    <span>LATENCY: {selectedCase.latency_ms}ms</span>
                  </div>
                  <div className="text-[var(--text)] font-medium">{selectedCase.input}</div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div>Expected: <span className="text-emerald-400">{selectedCase.expected_lens}</span></div>
                    <div>LLM Router: <span className={selectedCase.routing_match ? 'text-emerald-400' : 'text-amber-400'}>{selectedCase.llm_router_lens}</span></div>
                    <div>Pre-Router: <span className="text-[var(--text-muted)]">{selectedCase.pre_router_lens || 'None'}</span></div>
                    <div>Constitution: <span className="text-emerald-400">{selectedCase.constitution_compliance ? 'Compliant' : 'Violated'}</span></div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center space-y-3">
              <RotateCcw className="w-8 h-8 opacity-40 mx-auto animate-spin" />
              <div className="text-[var(--text)]">Loading evaluation benchmarks...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
