import React, { useEffect, useRef, useState } from 'react';
import { useChatStore, type LensType } from '../../lib/store.ts';
import {
  Paperclip,
  ArrowUp,
  X,
  Check,
  ChevronDown,
  Bold,
  Italic,
  Code2,
  List,
  ListOrdered,
  Quote,
  Sparkles,
  Mic,
  Minimize2,
  Maximize2,
  Table2,
  AlignLeft,
  Cpu,
  Palette,
  Microscope,
  Sigma,
  PenLine,
  Wand2,
  Square,
  Type,
  FileCode2,
  type LucideIcon,
} from 'lucide-react';

const LENSES: Array<{ id: LensType; label: string; desc: string; icon: LucideIcon }> = [
  { id: 'auto', label: 'Auto', desc: 'Adaptive routing across every discipline', icon: Wand2 },
  { id: 'engineering', label: 'Engineering', desc: 'Algorithms, systems, Rust, TypeScript', icon: Cpu },
  { id: 'design', label: 'Design', desc: 'Spatial layout, type systems, monochrome', icon: Palette },
  { id: 'research', label: 'Research', desc: 'Papers, benchmarks, causal synthesis', icon: Microscope },
  { id: 'reasoning', label: 'Reasoning', desc: 'Formal proofs, invariants, trade-offs', icon: Sigma },
  { id: 'writing', label: 'Writing', desc: 'Memos, RFCs, documentation', icon: PenLine },
];

const PRESETS: Array<{ category: string; label: string; text: string }> = [
  { category: 'Engineering', label: 'Refactor for zero allocation', text: 'Refactor the following to eliminate heap allocation and optimise for cache locality:\n\n' },
  { category: 'Reasoning', label: 'Architectural trade-off matrix', text: 'Build a trade-off matrix comparing the following options under heavy concurrency:\n\n' },
  { category: 'Research', label: 'Synthesis of the state of the art', text: 'Synthesise the current state of the art and empirical benchmarks on:\n\n' },
  { category: 'Formal', label: 'Invariant proof sketch', text: 'Formulate a step-by-step invariant argument and proof for:\n\n' },
  { category: 'Writing', label: 'One-page executive RFC', text: 'Draft a one-page RFC: problem, proposal, migration path, risks — for:\n\n' },
];

const Btn: React.FC<{
  icon: LucideIcon;
  onClick?: () => void;
  title: string;
  active?: boolean;
}> = ({ icon: Icon, onClick, title, active }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className="nv-iconbtn nv-iconbtn--sm"
    style={active ? { color: 'var(--text)', background: 'var(--glass-3)' } : undefined}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);

export const Dock: React.FC = () => {
  const {
    activeId,
    messages,
    sendMessage,
    isStreaming,
    stopStreaming,
    selectedLensOverride,
    setSelectedLens,
    setIsTyping,
    setTypingRate,
    isLensMenuOpen,
    setLensMenuOpen,
    outputStyle,
    setOutputStyle,
    startOnboarding,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; size: number; type: string }>>([]);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<number[]>([]);
  const recogRef = useRef<any>(null);

  const convo = (activeId && messages[activeId]) || [];

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    if (expanded) {
      el.style.height = '220px';
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.34)}px`;
  }, [input, expanded]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (lensRef.current && !lensRef.current.contains(e.target as Node)) setLensMenuOpen(false);
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) setShowPresets(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [setLensMenuOpen]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setInput(v);
    const now = performance.now();
    keysRef.current = [...keysRef.current.filter((t) => now - t < 2000), now];
    setIsTyping(v.length > 0);
    setTypingRate(keysRef.current.length);
  };

  const send = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    const text = input.trim();
    const atts = [...attachments];
    setInput('');
    setAttachments([]);
    setIsTyping(false);
    setTypingRate(0);
    setExpanded(false);
    if (taRef.current) taRef.current.style.height = 'auto';
    sendMessage(text, atts);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      setLensMenuOpen(!isLensMenuOpen);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
      return;
    }
    if (e.key === 'Escape' && isStreaming) {
      e.preventDefault();
      stopStreaming();
      return;
    }
    if (e.key === 'ArrowUp' && !input.trim() && convo.length) {
      const last = [...convo].reverse().find((m) => m.role === 'user');
      if (last) {
        e.preventDefault();
        setInput(last.content);
      }
    }
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setAttachments((prev) => [
      ...prev,
      ...Array.from(files).map((f) => ({
        id: 'att_' + Date.now() + Math.random().toString(36).slice(2, 6),
        name: f.name,
        size: f.size,
        type: f.type || 'text/plain',
      })),
    ]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const wrap = (pre: string, post = '') => {
    const el = taRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const sel = value.slice(s, e);
    const next = value.slice(0, s) + pre + (sel || 'text') + post + value.slice(e);
    setInput(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(s + pre.length, s + pre.length + (sel.length || 4));
    }, 10);
  };

  const toggleVoice = () => {
    if (listening) {
      try {
        recogRef.current?.stop();
      } catch {}
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const r = new SR();
        r.continuous = false;
        r.interimResults = true;
        r.lang = 'en-US';
        r.onstart = () => setListening(true);
        r.onresult = (ev: any) =>
          setInput((p) => (p ? p + ' ' : '') + Array.from(ev.results).map((x: any) => x[0].transcript).join(''));
        r.onerror = () => setListening(false);
        r.onend = () => setListening(false);
        recogRef.current = r;
        r.start();
        return;
      } catch {}
    }
    setListening(true);
    setTimeout(() => {
      setInput((p) => (p ? p + ' ' : '') + 'Outline an asynchronous actor pattern in TypeScript.');
      setListening(false);
    }, 1500);
  };

  const activeLens = LENSES.find((l) => l.id === selectedLensOverride) || LENSES[0];
  const LensIcon = activeLens.icon;
  const chars = input.length;
  const words = input.trim() ? input.trim().split(/\s+/).length : 0;
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isStreaming;

  return (
    <div className="relative z-20 shrink-0 px-4 pb-5 pt-2 sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-[var(--dock-max)]">
        {/* ── Formatting toolbar ─────────────────────────────────── */}
        {showToolbar && (
          <div
            className="anim-fade mb-2 flex flex-wrap items-center justify-between gap-2 rounded-[14px] px-2.5 py-2"
            style={{ background: 'var(--glass-1)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-center gap-0.5">
              <Btn icon={Bold} title="Bold" onClick={() => wrap('**', '**')} />
              <Btn icon={Italic} title="Italic" onClick={() => wrap('*', '*')} />
              <Btn icon={Code2} title="Inline code" onClick={() => wrap('`', '`')} />
              <Btn icon={FileCode2} title="Code block" onClick={() => wrap('\n```typescript\n', '\n```')} />
              <span className="mx-1 h-4 w-px" style={{ background: 'var(--line)' }} />
              <Btn icon={List} title="Bulleted list" onClick={() => wrap('\n- ')} />
              <Btn icon={ListOrdered} title="Numbered list" onClick={() => wrap('\n1. ')} />
              <Btn icon={Quote} title="Blockquote" onClick={() => wrap('\n> ')} />
              <Btn
                icon={Table2}
                title="Comparison table"
                onClick={() =>
                  wrap('\n| Option | Latency | Cost |\n| :--- | :--- | :--- |\n| A | 8ms | — |\n')
                }
              />
            </div>
            <div className="flex items-center gap-3 pr-1 font-mono text-[10.5px]" style={{ color: 'var(--text-4)' }}>
              <span className="nv-num">
                {words}w · {chars}c · ~{Math.ceil(chars / 4)}t
              </span>
              {input && (
                <button
                  onClick={() => setInput('')}
                  className="uppercase tracking-wider transition-colors hover:text-[var(--text)]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Attachments ────────────────────────────────────────── */}
        {attachments.length > 0 && (
          <div className="anim-fade mb-2 flex flex-wrap gap-1.5">
            {attachments.map((a) => (
              <span
                key={a.id}
                className="flex items-center gap-2 rounded-full py-1 pl-3 pr-1.5 text-[11.5px]"
                style={{ background: 'var(--glass-2)', border: '1px solid var(--line)' }}
              >
                <Paperclip className="h-3 w-3 shrink-0" style={{ color: 'var(--text-3)' }} />
                <span className="max-w-[160px] truncate" style={{ color: 'var(--text-1)' }}>
                  {a.name}
                </span>
                <span className="nv-num text-[10px]" style={{ color: 'var(--text-4)' }}>
                  {Math.max(1, Math.round(a.size / 1024))}kb
                </span>
                <button
                  onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}
                  className="nv-iconbtn nv-iconbtn--sm !h-6 !w-6 sm:!h-5 sm:!w-5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── The dock ───────────────────────────────────────────── */}
        <div
          className="nv-edge relative overflow-hidden rounded-[24px] transition-all duration-300"
          style={{
            background: 'linear-gradient(180deg, var(--surface-2) 0%, var(--surface-1) 100%)',
            border: '1px solid transparent',
            boxShadow: focused
              ? 'var(--dock-shadow), 0 0 0 1px var(--line-bright), 0 0 0 5px var(--ring-soft)'
              : 'var(--dock-shadow)',
          }}
        >
          {/* top filament */}
          <span
            className="pointer-events-none absolute inset-x-8 top-0 h-px transition-opacity duration-500"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--line-bright), transparent)',
              opacity: focused ? 1 : 0.4,
            }}
          />

          <div className="flex items-start gap-2 px-3 pt-3">
            <textarea
              ref={taRef}
              value={input}
              onChange={handleInput}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              rows={1}
              placeholder="Ask anything, or describe what you want to build…"
              className="nv-scroll min-h-[44px] w-full resize-none bg-transparent px-2 py-2 text-[15.5px] leading-relaxed tracking-[-0.011em] outline-none"
              style={{ color: 'var(--text)' }}
            />
            <button
              onClick={() => setExpanded((v) => !v)}
              className="nv-iconbtn nv-iconbtn--sm mt-1.5 shrink-0"
              title={expanded ? 'Collapse' : 'Expand composer'}
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* control row */}
          <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1">
            <div className="flex min-w-0 items-center gap-1">
              <input ref={fileRef} type="file" multiple onChange={onFiles} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="nv-iconbtn nv-iconbtn--sm h-10 w-10 lg:!h-8 lg:!w-8"
                title="Attach a file"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <button
                onClick={() => setShowToolbar((v) => !v)}
                className="nv-iconbtn nv-iconbtn--sm h-10 w-10 lg:!h-8 lg:!w-8"
                style={showToolbar ? { color: 'var(--text)', background: 'var(--glass-3)' } : undefined}
                title="Formatting"
              >
                <Type className="h-4 w-4" />
              </button>

              {/* Discipline selector */}
              <div className="relative" ref={lensRef}>
                <button
                  onClick={() => setLensMenuOpen(!isLensMenuOpen)}
                  className="nv-pill h-10 !px-3 lg:h-8"
                  data-active={isLensMenuOpen}
                  title="Discipline lens  (⌘/)"
                >
                  <LensIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-2)' }} />
                  <span>{activeLens.label}</span>
                  <ChevronDown className="h-3 w-3" style={{ color: 'var(--text-4)' }} />
                </button>

                {isLensMenuOpen && (
                  <div
                    className="nv-menu absolute bottom-[calc(100%+10px)] left-0 z-50 w-[300px]"
                    style={{ ['--menu-origin' as any]: 'bottom left' }}
                  >
                    <div className="nv-menu__label">Discipline</div>
                    {LENSES.map((l) => {
                      const Icon = l.icon;
                      const active = selectedLensOverride === l.id;
                      return (
                        <button
                          key={l.id}
                          data-active={active}
                          onClick={() => {
                            setSelectedLens(l.id);
                            setLensMenuOpen(false);
                          }}
                          className="nv-menu__item items-start"
                        >
                          <Icon
                            className="mt-0.5 h-4 w-4 shrink-0"
                            style={{ color: active ? 'var(--text)' : 'var(--text-3)' }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-medium">{l.label}</span>
                              {active && <Check className="h-3.5 w-3.5" />}
                            </span>
                            <span
                              className="mt-0.5 block text-[11.5px] leading-snug"
                              style={{ color: 'var(--text-4)' }}
                            >
                              {l.desc}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Output shape */}
              <button
                onClick={() =>
                  setOutputStyle(
                    outputStyle === 'lists'
                      ? 'paragraphs'
                      : outputStyle === 'paragraphs'
                        ? 'code_first'
                        : outputStyle === 'code_first'
                          ? 'tables'
                          : 'lists'
                  )
                }
                className="nv-pill hidden h-10 !px-3 sm:inline-flex lg:h-8"
                title="Preferred answer shape"
              >
                {outputStyle === 'lists' ? (
                  <List className="h-3.5 w-3.5" style={{ color: 'var(--text-2)' }} />
                ) : outputStyle === 'paragraphs' ? (
                  <AlignLeft className="h-3.5 w-3.5" style={{ color: 'var(--text-2)' }} />
                ) : outputStyle === 'code_first' ? (
                  <Code2 className="h-3.5 w-3.5" style={{ color: 'var(--text-2)' }} />
                ) : (
                  <Table2 className="h-3.5 w-3.5" style={{ color: 'var(--text-2)' }} />
                )}
                <span className="capitalize">{outputStyle.replace('_', ' ')}</span>
              </button>

              {/* Presets */}
              <div className="relative" ref={presetRef}>
                <button
                  onClick={() => setShowPresets((v) => !v)}
                  className="nv-iconbtn nv-iconbtn--sm h-10 w-10 lg:!h-8 lg:!w-8"
                  style={showPresets ? { color: 'var(--text)', background: 'var(--glass-3)' } : undefined}
                  title="Prompt presets"
                >
                  <Sparkles className="h-4 w-4" />
                </button>

                {showPresets && (
                  <div
                    className="nv-menu absolute bottom-[calc(100%+10px)] left-0 z-50 w-[290px]"
                    style={{ ['--menu-origin' as any]: 'bottom left' }}
                  >
                    <div className="nv-menu__label">Presets</div>
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          setInput(p.text);
                          setShowPresets(false);
                          taRef.current?.focus();
                        }}
                        className="nv-menu__item flex-col !items-start !gap-0.5"
                      >
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                          {p.label}
                        </span>
                        <span className="nv-label !text-[10px]">{p.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={toggleVoice}
                className="nv-iconbtn nv-iconbtn--sm h-10 w-10 lg:!h-8 lg:!w-8"
                style={
                  listening ? { color: 'var(--bg)', background: 'var(--text)' } : undefined
                }
                title={listening ? 'Listening — click to stop' : 'Dictate'}
              >
                <Mic className="h-4 w-4" />
              </button>

              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="nv-btn nv-btn--sm !h-9 !gap-2 !px-3.5"
                  title="Stop generating"
                >
                  <Square className="h-3 w-3 fill-current" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={send}
                  disabled={!canSend}
                  className="nv-btn nv-btn--primary !h-9 !w-9 !rounded-full !p-0"
                  title="Send"
                  aria-label="Send"
                >
                  <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.4} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Hints ──────────────────────────────────────────────── */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
          <div
            className="flex items-center gap-2.5 font-mono text-[10.5px]"
            style={{ color: 'var(--text-4)' }}
          >
            <span className="hidden items-center gap-1 sm:flex">
              <span className="nv-kbd h-[17px] text-[9px]">↵</span> send
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <span className="nv-kbd h-[17px] text-[9px]">⇧↵</span> newline
            </span>
            <span className="hidden items-center gap-1 md:flex">
              <span className="nv-kbd h-[17px] text-[9px]">⌘/</span> discipline
            </span>
          </div>

          <button
            onClick={startOnboarding}
            className="flex items-center gap-1.5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors hover:text-[var(--text)] lg:py-0"
            style={{ color: 'var(--text-4)' }}
          >
            <Sparkles className="h-3 w-3" />
            Guided tour
          </button>
        </div>
      </div>
    </div>
  );
};
