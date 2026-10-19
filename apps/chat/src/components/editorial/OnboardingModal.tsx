import React, { useEffect, useState } from 'react';
import { useChatStore, type LensType } from '../../lib/store.ts';
import {
  ArrowRight,
  Check,
  Sparkles,
  Code2,
  Layout,
  BookOpen,
  Sigma,
  PenLine,
  List,
  AlignLeft,
  Table2,
  Command,
  MessageSquare,
  FileCode2,
  type LucideIcon,
} from 'lucide-react';

const DISCIPLINES: Array<{ id: LensType; label: string; desc: string; icon: LucideIcon; sample: string }> = [
  { id: 'engineering', label: 'Engineering', icon: Code2, desc: 'Zero-allocation algorithms, concurrency, Rust & TypeScript', sample: 'RingBuffer<T>::push(&self, item: T) -> Result<(), T>' },
  { id: 'reasoning', label: 'Reasoning', icon: Sigma, desc: 'Invariant proofs, trade-off matrices, formal verification', sample: 'A → B  ⟺  ∀k. V_A[k] ≤ V_B[k] ∧ ∃j. V_A[j] < V_B[j]' },
  { id: 'research', label: 'Research', icon: BookOpen, desc: 'Empirical benchmarks and causal literature synthesis', sample: 'Raft vs EPaxos under asymmetric network skew' },
  { id: 'design', label: 'Design', icon: Layout, desc: 'Token architectures, typographic ratios, spatial hierarchy', sample: '--bg: #000000 · --elev-1: #070707 · --radius-lg: 16px' },
  { id: 'writing', label: 'Writing', icon: PenLine, desc: 'Executive memos, RFCs, decision records', sample: 'RFC-014: modular monolith consolidation (p99 < 50ms)' },
];

const TOTAL = 4;

export const OnboardingModal: React.FC = () => {
  const { hasCompletedOnboarding, completeOnboarding, outputStyle, setOutputStyle, setSelectedLens } =
    useChatStore();

  const [step, setStep] = useState(1);
  const [demo, setDemo] = useState<LensType>('engineering');
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (step !== 1) return;
    const full = 'One intelligence. Every discipline. No noise.';
    let i = 0;
    setTyped('');
    const t = setInterval(() => {
      i += 1;
      setTyped(full.slice(0, i));
      if (i >= full.length) clearInterval(t);
    }, 34);
    return () => clearInterval(t);
  }, [step]);

  if (hasCompletedOnboarding) return null;

  const next = () => (step < TOTAL ? setStep(step + 1) : completeOnboarding());
  const active = DISCIPLINES.find((d) => d.id === demo) || DISCIPLINES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="nv-scrim" />

      <div className="nv-modal flex min-h-[560px] w-full max-w-[720px] flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-3">
            <span className="nv-display text-[20px] leading-none">Noevix</span>
            <span className="nv-badge">
              {String(step).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL }, (_, i) => i + 1).map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                aria-label={`Step ${s}`}
                className="h-[3px] rounded-full transition-all duration-300"
                style={{
                  width: s === step ? 26 : s < step ? 12 : 8,
                  background: s === step ? 'var(--text)' : s < step ? 'var(--text-3)' : 'var(--line-strong)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-9 sm:py-10">
          {step === 1 && (
            <div className="anim-rise">
              <span className="nv-label">Philosophy</span>
              <h2 className="nv-display mt-3 text-[clamp(34px,5vw,46px)] leading-[1.03]">
                Light in a<br />
                <em style={{ fontStyle: 'italic', color: 'var(--text-2)' }}>dark room.</em>
              </h2>
              <div
                className="mt-7 flex min-h-[52px] items-center rounded-[12px] px-4 font-mono text-[13.5px]"
                style={{ background: 'var(--glass-1)', border: '1px solid var(--line)', color: 'var(--text)' }}
              >
                <span>{typed}</span>
                <span className="nv-caret" />
              </div>
              <p className="mt-6 max-w-[52ch] text-[14px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Noevix removes decorative colour and chat bubbles entirely. A single luminous canvas
                keeps every unit of attention on the work itself.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="anim-rise">
              <span className="nv-label">Answer shape</span>
              <h2 className="nv-display mt-3 text-[clamp(30px,4vw,40px)] leading-[1.06]">
                How should answers arrive?
              </h2>
              <p className="mt-2.5 text-[13.5px]" style={{ color: 'var(--text-2)' }}>
                Switch at any time from the composer or preferences.
              </p>

              <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
                {[
                  { id: 'lists', label: 'Lists & outlines', desc: 'Dense bullets, numbered invariants, fast scanning', icon: List },
                  { id: 'paragraphs', label: 'Prose', desc: 'Editorial narrative with full context', icon: AlignLeft },
                  { id: 'code_first', label: 'Code first', desc: 'Executable answers lead the reply', icon: Code2 },
                  { id: 'tables', label: 'Comparison', desc: 'Trade-off matrices and option tables', icon: Table2 },
                ].map((o) => {
                  const Icon = o.icon;
                  const on = outputStyle === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setOutputStyle(o.id as any)}
                      className="flex flex-col items-start gap-2.5 rounded-[14px] p-4 text-left transition-all duration-200"
                      style={{
                        background: on ? 'var(--glass-3)' : 'var(--glass-1)',
                        border: `1px solid ${on ? 'var(--line-bright)' : 'var(--line-faint)'}`,
                        boxShadow: on ? 'var(--shadow-2), var(--shadow-inset)' : 'none',
                      }}
                    >
                      <div className="flex w-full items-center justify-between">
                        <Icon className="h-4 w-4" style={{ color: on ? 'var(--text)' : 'var(--text-3)' }} />
                        {on && <Check className="h-3.5 w-3.5" style={{ color: 'var(--text)' }} />}
                      </div>
                      <div>
                        <div className="text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                          {o.label}
                        </div>
                        <div className="mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--text-4)' }}>
                          {o.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="anim-rise">
              <span className="nv-label">Adaptive routing</span>
              <h2 className="nv-display mt-3 text-[clamp(30px,4vw,40px)] leading-[1.06]">
                Five disciplines. One voice.
              </h2>
              <p className="mt-2.5 text-[13.5px]" style={{ color: 'var(--text-2)' }}>
                A prompt router evaluates intent, then executes with domain precision.
              </p>

              <div className="mt-6 space-y-1.5">
                {DISCIPLINES.map((d) => {
                  const Icon = d.icon;
                  const on = demo === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setDemo(d.id);
                        setSelectedLens(d.id);
                      }}
                      className="flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left transition-all duration-200"
                      style={{
                        background: on ? 'var(--glass-3)' : 'transparent',
                        border: `1px solid ${on ? 'var(--line)' : 'transparent'}`,
                      }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: 'var(--glass-2)', border: '1px solid var(--line-faint)' }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: on ? 'var(--text)' : 'var(--text-3)' }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                          {d.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px]" style={{ color: 'var(--text-4)' }}>
                          {d.desc}
                        </span>
                      </span>
                      {on && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text)' }} />}
                    </button>
                  );
                })}
              </div>

              <div
                className="mt-5 overflow-hidden rounded-[11px] px-3.5 py-3"
                style={{ background: 'var(--code-bg)', border: '1px solid var(--line-faint)' }}
              >
                <div className="nv-label mb-1.5 !text-[9px]">Protocol signature</div>
                <code className="font-mono text-[12px]" style={{ color: 'var(--text-1)' }}>
                  {active.sample}
                </code>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="anim-rise">
              <span className="nv-label">Instrument</span>
              <h2 className="nv-display mt-3 text-[clamp(32px,4.5vw,44px)] leading-[1.04]">
                Everything is within reach.
              </h2>

              <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
                {[
                  { icon: MessageSquare, title: 'Spaces', body: 'Create, switch, rename and export threads from the left rail.' },
                  { icon: FileCode2, title: 'Code surfaces', body: 'Replies render in real editor windows with a full artifact sheet.' },
                  { icon: Sparkles, title: 'Discipline lens', body: 'Override routing per message from the composer pill.' },
                  { icon: Command, title: 'Keyboard', body: '⌘K for the index, ⌘/ for the lens, J and K to move between turns.' },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className="rounded-[13px] p-3.5"
                      style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" style={{ color: 'var(--text-2)' }} />
                        <span className="text-[12.5px] font-medium" style={{ color: 'var(--text)' }}>
                          {f.title}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-4)' }}>
                        {f.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--line)', background: 'var(--glass-1)' }}
        >
          <button
            onClick={completeOnboarding}
            className="font-mono text-[11px] uppercase tracking-[0.1em] transition-colors hover:text-[var(--text)]"
            style={{ color: 'var(--text-4)' }}
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="nv-btn">
                Back
              </button>
            )}
            <button onClick={next} className="nv-btn nv-btn--primary">
              {step === TOTAL ? 'Enter workspace' : 'Continue'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
