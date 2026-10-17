import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, Plus, Moon, Sun, MessageSquare } from 'lucide-react';
import { useChatStore } from '../lib/store.ts';
import { getStoredTheme, setStoredTheme } from '../lib/theme.ts';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    conversations,
    setActiveConversation,
    newChat,
    toggleSidebar,
  } = useChatStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Toggle command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      // Cmd/Ctrl + Shift + O: New chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        newChat();
      }
      // Cmd/Ctrl + B: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen, newChat, toggleSidebar]);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  const actions = [
    {
      id: 'action_new_chat',
      label: 'New chat',
      category: 'Actions',
      icon: <Plus className="w-4 h-4 text-[var(--muted)]" />,
      run: () => {
        newChat();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action_toggle_theme',
      label: 'Toggle theme (Light / Dark)',
      category: 'Preferences',
      icon: <Sun className="w-4 h-4 text-[var(--muted)]" />,
      run: () => {
        const cur = getStoredTheme();
        const next = cur === 'dark' ? 'light' : 'dark';
        setStoredTheme(next);
        setCommandPaletteOpen(false);
      },
    },
  ];

  const conversationItems = filteredConversations.slice(0, 5).map((conv) => ({
    id: conv.id,
    label: conv.title,
    category: 'Chats',
    icon: <MessageSquare className="w-4 h-4 text-[var(--muted)]" />,
    run: () => {
      setActiveConversation(conv.id);
      setCommandPaletteOpen(false);
    },
  }));

  const allItems = [...actions, ...conversationItems];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].run();
      }
    }
  };

  return (
    <Dialog.Root open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-150" />
        <Dialog.Content className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-[560px] rounded-[14px] bg-[var(--surface)] border border-[var(--border)] shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 p-0 text-[14px]">
          {/* Search bar */}
          <div className="flex items-center px-4 border-b border-[var(--border)]">
            <Search className="w-4 h-4 text-[var(--muted)] shrink-0 mr-3" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDownInList}
              placeholder="Search chats and actions..."
              className="w-full h-[48px] bg-transparent text-[14px] text-[var(--text)] placeholder-[var(--muted)] outline-none"
            />
            <kbd className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--muted)] border border-[var(--border)]">
              ESC
            </kbd>
          </div>

          {/* List items */}
          <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
            {allItems.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[var(--muted)]">
                No matching chats or commands
              </div>
            ) : (
              allItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.run}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-[8px] cursor-pointer text-[13px] transition-colors ${
                      isSelected
                        ? 'bg-[var(--surface-hover)] text-[var(--text)] font-medium'
                        : 'text-[var(--text)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-[11px] text-[var(--muted)] font-mono uppercase">
                      {item.category}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
