import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChatStore, type LensType } from '../../lib/store.ts';
import { MARKETING_COPY } from '../../content/marketing.ts';
import { Aura } from '../aura/Aura.tsx';
import { MarketingNav } from './MarketingNav.tsx';
import { Eyebrow, Section, SectionHead, Spark } from './ui.tsx';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Cpu,
  Gauge,
  Layout,
  Minus,
  Pause,
  PenLine,
  Play,
  Plus,
  ShieldCheck,
  Sigma,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════════
   Demo corpus — one render per discipline, streamed character by character.
   ══════════════════════════════════════════════════════════════════════════ */

const DEMO_LENSES: Array<{
  id: LensType;
  label: string;
  icon: LucideIcon;
  time: string;
  tokens: string;
  prompt: string;
  response: string;
}> = [
  {
    id: 'engineering',
    label: 'Engineering',
    icon: Code2,
    time: '180ms',
    tokens: '412',
    prompt: 'Synthesise a zero-copy lock-free ring buffer for low-latency telemetry.',
    response: `export class FastRingBuffer<T> {
  private readonly buffer: (T | undefined)[];
  private readonly mask: number;
  private head = 0;
  private tail = 0;

  constructor(capacity = 1024) {
    this.buffer = new Array(capacity);
    this.mask = capacity - 1;
  }

  push(item: T): boolean {
    if (this.head - this.tail >= this.buffer.length) return false;
    this.buffer[this.head++ & this.mask] = item;
    return true;
  }

  pop(): T | undefined {
    if (this.tail === this.head) return undefined;
    return this.buffer[this.tail++ & this.mask];
  }
}

// Power-of-two masking turns index wrap into one AND instruction.
// No allocation, no locks, no branch misprediction on the hot path.`,
  },
  {
    id: 'reasoning',
    label: 'Reasoning',
    icon: Sigma,
    time: '240ms',
    tokens: '284',
    prompt: 'Provide a formal invariant proof for vector-clock dominance.',
    response: `Theorem — A causally precedes B if and only if:
  1. ∀ k ∈ [1..N], V_A[k] ≤ V_B[k]
  2. ∃ j ∈ [1..N], V_A[j] < V_B[j]

Proof by monotonic counter invariant:
  · Local progression — node i increments V_i[i] on every local event.
  · Propagation — each send bundles V_msg; the recipient merges
    V_recv = max(V_local, V_msg).
  · Since max() is idempotent, commutative and monotonic, V_B
    dominates V_A along every causal chain.   ∎

If neither vector dominates, the events are concurrent.`,
  },
  {
    id: 'research',
    label: 'Research',
    icon: BookOpen,
    time: '310ms',
    tokens: '356',
    prompt: 'Synthesise the trade-offs between Raft, Paxos and EPaxos under contention.',
    response: `Comparative consensus synthesis

1 · Leader bottleneck
  Multi-Paxos and Raft serialise writes through an elected leader; past
  ~100k writes/s the leader's NIC saturates first. EPaxos proposes from
  every replica with no single-leader serialisation.

2 · Quorum latency
  Raft needs two round trips for uncommitted replication. EPaxos commits
  on the fast path in one round trip when no conflicting keys overlap.

3 · Recovery complexity
  Raft favours comprehensible failover. EPaxos requires topological
  sorting of dependency graphs during a view change.`,
  },
  {
    id: 'design',
    label: 'Design',
    icon: Layout,
    time: '190ms',
    tokens: '268',
    prompt: 'Define an elevation and typographic token architecture.',
    response: `Minimal token architecture

Elevation
  --bg      #000000   ground
  --elev-1  #070707   surfaces, composer
  --elev-2  #0d0d0d   raised controls
  --elev-3  #141414   flyouts, modals

Typographic ratio — major third (1.25)
  Display   Instrument Serif   72/1.02  tracking -0.025em
  Title     Instrument Serif   32/1.15  tracking -0.015em
  Body      Geist              17/1.70  tracking -0.011em
  Metadata  Geist Mono         11/1.40  tracking  0.08em`,
  },
  {
    id: 'writing',
    label: 'Writing',
    icon: PenLine,
    time: '160ms',
    tokens: '301',
    prompt: 'Draft a memo migrating from microservices to a modular monolith.',
    response: `RFC — consolidation to a modular monolith

Context
  Latency across 28 services pushed p99 from 40ms to 420ms. Inter-service
  serialisation consumes 34% of cluster CPU.

Decision
  1 · Collapse domain boundaries into one Rust binary of workspace crates.
  2 · Replace network hops with in-process async channels.
  3 · Keep strict visibility barriers to prevent entanglement.

Impact
  p99 projected down 88% (<50ms). Fleet: 110 pods → 12 instances.`,
  },
];

/* ── Synthesis highlighter ─────────────────────────────────────────────────
   Pure emphasis: keywords and operators gain weight, nothing else
   changes. Comments recede. This is the whole syntax theme.            */
const HL_SPLIT =
  /(\b(?:Theorem|Proof|Local|Propagation|Since|If|then|only if|neither|concurrent|export|class|private|readonly|constructor|return|boolean|true|false|Context|Decision|Impact|Elevation|Typographic)\b|∀|∃|∈|≤|∎|→|·|—)/g;
const HL_STRONG =
  /^(?:Theorem|Proof|Local|Propagation|Since|If|then|only if|neither|concurrent|export|class|private|readonly|constructor|return|boolean|true|false|Context|Decision|Impact|Elevation|Typographic|∀|∃|∈|≤|∎|→|·|—)$/;

const SynthesisLine: React.FC<{ line: string }> = ({ line }) => {
  if (/^\s*\/\//.test(line)) {
    return (
      <div style={{ color: 'var(--text-4)', fontStyle: 'italic' }}>{line || ' '}</div>
    );
  }
  const parts = line.split(HL_SPLIT);
  return (
    <div style={{ color: 'var(--text-2)' }}>
      {parts.map((p, i) =>
        p === undefined ? null : HL_STRONG.test(p) ? (
          <span key={i} style={{ color: 'var(--text)', fontWeight: 600 }}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Page
   ══════════════════════════════════════════════════════════════════════════ */

const CAP_ICONS: Record<string, LucideIcon> = {
  engineering: Code2,
  speed: Gauge,
  design: Layout,
  reasoning: Sigma,
  research: BookOpen,
  writing: PenLine,
};

const AUTONOMY = [
  {
    level: 'L0',
    title: 'Observe',
    desc: 'Read-only analysis against the event store. Nothing is leased, nothing leaves the sandbox.',
    gate: 'no approval',
  },
  {
    level: 'L1',
    title: 'Propose',
    desc: 'Drafts the plan and the changeset for a human to accept. The default for every new tenant.',
    gate: 'one approval',
  },
  {
    level: 'L2',
    title: 'Act in scope',
    desc: 'Applies effects whose class is explicitly allow-listed by the active policy revision.',
    gate: 'policy R2',
  },
  {
    level: 'L3',
    title: 'Act unsupervised',
    desc: 'Runs allow-listed effects with no human in the loop, under a mission budget ceiling.',
    gate: 'policy R3 + record',
  },
  {
    level: 'L4',
    title: 'Set policy',
    desc: 'The ladder deliberately stops here. A machine may not author the rules it obeys.',
    gate: 'never granted',
  },
];

export const MarketingPage: React.FC = () => {
  const { setCurrentView, setAuthModalOpen, newChat, setActiveConversation } = useChatStore();

  const [headlineWords, setHeadlineWords] = useState<string[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [lensIndex, setLensIndex] = useState(0);
  const [streamed, setStreamed] = useState('');
  const [typing, setTyping] = useState(false);
  const [paused, setPaused] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = DEMO_LENSES[lensIndex];
  const lines = useMemo(() => streamed.split('\n'), [streamed]);

  useEffect(() => setHeadlineWords(MARKETING_COPY.hero.headline.split(' ')), []);

  useEffect(() => {
    if (paused) return;
    let timeout: any;
    const words = active.response.split(' ');
    let i = 0;
    setStreamed('');
    setTyping(true);
    const iv = setInterval(() => {
      if (i < words.length) {
        i += 1;
        setStreamed(words.slice(0, i).join(' '));
      } else {
        clearInterval(iv);
        setTyping(false);
        timeout = setTimeout(() => setLensIndex((p) => (p + 1) % DEMO_LENSES.length), 6500);
      }
    }, 46);
    return () => {
      clearInterval(iv);
      if (timeout) clearTimeout(timeout);
    };
  }, [lensIndex, paused, active.response]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [streamed]);

  useEffect(() => {
    const update = () => setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const launch = () => {
    const id = newChat('Untitled Space');
    setActiveConversation(id);
    setCurrentView('app');
  };

  const money = (plan: { price: string; period: string }) => {
    if (!annual || plan.price === '$0') return { price: plan.price, period: plan.period };
    const base = parseInt(plan.price.replace(/[^0-9]/g, ''), 10) * 10;
    return { price: `$${base}`, period: plan.period.replace('month', 'year') };
  };

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <Aura />
      <div className="nv-grid" aria-hidden />

      <MarketingNav
        theme={theme}
        onLaunch={launch}
        onSignIn={() => setAuthModalOpen(true, 'login')}
        onLab={() => setCurrentView('lab')}
      />

      {/* ══ Hero ═══════════════════════════════════════════════════════ */}
      <section className="relative z-10 flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-[var(--gutter)] pb-16 pt-32 text-center">
        {/* Hero Background Dot Matrix Grid */}
        <div
          className="pointer-events-none absolute inset-0 select-none overflow-hidden"
          aria-hidden="true"
          style={{
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 15%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 15%, transparent 75%)',
          }}
        >
          <div
            className="absolute inset-0 h-full w-full"
            style={{
              backgroundImage: 'radial-gradient(circle, var(--text-4) 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
              opacity: 0.5,
            }}
          />
        </div>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">
          <span className="nv-badge mb-8">
            <span className="nv-dot nv-dot--live" />
            Pure precision instrument
          </span>

          <h1
            className="nv-display text-balance"
            style={{ fontSize: 'clamp(44px, 9vw, 104px)', lineHeight: 0.98 }}
          >
            {headlineWords.map((w, i) => (
              <span
                key={i}
                className="inline-block"
                style={{ animation: `nv-word 620ms var(--ease-out) ${i * 90}ms both` }}
              >
                {w}
                {i < headlineWords.length - 1 ? '\u00A0' : ''}
              </span>
            ))}
          </h1>

          <p
            className="text-pretty mt-8 max-w-[56ch] text-[16.5px] leading-relaxed"
            style={{ color: 'var(--text-2)' }}
          >
            {MARKETING_COPY.hero.subhead}
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <button onClick={launch} className="nv-btn nv-btn--primary nv-btn--lg">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              {MARKETING_COPY.hero.ctaPrimary}
            </button>
            <a href="#demo" className="nv-btn nv-btn--lg">
              {MARKETING_COPY.hero.ctaSecondary}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:mt-16 sm:gap-x-8">
            {[
              { icon: Cpu, label: 'Adaptive routing' },
              { icon: Code2, label: 'Five disciplines' },
              { icon: ShieldCheck, label: 'Verified synthesis' },
              { icon: Gauge, label: 'Sub-300ms first token' },
            ].map((t) => (
              <span key={t.label} className="flex items-center gap-2 nv-label !text-[10px]">
                <t.icon className="h-3.5 w-3.5" style={{ color: 'var(--icon)' }} />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Live stage ═════════════════════════════════════════════════ */}
      <Section id="demo" width="xl">
        <SectionHead
          eyebrow="Live stage"
          title="A real render, not a mock-up"
          sub="The workspace below streams an actual synthesis for each discipline. Nothing is a screenshot."
          aside={
            <button onClick={launch} className="nv-btn nv-btn--sm hidden sm:inline-flex">
              Open the workspace
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          }
        />

        <div className="relative mx-auto max-w-[1100px]">
          <div className="nv-frame__glow" aria-hidden />

          {/* ⌘ Verified — floats off the top-right corner */}
          <div
            className="nv-glass absolute -right-6 top-24 z-20 hidden w-[212px] rounded-[16px] p-3.5 xl:block"
            style={{ border: '1px solid var(--line)', boxShadow: 'var(--shadow-3)' }}
          >
            <div className="flex items-center justify-between">
              <span className="nv-label !text-[10px]">Verification</span>
              <span className="nv-badge nv-badge--solid !h-[17px] !text-[9.5px]">passed</span>
            </div>
            <div className="mt-3 space-y-2">
              {['Type safety', 'Bounds invariant', 'Allocation count'].map((c, i) => (
                <div key={c} className="flex items-center gap-2">
                  <span
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
                    style={{ background: 'var(--text)', color: 'var(--bg)' }}
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  <span className="text-[11.5px]" style={{ color: 'var(--text-2)' }}>
                    {c}
                  </span>
                  <span
                    className="nv-num ml-auto text-[10px]"
                    style={{ color: 'var(--text-4)' }}
                  >
                    0{i + 1}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="nv-label !text-[10px]">Certificate</span>
              <span className="nv-num text-[10px]" style={{ color: 'var(--text-3)' }}>
                sha·7f2c
              </span>
            </div>
          </div>

          {/* ⌘ Latency — floats off the bottom-left corner */}
          <div
            className="nv-glass absolute -left-6 bottom-28 z-20 hidden w-[196px] rounded-[16px] p-3.5 xl:block"
            style={{ border: '1px solid var(--line)', boxShadow: 'var(--shadow-3)' }}
          >
            <div className="flex items-baseline justify-between">
              <span className="nv-label !text-[10px]">First token</span>
              <span className="nv-num text-[17px]" style={{ color: 'var(--text)' }}>
                {active.time}
              </span>
            </div>
            <div className="nv-meter nv-meter--sweep mt-3" style={{ height: 3 }}>
              <span className="nv-meter__fill" style={{ width: '68%' }} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="nv-label !text-[10px]">Budget</span>
              <span className="nv-num text-[10px]" style={{ color: 'var(--text-3)' }}>
                {active.tokens} tok
              </span>
            </div>
          </div>

          <div
            className="nv-frame relative flex h-[524px] flex-col overflow-hidden sm:h-[590px] lg:h-[648px]"
            style={{ border: '1px solid var(--line)' }}
          >
            {/* chrome */}
            <div
              className="flex h-12 shrink-0 items-center justify-between gap-2 px-4"
              style={{ background: 'var(--code-gutter)', borderBottom: '1px solid var(--line-faint)' }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden items-center gap-[6px] sm:flex">
                  {[0.55, 0.34, 0.22].map((o, i) => (
                    <span
                      key={i}
                      className="h-[9px] w-[9px] rounded-full"
                      style={{ background: 'var(--glass-4)', opacity: o }}
                    />
                  ))}
                </div>
                <span className="nv-display ml-1 hidden text-[15px] sm:inline">Noevix</span>
                {/* The lens name is the only label on a phone, so it stays. */}
                <span className="nv-chip !h-[20px] !text-[10px]">
                  {active.label}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="nv-label !text-[10px] hidden sm:inline">
                  {typing ? 'streaming' : 'complete'}
                </span>
                {typing && <span className="nv-dot nv-dot--live" />}
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="nv-iconbtn nv-iconbtn--sm"
                  title={paused ? 'Resume' : 'Pause'}
                  aria-label={paused ? 'Resume' : 'Pause'}
                >
                  {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1" style={{ minHeight: 0 }}>
              {/* app rail */}
              <div
                className="hidden w-[52px] shrink-0 flex-col items-center justify-between py-4 sm:flex"
                style={{ background: 'var(--elev-1)', borderRight: '1px solid var(--line-faint)' }}
              >
                <div className="flex flex-col items-center gap-3.5">
                  {DEMO_LENSES.map((l, i) => {
                    const Icon = l.icon;
                    return (
                      <button
                        key={l.id}
                        onClick={() => setLensIndex(i)}
                        title={l.label}
                        className="flex h-9 w-9 items-center justify-center rounded-[9px] transition-colors lg:h-8 lg:w-8"
                        style={{
                          background: lensIndex === i ? 'var(--glass-3)' : 'transparent',
                          color: lensIndex === i ? 'var(--text)' : 'var(--icon)',
                          border: `1px solid ${lensIndex === i ? 'var(--line)' : 'transparent'}`,
                        }}
                      >
                        <Icon className="h-[15px] w-[15px]" />
                      </button>
                    );
                  })}
                </div>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[9px]"
                  style={{ background: 'var(--glass-3)', color: 'var(--text-2)' }}
                >
                  NV
                </span>
              </div>

              {/* stage */}
              <div className="flex min-w-0 flex-1 flex-col">
                {/* lens switcher */}
                <div
                  className="flex shrink-0 items-center gap-1 px-3 py-2.5 sm:px-4"
                  style={{ borderBottom: '1px solid var(--line-faint)' }}
                >
                  <div className="nv-seg nv-scroll-x max-w-full overflow-x-auto">
                    {DEMO_LENSES.map((l, i) => {
                      const Icon = l.icon;
                      return (
                        <button
                          key={l.id}
                          data-active={lensIndex === i}
                          onClick={() => setLensIndex(i)}
                          className="nv-seg__item"
                        >
                          <Icon className="h-3 w-3" />
                          <span className="hidden md:inline">{l.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="nv-num ml-auto hidden shrink-0 text-[11px] sm:block sm:text-[10.5px]" style={{ color: 'var(--text-4)' }}>
                    {String(lensIndex + 1).padStart(2, '0')} / {String(DEMO_LENSES.length).padStart(2, '0')}
                  </span>
                </div>

                {/* prompt */}
                <div className="shrink-0 px-4 pt-4 sm:px-5 sm:pt-5">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="nv-label !text-[10px]">Prompt</span>
                    <span className="ml-auto nv-label !text-[10px]">latency {active.time}</span>
                  </div>
                  <h3 className="nv-display text-balance text-[18px] leading-snug sm:text-[23px]">
                    &ldquo;{active.prompt}&rdquo;
                  </h3>
                </div>

                {/* synthesis */}
                <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4">
                  <div className="mb-2 flex shrink-0 items-center gap-3">
                    <span className="nv-label !text-[10px]">Synthesis</span>
                    <span className="ml-auto nv-num text-[10px]" style={{ color: 'var(--text-4)' }}>
                      {lines.length} lines
                    </span>
                  </div>

                  <div
                    ref={scrollRef}
                    className="nv-scroll relative min-h-0 flex-1 overflow-y-auto rounded-[14px]"
                    style={{
                      background: 'var(--code-bg)',
                      border: '1px solid var(--line-faint)',
                      overflowAnchor: 'none',
                      overscrollBehavior: 'contain',
                      boxShadow: 'var(--shadow-inset)',
                    }}
                  >
                    <div className="flex min-h-full">
                      <div
                        className="w-[34px] shrink-0 select-none py-4 pr-2 text-right font-mono text-[10px] tabular-nums sm:w-[42px] sm:pr-3 sm:text-[10.5px]"
                        style={{ color: 'var(--text-4)', borderRight: '1px solid var(--line-faint)' }}
                        aria-hidden
                      >
                        {lines.map((_, i) => (
                          <div key={i} style={{ lineHeight: 1.75 }}>
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      <div
                        className="flex-1 whitespace-pre-wrap px-3 py-4 font-mono text-[11.5px] sm:px-4 sm:text-[12.5px]"
                        style={{ lineHeight: 1.75 }}
                      >
                        {lines.map((l, i) => (
                          <React.Fragment key={i}>
                            <SynthesisLine line={l} />
                          </React.Fragment>
                        ))}
                        {typing && <span className="nv-caret" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* composer */}
                <div className="shrink-0 px-4 pb-3 sm:px-5 sm:pb-4">
                  <div
                    className="flex items-center gap-2 rounded-full py-1.5 pl-3.5 pr-1.5 sm:gap-3 sm:pl-4"
                    style={{ background: 'var(--glass-1)', border: '1px solid var(--line)' }}
                  >
                    <span className="truncate text-[12px] sm:text-[12.5px]" style={{ color: 'var(--text-3)' }}>
                      Ready for a prompt…
                    </span>
                    <span className="ml-auto hidden items-center gap-1.5 sm:flex">
                      <span className="nv-kbd">⌘</span>
                      <span className="nv-kbd">K</span>
                    </span>
                    <button onClick={launch} className="nv-btn nv-btn--primary nv-btn--sm !rounded-full">
                      Launch
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* status bar */}
            <div
              className="relative flex h-9 shrink-0 items-center justify-between px-4"
              style={{ background: 'var(--elev-1)', borderTop: '1px solid var(--line-faint)' }}
            >
              <div className="flex items-center gap-4">
                <span className="nv-num text-[10px]" style={{ color: 'var(--text-3)' }}>
                  chain·sha256
                </span>
                <span className="nv-num hidden text-[10px] sm:block" style={{ color: 'var(--text-4)' }}>
                  events·{lines.length + 41}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="nv-dot" />
                <span className="nv-label !text-[10px]">auditable</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ══ Measurement ════════════════════════════════════════════════ */}
      <Section id="metrics" width="xl">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-12 lg:grid-cols-4">
          {MARKETING_COPY.metrics.map((m, i) => (
            <div key={m.label} className="relative">
              <div className="flex items-baseline gap-1.5">
                <span
                  className="nv-display nv-num"
                  style={{ fontSize: 'clamp(38px,5vw,58px)', lineHeight: 1 }}
                >
                  {m.value}
                </span>
                <span className="font-mono text-[15px]" style={{ color: 'var(--text-3)' }}>
                  {m.unit}
                </span>
              </div>
              <div className="mt-4 nv-label !text-[10px]" style={{ color: 'var(--text-1)' }}>
                {m.label}
              </div>
              <p className="mt-2 max-w-[26ch] text-[12.5px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                {m.detail}
              </p>
              <span className="nv-num absolute right-0 top-0 text-[10px]" style={{ color: 'var(--text-4)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ══ Capabilities ═══════════════════════════════════════════════ */}
      <Section id="capabilities" width="xl">
        <SectionHead
          eyebrow="Capabilities"
          title="Five specialised roles, one calm voice"
          sub="No mode selector, no model picker. Intent is classified and routed in under fifteen milliseconds."
          aside={<Spark seed={5} className="hidden w-[180px] lg:flex" />}
        />
        <div className="grid grid-cols-12 gap-3">
          {MARKETING_COPY.capabilities.map((item, i) => {
            const Icon = CAP_ICONS[item.id] ?? Sparkles;
            const wide = item.colSpan.includes('col-span-12') || item.colSpan.includes('md:col-span-7');
            return (
              <article
                key={item.id}
                className={`${item.colSpan} nv-card nv-lift nv-spotlight relative flex flex-col overflow-hidden p-6 sm:p-7`}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                }}
              >
                <div className="relative flex items-start justify-between">
                  <span className="nv-tile nv-tile--lg">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="nv-chip">{item.badge}</span>
                    <span className="nv-num text-[10px]" style={{ color: 'var(--text-4)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <h3 className="nv-display relative mt-7 text-balance text-[26px] leading-tight">
                  {item.title}
                </h3>
                <p
                  className="relative mt-2.5 max-w-[46ch] text-[13.5px] leading-relaxed"
                  style={{ color: 'var(--text-2)' }}
                >
                  {item.desc}
                </p>

                <div className="relative mt-auto pt-7">
                  <Spark seed={i * 3 + 1} hot={wide ? 17 : -1} />
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      {/* ══ How it works ═══════════════════════════════════════════════ */}
      <Section width="lg">
        <SectionHead
          eyebrow="Execution"
          title="From sentence to verified artefact"
          sub="Three movements. The middle one is where most systems quietly give up."
          align="center"
        />
        <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
          {MARKETING_COPY.howItWorks.map((s, i) => (
            <div key={s.step} className="relative flex flex-col">
              <div className="relative flex items-center gap-3">
                <span
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full font-mono text-[13px]"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line-strong)',
                    color: 'var(--text)',
                    boxShadow: 'var(--shadow-inset), var(--shadow-2)',
                  }}
                >
                  {s.step}
                </span>
                <span className="nv-label !text-[10px]">
                  {['interpret', 'dispatch', 'verify'][i]}
                </span>
              </div>
              <h3 className="nv-display mt-6 text-[22px]">{s.title}</h3>
              <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ══ Comparison ════════════════════════════════════════════════ */}
      <Section id="compare" width="lg">
        <SectionHead
          eyebrow="Comparison"
          title="What changes when work must be provable"
          sub="Assistants optimise for the answer. Noevix optimises for the answer surviving inspection."
        />
        <div className="mb-3 flex items-center justify-between md:hidden">
          <span className="nv-label !text-[10px]">Swipe to compare</span>
          <span className="flex items-center gap-1.5 nv-label !text-[10px]" style={{ color: 'var(--text-3)' }}>
            four columns
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
        <div
          className="nv-edge overflow-hidden rounded-[18px]"
          style={{ border: '1px solid transparent', background: 'var(--glass-1)' }}
        >
          <div className="overflow-x-auto nv-scroll-x">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr>
                  {MARKETING_COPY.compare.columns.map((c, i) => {
                    const last = i === MARKETING_COPY.compare.columns.length - 1;
                    return (
                      <th
                        key={c}
                        className={`px-5 py-3 text-left ${i === 0 ? 'w-[38%]' : ''}`}
                        style={{ background: last ? 'var(--glass-2)' : 'transparent' }}
                      >
                        {last ? (
                          <span className="nv-badge nv-badge--solid">{c}</span>
                        ) : (
                          <span className="nv-label !text-[10px]">{c}</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {MARKETING_COPY.compare.rows.map((row) => (
                  <tr key={row[0]} className="transition-colors">
                    {row.map((cell, ci) => {
                      const last = ci === row.length - 1;
                      const first = ci === 0;
                      const negative = cell === 'not offered' || cell === '—';
                      return (
                        <td
                          key={ci}
                          className="px-5 py-4 text-[13px]"
                          style={{
                            background: last ? 'var(--glass-2)' : 'transparent',
                            color: first
                              ? 'var(--text)'
                              : last
                                ? 'var(--text-1)'
                                : negative
                                  ? 'var(--text-3)'
                                  : 'var(--text-2)',
                            fontFamily: first ? undefined : 'var(--font-mono)',
                            fontSize: first ? 13.5 : 11.5,
                            fontWeight: last ? 500 : undefined,
                          }}
                        >
                          <span className="flex items-center gap-2">
                            {last && (
                              <Check className="h-3 w-3 shrink-0" style={{ color: 'var(--text)' }} />
                            )}
                            {cell}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ══ Autonomy ladder ═══════════════════════════════════════════ */}
      <Section id="governance" width="md">
        <SectionHead
          eyebrow="Governance"
          title="Autonomy is granted a rung at a time"
          sub="Every tenant starts at L1. Escalation is explicit, recorded, and reversible."
        />
        <div className="space-y-3">
          {AUTONOMY.map((a, i) => {
            const terminal = i === AUTONOMY.length - 1;
            return (
              <div
                key={a.level}
                className="nv-card nv-lift relative flex flex-col gap-4 p-5 pl-[68px] sm:flex-row sm:items-center sm:pl-[78px]"
              >
                <span
                  className="absolute left-4 top-4 flex h-[22px] items-center rounded-full px-2 font-mono text-[10px] sm:left-4 sm:top-1/2 sm:-translate-y-1/2"
                  style={{
                    background: terminal ? 'transparent' : 'var(--text)',
                    color: terminal ? 'var(--text-3)' : 'var(--bg)',
                    border: terminal ? '1px dashed var(--line-strong)' : 'none',
                    boxShadow: terminal ? 'none' : 'var(--shadow-2)',
                  }}
                >
                  {a.level}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <h3 className="nv-display text-[19px]">{a.title}</h3>
                    <span className="nv-num text-[10px]" style={{ color: 'var(--text-4)' }}>
                      {String(i).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                    {a.desc}
                  </p>
                </div>
                <span
                  className="shrink-0 self-start rounded-full px-3 py-1 font-mono text-[11px] sm:self-center sm:text-[10.5px]"
                  style={{
                    background: 'var(--glass-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--text-3)',
                  }}
                >
                  {a.gate}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ══ Quote ═════════════════════════════════════════════════════ */}
      <Section width="md">
        <div className="relative flex flex-col items-center text-center">
          <span className="nv-quotemark absolute -top-4 select-none" aria-hidden>
            &ldquo;
          </span>
          <blockquote className="relative pt-6">
            <p className="nv-display text-balance text-[clamp(26px,4.4vw,52px)] leading-[1.1]">
              {MARKETING_COPY.quote.statement}
            </p>
            <footer className="mt-6 flex items-center justify-center">
              <span className="nv-label !text-[10px]">{MARKETING_COPY.quote.attribution}</span>
            </footer>
          </blockquote>
        </div>
      </Section>

      {/* ══ Principles ════════════════════════════════════════════════ */}
      <Section id="principles" width="md">
        <div className="text-center">
          <Eyebrow>The constitution</Eyebrow>
        </div>
        <div className="mt-14 space-y-14">
          {MARKETING_COPY.principles.map((p, i) => (
            <div key={i} className="grid gap-5 sm:grid-cols-[64px_1fr]">
              <span
                className="font-mono text-[11px]"
                style={{ color: 'var(--text-4)', paddingTop: 6 }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <blockquote className="relative">
                <p className="nv-display text-balance text-[clamp(22px,3.2vw,34px)] leading-[1.16]">
                  {p.statement}
                </p>
                <footer
                  className="mt-5 max-w-[58ch] text-[13.5px] leading-relaxed"
                  style={{ color: 'var(--text-2)' }}
                >
                  {p.detail}
                </footer>
              </blockquote>
            </div>
          ))}
        </div>
      </Section>

      {/* ══ Pricing ═══════════════════════════════════════════════════ */}
      <Section id="pricing" width="xl">
        <SectionHead
          eyebrow="Value"
          title="Predictable plans"
          sub="Every tier ships the full verification plane. What changes is throughput, autonomy and collaboration."
          align="center"
        />

        <div className="mb-10 flex justify-center">
          <div className="nv-seg">
            <button
              data-active={!annual}
              onClick={() => setAnnual(false)}
              className="nv-seg__item !px-4"
            >
              Monthly
            </button>
            <button
              data-active={annual}
              onClick={() => setAnnual(true)}
              className="nv-seg__item !px-4"
            >
              Annual
              <span className="nv-chip !h-[16px] !text-[9.5px]">−2 months</span>
            </button>
          </div>
        </div>

        <div className="grid items-start gap-3 md:grid-cols-3">
          {MARKETING_COPY.pricing.map((plan) => {
            const shown = money(plan);
            return (
              <div
                key={plan.tier}
                className={`nv-edge relative flex flex-col rounded-[22px] p-7 ${
                  plan.popular ? 'lg:-mt-4 lg:pb-9 lg:pt-9' : ''
                }`}
                style={{
                  background: plan.popular
                    ? 'linear-gradient(180deg, var(--surface-3), var(--surface-1))'
                    : 'var(--glass-1)',
                  border: '1px solid transparent',
                  boxShadow: plan.popular ? 'var(--shadow-4)' : 'var(--shadow-1)',
                }}
              >
                {plan.popular && (
                  <span
                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
                    style={{ zIndex: 2 }}
                  >
                    <span className="nv-badge nv-badge--solid">Recommended</span>
                  </span>
                )}

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="nv-display text-[24px]">{plan.tier}</span>
                    <span className="nv-num text-[10px]" style={{ color: 'var(--text-4)' }}>
                      {String(MARKETING_COPY.pricing.indexOf(plan) + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="nv-display text-[44px] leading-none">{shown.price}</span>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
                      / {shown.period}
                    </span>
                  </div>

                  <p className="mt-4 text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                    {plan.desc}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-[13.5px]" style={{ color: 'var(--text-1)' }}>
                        <span
                          className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: plan.popular ? 'var(--text)' : 'var(--glass-3)',
                            color: plan.popular ? 'var(--bg)' : 'var(--text-1)',
                          }}
                        >
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={launch}
                  className={`nv-btn relative mt-8 w-full ${plan.popular ? 'nv-btn--primary' : ''}`}
                >
                  {plan.cta}
                  {plan.popular && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════ */}
      <Section id="faq" width="md">
        <SectionHead eyebrow="Questions" title="Architecture details" align="center" />
        <div className="space-y-2">
          {MARKETING_COPY.faq.map((item, i) => {
            const open = openFaq === i;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-[14px] transition-colors"
                style={{
                  background: open ? 'var(--glass-2)' : 'var(--glass-1)',
                  border: `1px solid ${open ? 'var(--line-strong)' : 'var(--line-faint)'}`,
                }}
              >
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <span
                    className="nv-num shrink-0 text-[10px]"
                    style={{ color: open ? 'var(--text-2)' : 'var(--text-4)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-[14.5px] font-medium" style={{ color: 'var(--text)' }}>
                    {item.q}
                  </span>
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: open ? 'var(--text)' : 'var(--glass-3)',
                      color: open ? 'var(--bg)' : 'var(--text-2)',
                      transition: 'background 200ms var(--ease), color 200ms var(--ease)',
                    }}
                  >
                    {open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </span>
                </button>
                {open && (
                  <div className="anim-fade px-5 pb-5 pl-[46px]">
                    <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ══ Closing CTA ═══════════════════════════════════════════════ */}
      <Section id="cta" width="lg">
        <div className="nv-edge relative overflow-hidden rounded-[26px]" style={{ border: '1px solid transparent' }}>
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, var(--surface-2), var(--surface-1))' }}
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(70% 120% at 50% 110%, rgba(255,255,255,0.07), transparent 70%)',
            }}
            aria-hidden
          />
          <div className="relative flex flex-col items-center px-6 py-16 text-center sm:px-14 sm:py-20">
            <span className="nv-badge">
              <span className="nv-dot nv-dot--live" />
              Ready when you are
            </span>
            <h2 className="nv-display mt-7 max-w-[22ch] text-balance text-[clamp(30px,5.4vw,62px)] leading-[1.03]">
              Begin in the dark room.
            </h2>
            <p className="mt-6 max-w-[52ch] text-pretty text-[15px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Open a space, state the goal in a sentence, and watch the plan, the evidence and the
              effects arrive together.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <button onClick={launch} className="nv-btn nv-btn--primary nv-btn--lg">
                <Plus className="h-4 w-4" strokeWidth={2.4} />
                Launch a space
              </button>
              <button onClick={() => setCurrentView('lab')} className="nv-btn nv-btn--lg">
                <Sparkles className="h-4 w-4" />
                Visit the Aura lab
              </button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              {[
                { icon: ShieldCheck, label: 'Verification plane included' },
                { icon: Cpu, label: 'No API key required to begin' },
                { icon: Gauge, label: 'Cancel any time' },
              ].map((t) => (
                <span key={t.label} className="flex items-center gap-2 nv-label !text-[10px]">
                  <t.icon className="h-3.5 w-3.5" style={{ color: 'var(--icon)' }} />
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ══ Footer ════════════════════════════════════════════════════ */}
      <footer className="relative z-10 px-[var(--gutter)] pb-10 pt-16 sm:pt-20">
        <div className="mx-auto max-w-[1240px]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-[1.6fr_repeat(4,1fr)] lg:gap-10">
            <div className="col-span-2 max-w-[34ch] sm:col-span-3 md:col-span-4 lg:col-span-1">
              <span className="nv-display text-[22px]">Noevix</span>
              <p className="mt-4 text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                A modern reasoning instrument. Claims are checkable, effects are staged, and
                every run leaves a hash-linked record.
              </p>
              <div className="mt-6 flex items-center gap-2.5">
                <span className="nv-dot nv-dot--live" />
                <span className="nv-label !text-[10px]">All planes operational</span>
              </div>
            </div>

            {MARKETING_COPY.footer.map((col) => (
              <div key={col.title}>
                <span className="nv-label !text-[10px]">{col.title}</span>
                <ul className="mt-2 space-y-0.5 sm:mt-4 sm:space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="inline-flex min-h-[36px] items-center text-[13px] transition-colors lg:min-h-0"
                        style={{ color: 'var(--text-2)' }}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="font-mono text-[11px] sm:text-[10.5px]" style={{ color: 'var(--text-3)' }}>
              © 2026 Noevix — Light in a dark room
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentView('lab')}
                className="nv-btn nv-btn--ghost nv-btn--sm"
              >
                Aura lab
              </button>
              <button onClick={launch} className="nv-btn nv-btn--ghost nv-btn--sm">
                Workspace
              </button>
              <button
                onClick={() => setAuthModalOpen(true, 'login')}
                className="nv-btn nv-btn--ghost nv-btn--sm"
              >
                Sign in
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="nv-iconbtn nv-iconbtn--sm"
                title="Back to top"
              >
                <ChevronDown className="h-3.5 w-3.5 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
