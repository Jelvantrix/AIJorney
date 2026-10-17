import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatHeader } from './components/ChatHeader.tsx';
import { MessageList } from './components/MessageList.tsx';
import { EmptyState } from './components/EmptyState.tsx';
import { Composer } from './components/Composer.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { useChatStore } from './lib/store.ts';
import { applyTheme, getStoredTheme } from './lib/theme.ts';
import { PanelLeftOpen } from 'lucide-react';

export default function App() {
  const { activeId, messages, isSidebarOpen, toggleSidebar } = useChatStore();

  const activeMessages = (activeId && messages[activeId]) || [];
  const isEmpty = activeMessages.length === 0;

  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Region 1: Sidebar (260px, collapsible) */}
      <Sidebar onOpenCommandPalette={() => useChatStore.getState().setCommandPaletteOpen(true)} />

      {/* Region 2: Main Area */}
      <main className="relative flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[var(--bg)]">
        {/* Floating reopen sidebar button on desktop when sidebar is closed */}
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="hidden md:flex absolute top-[10px] left-[12px] z-30 w-[32px] h-[32px] items-center justify-center rounded-[6px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-[var(--border)] transition-colors duration-150"
            title="Open sidebar (Ctrl+B)"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* 52px Header */}
        <ChatHeader />

        {/* Conversation Column (max-width 768px, centered) */}
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="relative flex-1 flex flex-col min-h-0">
            <MessageList />

            {/* Pinned Bottom Composer with 24px soft fade mask */}
            <div className="absolute bottom-0 inset-x-0 z-10 pointer-events-none">
              {/* 24px tall gradient fade mask */}
              <div className="h-[24px] w-full composer-fade-mask" />
              {/* Floating composer container */}
              <div className="bg-[var(--bg)] pb-6 pt-1 pointer-events-auto">
                <Composer />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Command Palette (Cmd+K) */}
      <CommandPalette />
    </div>
  );
}
