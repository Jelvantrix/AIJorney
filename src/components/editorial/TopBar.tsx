import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import {
  Search,
  Pencil,
  Check,
  Download,
  PanelLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    activeId,
    conversations,
    messages,
    renameConversation,
    setSpacesMenuOpen,
    setIndexOpen,
    exportSpace,
    isStreaming,
    activeLens,
    selectedLensOverride,
  } = useChatStore();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const space = conversations.find((c) => c.id === activeId);
  const convo = (activeId && messages[activeId]) || [];

  const stats = useMemo(() => {
    const exchanges = convo.filter((m) => m.role === 'user').length;
    const tokens = convo.reduce((acc, m) => acc + (m.tokens || 0), 0);
    return { exchanges, tokens };
  }, [convo]);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.select(), 20);
  }, [editing]);

  const commit = () => {
    if (activeId && draft.trim()) renameConversation(activeId, draft.trim());
    setEditing(false);
  };

  const handleExport = () => {
    if (!activeId) return;
    const md = exportSpace(activeId);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(space?.title || 'space').toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lensLabel = (selectedLensOverride === 'auto' ? activeLens : selectedLensOverride).toUpperCase();

  return (
    <header
      className="nv-topline relative z-20 flex h-[var(--topbar-h)] shrink-0 items-center gap-3 px-4"
      style={{
        borderBottom: '1px solid var(--line)',
        background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
      }}
    >
      {/* Mobile rail trigger */}
      <button
        onClick={() => setSpacesMenuOpen(true)}
        className="nv-iconbtn nv-iconbtn--sm lg:hidden"
        aria-label="Open spaces"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      {/* Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="nv-label hidden shrink-0 sm:inline">Space</span>
        <ChevronRight className="hidden h-3 w-3 shrink-0 sm:block" style={{ color: 'var(--text-4)' }} />

        {editing ? (
          <div className="nv-field h-10 max-w-[420px] flex-1 px-2.5 lg:h-8">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="!text-[14px]"
              autoFocus
            />
            <button onClick={commit} className="nv-iconbtn nv-iconbtn--sm !h-8 !w-8 lg:!h-6 lg:!w-6">
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setDraft(space?.title || 'Untitled Space');
              setEditing(true);
            }}
            className="group flex min-h-[40px] min-w-0 items-center gap-2 rounded-[8px] px-2 py-1 transition-colors lg:min-h-0"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--glass-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title="Rename this space"
          >
            <span
              className="truncate text-[14px] font-medium tracking-[-0.01em]"
              style={{ color: 'var(--text)' }}
            >
              {space?.title || 'Untitled Space'}
            </span>
            <Pencil
              className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
              style={{ color: 'var(--text-2)' }}
            />
          </button>
        )}
      </div>

      {/* Telemetry */}
      <div className="hidden items-center gap-2 md:flex">
        {isStreaming ? (
          <span className="nv-badge" style={{ color: 'var(--text)' }}>
            <span className="nv-dot nv-dot--live" />
            {lensLabel}
          </span>
        ) : (
          <span className="nv-chip">
            <Sparkles className="h-3 w-3" />
            {lensLabel}
          </span>
        )}
        <span className="nv-chip">
          <span className="nv-num">{String(stats.exchanges).padStart(2, '0')}</span> turns
        </span>
        <span className="nv-chip">
          <span className="nv-num">{stats.tokens.toLocaleString()}</span> tok
        </span>
      </div>

      <span className="hidden h-5 w-px md:block" style={{ background: 'var(--line)' }} />

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setIndexOpen(true)}
          className="nv-btn nv-btn--sm"
          style={{ color: 'var(--text-2)' }}
          title="Search everything"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <span className="nv-kbd ml-1 hidden h-[16px] text-[9px] sm:inline-flex">⌘K</span>
        </button>

        <button
          onClick={handleExport}
          className="nv-iconbtn nv-iconbtn--sm"
          title="Export space as Markdown"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
