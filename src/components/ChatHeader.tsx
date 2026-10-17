import React, { useState, useEffect } from 'react';
import { PanelLeft, PanelLeftOpen, WifiOff } from 'lucide-react';
import { useChatStore } from '../lib/store.ts';

export const ChatHeader: React.FC = () => {
  const { conversations, activeId, isSidebarOpen, toggleSidebar } = useChatStore();
  const [isOnline, setIsOnline] = useState(true);

  const activeConv = conversations.find((c) => c.id === activeId);
  const title = activeConv?.title || 'New conversation';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="relative w-full z-10 shrink-0">
      {/* Offline slim banner if offline */}
      {!isOnline && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-center gap-2 text-[12px] text-amber-500 font-medium">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are currently offline. Responses will queue locally.</span>
        </div>
      )}

      {/* 52px Header */}
      <div className="h-[52px] px-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xs select-none">
        <div className="flex items-center gap-3 min-w-0">
          {/* Sidebar toggle button (visible when sidebar is closed or on mobile) */}
          <button
            onClick={toggleSidebar}
            className={`w-[32px] h-[32px] flex items-center justify-center rounded-[6px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150 ${
              isSidebarOpen ? 'md:hidden' : ''
            }`}
            title="Toggle sidebar (Ctrl+B)"
          >
            {isSidebarOpen ? <PanelLeft className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          {/* Conversation title in 14px muted */}
          <span className="text-[14px] text-[var(--muted)] truncate max-w-[280px] md:max-w-[420px]">
            {title}
          </span>
        </div>

        {/* Model label on the right */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--muted)] px-2 py-1 rounded-[6px] bg-[var(--surface)]">
            Noevix 1.0
          </span>
        </div>
      </div>
    </header>
  );
};
