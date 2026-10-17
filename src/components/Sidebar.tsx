import React, { useState } from 'react';
import {
  PanelLeftClose,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';
import { useChatStore, ConversationItem } from '../lib/store.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

interface SidebarProps {
  onOpenCommandPalette: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCommandPalette }) => {
  const {
    conversations,
    activeId,
    setActiveConversation,
    newChat,
    deleteConversation,
    renameConversation,
    isSidebarOpen,
    toggleSidebar,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Group conversations by date
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const filteredConvs = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groups: { [key: string]: ConversationItem[] } = {
    Today: [],
    Yesterday: [],
    'Previous 7 days': [],
    Older: [],
  };

  filteredConvs.forEach((conv) => {
    const age = now - conv.updated_at;
    if (age < ONE_DAY) {
      groups.Today.push(conv);
    } else if (age < 2 * ONE_DAY) {
      groups.Yesterday.push(conv);
    } else if (age < 7 * ONE_DAY) {
      groups['Previous 7 days'].push(conv);
    } else {
      groups.Older.push(conv);
    }
  });

  const handleStartRename = (conv: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
    setMenuOpenId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      renameConversation(id, editingTitle);
    }
    setEditingConvId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
    setMenuOpenId(null);
  };

  const confirmDelete = (id: string) => {
    deleteConversation(id);
    setConfirmDeleteId(null);
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-xs transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* 260px Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-[260px] bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col shrink-0 select-none transition-transform duration-200 ease-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Top: Wordmark "Noevix" (14px, 600) on left, collapse icon on right */}
        <div className="h-[52px] px-4 flex items-center justify-between border-b border-[var(--border)] shrink-0">
          <span className="text-[14px] font-semibold text-[var(--text)] tracking-tight">
            Noevix
          </span>
          <button
            onClick={toggleSidebar}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-[6px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
            title="Collapse sidebar (Ctrl+B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Action rows: "New chat" (40px) + "Search chats" */}
        <div className="p-3 space-y-1.5 shrink-0">
          <button
            onClick={() => newChat()}
            className="w-full h-[40px] px-3 rounded-[8px] flex items-center gap-2.5 text-[14px] font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
          >
            <Plus className="w-4 h-4 text-[var(--muted)]" />
            <span>New chat</span>
          </button>

          {/* Search chats */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-[var(--muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[36px] pl-9 pr-3 rounded-[8px] bg-[var(--surface)] border-0 text-[13px] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border)] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Chat history list grouped by date */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
          {Object.entries(groups).map(([groupTitle, convs]) => {
            if (convs.length === 0) return null;

            return (
              <div key={groupTitle} className="space-y-0.5">
                <div className="px-2 py-1 text-[12px] text-[var(--muted)] font-medium">
                  {groupTitle}
                </div>
                {convs.map((conv) => {
                  const isSelected = conv.id === activeId;
                  const isEditing = editingConvId === conv.id;
                  const isMenuOpen = menuOpenId === conv.id;

                  if (isEditing) {
                    return (
                      <div key={conv.id} className="h-[36px] px-2 flex items-center gap-1">
                        <input
                          autoFocus
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(conv.id);
                            if (e.key === 'Escape') setEditingConvId(null);
                          }}
                          onBlur={() => handleSaveRename(conv.id)}
                          className="w-full h-[30px] px-2 rounded-[6px] bg-[var(--surface)] text-[13px] text-[var(--text)] outline-none border border-[var(--border)]"
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConversation(conv.id)}
                      className={`group relative h-[36px] px-2.5 rounded-[8px] flex items-center justify-between text-[14px] cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? 'bg-[var(--surface-hover)] text-[var(--text)] font-medium'
                          : 'text-[var(--text)] hover:bg-[var(--surface-hover)]/70'
                      }`}
                    >
                      <span className="truncate flex-1 pr-2">{conv.title}</span>

                      {/* Hover "..." menu button */}
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(isMenuOpen ? null : conv.id);
                          }}
                          className={`w-[24px] h-[24px] flex items-center justify-center rounded-[4px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-opacity duration-150 ${
                            isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title="Options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown menu */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 z-30 w-[130px] rounded-[8px] bg-[var(--surface)] border border-[var(--border)] shadow-md py-1 text-[13px] animate-in fade-in-0 duration-150"
                          >
                            <button
                              onClick={(e) => handleStartRename(conv, e)}
                              className="w-full px-3 py-1.5 flex items-center gap-2 text-[var(--text)] hover:bg-[var(--surface-hover)] text-left"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[var(--muted)]" />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={(e) => handleDelete(conv.id, e)}
                              className="w-full px-3 py-1.5 flex items-center gap-2 text-red-500 hover:bg-[var(--surface-hover)] text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Delete Confirmation Dialog */}
        {confirmDeleteId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setConfirmDeleteId(null)}
          >
            <div
              className="w-full max-w-[340px] bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5 shadow-xl text-[14px] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-semibold text-[var(--text)]">Delete chat?</div>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                This will delete the conversation and all of its message branches. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-3 py-1.5 rounded-[8px] hover:bg-[var(--surface-hover)] text-[var(--text)] text-[13px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDelete(confirmDeleteId)}
                  className="px-3.5 py-1.5 rounded-[8px] bg-red-600 hover:bg-red-700 text-white font-medium text-[13px] transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Profile and Settings row */}
        <div className="p-3 border-t border-[var(--border)] flex items-center justify-between text-[14px] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Neutral monochrome avatar */}
            <div className="w-[28px] h-[28px] rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-[12px] font-semibold text-[var(--muted)] shrink-0">
              U
            </div>
            <span className="text-[13px] text-[var(--text)] truncate font-medium">User</span>
          </div>

          {/* Theme toggle control */}
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
};
