import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import { Search, Pencil, Check, Download, PanelLeft, ChevronRight } from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    activeId,
    conversations,
    renameConversation,
    setSpacesMenuOpen,
    setIndexOpen,
    exportSpace,
    isStreaming,
  } = useChatStore();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const space = conversations.find((c) => c.id === activeId);

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

  return (
    <header
      className="relative z-20 flex h-[var(--topbar-h)] shrink-0 items-center justify-between gap-3 px-4 sm:px-6"
      style={{
        border: 'none',
        background: 'color-mix(in srgb, var(--bg) 70%, transparent)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
      }}
    >
      {/* Left: Mobile trigger & Space Title Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Mobile rail trigger - clean borderless ghost */}
        <button
          onClick={() => setSpacesMenuOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border-0 bg-transparent text-[var(--text-3)] transition-colors hover:bg-[var(--glass-2)] hover:text-[var(--text)] lg:hidden"
          aria-label="Open spaces"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <span className="hidden shrink-0 text-[12px] font-medium tracking-wide uppercase opacity-45 sm:inline" style={{ color: 'var(--text-3)' }}>
          Space
        </span>
        <ChevronRight className="hidden h-3 w-3 shrink-0 opacity-40 sm:block" style={{ color: 'var(--text-4)' }} />

        {editing ? (
          <div className="flex max-w-[420px] flex-1 items-center gap-2">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="flex-1 border-b border-[var(--text-3)] bg-transparent py-1 text-[14px] font-medium text-[var(--text)] outline-none"
              autoFocus
            />
            <button
              onClick={commit}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] border-0 bg-transparent text-[var(--text-2)] hover:bg-[var(--glass-2)] hover:text-[var(--text)]"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setDraft(space?.title || 'Untitled Space');
              setEditing(true);
            }}
            className="group flex min-h-[36px] min-w-0 items-center gap-2 rounded-[8px] border-0 bg-transparent px-2 py-1 transition-colors hover:bg-[var(--glass-2)]"
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
              style={{ color: 'var(--text-3)' }}
            />
          </button>
        )}

        {isStreaming && (
          <span className="ml-2 flex items-center gap-1.5 text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-2)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--text)] animate-pulse" />
            Active
          </span>
        )}
      </div>

      {/* Right Actions: Search & Export - Clean borderless ghost elements */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIndexOpen(true)}
          className="flex h-8 items-center gap-2 rounded-[8px] border-0 bg-transparent px-2.5 text-[13px] transition-colors hover:bg-[var(--glass-2)]"
          style={{ color: 'var(--text-3)' }}
          title="Search everything (⌘K)"
        >
          <Search className="h-3.5 w-3.5 text-[var(--text-2)]" />
          <span className="hidden sm:inline">Search</span>
          <span className="hidden font-mono text-[10px] tracking-wider opacity-60 sm:inline">⌘K</span>
        </button>

        <button
          onClick={handleExport}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border-0 bg-transparent transition-colors hover:bg-[var(--glass-2)] hover:text-[var(--text)]"
          style={{ color: 'var(--text-3)' }}
          title="Export space as Markdown"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
