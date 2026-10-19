import React from 'react';
import { MissionView } from '@noevix/contracts';
import { Panel, Stat, Tag, Empty, Dot, Table, Td, outcomeLevel, claimLevel, TEXT_TONE } from './ui.tsx';

interface MissionVerificationProps {
  mission: MissionView | null;
}

export default function MissionVerification({ mission }: MissionVerificationProps) {
  if (!mission) return null;

  const verifications = mission.verifications;
  const claims = mission.claims;

  const pass = verifications.filter((v) => v.outcome === 'pass').length;
  const fail = verifications.filter((v) => v.outcome === 'fail').length;
  const inconclusive = verifications.filter((v) => v.outcome === 'inconclusive').length;
  const verified = claims.filter((c) => c.status === 'verified').length;
  const rate = verifications.length ? Math.round((pass / verifications.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ── Scoreboard ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Verifications" value={verifications.length} sub="independent checks" />
        <Stat label="Passed" value={pass} level="solid" progress={rate} />
        <Stat label="Failed" value={fail} level="hollow" />
        <Stat label="Inconclusive" value={inconclusive} level="soft" />
        <Stat
          label="Claims trusted"
          value={`${verified}/${claims.length}`}
          sub={`${rate}% verifier pass rate`}
        />
      </div>

      {/* ── Verifications ───────────────────────────────────────── */}
      <Panel title="Step verifications" subtitle="Every verifier is executed against declared criteria" bodyClassName="p-0">
        {verifications.length === 0 ? (
          <Empty label="No verifications recorded" hint="A step is only trusted once its verifiers return pass." />
        ) : (
          <Table head={['Target', 'Verifier', 'Tier', 'Outcome', 'Detail']}>
            {verifications.map((v) => {
              const level = outcomeLevel(v.outcome);
              return (
                <tr key={v.id}>
                  <Td mono>{v.target}</Td>
                  <Td>{v.verifier}</Td>
                  <Td>
                    <Tag>{v.tier}</Tag>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <Dot level={level} size={6} />
                      <span
                        className="font-mono text-[10px] font-medium uppercase tracking-[0.1em]"
                        style={{ color: TEXT_TONE[level] }}
                      >
                        {v.outcome}
                      </span>
                    </span>
                  </Td>
                  <Td className="max-w-[380px]">
                    <span style={{ color: 'var(--text-2)' }}>{v.detail}</span>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Panel>

      {/* ── Claims ──────────────────────────────────────────────── */}
      <Panel
        title="Claim ledger"
        subtitle={`${verified} verified · ${claims.length - verified} unverified · ${claims.length} total`}
        bodyClassName="p-3"
      >
        {claims.length === 0 ? (
          <Empty label="No claims recorded" hint="Factual assertions are captured with evidence links and derivation chains." />
        ) : (
          <div className="space-y-2">
            {claims.map((c) => {
              const level = claimLevel(c.status);
              return (
                <div
                  key={c.id}
                  className="flex items-start gap-3 rounded-[12px] p-3"
                  style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
                >
                  <span className="pt-1.5">
                    <Dot level={level} size={7} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="font-mono text-[9.5px] font-medium uppercase tracking-[0.12em]"
                        style={{ color: TEXT_TONE[level] }}
                      >
                        {c.status}
                      </span>
                      <Tag>{c.id}</Tag>
                      {c.location && <Tag>{c.location}</Tag>}
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-1)' }}>
                      {c.text}
                    </p>
                    {c.evidence_ids.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.evidence_ids.map((e) => (
                          <Tag key={e}>evidence {e.slice(0, 12)}</Tag>
                        ))}
                      </div>
                    )}
                    {c.detail && (
                      <p className="mt-1 font-mono text-[10.5px] leading-relaxed" style={{ color: 'var(--text-4)' }}>
                        {c.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
