import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../lib/store.ts';
import {
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  Sparkles,
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
  } = useChatStore();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSpacesMenuOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSpacesMenuOpen]);

  if (!isSpacesMenuOpen) return null;

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleNewChat = () => {
    const newId = newChat('Untitled Space');
    setActiveConversation(newId);
    setSpacesMenuOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none">
      {/* Dim backdrop */}
      <div
        onClick={() => setSpacesMenuOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 pointer-events-auto"
      />

      {/* Slide-out Drawer */}
      <aside
        className="relative w-full max-w-sm h-full bg-[var(--elev-1)] border-r border-[var(--line-strong)] shadow-2xl flex flex-col pointer-events-auto z-10 animate-[wordReveal_180ms_cubic-bezier(0.16,1,0.3,1)]"
        aria-label="Chats and Spaces Drawer"
      >
        {/* Header with New Chat & Close */}
        <div className="p-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--elev-2)]">
          <div className="flex items-center gap-2">
            <span className="font-serif-display text-xl text-[var(--text)]">Spaces & Chats</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[var(--elev-3)] text-[var(--text-3)]">
              {conversations.length}
            </span>
          </div>

          <button
            onClick={() => setSpacesMenuOpen(false)}
            className="p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--elev-3)] transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action: "+ New Chat" button */}
        <div className="p-4 pb-2">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-4 rounded-[10px] bg-[var(--text)] text-[var(--bg)] text-[13px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create New Chat</span>
          </button>
        </div>

        {/* Search filter */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[var(--elev-2)] border border-[var(--line)] text-[13px]">
            <Search className="w-3.5 h-3.5 text-[var(--text-3)]" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter chats..."
              className="w-full bg-transparent text-[var(--text)] placeholder-[var(--text-3)] outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[var(--text-3)] hover:text-[var(--text)]">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-3)] font-mono text-[12px]">
              No conversations found
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = conv.id === activeId;
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConversation(conv.id);
                    setSpacesMenuOpen(false);
                  }}
                  className={`group relative p-3 rounded-[10px] border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    isActive
                      ? 'bg-[var(--elev-2)] border-[var(--text)] shadow-xs'
                      : 'bg-transparent border-transparent hover:bg-[var(--elev-2)] hover:border-[var(--line)] text-[var(--text-2)]'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <MessageSquare
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isActive ? 'text-[var(--text)]' : 'text-[var(--text-3)]'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(conv.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="w-full bg-[var(--elev-3)] text-[13px] px-2 py-0.5 rounded-[4px] border border-[var(--line-strong)] text-[var(--text)] outline-none"
                          />
                          <button
                            onClick={() => handleSaveRename(conv.id)}
                            className="p-1 text-[var(--text)] hover:opacity-80"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`font-medium text-[13.5px] truncate block leading-tight ${
                              isActive ? 'text-[var(--text)]' : 'text-[var(--text-2)] group-hover:text-[var(--text)]'
                            }`}
                          >
                            {conv.title}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-3)] mt-1 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(conv.updated_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartRename(conv.id, conv.title, e)}
                        className="p-1 rounded-[4px] hover:bg-[var(--elev-3)] text-[var(--text-3)] hover:text-[var(--text)]"
                        title="Rename Chat"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="p-1 rounded-[4px] hover:bg-[var(--elev-3)] text-[var(--text-3)] hover:text-[var(--text)]"
                        title="Delete Chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 px-4 border-t border-[var(--line)] bg-[var(--elev-2)] text-[11px] font-mono text-[var(--text-3)] flex items-center justify-between">
          <span>{conversations.length} total spaces</span>
          <span>Click to switch</span>
        </div>
      </aside>
    </div>
  );
};
