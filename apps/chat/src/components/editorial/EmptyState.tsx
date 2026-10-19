import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { type LensType } from '../../lib/store.ts';

export interface EmptyStateProps {
  onSeed?: (text: string) => void;
  className?: string;
}

export const DISCIPLINES: Array<{
  lens: LensType;
  title: string;
  body: string;
  glyph: string;
}> = [
  {
    lens: 'engineering',
    title: 'Lock-free ring buffer in Rust',
    body: 'Zero heap allocation, power-of-two masking, cache-line isolation.',
    glyph: 'Systems',
  },
  {
    lens: 'reasoning',
    title: 'Prove vector-clock dominance',
    body: 'A step-by-step invariant argument for causal ordering across replicas.',
    glyph: 'Formal',
  },
  {
    lens: 'research',
    title: 'Raft versus EPaxos',
    body: 'Synthesise the empirical trade-offs under heavy write contention.',
    glyph: 'Survey',
  },
  {
    lens: 'design',
    title: 'Luminous design constitution',
    body: 'A token architecture for an editorial, strictly greyscale interface.',
    glyph: 'Craft',
  },
];

export const EmptyState: React.FC<EmptyStateProps> = ({ onSeed, className = '' }) => {
  return (
    <div
      className={`relative flex min-h-full flex-col justify-center overflow-hidden px-6 py-16 lg:px-2 ${className}`}
      role="region"
      aria-label="New thread canvas"
    >
      {/* Background Dot Matrix Pattern for Hero at Homepage */}
      <div
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
        aria-hidden="true"
        style={{
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 38%, black 15%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 38%, black 15%, transparent 75%)',
        }}
      >
        <div
          className="absolute inset-0 h-full w-full"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--text-4) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            opacity: 0.55,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[720px]">
        {/* Element 1: Kicker Filament & Thread Badge (Stagger 0) */}
        <div
          className="nv-reveal-scale mb-7 flex items-center gap-3"
          style={{ '--delay': '0ms' } as React.CSSProperties}
        >
          <span className="h-px w-10" style={{ background: 'var(--line-strong)' }} />
          <span className="nv-label flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text)] opacity-80" />
            A new thread
          </span>
          <span className="h-px flex-1" style={{ background: 'var(--line-faint)' }} />
        </div>

        {/* Element 2: Typographic Editorial Headline (Stagger 1) */}
        <div
          className="nv-reveal-scale"
          style={{ '--delay': '90ms' } as React.CSSProperties}
        >
          <h1
            className="nv-display text-balance tracking-tight"
            style={{ fontSize: 'clamp(38px, 6vw, 62px)', lineHeight: 1.01 }}
          >
            What should we
            <br />
            <em style={{ fontStyle: 'italic', color: 'var(--text-2)' }}>think through</em> together?
          </h1>
        </div>

        {/* Element 3: Subtitle & Directing Copy (Stagger 2) */}
        <div
          className="nv-reveal-scale"
          style={{ '--delay': '180ms' } as React.CSSProperties}
        >
          <p
            className="text-pretty mt-6 max-w-[48ch] text-[15px] leading-relaxed"
            style={{ color: 'var(--text-2)' }}
          >
            One intelligence across engineering, design, research, reasoning and writing.
            State a problem, a hypothesis, or a half-formed idea — the dock is below.
          </p>
        </div>

        {/* Element 4: Discipline Section Divider (Stagger 3) */}
        <div
          className="nv-reveal-scale mt-12 flex items-center gap-3"
          style={{ '--delay': '260ms' } as React.CSSProperties}
        >
          <span className="nv-label flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 opacity-60" />
            Or begin from a discipline
          </span>
          <span className="h-px flex-1" style={{ background: 'var(--line-faint)' }} />
        </div>

        {/* Element 5: Staggered Discipline Cards (Staggers 4, 5, 6, 7) */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {DISCIPLINES.map((d, i) => {
            const cardDelay = 330 + i * 70; // 330ms, 400ms, 470ms, 540ms
            return (
              <button
                key={d.lens}
                type="button"
                onClick={() => onSeed?.(d.title)}
                className="nv-reveal-scale nv-card nv-card--interactive nv-spotlight group/card relative overflow-hidden p-4 text-left"
                style={{ '--delay': `${cardDelay}ms` } as React.CSSProperties}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                }}
              >
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-[13.5px] font-medium leading-snug tracking-[-0.01em]"
                      style={{ color: 'var(--text)' }}
                    >
                      {d.title}
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                      {d.body}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover/card:translate-x-0 group-hover/card:opacity-70"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
                <div className="relative mt-3.5 flex items-center justify-between">
                  <span className="nv-chip !h-[18px] !text-[9px]">{d.glyph}</span>
                  <span className="nv-label" style={{ opacity: 0.5 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Element 6: Subtitle Hints Footer (Stagger 8) */}
        <div
          className="nv-reveal-scale mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-[11px]"
          style={
            {
              '--delay': '620ms',
              borderColor: 'var(--line-faint)',
              color: 'var(--text-4)',
            } as React.CSSProperties
          }
        >
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-1 rounded-full bg-[var(--text-3)]" />
            Constitutional intelligence
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border px-1 py-0.5 font-mono text-[9px]" style={{ borderColor: 'var(--line)' }}>⌘K</kbd>
              Index
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border px-1 py-0.5 font-mono text-[9px]" style={{ borderColor: 'var(--line)' }}>/</kbd>
              Lenses
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
