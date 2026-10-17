import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Sparkles,
  Zap,
  Code2,
  Brain,
  Feather,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
  Pin,
  Clock,
  Layers,
  Activity,
  Cpu,
} from 'lucide-react';
import { useChatStore, ConversationItem } from '../lib/store.ts';

interface ModernRailProps {
  onOpenCommandPalette: () => void;
}

export const ModernRail: React.FC<ModernRailProps> = ({ onOpenCommandPalette }) => {
  const {
    conversations,
    activeId,
    setActiveConversation,
    newChat,
    deleteConversation,
    renameConversation,
    isSidebarOpen,
    toggleSidebar,
    railCollapsed,
    toggleRailCollapsed,
    selectedLens,
    setLens,
    auraTheme,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);

  const filteredConvs = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartRename = (conv: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Modern Rail Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col shrink-0 border-r border-[var(--border)]/60 bg-[var(--sidebar)]/90 backdrop-blur-2xl transition-all duration-300 ease-out select-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${railCollapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        {/* Top Header: Brand & Collapse Toggle */}
        <div className="h-[58px] px-3.5 flex items-center justify-between border-b border-[var(--border)]/50 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-[var(--aura-2)] shadow-[0_0_15px_var(--aura-1)] shrink-0">
              <span className="text-white text-sm font-black tracking-widest">N</span>
              <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />
            </div>
            {!railCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold tracking-tight text-[15px] bg-clip-text text-transparent bg-gradient-to-r from-[var(--text)] to-[var(--muted)]">
                  NOEVIX
                </span>
                <span className="text-[10px] text-[var(--accent)] tracking-wider font-semibold uppercase">
                  Neural Studio
                </span>
              </div>
            )}
          </div>

          <button
            onClick={toggleRailCollapsed}
            className="hidden md:flex p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
            title={railCollapsed ? 'Expand Navigation' : 'Collapse to Rail'}
          >
            {railCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* New Session Action */}
        <div className="p-3 shrink-0">
          <button
            onClick={() => newChat()}
            className={`w-full flex items-center justify-center gap-2 rounded-xl transition-all duration-200 ${
              railCollapsed
                ? 'h-11 w-11 mx-auto bg-gradient-to-r from-[var(--accent)] to-[var(--aura-2)] text-white shadow-[0_0_15px_var(--aura-1)]'
                : 'h-10 px-3 bg-gradient-to-r from-[var(--accent)] to-[var(--aura-2)] hover:opacity-95 text-white font-medium text-[13px] shadow-[0_0_15px_var(--aura-1)]'
            }`}
            title="Start New Session"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!railCollapsed && <span>New Session</span>}
          </button>
        </div>

        {/* Quick Lens Switcher (Icons when collapsed, Pills when expanded) */}
        {!railCollapsed ? (
          <div className="px-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--muted)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-7 rounded-xl bg-[var(--surface)] text-[12px] text-[var(--text)] placeholder-[var(--muted)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 p-0.5 text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2 border-b border-[var(--border)]/40 shrink-0">
            {[
              { id: 'neural', icon: Zap, label: 'Neural' },
              { id: 'reason', icon: Brain, label: 'Reason' },
              { id: 'code', icon: Code2, label: 'Code' },
            ].map((lens) => {
              const Icon = lens.icon;
              const isSelected = selectedLens === lens.id;
              return (
                <button
                  key={lens.id}
                  onClick={() => setLens(lens.id as any)}
                  className={`p-2 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-[var(--accent)] text-white shadow-[0_0_10px_var(--aura-1)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                  }`}
                  title={`${lens.label} Lens`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        )}

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {filteredConvs.map((conv) => {
            const isActive = conv.id === activeId;
            const isHovered = hoveredConvId === conv.id;

            if (railCollapsed) {
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={`w-11 h-11 mx-auto my-0.5 flex items-center justify-center rounded-xl transition-all ${
                    isActive
                      ? 'bg-[var(--surface-active)] text-[var(--accent)] border border-[var(--accent)]/40 shadow-[0_0_12px_var(--aura-1)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                  }`}
                  title={conv.title}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              );
            }

            return (
              <div
                key={conv.id}
                onMouseEnter={() => setHoveredConvId(conv.id)}
                onMouseLeave={() => setHoveredConvId(null)}
                onClick={() => setActiveConversation(conv.id)}
                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--surface-active)] border border-[var(--accent)]/30 text-[var(--text)] shadow-xs'
                    : 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-transparent'
                }`}
              >
                {/* Active Indicator Glow Pip */}
                {isActive && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                )}

                <div className="flex items-center gap-2 min-w-0 pl-1.5 flex-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                    }`}
                  />
                  {editingId === conv.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveRename(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(conv.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="w-full bg-transparent text-[12.5px] font-medium text-[var(--text)] focus:outline-none border-b border-[var(--accent)]"
                    />
                  ) : (
                    <span className="text-[12.5px] font-medium truncate select-none">
                      {conv.title}
                    </span>
                  )}
                </div>

                {/* Hover Actions: Rename & Delete */}
                {(isHovered || isActive) && editingId !== conv.id && (
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <button
                      onClick={(e) => handleStartRename(conv, e)}
                      className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="p-1 rounded-md text-[var(--muted)] hover:text-red-400 hover:bg-[var(--surface)] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Orbit Status Deck */}
        <div className="p-3 border-t border-[var(--border)]/50 shrink-0">
          {!railCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-[var(--accent)] animate-pulse" />
                  <span>Telemetry</span>
                </span>
                <span className="font-mono text-[10px] text-[var(--text)]">18ms · v3.2</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[var(--accent)] to-[var(--aura-2)] flex items-center justify-center text-[10px] text-white font-bold">
                  NX
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-[var(--text)] truncate">Studio Workspace</div>
                  <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Neural Synchronized</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl bg-[var(--surface)] flex items-center justify-center text-[11px] font-bold text-[var(--text)] border border-[var(--border)]"
                title="Neural Workspace"
              >
                NX
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
