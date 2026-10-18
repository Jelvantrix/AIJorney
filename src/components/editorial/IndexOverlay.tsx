import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import { toggleTheme } from '../../lib/theme.ts';
import {
  Search,
  Plus,
  Trash2,
  Download,
  SunMoon,
  Waves,
  FlaskConical,
  Compass,
  CornerDownLeft,
  MessageSquare,
  Command as CommandIcon,
  FileText,
  Clock,
  type LucideIcon,
} from 'lucide-react';

type Kind = 'space' | 'action';
interface Item {
  id: string;
  kind: Kind;
  title: string;
  hint: string;
  icon: LucideIcon;
  run: () => void;
  meta?: string;
  keywords: string;
}

export const IndexOverlay: React.FC = () => {
  const {
    isIndexOpen,
    setIndexOpen,
    conversations,
    activeId,
    setActiveConversation,
    newChat,
    deleteConversation,
    exportSpace,
    reduceEffects,
    setReduceEffects,
    setCurrentView,
  } = useChatStore();

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isIndexOpen) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isIndexOpen]);

  const download = (id: string) => {
    const md = exportSpace(id);
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(conversations.find((c) => c.id === id)?.title || 'space').toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const items: Item[] = useMemo(() => {
    const actions: Item[] = [
      {
        id: 'act:new',
        kind: 'action',
        title: 'Create a new space',
        hint: 'Start a fresh thread',
        icon: Plus,
        keywords: 'new space chat thread create',
        run: () => {
          const id = newChat('Untitled Space');
          setActiveConversation(id);
          setIndexOpen(false);
        },
      },
      {
        id: 'act:theme',
        kind: 'action',
        title: 'Invert the canvas',
        hint: 'Switch between obsidian and paper',
        icon: SunMoon,
        keywords: 'theme dark light mode invert',
        run: () => toggleTheme(),
      },
      {
        id: 'act:effects',
        kind: 'action',
        title: reduceEffects ? 'Restore ambient motion' : 'Damp ambient motion',
        hint: 'Toggle the reactive aura',
        icon: Waves,
        keywords: 'effects motion aura reduce performance',
        run: () => setReduceEffects(!reduceEffects),
      },
      {
        id: 'act:missions',
        kind: 'action',
        title: 'Open mission control',
        hint: 'Autonomous multi-step execution',
        icon: Compass,
        keywords: 'mission control orchestrate agents',
        run: () => {
          setIndexOpen(false);
          setCurrentView('missions');
        },
      },
      {
        id: 'act:lab',
        kind: 'action',
        title: 'Open the aura lab',
        hint: 'Inspect the reactive backdrop',
        icon: FlaskConical,
        keywords: 'aura lab background effects',
        run: () => {
          setIndexOpen(false);
          setCurrentView('lab');
        },
      },
    ];

    const spaces: Item[] = conversations.map((c) => ({
      id: `sp:${c.id}`,
      kind: 'space',
      title: c.title,
      hint: new Date(c.updated_at).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      icon: MessageSquare,
      keywords: c.title,
      meta: c.id === activeId ? 'current' : undefined,
      run: () => {
        setActiveConversation(c.id);
        setIndexOpen(false);
      },
    }));

    return [...actions, ...spaces];
  }, [conversations, activeId, reduceEffects, newChat, setActiveConversation, setIndexOpen, setReduceEffects, setCurrentView]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.title + ' ' + i.keywords + ' ' + i.hint).toLowerCase().includes(q));
  }, [items, query]);

  const grouped = useMemo(() => {
    const actions = filtered.filter((i) => i.kind === 'action');
    const spaces = filtered.filter((i) => i.kind === 'space');
    return { actions, spaces, flat: [...actions, ...spaces] };
  }, [filtered]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    if (!isIndexOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const n = grouped.flat.length;
      if (e.key === 'Escape') setIndexOpen(false);
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => (n ? (c + 1) % n : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => (n ? (c - 1 + n) % n : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        grouped.flat[cursor]?.run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isIndexOpen, grouped, cursor, setIndexOpen]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${cursor}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!isIndexOpen) return null;

  const selected = grouped.flat[cursor];

  const section = (label: string, list: Item[], offset: number) =>
    list.length === 0 ? null : (
      <div key={label} className="pb-1">
        <div className="nv-menu__label flex items-center justify-between">
          <span>{label}</span>
          <span className="nv-num text-[9px] opacity-60">{String(list.length).padStart(2, '0')}</span>
        </div>
        {list.map((item, i) => {
          const idx = offset + i;
          const isCursor = idx === cursor;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              data-idx={idx}
              onMouseEnter={() => setCursor(idx)}
              onClick={item.run}
              className="nv-menu__item !py-2.5"
              data-active={isCursor}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
                style={{
                  background: isCursor ? 'var(--glass-3)' : 'var(--glass-1)',
                  border: '1px solid var(--line-faint)',
                }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: isCursor ? 'var(--text)' : 'var(--text-3)' }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                    {item.title}
                  </span>
                  {item.meta && (
                    <span className="nv-badge !h-[16px] !text-[8.5px]">{item.meta}</span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px]" style={{ color: 'var(--text-4)' }}>
                  {item.hint}
                </span>
              </span>
              {item.kind === 'space' && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    download(item.id.replace('sp:', ''));
                  }}
                  className="nv-iconbtn nv-iconbtn--sm !h-7 !w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ opacity: isCursor ? 1 : undefined }}
                  title="Export"
                >
                  <Download className="h-3.5 w-3.5" />
                </span>
              )}
              {item.kind === 'space' && item.meta !== 'current' && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(item.id.replace('sp:', ''));
                  }}
                  className="nv-iconbtn nv-iconbtn--sm !h-7 !w-7"
                  style={{ opacity: isCursor ? 1 : 0 }}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
      <div className="nv-scrim" onClick={() => setIndexOpen(false)} />

      <div
        className="nv-modal flex w-full max-w-[860px] flex-col"
        style={{ maxHeight: 'min(72vh, 620px)' }}
      >
        {/* Search */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <Search className="h-[18px] w-[18px] shrink-0" style={{ color: 'var(--text-3)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search spaces, or run a command…"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            style={{ color: 'var(--text)' }}
          />
          <span className="nv-kbd">esc</span>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Results */}
          <div ref={listRef} className="nv-scroll min-w-0 flex-1 overflow-y-auto p-2">
            {grouped.flat.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16">
                <FileText className="h-5 w-5" style={{ color: 'var(--text-4)' }} />
                <span className="font-mono text-[12px]" style={{ color: 'var(--text-4)' }}>
                  Nothing matches “{query}”
                </span>
              </div>
            ) : (
              <>
                {section('Commands', grouped.actions, 0)}
                {section('Spaces', grouped.spaces, grouped.actions.length)}
              </>
            )}
          </div>

          {/* Preview */}
          <aside
            className="hidden w-[300px] shrink-0 flex-col p-4 md:flex"
            style={{ borderLeft: '1px solid var(--line)', background: 'var(--glass-1)' }}
          >
            {selected ? (
              <div className="anim-fade flex h-full flex-col">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-[12px]"
                  style={{
                    background: 'var(--glass-2)',
                    border: '1px solid var(--line)',
                    boxShadow: 'var(--shadow-inset)',
                  }}
                >
                  <selected.icon className="h-5 w-5" style={{ color: 'var(--text)' }} />
                </span>

                <h3 className="mt-4 text-[15px] font-medium leading-snug" style={{ color: 'var(--text)' }}>
                  {selected.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                  {selected.hint}
                </p>

                <div className="mt-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="nv-label">Kind</span>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--text-2)' }}>
                      {selected.kind}
                    </span>
                  </div>
                  {selected.kind === 'space' && (
                    <div className="flex items-center justify-between">
                      <span className="nv-label">Updated</span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--text-2)' }}>
                        {selected.hint}
                      </span>
                    </div>
                  )}
                  <div className="nv-hair" />
                  <div className="flex items-center gap-2">
                    <span className="nv-kbd">
                      <CornerDownLeft className="h-2.5 w-2.5" />
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-4)' }}>
                      to {selected.kind === 'space' ? 'open' : 'run'}
                    </span>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4" style={{ color: 'var(--text-4)' }}>
                  <CommandIcon className="h-3 w-3" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                    Noevix index
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <Clock className="h-5 w-5" style={{ color: 'var(--text-4)' }} />
              </div>
            )}
          </aside>
        </div>

        {/* Footer */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-3.5 font-mono text-[10.5px]" style={{ color: 'var(--text-4)' }}>
            <span className="flex items-center gap-1.5">
              <span className="nv-kbd h-[17px] text-[9px]">↑↓</span> navigate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="nv-kbd h-[17px] text-[9px]">↵</span> select
            </span>
          </div>
          <span className="font-mono text-[10.5px]" style={{ color: 'var(--text-4)' }}>
            {grouped.flat.length} result{grouped.flat.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
};
