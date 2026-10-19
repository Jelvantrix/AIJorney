import React, { useState } from 'react';
import { Aura, type AuraState, applyTheme, getStoredTheme, setStoredTheme } from '@noevix/design-system';
import { getProduct } from '@noevix/products';
import { ArrowLeft, Play, RefreshCw, Sun, Moon, Sparkles, FlaskConical, ArrowUpRight } from 'lucide-react';

const STATES: AuraState[] = ['idle', 'typing', 'thinking', 'streaming', 'error', 'done'];

const SCENARIOS = [
  { label: 'Fast inference', meta: '5ms / token', prompt: 'Write a quick algorithm', scenario: 'fast' },
  { label: 'Deep reasoning', meta: 'slow profile', prompt: 'Prove a mathematical theorem', scenario: 'slow' },
  { label: 'Tool interleave', meta: 'search / read / exec', prompt: 'Search distributed consensus papers', scenario: 'tool_use' },
  { label: 'Mid-stream cut', meta: 'disconnect', prompt: 'Simulate stream interruption', scenario: 'mid_stream_disconnect' },
  { label: 'Upstream 500', meta: 'server error', prompt: 'Trigger error scenario', scenario: 'error' },
  { label: 'Rate limited', meta: '429', prompt: 'Trigger rate limit scenario', scenario: 'rate_limit' },
];

const Panel: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  right,
  children,
}) => (
  <section
    className="nv-edge overflow-hidden rounded-[18px]"
    style={{
      background: 'linear-gradient(180deg, var(--surface-2), var(--surface-1))',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-3)',
    }}
  >
    <header
      className="flex items-center justify-between border-b px-5 py-4"
      style={{ borderColor: 'var(--line-faint)' }}
    >
      <div>
        <h3 className="nv-display text-[17px] font-medium" style={{ color: 'var(--text)' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-3)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </header>
    <div className="p-5">{children}</div>
  </section>
);

interface AuraLabProps {
  onBack?: () => void;
}

export const AuraLab: React.FC<AuraLabProps> = ({ onBack }) => {
  const [reduceEffects, setReduceEffects] = useState(false);
  const [state, setState] = useState<AuraState>('idle');
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? 'light' : 'dark'
  );

  const pick = (t: 'dark' | 'light') => {
    setTheme(t);
    setStoredTheme(t);
    applyTheme(t);
  };

  const handleToggleReduce = () => {
    const next = !reduceEffects;
    setReduceEffects(next);
    if (typeof document !== 'undefined') {
      document.documentElement.toggleAttribute('data-reduce-effects', next);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Aura forcedState={state} reduceEffects={reduceEffects} />
      <div className="nv-grid" aria-hidden />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="nv-topline relative z-10 flex h-[64px] shrink-0 items-center justify-between px-5 sm:px-8"
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack || (() => window.history.back())}
            className="nv-btn nv-btn--ghost !h-9 !px-3 text-[12.5px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Exit Lab
          </button>
          <div className="h-4 w-px" style={{ background: 'var(--line)' }} />
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
            <span className="nv-display text-[16px] font-medium">Xylvanthrex Labs</span>
            <span className="nv-chip !text-[9.5px]">GPU Tuner</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => pick(theme === 'dark' ? 'light' : 'dark')}
            className="nv-btn nv-btn--ghost !h-9 !px-3 text-[12px]"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === 'dark' ? 'Light room' : 'Dark room'}
          </button>
        </div>
      </header>

      {/* ── Workspace ──────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-6 px-5 py-8 sm:px-8">
        <Panel
          title="Atmospheric energy state"
          subtitle="Directly drive the GPU light source shader through canonical state machine modes"
          right={
            <div className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
              <span>ACTIVE:</span>
              <span className="font-semibold uppercase" style={{ color: 'var(--text)' }}>
                {state}
              </span>
            </div>
          }
        >
          <div className="flex flex-wrap gap-2">
            {STATES.map((s) => (
              <button
                key={s}
                onClick={() => setState(s)}
                className={`nv-btn !h-10 !px-4 text-[13px] uppercase font-mono tracking-wider ${
                  state === s ? 'nv-btn--primary' : 'nv-btn--ghost'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Accessibility & Motion" subtitle="Validate low-spec or sensitive-motion fallbacks">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                Reduce atmospheric effects
              </div>
              <div className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                Clamps scalar energy to a static ground, disables rotational lighting and grain
              </div>
            </div>
            <button
              onClick={handleToggleReduce}
              className="nv-btn nv-btn--ghost !h-9 !px-3.5 text-[12.5px]"
              style={
                reduceEffects
                  ? { color: 'var(--bg)', background: 'var(--text)', borderColor: 'transparent' }
                  : undefined
              }
            >
              {reduceEffects ? 'Reduced' : 'Full cinematic'}
            </button>
          </div>
        </Panel>

        <Panel title="Product App Scenarios" subtitle="Launch the Chat Reasoning Instrument with a specialized scenario">
          <div className="grid gap-2 sm:grid-cols-2">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.scenario}
                onClick={() => {
                  const chatProd = getProduct('chat');
                  window.location.href = `${chatProd?.url || '/chat'}?scenario=${sc.scenario}`;
                }}
                className="nv-card nv-card--interactive group flex items-center gap-3 px-3.5 py-3 text-left"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                  style={{ background: 'var(--glass-2)', border: '1px solid var(--line-faint)' }}
                >
                  <RefreshCw className="h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium" style={{ color: 'var(--text)' }}>
                    {sc.label}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px]" style={{ color: 'var(--text-4)' }}>
                    {sc.meta}
                  </span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-3)' }} />
              </button>
            ))}
          </div>
        </Panel>
      </main>
    </div>
  );
};
