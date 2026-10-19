import React from 'react';
import { MissionView } from '@noevix/contracts';
import { Panel, Stat, KV, Tag, Dot } from './ui.tsx';

interface MissionBriefProps {
  mission: MissionView | null;
}

const pct = (used: number, total: number) => Math.min(100, (used / Math.max(1, total || 1)) * 100);

export default function MissionBrief({ mission }: MissionBriefProps) {
  if (!mission) return null;

  const { spec, budget } = mission;
  const c = budget.consumed;

  return (
    <div className="space-y-4">
      {/* ── Budget ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Tokens"
          value={c.tokens.toLocaleString()}
          sub={`of ${budget.tokens.toLocaleString()}`}
          progress={pct(c.tokens, budget.tokens)}
        />
        <Stat
          label="Wall clock"
          value={`${c.seconds}s`}
          sub={`of ${budget.seconds}s`}
          progress={pct(c.seconds, budget.seconds)}
        />
        <Stat
          label="Tool calls"
          value={c.tool_calls}
          sub={`of ${budget.tool_calls}`}
          progress={pct(c.tool_calls, budget.tool_calls)}
        />
        <Stat
          label="Spend"
          value={`$${c.usd.toFixed(3)}`}
          sub={`of $${budget.usd.toFixed(2)}`}
          progress={pct(c.usd, budget.usd)}
        />
      </div>

      {/* ── Specification ──────────────────────────────────────── */}
      <Panel title="Mission specification" subtitle={mission.id}>
        <div className="space-y-4">
          <div>
            <div className="nv-label mb-2">Objective</div>
            <p
              className="nv-display text-[19px] leading-snug"
              style={{ color: 'var(--text)' }}
            >
              {spec.goal}
            </p>
          </div>

          {spec.inputs.length > 0 && (
            <div>
              <div className="nv-label mb-2">Inputs</div>
              <div className="flex flex-wrap gap-1.5">
                {spec.inputs.map((i, idx) => (
                  <Tag key={idx}>
                    {i.kind} · {i.name || i.ref.slice(0, 36)}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          <div className="nv-hair" />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="nv-label mb-2">Constraints</div>
              {spec.constraints.length === 0 ? (
                <p className="text-[11.5px]" style={{ color: 'var(--text-4)' }}>
                  Unconstrained
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {spec.constraints.map((c2, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--text-1)' }}>
                      <span className="mt-[7px]"><Dot level="faint" size={4} /></span>
                      {c2}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="nv-label mb-2">Acceptance criteria</div>
              {spec.acceptance.length === 0 ? (
                <p className="text-[11.5px]" style={{ color: 'var(--text-4)' }}>
                  None declared
                </p>
              ) : (
                <ul className="space-y-2">
                  {spec.acceptance.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5">
                      <Tag>{a.id}</Tag>
                      <span className="text-[12px] leading-snug" style={{ color: 'var(--text-1)' }}>
                        {a.check}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Policy + provenance ────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Approval policy">
          <div className="space-y-2">
            <KV k="Plan approval">{spec.approvals.plan ? 'Human required' : 'Automatic'}</KV>
            <KV k="External writes">
              {spec.approvals.external_writes ? 'Gated' : 'Open'}
            </KV>
            <KV k="Spend gate" mono>
              &gt; ${spec.approvals.spend_over_usd.toFixed(2)} USD
            </KV>
          </div>
        </Panel>

        <Panel title="Data policy">
          <div className="space-y-2">
            <KV k="Logging consent">
              {spec.data_policy.logging_consent ? 'Granted' : 'Declined'}
            </KV>
            <KV k="Retention" mono>
              {spec.data_policy.retention_days} days
            </KV>
            <KV k="Project" mono>
              {mission.project_id}
            </KV>
          </div>
        </Panel>
      </div>

      <Panel title="Provenance">
        <div className="grid gap-2 md:grid-cols-2">
          <KV k="Mission id" mono>
            {mission.id}
          </KV>
          <KV k="State">{mission.state.replace(/_/g, ' ')}</KV>
          <KV k="Created" mono>
            {new Date(mission.created_at).toLocaleString()}
          </KV>
          <KV k="Updated" mono>
            {new Date(mission.updated_at).toLocaleString()}
          </KV>
        </div>
      </Panel>
    </div>
  );
}
