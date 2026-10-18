import React, { useEffect, useMemo, useState } from 'react';
import { useMissionStore } from '../../lib/missionStore.ts';
import { useChatStore } from '../../lib/store.ts';
import MissionBrief from './MissionBrief.tsx';
import MissionPlan from './MissionPlan.tsx';
import MissionRun from './MissionRun.tsx';
import MissionVerification from './MissionVerification.tsx';
import MissionAudit from './MissionAudit.tsx';
import {
  Plus,
  RefreshCw,
  ArrowLeft,
  Check,
  X,
  Play,
  Pause,
  Download,
  Compass,
  CircleDot,
  type LucideIcon,
} from 'lucide-react';

type Tab = 'brief' | 'plan' | 'run' | 'verification' | 'audit';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'brief', label: 'Brief' },
  { id: 'plan', label: 'Plan' },
  { id: 'run', label: 'Run' },
  { id: 'verification', label: 'Verification' },
  { id: 'audit', label: 'Audit' },
];

const stateTone = (state: string) => {
  if (state === 'completed') return { color: 'var(--text)', bg: 'var(--glass-3)' };
  if (state === 'failed' || state === 'cancelled') return { color: 'var(--text-3)', bg: 'var(--glass-1)' };
  if (state === 'running') return { color: 'var(--text)', bg: 'var(--glass-3)' };
  return { color: 'var(--text-2)', bg: 'var(--glass-2)' };
};

const Stat: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({
  label,
  value,
  sub,
}) => (
  <div
    className="flex min-w-0 flex-col gap-1 rounded-[12px] px-3.5 py-3"
    style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
  >
    <span className="nv-label !text-[9px]">{label}</span>
    <span className="nv-num text-[15px] leading-none" style={{ color: 'var(--text)' }}>
      {value}
    </span>
    {sub && (
      <span className="truncate font-mono text-[10px]" style={{ color: 'var(--text-4)' }}>
        {sub}
      </span>
    )}
  </div>
);

export default function MissionControl() {
  const {
    missions,
    activeMission,
    activeMissionId,
    events,
    isStreaming,
    isLoading,
    error,
    setActiveMission,
    fetchMissions,
    fetchMission,
    createMission,
    startSSE,
    stopSSE,
    fetchAudit,
    cancelMission,
    resumeMission,
    approvePlan,
    rejectPlan,
    setError,
  } = useMissionStore();

  const { setCurrentView } = useChatStore();

  const [tab, setTab] = useState<Tab>('brief');
  const [goal, setGoal] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMissions();
    return () => stopSSE();
  }, [fetchMissions, stopSSE]);

  useEffect(() => {
    if (activeMissionId) startSSE(activeMissionId);
    return () => stopSSE();
  }, [activeMissionId, startSSE, stopSSE]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    setCreating(true);
    const id = await createMission({
      goal,
      inputs: [],
      constraints: [],
      acceptance: [{ id: 'A1', check: 'v1.schema.validation', params: {} }],
      budgets: { tokens: 50000, seconds: 300, tool_calls: 10, usd: 1.0 },
      approvals: { plan: false, external_writes: true, spend_over_usd: 0.5 },
      data_policy: { logging_consent: true, retention_days: 30 },
    });
    setCreating(false);
    setGoal('');
    if (id) {
      setActiveMission(id);
      setTab('run');
    }
  };

  const budget = activeMission?.budget;

  const budgetPct = useMemo(() => {
    if (!budget) return { tokens: 0, seconds: 0, tool: 0, usd: 0 };
    return {
      tokens: Math.min(100, (budget.consumed.tokens / Math.max(1, budget.tokens)) * 100),
      seconds: Math.min(100, (budget.consumed.seconds / Math.max(1, budget.seconds)) * 100),
      tool: Math.min(100, (budget.consumed.tool_calls / Math.max(1, budget.tool_calls)) * 100),
      usd: Math.min(100, (budget.consumed.usd / Math.max(0.0001, budget.usd)) * 100),
    };
  }, [budget]);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className="flex w-[300px] shrink-0 flex-col"
        style={{ borderRight: '1px solid var(--line)', background: 'var(--panel)' }}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <button
            onClick={() => setCurrentView('app')}
            className="flex items-center gap-2 text-left"
            title="Back to the workspace"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[10px]"
              style={{ background: 'var(--glass-2)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-inset)' }}
            >
              <Compass className="h-4 w-4" style={{ color: 'var(--text-2)' }} />
            </span>
            <span>
              <span className="block text-[13.5px] font-medium leading-none" style={{ color: 'var(--text)' }}>
                Mission control
              </span>
              <span className="nv-label mt-1 !text-[9px]">Autonomous execution</span>
            </span>
          </button>
          <button onClick={fetchMissions} className="nv-iconbtn nv-iconbtn--sm" title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'nv-spin' : ''}`} />
          </button>
        </div>

        <div className="px-4 pb-3">
          <form onSubmit={create} className="space-y-2">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              placeholder="State a goal for a new mission…"
              className="nv-scroll w-full resize-none rounded-[11px] px-3 py-2.5 text-[12.5px] leading-relaxed outline-none transition-colors"
              style={{
                background: 'var(--glass-1)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
              }}
            />
            <button
              type="submit"
              disabled={!goal.trim() || creating}
              className="nv-btn nv-btn--primary nv-btn--sm w-full"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              {creating ? 'Compiling…' : 'Create mission'}
            </button>
          </form>
        </div>

        <div className="nv-hair" />

        <div className="nv-scroll flex-1 overflow-y-auto p-2.5">
          {missions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <CircleDot className="h-5 w-5" style={{ color: 'var(--text-4)' }} />
              <span className="font-mono text-[12px]" style={{ color: 'var(--text-4)' }}>
                No missions yet
              </span>
            </div>
          ) : (
            missions.map((m) => {
              const active = m.id === activeMissionId;
              const tone = stateTone(m.state);
              const steps = Object.values(m.steps);
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMission(m.id);
                    setTab('brief');
                  }}
                  className="mb-1.5 w-full rounded-[12px] px-3 py-3 text-left transition-colors"
                  style={{
                    background: active ? 'var(--glass-3)' : 'transparent',
                    border: `1px solid ${active ? 'var(--line)' : 'transparent'}`,
                    boxShadow: active ? 'var(--shadow-1)' : 'none',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      style={{
                        width: 2,
                        height: 14,
                        borderRadius: 99,
                        flexShrink: 0,
                        marginTop: 3,
                        background: active ? 'var(--text)' : 'var(--line-strong)',
                      }}
                    />
                    <span
                      className="line-clamp-2 min-w-0 flex-1 text-[12.5px] font-medium leading-snug"
                      style={{ color: active ? 'var(--text)' : 'var(--text-2)' }}
                    >
                      {m.spec.goal}
                    </span>
                  </div>

                  {/* step pips */}
                  <div className="mt-2.5 flex gap-1">
                    {steps.map((s) => (
                      <span
                        key={s.id}
                        className="h-[3px] flex-1 rounded-full transition-colors"
                        style={{
                          background:
                            s.state === 'passed'
                              ? 'var(--text)'
                              : s.state === 'failed' || s.state === 'escalated'
                                ? 'var(--text-4)'
                                : s.state === 'running' || s.state === 'produced'
                                  ? 'var(--text-2)'
                                  : 'var(--line-strong)',
                        }}
                      />
                    ))}
                    {steps.length === 0 && (
                      <span className="h-[3px] flex-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span
                      className="nv-chip !h-[16px] !px-1.5 !text-[8.5px]"
                      style={{ color: tone.color, background: tone.bg }}
                    >
                      {m.state.replace(/_/g, ' ')}
                    </span>
                    <span className="truncate font-mono text-[10px]" style={{ color: 'var(--text-4)' }}>
                      {m.budget.consumed.tool_calls}/{m.budget.tool_calls} · $
                      {m.budget.consumed.usd.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--line)' }}>
          <span className={`flex items-center gap-2 nv-label !text-[9px]`}>
            <span className={`nv-dot ${isStreaming ? 'nv-dot--live' : ''}`} />
            {isStreaming ? 'Streaming' : 'Idle'}
          </span>
          <button
            onClick={() => setCurrentView('app')}
            className="flex items-center gap-1.5 nv-label !text-[9px] transition-colors hover:text-[var(--text)]"
          >
            <ArrowLeft className="h-3 w-3" />
            Workspace
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {!activeMissionId || !activeMission ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-[14px]"
              style={{ background: 'var(--glass-1)', border: '1px solid var(--line)' }}
            >
              <Compass className="h-5 w-5" style={{ color: 'var(--text-3)' }} />
            </span>
            <div className="nv-display text-[26px]">Select a mission</div>
            <p className="max-w-[42ch] text-center text-[13px]" style={{ color: 'var(--text-3)' }}>
              Missions are compiled into a static plan, executed under lease with fenced steps, and
              verified before any deliverable is issued.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="shrink-0 px-6 pb-4 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="nv-badge" style={{ color: stateTone(activeMission.state).color }}>
                      <span className={`nv-dot ${activeMission.state === 'running' ? 'nv-dot--live' : ''}`} />
                      {activeMission.state.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-[10.5px]" style={{ color: 'var(--text-4)' }}>
                      {activeMission.id}
                    </span>
                  </div>
                  <h1 className="nv-display mt-2.5 max-w-[60ch] text-[clamp(22px,2.6vw,30px)] leading-[1.1]">
                    {activeMission.spec.goal}
                  </h1>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {activeMission.approvals.some((a) => a.type === 'plan' && a.decision === 'pending') && (
                    <button
                      onClick={() => {
                        const a = activeMission.approvals.find(
                          (x) => x.type === 'plan' && x.decision === 'pending'
                        );
                        if (a) approvePlan(activeMission.id, a.id);
                      }}
                      className="nv-btn nv-btn--primary nv-btn--sm"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve plan
                    </button>
                  )}
                  {activeMission.approvals.some((a) => a.type === 'plan' && a.decision === 'pending') && (
                    <button
                      onClick={() => {
                        const a = activeMission.approvals.find(
                          (x) => x.type === 'plan' && x.decision === 'pending'
                        );
                        if (a) rejectPlan(activeMission.id, a.id);
                      }}
                      className="nv-btn nv-btn--sm"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  )}
                  {activeMission.state === 'paused' && (
                    <button onClick={() => resumeMission(activeMission.id)} className="nv-btn nv-btn--primary nv-btn--sm">
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </button>
                  )}
                  {activeMission.state === 'running' && (
                    <button onClick={() => cancelMission(activeMission.id)} className="nv-btn nv-btn--sm">
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={() => fetchAudit(activeMission.id)}
                    className="nv-iconbtn nv-iconbtn--sm"
                    title="Export audit"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Budget */}
              {budget && (
                <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  <Stat
                    label="Tokens"
                    value={`${budget.consumed.tokens.toLocaleString()}`}
                    sub={`of ${budget.tokens.toLocaleString()} · ${budgetPct.tokens.toFixed(0)}%`}
                  />
                  <Stat
                    label="Wall clock"
                    value={`${budget.consumed.seconds}s`}
                    sub={`of ${budget.seconds}s · ${budgetPct.seconds.toFixed(0)}%`}
                  />
                  <Stat
                    label="Tool calls"
                    value={`${budget.consumed.tool_calls}`}
                    sub={`of ${budget.tool_calls} · ${budgetPct.tool.toFixed(0)}%`}
                  />
                  <Stat
                    label="Spend"
                    value={`$${budget.consumed.usd.toFixed(3)}`}
                    sub={`of $${budget.usd.toFixed(2)} · ${budgetPct.usd.toFixed(0)}%`}
                  />
                </div>
              )}
            </header>

            {/* Tabs */}
            <div
              className="flex shrink-0 items-center gap-0 px-3"
              style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  data-active={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className="nv-tabline"
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="nv-scroll min-h-0 flex-1 overflow-y-auto p-6">
              {tab === 'brief' && <MissionBrief mission={activeMission} />}
              {tab === 'plan' && <MissionPlan mission={activeMission} />}
              {tab === 'run' && (
                <MissionRun mission={activeMission} events={events} fetchMission={fetchMission} />
              )}
              {tab === 'verification' && <MissionVerification mission={activeMission} />}
              {tab === 'audit' && (
                <MissionAudit mission={activeMission} auditError={error} setError={setError} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
