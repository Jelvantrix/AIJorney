import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../lib/store.ts';
import { toggleTheme, getStoredTheme } from '../../lib/theme.ts';
import {
  Search,
  Plus,
  Trash2,
  Download,
  Sun,
  Moon,
  Sliders,
  X,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isIndexOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isIndexOpen]);

  if (!isIndexOpen) return null;

  const filteredSpaces = conversations.filter((s) =>
    s.title.toLowerCase().includes(query.toLowerCase())
  );

  // Group spaces by date
  const now = Date.now();
  const dayMs = 86400000;
  const groups: { label: string; spaces: typeof conversations }[] = [
    { label: 'Today', spaces: [] },
    { label: 'Previous 7 Days', spaces: [] },
    { label: 'Older', spaces: [] },
  ];

  filteredSpaces.forEach((s) => {
    const age = now - s.updated_at;
    if (age < dayMs) {
      groups[0].spaces.push(s);
    } else if (age < dayMs * 7) {
      groups[1].spaces.push(s);
    } else {
      groups[2].spaces.push(s);
    }
  });

  const flatVisible = groups.flatMap((g) => g.spaces);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIndexOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatVisible.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatVisible.length) % Math.max(1, flatVisible.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatVisible[selectedIndex]) {
        setActiveConversation(flatVisible[selectedIndex].id);
        setIndexOpen(false);
      }
    }
  };

  const handleExport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const md = exportSpace(id);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noevix-space-${id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewSpace = () => {
    newChat('Untitled Space');
    setIndexOpen(false);
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-2xl animate-[wordReveal_160ms_ease-out]"
    >
      <div className="relative w-full max-w-4xl max-h-[85vh] rounded-[24px] bg-[var(--elev-1)] border border-[var(--line-strong)] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Search Field & Action Bar */}
        <div className="p-4 sm:p-6 border-b border-[var(--line)] flex items-center gap-4 bg-[var(--elev-2)]">
          <Search className="w-5 h-5 text-[var(--text-3)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search spaces or jump to action..."
            className="flex-1 bg-transparent text-[16px] text-[var(--text)] placeholder-[var(--text-3)] outline-none"
          />

          <button
            onClick={handleNewSpace}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9999px] bg-[var(--text)] text-[var(--bg)] text-[12px] font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Space</span>
          </button>

          <button
            onClick={() => setIndexOpen(false)}
            className="p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--elev-3)] transition-colors shrink-0"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Column Grid of Spaces Grouped by Date */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {flatVisible.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-3)] font-mono text-[13px]">
              No spaces found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            groups
              .filter((g) => g.spaces.length > 0)
              .map((group) => (
                <div key={group.label} className="space-y-3">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-3)] px-1">
                    {group.label}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.spaces.map((s) => {
                      const overallIdx = flatVisible.findIndex((v) => v.id === s.id);
                      const isSelected = overallIdx === selectedIndex;
                      const isActiveSpace = s.id === activeId;

                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveConversation(s.id);
                            setIndexOpen(false);
                          }}
                          className={`p-4 rounded-[14px] border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                            isSelected
                              ? 'bg-[var(--elev-2)] border-[var(--text)] shadow-sm'
                              : 'bg-[var(--elev-1)] border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--elev-2)]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-serif-display text-lg text-[var(--text)] truncate block">
                                {s.title}
                              </span>
                              {isActiveSpace && (
                                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-[3px] bg-[var(--text)] text-[var(--bg)] font-bold">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-[var(--text-3)] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(s.updated_at).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Space Quick Actions */}
                          <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleExport(s.id, e)}
                              className="p-1.5 rounded-[4px] hover:bg-[var(--elev-3)] text-[var(--text-3)] hover:text-[var(--text)]"
                              title="Export Markdown"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(s.id);
                              }}
                              className="p-1.5 rounded-[4px] hover:bg-[var(--elev-3)] text-[var(--text-3)] hover:text-[var(--text)]"
                              title="Delete Space"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Bottom Actions Bar (Theme, Reduce Effects, Lab) */}
        <div className="p-4 px-6 border-t border-[var(--line)] bg-[var(--elev-2)] flex flex-wrap items-center justify-between text-[12px] font-mono text-[var(--text-2)] gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="flex items-center gap-1.5 hover:text-[var(--text)] transition-colors"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Toggle Theme</span>
            </button>

            <button
              onClick={() => setReduceEffects(!reduceEffects)}
              className="flex items-center gap-1.5 hover:text-[var(--text)] transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{reduceEffects ? 'Effects: Minimal' : 'Effects: Cinematic'}</span>
            </button>

            <button
              onClick={() => {
                setIndexOpen(false);
                setCurrentView('lab');
              }}
              className="flex items-center gap-1.5 hover:text-[var(--text)] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aura Lab</span>
            </button>
          </div>

          <div className="text-[11px] text-[var(--text-3)] flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Dismiss</span>
          </div>
        </div>
      </div>
    </div>
  );
};
