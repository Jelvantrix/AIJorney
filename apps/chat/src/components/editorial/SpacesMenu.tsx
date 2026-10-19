import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import {
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
  Download,
  Layers,
} from 'lucide-react';

export const SpacesMenu: React.FC = () => {
  const {
    isSpacesMenuOpen,
    setSpacesMenuOpen,
    conversations,
    activeId,
    setActiveConversation,
    newChat,
    deleteConversation,
    renameConversation,
    exportSpace,
  } = useChatStore();

  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSpacesMenuOpen) setTimeout(() => searchRef.current?.focus(), 60);
  }, [isSpacesMenuOpen]);

  useEffect(() => {
    if (!isSpacesMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSpacesMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSpacesMenuOpen, setSpacesMenuOpen]);

  const groups = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = conversations.filter((c) => c.title.toLowerCase().includes(q));
    const now = Date.now();
    const day = 86_400_000;
    const buckets: Array<{ label: string; items: typeof filtered }> = [
      { label: 'Today', items: [] },
      { label: 'This week', items: [] },
      { label: 'Earlier', items: [] },
    ];
    filtered.forEach((c) => {
      const age = now - c.updated_at;
      if (age < day) buckets[0].items.push(c);
      else if (age < day * 7) buckets[1].items.push(c);
      else buckets[2].items.push(c);
    });
    return buckets.filter((b) => b.items.length);
  }, [conversations, query]);

  if (!isSpacesMenuOpen) return null;

  const exportOne = (id: string) => {
    const md = exportSpace(id);
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(conversations.find((c) => c.id === id)?.title || 'space').toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="nv-scrim" onClick={() => setSpacesMenuOpen(false)} />

      <aside
        className="anim-rise relative z-10 flex h-full w-full max-w-[380px] flex-col"
        style={{
          background: 'linear-gradient(180deg, var(--surface-2), var(--surface-1))',
          borderRight: '1px solid var(--line-strong)',
          boxShadow: 'var(--shadow-4)',
        }}
        aria-label="Spaces"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[10px]"
              style={{ background: 'var(--glass-2)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-inset)' }}
            >
              <Layers className="h-4 w-4" style={{ color: 'var(--text-2)' }} />
            </span>
            <div>
              <div className="text-[14px] font-medium leading-none" style={{ color: 'var(--text)' }}>
                Spaces
              </div>
              <div className="nv-label mt-1 !text-[9px]">
                {conversations.length} thread{conversations.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setSpacesMenuOpen(false)}
            className="nv-iconbtn nv-iconbtn--sm"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New */}
        <div className="px-4 pb-3">
          <button
            onClick={() => {
              const id = newChat('Untitled Space');
              setActiveConversation(id);
              setSpacesMenuOpen(false);
            }}
            className="nv-btn nv-btn--primary w-full"
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            New space
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="nv-field h-9">
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-3)' }} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter spaces…"
            />
            {query && (
              <button onClick={() => setQuery('')} className="nv-iconbtn nv-iconbtn--sm !h-5 !w-5">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="nv-hair" />

        {/* List */}
        <div className="nv-scroll flex-1 overflow-y-auto px-2.5 py-2.5">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <MessageSquare className="h-5 w-5" style={{ color: 'var(--text-4)' }} />
              <span className="font-mono text-[12px]" style={{ color: 'var(--text-4)' }}>
                No spaces found
              </span>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="mb-2">
                <div className="nv-menu__label">{g.label}</div>
                {g.items.map((c) => {
                  const active = c.id === activeId;
                  const isEditing = editingId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (isEditing) return;
                        setActiveConversation(c.id);
                        setSpacesMenuOpen(false);
                      }}
                      className="group/row relative flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 transition-colors"
                      style={{
                        background: active ? 'var(--glass-3)' : 'transparent',
                        border: `1px solid ${active ? 'var(--line)' : 'transparent'}`,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = 'var(--glass-1)';
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span
                        className="h-4 w-px shrink-0 rounded-full transition-colors"
                        style={{ background: active ? 'var(--text)' : 'var(--line-strong)' }}
                      />

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && draft.trim()) {
                                  renameConversation(c.id, draft.trim());
                                  setEditingId(null);
                                }
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="h-7 w-full rounded-[7px] px-2 text-[13px] outline-none"
                              style={{ background: 'var(--glass-3)', border: '1px solid var(--line-bright)', color: 'var(--text)' }}
                            />
                            <button
                              onClick={() => {
                                if (draft.trim()) renameConversation(c.id, draft.trim());
                                setEditingId(null);
                              }}
                              className="nv-iconbtn nv-iconbtn--sm !h-7 !w-7"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div
                              className="truncate text-[13.5px] font-medium leading-tight tracking-[-0.006em]"
                              style={{ color: active ? 'var(--text)' : 'var(--text-1)' }}
                            >
                              {c.title}
                            </div>
                            <div
                              className="mt-1 font-mono text-[10px] tabular-nums"
                              style={{ color: 'var(--text-4)' }}
                            >
                              {new Date(c.updated_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportOne(c.id);
                            }}
                            className="nv-iconbtn nv-iconbtn--sm !h-7 !w-7"
                            title="Export"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(c.id);
                              setDraft(c.title);
                            }}
                            className="nv-iconbtn nv-iconbtn--sm !h-7 !w-7"
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(c.id);
                            }}
                            className="nv-iconbtn nv-iconbtn--sm !h-7 !w-7"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <span className="nv-label !text-[9px]">Local · persisted</span>
          <span className="flex items-center gap-1.5 nv-label !text-[9px]">
            <span className="nv-kbd h-[16px] text-[9px]">esc</span> close
          </span>
        </div>
      </aside>
    </div>
  );
};
