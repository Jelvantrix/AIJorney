import React from 'react';

/* ──────────────────────────────────────────────────────────────────────────
   Mission surface kit — one vocabulary for every mission panel.
   Precision semantics: state is carried by weight, fill and dot topology,
   never by hue.
   ────────────────────────────────────────────────────────────────────────── */

export type Level = 'solid' | 'strong' | 'soft' | 'faint' | 'hollow';

const DOT: Record<Level, React.CSSProperties> = {
  solid: { background: 'var(--text)' },
  strong: { background: 'var(--text-2)' },
  soft: { background: 'var(--text-4)' },
  faint: { background: 'var(--line-strong)' },
  hollow: {
    background: 'transparent',
    boxShadow: 'inset 0 0 0 1px var(--line-bright)',
  },
};

const TEXT: Record<Level, string> = {
  solid: 'var(--text)',
  strong: 'var(--text-1)',
  soft: 'var(--text-2)',
  faint: 'var(--text-3)',
  hollow: 'var(--text-4)',
};

export const Dot: React.FC<{ level?: Level; size?: number; live?: boolean }> = ({
  level = 'soft',
  size = 6,
  live,
}) => (
  <span
    className={`relative inline-block shrink-0 rounded-full ${live ? 'nv-dot nv-dot--live' : ''}`}
    style={{ width: size, height: size, ...DOT[level] }}
  />
);

export const StateBadge: React.FC<{ state: string }> = ({ state }) => {
  const level: Level =
    state === 'passed' || state === 'completed' || state === 'human_resolved'
      ? 'solid'
      : state === 'failed' || state === 'escalated' || state === 'cancelled' || state === 'abandoned'
        ? 'hollow'
        : state === 'running' || state === 'repairing' || state === 'verifying'
          ? 'strong'
          : 'soft';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] font-mono text-[9.5px] font-medium uppercase tracking-[0.1em]"
      style={{
        color: TEXT[level],
        background: level === 'solid' ? 'var(--glass-4)' : 'var(--glass-1)',
        border: '1px solid var(--line-faint)',
      }}
    >
      <Dot level={level} size={5} live={state === 'running'} />
      {state.replace(/_/g, ' ')}
    </span>
  );
};

export const Panel: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  className?: string;
}> = ({ title, subtitle, right, children, bodyClassName = 'p-4', className = '' }) => (
  <section
    className={`nv-edge overflow-hidden rounded-[16px] ${className}`}
    style={{
      background: 'linear-gradient(180deg, var(--surface-2) 0%, var(--surface-1) 100%)',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-2)',
    }}
  >
    <header
      className="flex items-center justify-between gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-3.5 w-[2px] shrink-0 rounded-full"
          style={{ background: 'linear-gradient(180deg, var(--line-bright), var(--line))' }}
        />
        <div className="min-w-0">
          <h3
            className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.13em]"
            style={{ color: 'var(--text-1)' }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 truncate font-mono text-[10px]" style={{ color: 'var(--text-4)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right}
    </header>
    <div className={bodyClassName}>{children}</div>
  </section>
);

export const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  level?: Level;
  sub?: string;
  progress?: number;
}> = ({ label, value, level = 'solid', sub, progress }) => (
  <div
    className="flex min-w-0 flex-col gap-1.5 rounded-[12px] px-3.5 py-3"
    style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
  >
    <span className="nv-label !text-[9px]">{label}</span>
    <span
      className="nv-num truncate text-[17px] leading-none"
      style={{ color: TEXT[level] }}
    >
      {value}
    </span>
    {sub && (
      <span className="truncate font-mono text-[10px]" style={{ color: 'var(--text-4)' }}>
        {sub}
      </span>
    )}
    {progress !== undefined && (
      <span className="nv-meter mt-0.5">
        <span className="nv-meter__fill" style={{ width: `${Math.min(100, progress)}%` }} />
      </span>
    )}
  </div>
);

export const KV: React.FC<{ k: string; children: React.ReactNode; mono?: boolean }> = ({
  k,
  children,
  mono,
}) => (
  <div
    className="flex items-baseline justify-between gap-3 rounded-[10px] px-3 py-2.5"
    style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
  >
    <span className="nv-label !text-[9px]">{k}</span>
    <span
      className={`min-w-0 truncate text-[11.5px] ${mono ? 'font-mono' : ''}`}
      style={{ color: 'var(--text-1)' }}
    >
      {children}
    </span>
  </div>
);

export const Tag: React.FC<{ children: React.ReactNode; solid?: boolean }> = ({
  children,
  solid,
}) => (
  <span
    className="inline-flex items-center rounded-[6px] px-1.5 py-[2px] font-mono text-[9.5px] tracking-[0.04em]"
    style={
      solid
        ? { background: 'var(--text)', color: 'var(--bg)' }
        : { background: 'var(--glass-2)', color: 'var(--text-3)', border: '1px solid var(--line-faint)' }
    }
  >
    {children}
  </span>
);

export const Empty: React.FC<{ label: string; hint?: string }> = ({ label, hint }) => (
  <div className="flex flex-col items-center gap-1.5 py-12 text-center">
    <Dot level="faint" size={8} />
    <span className="font-mono text-[11.5px]" style={{ color: 'var(--text-4)' }}>
      {label}
    </span>
    {hint && (
      <span className="max-w-[36ch] text-[11px]" style={{ color: 'var(--text-4)', opacity: 0.7 }}>
        {hint}
      </span>
    )}
  </div>
);

export const Table: React.FC<{ head: string[]; children: React.ReactNode }> = ({
  head,
  children,
}) => (
  <div className="nv-scroll w-full overflow-x-auto">
    <table className="w-full border-collapse text-left">
      <thead>
        <tr>
          {head.map((h) => (
            <th
              key={h}
              className="whitespace-nowrap border-b px-3 py-2.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.12em]"
              style={{ borderColor: 'var(--line)', color: 'var(--text-4)' }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const Td: React.FC<{ children?: React.ReactNode; className?: string; mono?: boolean }> = ({
  children,
  className = '',
  mono,
}) => (
  <td
    className={`border-b px-3 py-2.5 align-top text-[11px] ${mono ? 'font-mono' : ''} ${className}`}
    style={{ borderColor: 'var(--line-faint)', color: 'var(--text-1)' }}
  >
    {children}
  </td>
);

/** Outcome mapping used by verification surfaces. */
export const outcomeLevel = (outcome: string): Level =>
  outcome === 'pass' ? 'solid' : outcome === 'fail' ? 'hollow' : 'soft';

export const claimLevel = (status: string): Level =>
  status === 'verified'
    ? 'solid'
    : status === 'unsupported' || status === 'contradicted'
      ? 'hollow'
      : 'soft';

export { TEXT as TEXT_TONE };
