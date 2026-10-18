import React from 'react';
import { MissionView } from '../../../packages/contracts/mission.ts';
import { Panel, Stat, StateBadge, Tag, Empty, Dot, Table, Td } from './ui.tsx';

interface MissionPlanProps {
  mission: MissionView | null;
}

export default function MissionPlan({ mission }: MissionPlanProps) {
  if (!mission || !mission.plan) {
    return (
      <Panel title="Plan DAG">
        <Empty
          label="No plan compiled yet"
          hint="The planner emits a static DAG before any step is leased for execution."
        />
      </Panel>
    );
  }

  const { plan, steps } = mission;
  const awaiting = mission.approvals.some((a) => a.type === 'plan' && a.decision === 'pending');

  const progressed = plan.steps.filter((s) => {
    const st = steps[s.id]?.state;
    return st === 'passed' || st === 'produced' || st === 'verifying';
  }).length;

  const dependents = (id: string) =>
    plan.steps.filter((s) => s.inputs.from_steps.includes(id)).map((s) => s.id);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Steps" value={plan.steps.length} sub={`v${plan.version} · ${plan.status}`} />
        <Stat
          label="Progressed"
          value={`${progressed}/${plan.steps.length}`}
          sub="executed or verifying"
          progress={(progressed / Math.max(1, plan.steps.length)) * 100}
        />
        <Stat
          label="Edges"
          value={plan.steps.reduce((n, s) => n + s.inputs.from_steps.length, 0)}
          sub="dependency links"
        />
        <Stat label="Approval" value={awaiting ? 'Gate' : 'Cleared'} sub={awaiting ? 'awaiting human' : 'not required'} />
      </div>

      {awaiting && (
        <div
          className="flex items-center gap-3 rounded-[14px] px-4 py-3.5"
          style={{ background: 'var(--glass-2)', border: '1px solid var(--line-strong)' }}
        >
          <Dot level="strong" size={8} />
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium" style={{ color: 'var(--text)' }}>
              Awaiting plan approval
            </div>
            <div className="text-[11.5px]" style={{ color: 'var(--text-3)' }}>
              Execution is held at the gate until a human approves the compiled plan.
            </div>
          </div>
        </div>
      )}

      {/* ── Step cards ──────────────────────────────────────────── */}
      <Panel
        title="Execution graph"
        subtitle={plan.rationale ? plan.rationale.slice(0, 96) : 'Static DAG, deterministically ordered'}
        bodyClassName="p-3"
      >
        <div className="space-y-2">
          {plan.steps.map((step, i) => {
            const sv = steps[step.id];
            const state = sv?.state || 'pending';
            const deps = step.inputs.from_steps;
            return (
              <div
                key={step.id}
                className="group/step relative overflow-hidden rounded-[13px] p-3.5 transition-colors"
                style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
              >
                <div className="flex items-start gap-3">
                  {/* index rail */}
                  <div className="flex w-6 shrink-0 flex-col items-center gap-1 pt-0.5">
                    <span className="nv-num text-[10px]" style={{ color: 'var(--text-4)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="h-4 w-px" style={{ background: 'var(--line)' }} />
                    <Dot
                      level={
                        state === 'passed'
                          ? 'solid'
                          : state === 'failed' || state === 'escalated'
                            ? 'hollow'
                            : state === 'running' || state === 'repairing'
                              ? 'strong'
                              : 'faint'
                      }
                      size={7}
                      live={state === 'running'}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                        {step.title}
                      </span>
                      <Tag>{step.id}</Tag>
                      <Tag>{step.kind}</Tag>
                      <span className="ml-auto">
                        <StateBadge state={state} />
                      </span>
                    </div>

                    {step.description && (
                      <p className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                        {step.description}
                      </p>
                    )}

                    <div className="mt-2.5 grid gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <span className="nv-label !text-[9px]">Agent</span>
                        <span style={{ color: 'var(--text-2)' }}>
                          {step.agent.role}
                          {step.agent.domain ? ` · ${step.agent.domain}` : ''} · {step.agent.tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="nv-label !text-[9px]">Timeout</span>
                        <span className="font-mono" style={{ color: 'var(--text-2)' }}>
                          {step.policy.timeout_s}s · {step.policy.max_attempts} attempts
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="nv-label !text-[9px]">Verifiers</span>
                        <span className="flex flex-wrap gap-1">
                          {step.verifiers.length ? (
                            step.verifiers.map((v) => <Tag key={v}>{v}</Tag>)
                          ) : (
                            <span style={{ color: 'var(--text-4)' }}>none</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="nv-label !text-[9px]">Tools</span>
                        <span className="flex flex-wrap gap-1">
                          {step.tools_allowed.length ? (
                            step.tools_allowed.map((t) => <Tag key={t}>{t}</Tag>)
                          ) : (
                            <span style={{ color: 'var(--text-4)' }}>none</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* dependency line */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="nv-label !text-[9px]">Depends on</span>
                      {deps.length === 0 ? (
                        <span className="font-mono text-[10.5px]" style={{ color: 'var(--text-4)' }}>
                          root
                        </span>
                      ) : (
                        deps.map((d) => (
                          <Tag key={d}>
                            {d} → {step.id}
                          </Tag>
                        ))
                      )}
                      {!!sv?.attempts && sv.attempts > 1 && (
                        <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>
                          · {sv.attempts} attempts
                        </span>
                      )}
                      {sv?.repair_count ? (
                        <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>
                          · {sv.repair_count} repairs
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ── Topology table ──────────────────────────────────────── */}
      <Panel title="Topology" subtitle="Adjacency and fan-out" bodyClassName="p-0">
        <Table head={['Step', 'Feeds', 'Kind', 'Agent', 'Idempotency key']}>
          {plan.steps.map((step) => (
            <tr key={step.id}>
              <Td mono>{step.id}</Td>
              <Td>
                {dependents(step.id).length ? (
                  <span className="flex flex-wrap gap-1">
                    {dependents(step.id).map((d) => (
                      <Tag key={d}>{d}</Tag>
                    ))}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-4)' }}>terminal</span>
                )}
              </Td>
              <Td>{step.kind}</Td>
              <Td>
                {step.agent.role}
                {step.agent.domain ? ` · ${step.agent.domain}` : ''}
              </Td>
              <Td mono className="max-w-[220px] truncate">
                {step.idempotency_key}
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
