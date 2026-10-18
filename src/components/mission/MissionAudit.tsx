import React, { useEffect, useState } from 'react';
import { MissionView } from '../../../packages/contracts/mission.ts';
import { useMissionStore } from '../../lib/missionStore.ts';
import { Panel, Stat, KV, Tag, Dot, Empty, Table, Td, type Level } from './ui.tsx';

interface MissionAuditProps {
  mission: MissionView | null;
  auditError: string | null;
  setError: (err: string | null) => void;
}

export default function MissionAudit({ mission, auditError, setError }: MissionAuditProps) {
  const { audit, fetchAudit } = useMissionStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mission && mission.state === 'completed') fetchAudit(mission.id);
  }, [mission, fetchAudit]);

  if (!mission) return null;

  const valid = audit?.tamper_evident_valid;

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const download = () => {
    if (!audit) return;
    const md = [
      `# Audit report — ${audit.mission_id}`,
      '',
      `**Goal.** ${audit.goal}`,
      '',
      `| Field | Value |`,
      `| :--- | :--- |`,
      `| Status | ${audit.status} |`,
      `| Steps executed | ${audit.steps_executed} |`,
      `| Verifications run | ${audit.verifications_run} |`,
      `| Verification pass rate | ${Math.round(audit.verification_pass_rate * 100)}% |`,
      `| Claims verified | ${audit.claims_verified_count} |`,
      `| Claims unverified | ${audit.claims_unverified_count} |`,
      `| Events | ${audit.events_count} |`,
      `| Chain head | \`${audit.chain_head_hash}\` |`,
      `| Hash chain valid | ${audit.tamper_evident_valid ? 'yes' : 'NO'} |`,
      '',
      `## Artifacts`,
      '',
      ...audit.artifacts.map((a) => `- \`${a.hash}\` — ${a.name} (${a.mime}) via ${a.producer_step}`),
      '',
      `## Claims`,
      '',
      ...audit.claims.map((c) => `- [${c.status}] ${c.text}`),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${audit.mission_id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {auditError && (
        <div
          className="flex items-start gap-3 rounded-[14px] px-4 py-3.5"
          style={{ background: 'var(--glass-2)', border: '1px solid var(--line-strong)' }}
        >
          <Dot level="hollow" size={8} />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium" style={{ color: 'var(--text)' }}>
              Audit retrieval failed
            </div>
            <div className="mt-0.5 font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
              {auditError}
            </div>
          </div>
          <button onClick={() => setError(null)} className="nv-btn nv-btn--sm">
            Dismiss
          </button>
        </div>
      )}

      {!audit ? (
        <Panel title="Audit report">
          <Empty
            label={mission.state === 'completed' ? 'Compiling audit report…' : 'Report pending'}
            hint="A tamper-evident report is issued once the mission completes and the hash chain is sealed."
          />
        </Panel>
      ) : (
        <>
          {/* ── Scoreboard ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Status" value={audit.status.replace(/_/g, ' ')} />
            <Stat label="Steps executed" value={audit.steps_executed} sub="leased and run" />
            <Stat
              label="Verifications"
              value={audit.verifications_run}
              sub={`${Math.round(audit.verification_pass_rate * 100)}% pass rate`}
              progress={audit.verification_pass_rate * 100}
            />
            <Stat
              label="Events sealed"
              value={audit.events_count}
              sub="hash-chained"
            />
          </div>

          {/* ── Chain integrity ────────────────────────────────── */}
          <Panel
            title="Tamper evidence"
            subtitle="SHA-256 rolling hash chain over the append-only log"
            right={
              <span
                className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em]"
                style={{
                  background: valid ? 'var(--glass-3)' : 'var(--glass-1)',
                  border: `1px solid ${valid ? 'var(--line)' : 'var(--line-strong)'}`,
                  color: valid ? 'var(--text)' : 'var(--text-2)',
                }}
              >
                <Dot level={valid ? 'solid' : 'hollow'} size={6} />
                {valid ? 'Chain valid' : 'Chain invalid'}
              </span>
            }
          >
            <div className="space-y-2">
              <button
                onClick={() => copy(audit.chain_head_hash)}
                className="group flex w-full items-center gap-3 rounded-[11px] px-3.5 py-3 text-left transition-colors"
                style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
                title="Copy chain head"
              >
                <span className="nv-label !text-[9px] shrink-0">Chain head</span>
                <code
                  className="min-w-0 flex-1 truncate font-mono text-[11.5px]"
                  style={{ color: 'var(--text-1)' }}
                >
                  {audit.chain_head_hash}
                </code>
                <span className="nv-label !text-[9px] shrink-0">{copied ? 'copied' : 'copy'}</span>
              </button>

              <div className="grid gap-2 md:grid-cols-2">
                <KV k="Claims verified" mono>
                  {audit.claims_verified_count}
                </KV>
                <KV k="Claims unverified" mono>
                  {audit.claims_unverified_count}
                </KV>
                <KV k="Budget — tokens" mono>
                  {audit.budget_consumed.consumed.tokens.toLocaleString()} /{' '}
                  {audit.budget_consumed.tokens.toLocaleString()}
                </KV>
                <KV k="Budget — spend" mono>
                  ${audit.budget_consumed.consumed.usd.toFixed(3)} / $
                  {audit.budget_consumed.usd.toFixed(2)}
                </KV>
              </div>
            </div>
          </Panel>

          {/* ── Artifacts ──────────────────────────────────────── */}
          <Panel
            title="Artifacts"
            subtitle={`${audit.artifacts.length} content-addressed objects`}
            bodyClassName="p-0"
          >
            {audit.artifacts.length === 0 ? (
              <Empty label="No artifacts registered" />
            ) : (
              <Table head={['Hash', 'Name', 'Media type', 'Producer step']}>
                {audit.artifacts.map((a) => (
                  <tr key={a.hash}>
                    <Td mono>
                      <span style={{ color: 'var(--text-3)' }}>{a.hash.slice(0, 20)}…</span>
                    </Td>
                    <Td>{a.name}</Td>
                    <Td>
                      <Tag>{a.mime}</Tag>
                    </Td>
                    <Td mono>{a.producer_step}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>

          {/* ── Approvals ──────────────────────────────────────── */}
          {audit.approvals.length > 0 && (
            <Panel title="Approval decisions" bodyClassName="p-3">
              <div className="space-y-2">
                {audit.approvals.map((ap) => {
                  const level: Level =
                    ap.decision === 'approved' ? 'solid' : ap.decision === 'rejected' ? 'hollow' : 'soft';
                  return (
                    <div
                      key={ap.id}
                      className="flex items-center gap-3 rounded-[11px] px-3.5 py-2.5"
                      style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
                    >
                      <Dot level={level} size={7} />
                      <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: 'var(--text-1)' }}>
                        {ap.type.replace(/_/g, ' ')} · {ap.target}
                      </span>
                      <Tag>{ap.decision}</Tag>
                      <span className="shrink-0 font-mono text-[10px]" style={{ color: 'var(--text-4)' }}>
                        {ap.user || 'system'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          <button onClick={download} className="nv-btn w-full">
            <span className="nv-label !text-[10px]">Export audit report</span>
            <span className="font-mono text-[10.5px]" style={{ color: 'var(--text-4)' }}>
              .md
            </span>
          </button>
        </>
      )}
    </div>
  );
}
