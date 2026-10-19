import React, { useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import { Aura, type AuraState } from '../aura/Aura.tsx';
import { applyTheme, getStoredTheme, setStoredTheme } from '../../lib/theme.ts';
import { ArrowLeft, Play, RefreshCw, Sun, Moon, Sparkles, FlaskConical } from 'lucide-react';

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
      className="flex items-center justify-between gap-3 px-5 py-4"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="h-3.5 w-[2px] rounded-full"
          style={{ background: 'linear-gradient(180deg, var(--line-bright), var(--line))' }}
        />
        <div>
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.13em]" style={{ color: 'var(--text-1)' }}>
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 font-mono text-[10px]" style={{ color: 'var(--text-4)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right}
    </header>
    <div className="p-5">{children}</div>
  </section>
);

export const AuraLab: React.FC = () => {
  const { setCurrentView, reduceEffects, setReduceEffects, sendMessage } = useChatStore();
  const [state, setState] = useState<AuraState>('idle');
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('light') ? 'light' : 'dark'
  );

  const pick = (t: 'dark' | 'light') => {
    setTheme(t);
    setStoredTheme(t);
    applyTheme(t);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Aura forcedState={state} />
      <div className="nv-grid" aria-hidden />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="nv-topline relative z-10 flex h-[64px] shrink-0 items-center justify-between px-5 sm:px-8"
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentView('app')} className="nv-btn nv-btn--sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Workspace
          </button>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-[10px]"
            style={{ background: 'var(--glass-2)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-inset)' }}
          >
            <FlaskConical className="h-4 w-4" style={{ color: 'var(--text-2)' }} />
          </span>
          <div>
            <div className="nv-display text-[19px] leading-none">Xylvanthrex Labs</div>
            <div className="nv-label mt-1 !text-[9px]">Isolated reactive backdrop testbed</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="nv-chip hidden sm:inline-flex">state · {state}</span>
          <button onClick={() => pick(theme === 'dark' ? 'light' : 'dark')} className="nv-btn nv-btn--sm">
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span className="capitalize">{theme}</span>
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-5 sm:p-8">
        <Panel
          title="State machine"
          subtitle="A single scalar drives the bloom behind the interface"
          right={
            <span className="nv-chip">
              <Sparkles className="h-3 w-3" />
              {state}
            </span>
          }
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STATES.map((st) => (
              <button
                key={st}
                onClick={() => setState(st)}
                data-active={state === st}
                className="nv-seg__item !h-11 justify-center capitalize"
                style={state === st ? undefined : { background: 'var(--glass-1)', borderColor: 'var(--line-faint)' }}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <span className="nv-label shrink-0">Energy</span>
            <span className="nv-meter">
              <span
                className="nv-meter__fill"
                style={{
                  width:
                    state === 'streaming' ? '88%'
                    : state === 'thinking' ? '72%'
                    : state === 'typing' ? '52%'
                    : state === 'error' ? '100%'
                    : '25%',
                  transition: 'width 600ms var(--ease)',
                }}
              />
            </span>
            <span className="nv-num shrink-0 text-[10.5px]" style={{ color: 'var(--text-4)' }}>
              --energy
            </span>
          </div>
        </Panel>

        <Panel title="Dock replica" subtitle="Composer chrome rendered under the active aura state">
          <div className="flex flex-col items-center justify-center gap-4 py-6">
            <div
              className="nv-edge flex w-full max-w-lg items-center justify-between rounded-[18px] p-3 pl-4"
              style={{
                background: 'linear-gradient(180deg, var(--surface-3), var(--surface-1))',
                border: '1px solid transparent',
                boxShadow: 'var(--dock-shadow)',
              }}
            >
              <span className="truncate text-[13.5px]" style={{ color: 'var(--text-3)' }}>
                Simulated composer · {state} mode
              </span>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--text)', color: 'var(--bg)' }}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
              </span>
            </div>
            <span className="nv-label !text-[9px]">Grain, bloom and vignette are live behind this panel</span>
          </div>
        </Panel>

        <Panel title="Accessibility" subtitle="Performance and motion controls">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                Damp ambient motion
              </div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-3)' }}>
                Disables the grain overlay and the reactive bloom for low-power devices.
              </div>
            </div>
            <button
              onClick={() => setReduceEffects(!reduceEffects)}
              role="switch"
              aria-checked={reduceEffects}
              className="nv-btn nv-btn--sm shrink-0"
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

        <Panel title="Backend scenarios" subtitle="Dispatch a scripted SSE stream into the workspace">
          <div className="grid gap-2 sm:grid-cols-2">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.scenario}
                onClick={() => {
                  setCurrentView('app');
                  sendMessage(sc.prompt, [], sc.scenario);
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
              </button>
            ))}
          </div>
        </Panel>
      </main>
    </div>
  );
};
