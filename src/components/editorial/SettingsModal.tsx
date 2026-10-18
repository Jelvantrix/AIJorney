import React, { useEffect, useState } from 'react';
import { useChatStore, AVAILABLE_MODELS, type ModelId } from '../../lib/store.ts';
import { getStoredTheme, setStoredTheme, type Theme } from '../../lib/theme.ts';
import {
  X,
  List,
  AlignLeft,
  Table2,
  Code2,
  RotateCcw,
  Sparkles,
  Trash2,
  Check,
  Moon,
  Sun,
  Laptop,
  MonitorPlay,
  Palette,
  FileCode2,
  Database,
  Cpu,
  type LucideIcon,
} from 'lucide-react';

type Section = 'response' | 'editor' | 'appearance' | 'data';

const SECTIONS: Array<{ id: Section; label: string; icon: LucideIcon }> = [
  { id: 'response', label: 'Response', icon: MonitorPlay },
  { id: 'editor', label: 'Code', icon: FileCode2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'data', label: 'Data', icon: Database },
];

const Card: React.FC<{
  active?: boolean;
  onClick?: () => void;
  icon?: LucideIcon;
  title: string;
  desc?: string;
  trailing?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}> = ({ active, onClick, icon: Icon, title, desc, trailing, className = '', children }) => {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-[12px] px-3.5 py-3 text-left transition-all duration-200 ${className}`}
      style={{
        background: active ? 'var(--glass-3)' : 'var(--glass-1)',
        border: `1px solid ${active ? 'var(--line-strong)' : 'var(--line-faint)'}`,
        boxShadow: active ? 'var(--shadow-1), var(--shadow-inset)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e: any) => {
        if (onClick && !active) e.currentTarget.style.background = 'var(--glass-2)';
      }}
      onMouseLeave={(e: any) => {
        if (onClick && !active) e.currentTarget.style.background = 'var(--glass-1)';
      }}
    >
      {Icon && (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: 'var(--glass-2)', border: '1px solid var(--line-faint)' }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: active ? 'var(--text)' : 'var(--text-3)' }} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
            {title}
          </span>
          {active && <Check className="h-3.5 w-3.5" style={{ color: 'var(--text)' }} />}
        </span>
        {desc && (
          <span className="mt-0.5 block text-[11.5px] leading-snug" style={{ color: 'var(--text-4)' }}>
            {desc}
          </span>
        )}
        {children}
      </span>
      {trailing}
    </Tag>
  );
};

const Toggle: React.FC<{ on: boolean; onChange: () => void }> = ({ on, onChange }) => (
  <button
    onClick={onChange}
    role="switch"
    aria-checked={on}
    className="relative flex h-6 w-11 shrink-0 items-center rounded-full px-[3px] transition-colors duration-200"
    style={{
      background: on ? 'var(--text)' : 'var(--glass-4)',
      border: `1px solid ${on ? 'transparent' : 'var(--line)'}`,
    }}
  >
    <span
      className="h-[18px] w-[18px] rounded-full transition-transform duration-200"
      style={{
        background: on ? 'var(--bg)' : 'var(--text-2)',
        transform: on ? 'translateX(20px)' : 'translateX(0)',
        boxShadow: 'var(--shadow-1)',
      }}
    />
  </button>
);

const Row: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div
    className="flex items-center justify-between gap-4 rounded-[12px] px-3.5 py-3"
    style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
  >
    <div className="min-w-0">
      <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
        {title}
      </div>
      <div className="mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--text-4)' }}>
        {desc}
      </div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setSettingsOpen,
    selectedModel,
    setSelectedModel,
    outputStyle,
    setOutputStyle,
    responseDepth,
    setResponseDepth,
    showLineNumbers,
    setShowLineNumbers,
    codeFontSize,
    setCodeFontSize,
    reduceEffects,
    setReduceEffects,
    startOnboarding,
    conversations,
    newChat,
    setActiveConversation,
  } = useChatStore();

  const [section, setSection] = useState<Section>('response');
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const [confirmClear, setConfirmClear] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (isSettingsOpen) {
      setTheme(getStoredTheme());
      setConfirmClear(false);
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSettingsOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSettingsOpen, setSettingsOpen]);

  if (!isSettingsOpen) return null;

  const pick = (t: Theme) => {
    setTheme(t);
    setStoredTheme(t);
  };

  const reset = () => {
    setOutputStyle('lists');
    setResponseDepth('concise');
    setShowLineNumbers(true);
    setCodeFontSize('base');
    setReduceEffects(false);
    pick('system');
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="nv-scrim" onClick={() => setSettingsOpen(false)} />

      <div className="nv-modal flex w-full max-w-[880px] flex-col" style={{ height: 'min(84vh, 680px)' }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div>
            <h2 className="nv-display text-[22px] leading-none">Preferences</h2>
            <div className="nv-label mt-1.5 !text-[9px]">Noevix · local configuration</div>
          </div>
          <button onClick={() => setSettingsOpen(false)} className="nv-iconbtn nv-iconbtn--sm">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Nav */}
          <nav
            className="hidden w-[196px] shrink-0 flex-col gap-0.5 p-2.5 sm:flex"
            style={{ borderRight: '1px solid var(--line)', background: 'var(--glass-1)' }}
          >
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className="relative flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-left text-[13px] transition-colors"
                  style={{
                    color: active ? 'var(--text)' : 'var(--text-2)',
                    background: active ? 'var(--glass-3)' : 'transparent',
                    boxShadow: active ? 'var(--shadow-inset)' : 'none',
                  }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: active ? 'var(--text)' : 'var(--text-3)' }} />
                  {s.label}
                </button>
              );
            })}
          </nav>

          {/* Panel */}
          <div className="nv-scroll min-w-0 flex-1 overflow-y-auto p-5">
            {/* Mobile section switch */}
            <div className="mb-4 flex flex-wrap gap-1.5 sm:hidden">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className="nv-pill !h-7 !text-[11px]"
                  data-active={section === s.id}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {section === 'response' && (
              <div className="anim-fade space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="nv-label">Default AI Model & Engine</span>
                    <span className="text-[10.5px] font-mono" style={{ color: 'var(--text-4)' }}>
                      Inference engine
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {AVAILABLE_MODELS.map((m) => (
                      <Card
                        key={m.id}
                        icon={Cpu}
                        title={m.name}
                        desc={m.description}
                        active={selectedModel === m.id}
                        onClick={() => setSelectedModel(m.id)}
                        trailing={
                          <span
                            className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider shrink-0"
                            style={{ background: 'var(--glass-3)', color: 'var(--text-3)' }}
                          >
                            {m.badge}
                          </span>
                        }
                      >
                        <div className="mt-1 flex items-center gap-2 font-mono text-[9.5px]" style={{ color: 'var(--text-4)' }}>
                          <span>{m.provider}</span>
                          <span>·</span>
                          <span>{m.speed}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="nv-hair" />

                <div>
                  <div className="nv-label mb-2">Answer shape</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { id: 'lists', label: 'Lists & outlines', desc: 'High-density scanning', icon: List },
                      { id: 'paragraphs', label: 'Prose', desc: 'Editorial narrative', icon: AlignLeft },
                      { id: 'code_first', label: 'Code first', desc: 'Executable answers lead', icon: Code2 },
                      { id: 'tables', label: 'Comparison', desc: 'Trade-off matrices', icon: Table2 },
                    ].map((s) => (
                      <Card
                        key={s.id}
                        icon={s.icon}
                        title={s.label}
                        desc={s.desc}
                        active={outputStyle === s.id}
                        onClick={() => setOutputStyle(s.id as any)}
                      />
                    ))}
                  </div>
                </div>

                <div className="nv-hair" />

                <div>
                  <div className="nv-label mb-2">Depth</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { id: 'concise', label: 'Direct', desc: 'No filler, signal only' },
                      { id: 'comprehensive', label: 'Architectural', desc: 'Context, proofs, edge cases' },
                    ].map((d) => (
                      <Card
                        key={d.id}
                        title={d.label}
                        desc={d.desc}
                        active={responseDepth === d.id}
                        onClick={() => setResponseDepth(d.id as any)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === 'editor' && (
              <div className="anim-fade space-y-2.5">
                <Row title="Gutter line numbers" desc="Show the line-number column in code blocks.">
                  <Toggle on={showLineNumbers} onChange={() => setShowLineNumbers(!showLineNumbers)} />
                </Row>
                <Row title="Code type scale" desc="Typography size inside code blocks.">
                  <div className="nv-seg">
                    {(['sm', 'base', 'lg'] as const).map((sz) => (
                      <button
                        key={sz}
                        data-active={codeFontSize === sz}
                        onClick={() => setCodeFontSize(sz)}
                        className="nv-seg__item !px-3 font-mono"
                      >
                        {sz === 'sm' ? '12' : sz === 'base' ? '13' : '14'}
                      </button>
                    ))}
                  </div>
                </Row>
              </div>
            )}

            {section === 'appearance' && (
              <div className="anim-fade space-y-5">
                <div>
                  <div className="nv-label mb-2">Canvas</div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { id: 'dark', label: 'Obsidian', desc: 'Pure dark', icon: Moon },
                      { id: 'light', label: 'Paper', desc: 'Ink on white', icon: Sun },
                      { id: 'system', label: 'System', desc: 'Follow OS', icon: Laptop },
                    ].map((t) => (
                      <Card
                        key={t.id}
                        icon={t.icon}
                        title={t.label}
                        desc={t.desc}
                        active={theme === t.id}
                        onClick={() => pick(t.id as Theme)}
                      />
                    ))}
                  </div>
                </div>

                <div className="nv-hair" />

                <Row
                  title="Damp ambient motion"
                  desc="Disable the grain, bloom and reactive aura."
                >
                  <Toggle on={reduceEffects} onChange={() => setReduceEffects(!reduceEffects)} />
                </Row>
              </div>
            )}

            {section === 'data' && (
              <div className="anim-fade space-y-2.5">
                <Card
                  icon={Sparkles}
                  title="Replay the guided tour"
                  desc="Walk through the interface once more."
                  onClick={() => {
                    setSettingsOpen(false);
                    startOnboarding();
                  }}
                />

                <Card
                  icon={RotateCcw}
                  title={resetDone ? 'Preferences restored' : 'Restore defaults'}
                  desc="Return every setting to its factory value."
                  onClick={reset}
                />

                {confirmClear ? (
                  <div
                    className="rounded-[12px] p-3.5"
                    style={{ background: 'var(--glass-2)', border: '1px solid var(--line-strong)' }}
                  >
                    <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                      Clear all {conversations.length} spaces?
                    </div>
                    <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-4)' }}>
                      This removes every thread stored on this device. It cannot be undone.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          const id = newChat('Untitled Space');
                          setActiveConversation(id);
                          setConfirmClear(false);
                        }}
                        className="nv-btn nv-btn--primary nv-btn--sm"
                      >
                        Confirm
                      </button>
                      <button onClick={() => setConfirmClear(false)} className="nv-btn nv-btn--sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <Card
                    icon={Trash2}
                    title="Clear all spaces"
                    desc={`Remove ${conversations.length} threads from this device.`}
                    onClick={() => setConfirmClear(true)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid var(--line)', background: 'var(--glass-1)' }}
        >
          <span className="nv-label !text-[9px]">
            {theme === 'dark' ? 'Obsidian active' : theme === 'light' ? 'Paper active' : 'System synced'}
          </span>
          <button onClick={() => setSettingsOpen(false)} className="nv-btn nv-btn--primary nv-btn--sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
