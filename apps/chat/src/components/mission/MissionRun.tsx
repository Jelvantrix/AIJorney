import React, { useEffect, useState } from 'react';
import { MissionView, MissionEvent } from '@noevix/contracts';
import { Panel, Dot, StateBadge, Tag, Empty, type Level } from './ui.tsx';

interface MissionRunProps {
  mission: MissionView | null;
  events: MissionEvent[];
  fetchMission: (id: string) => Promise<void>;
}

const EVENT_LABELS: Record<string, string> = {
  MissionCreated: 'Mission created',
  PlanProposed: 'Plan proposed',
  PlanApproved: 'Plan approved',
  PlanEdited: 'Plan edited',
  StepLeased: 'Step leased',
  StepStarted: 'Step started',
  StepOutputProduced: 'Output produced',
  StepPassed: 'Step passed',
  StepFailed: 'Step failed',
  StepEscalated: 'Step escalated',
  StepRepaired: 'Step repaired',
  ToolCallIntent: 'Tool intent',
  ToolCallResult: 'Tool result',
  VerificationResult: 'Verification',
  ApprovalRequested: 'Approval requested',
  ApprovalDecided: 'Approval decided',
  BudgetWarning: 'Budget warning',
  BudgetExhausted: 'Budget exhausted',
  MissionPaused: 'Mission paused',
  MissionResumed: 'Mission resumed',
  MissionCompleted: 'Mission completed',
  MissionFailed: 'Mission failed',
  MissionCancelled: 'Mission cancelled',
  ClaimRecorded: 'Claim recorded',
  ArtifactRegistered: 'Artifact registered',
};

/** Topology semantics: fill encodes severity. */
const EVENT_LEVEL: Record<string, Level> = {
  StepPassed: 'solid',
  MissionCompleted: 'solid',
  StepFailed: 'hollow',
  StepEscalated: 'hollow',
  MissionFailed: 'hollow',
  BudgetExhausted: 'hollow',
  StepRepaired: 'strong',
  VerificationResult: 'strong',
  ToolCallResult: 'strong',
  MissionResumed: 'strong',
  BudgetWarning: 'soft',
  ApprovalRequested: 'soft',
  ApprovalDecided: 'soft',
  ToolCallIntent: 'faint',
  ClaimRecorded: 'soft',
  ArtifactRegistered: 'solid',
};

const PayloadRow: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({
  label,
  children,
  mono = true,
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="nv-label !text-[9px]">{label}</span>
    <span
      className={`break-all text-[10.5px] leading-relaxed ${mono ? 'font-mono' : ''}`}
      style={{ color: 'var(--text-1)' }}
    >
      {children}
    </span>
  </div>
);

export default function MissionRun({ mission, events, fetchMission }: MissionRunProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (mission) fetchMission(mission.id);
  }, [mission, fetchMission]);

  const toggle = (seq: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(seq) ? next.delete(seq) : next.add(seq);
      return next;
    });

  const ordered = events.slice().reverse();
  const running = mission?.state === 'running';

  return (
    <div className="space-y-4">
      {/* ── Stream ──────────────────────────────────────────────── */}
      <Panel
        title="Execution stream"
        subtitle={`${events.length} events · newest first`}
        right={
          running ? (
            <span
              className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em]"
              style={{ background: 'var(--glass-3)', border: '1px solid var(--line)' }}
            >
              <span className="nv-dot nv-dot--live" />
              Executing
            </span>
          ) : mission ? (
            <StateBadge state={mission.state} />
          ) : null
        }
        bodyClassName="p-0"
      >
        {ordered.length === 0 ? (
          <Empty label="No events recorded" hint="Events append as the mission is leased, executed and verified." />
        ) : (
          <div className="max-h-[62vh] overflow-y-auto nv-scroll">
            {ordered.map((ev, i) => {
              const isOpen = expanded.has(ev.seq);
              const level = EVENT_LEVEL[ev.type] || 'faint';
              const label = EVENT_LABELS[ev.type] || ev.type;
              const p = (ev.payload || {}) as any;

              return (
                <div
                  key={ev.seq}
                  className="group/ev relative px-4 py-3 transition-colors"
                  style={{
                    borderBottom: i === ordered.length - 1 ? 'none' : '1px solid var(--line-faint)',
                  }}
                >
                  <button
                    onClick={() => toggle(ev.seq)}
                    className="flex w-full items-start gap-3 text-left"
                    aria-expanded={isOpen}
                  >
                    {/* rail */}
                    <span className="flex w-9 shrink-0 flex-col items-end gap-1 pt-0.5">
                      <span className="nv-num text-[9.5px]" style={{ color: 'var(--text-4)' }}>
                        {String(ev.seq).padStart(4, '0')}
                      </span>
                      <span className="h-3 w-px" style={{ background: 'var(--line)' }} />
                      <Dot level={level} size={7} live={ev.type === 'StepStarted' && running} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className="text-[12.5px] font-medium"
                          style={{
                            color:
                              level === 'solid' ? 'var(--text)' : level === 'hollow' ? 'var(--text-2)' : 'var(--text-1)',
                          }}
                        >
                          {label}
                        </span>
                        {p.step_id && <Tag>{p.step_id}</Tag>}
                        {p.tool && <Tag>{p.tool}</Tag>}
                        {p.verification?.outcome && (
                          <Tag solid={p.verification.outcome === 'pass'}>
                            {String(p.verification.outcome).toUpperCase()}
                          </Tag>
                        )}
                        <span className="ml-auto shrink-0 font-mono text-[9.5px]" style={{ color: 'var(--text-4)' }}>
                          {new Date(ev.created_at).toLocaleTimeString()}
                        </span>
                      </span>

                      {!isOpen && p.detail && (
                        <span className="mt-1 block truncate text-[11px]" style={{ color: 'var(--text-4)' }}>
                          {String(p.detail)}
                        </span>
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      className="anim-fade mt-3 ml-12 space-y-2.5 rounded-[11px] p-3"
                      style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
                    >
                      <PayloadRow label="Actor">{ev.actor}</PayloadRow>
                      <PayloadRow label="Event type">{ev.type}</PayloadRow>
                      {p.step_id && <PayloadRow label="Step">{p.step_id}</PayloadRow>}
                      {p.tool && <PayloadRow label="Tool">{p.tool}</PayloadRow>}
                      {p.detail && <PayloadRow label="Detail" mono={false}>{String(p.detail)}</PayloadRow>}
                      {p.output && (
                        <div className="flex flex-col gap-1">
                          <span className="nv-label !text-[9px]">Output</span>
                          <pre
                            className="nv-scroll max-h-[220px] overflow-auto whitespace-pre-wrap rounded-[9px] p-2.5 font-mono text-[10.5px] leading-relaxed"
                            style={{
                              background: 'var(--code-bg)',
                              border: '1px solid var(--line-faint)',
                              color: 'var(--text-2)',
                            }}
                          >
                            {String(p.output).slice(0, 1600)}
                            {String(p.output).length > 1600 ? '\n…' : ''}
                          </pre>
                        </div>
                      )}
                      {p.verification && (
                        <PayloadRow label="Verification" mono={false}>
                          <span className="flex flex-wrap items-center gap-2">
                            <Tag solid={p.verification.outcome === 'pass'}>
                              {String(p.verification.outcome).toUpperCase()}
                            </Tag>
                            <span style={{ color: 'var(--text-3)' }}>{p.verification.verifier}</span>
                            <span style={{ color: 'var(--text-4)' }}>{p.verification.detail}</span>
                          </span>
                        </PayloadRow>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── Deliverable ─────────────────────────────────────────── */}
      {mission?.deliverable && (
        <Panel
          title="Deliverable"
          subtitle={`${mission.deliverable.artifact_hashes?.length || 0} artifacts attached`}
          right={<Tag solid>Issued</Tag>}
        >
          <p className="editorial-compact text-[13px] leading-relaxed" style={{ color: 'var(--text-1)' }}>
            {mission.deliverable.summary}
          </p>

          {!!mission.deliverable.artifact_hashes?.length && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {mission.deliverable.artifact_hashes.map((h) => (
                <span
                  key={h}
                  className="rounded-[7px] px-2 py-1 font-mono text-[10px]"
                  style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)', color: 'var(--text-3)' }}
                >
                  {h.slice(0, 24)}…
                </span>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
