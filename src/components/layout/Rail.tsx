import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Database,
  ShieldCheck,
  ShieldAlert,
  BarChart2,
  Sun,
  Moon,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { Conversation } from '../../../packages/contracts/index.ts';

interface RailProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  loggingConsent: boolean;
  onToggleConsent: () => void;
  onOpenEvals: () => void;
  backendInfo: {
    activeBackend: string;
    isMock: boolean;
    mockScenario: string;
  };
  onSwitchScenario: (scenario: string) => void;
  onSwitchBackend: (backend: string) => void;
}

export const Rail: React.FC<RailProps> = ({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  loggingConsent,
  onToggleConsent,
  onOpenEvals,
  backendInfo,
  onSwitchScenario,
  onSwitchBackend,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by date
  const now = Date.now();
  const dayMs = 86400000;
  const groups: { [key: string]: Conversation[] } = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  };

  for (const c of filtered) {
    const diff = now - c.updated_at;
    if (diff < dayMs) {
      groups.Today.push(c);
    } else if (diff < dayMs * 2) {
      groups.Yesterday.push(c);
    } else if (diff < dayMs * 7) {
      groups['Previous 7 Days'].push(c);
    } else {
      groups.Older.push(c);
    }
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-[260px] flex flex-col shrink-0 bg-[var(--surface-1)] border-r border-[var(--border)] transition-transform duration-200 ease-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand & New Chat */}
        <div className="p-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm tracking-tight text-[var(--text)]">
              Noevix
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleTheme}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-[6px] hover:bg-[var(--surface-2)] transition-colors"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] md:hidden rounded-[6px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--signature-magenta)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-2 pb-1">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[var(--bg)] border border-[var(--border)] rounded-[6px] text-[var(--text)] placeholder-[var(--text-muted)] focus-visible:outline-none focus-visible:border-[var(--signature-magenta)] transition-colors"
            />
          </div>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </div>
          ) : (
            Object.entries(groups).map(([groupTitle, convs]) => {
              if (convs.length === 0) return null;
              return (
                <div key={groupTitle} className="space-y-1">
                  <div className="px-2 text-[11px] font-medium text-[var(--text-muted)] tracking-wider uppercase">
                    {groupTitle}
                  </div>
                  {convs.map((conv) => {
                    const isActive = conv.id === activeId;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => onSelect(conv.id)}
                        className={`group relative flex items-center justify-between px-2.5 py-2 text-xs rounded-[6px] cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[var(--surface-2)] text-[var(--text)] font-medium border border-[var(--border)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{conv.title || 'Untitled'}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-opacity"
                          title="Delete chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Operations & Config */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-1)] text-xs space-y-2">
          {/* Privacy Consent Toggle */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              {loggingConsent ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>Logging for evals</span>
            </div>
            <button
              onClick={onToggleConsent}
              className={`px-2 py-0.5 rounded-[4px] font-mono text-[10px] transition-colors ${
                loggingConsent
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {loggingConsent ? 'CONSENTED' : 'OFF'}
            </button>
          </div>

          {/* Quick Eval Harness Trigger */}
          <button
            onClick={onOpenEvals}
            className="w-full flex items-center justify-between py-1.5 px-2 bg-[var(--surface-2)] hover:bg-[var(--border)] rounded-[6px] text-[var(--text)] transition-colors border border-[var(--border)] text-[11px]"
          >
            <div className="flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-[var(--signature-magenta)]" />
              <span>Eval Harness & Benchmarks</span>
            </div>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">40 cases</span>
          </button>

          {/* Backend & Test Scenario Config */}
          <div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="w-full flex items-center justify-between py-1 px-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] rounded transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span className="capitalize">{backendInfo.activeBackend} Backend</span>
              </div>
              <SlidersHorizontal className="w-3 h-3" />
            </button>

            {showConfig && (
              <div className="mt-2 p-2 bg-[var(--surface-2)] rounded-[6px] border border-[var(--border)] space-y-2">
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider font-mono">
                    Inference Backend
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {['nim', 'openai', 'gemini', 'mock'].map((b) => (
                      <button
                        key={b}
                        onClick={() => onSwitchBackend(b)}
                        className={`py-1 px-1.5 rounded-[4px] capitalize font-mono text-center transition-colors ${
                          backendInfo.activeBackend === b
                            ? 'bg-[var(--signature-magenta)] text-white'
                            : 'bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider font-mono">
                    Scripted Scenario
                  </div>
                  <select
                    value={backendInfo.mockScenario}
                    onChange={(e) => onSwitchScenario(e.target.value)}
                    className="w-full text-[11px] py-1 px-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-[var(--text)]"
                  >
                    <option value="default">Default Stream</option>
                    <option value="fast">Fast Path (10ms)</option>
                    <option value="slow">Slow Path (60ms)</option>
                    <option value="tool_use">Tool Use (Search + Retrieval)</option>
                    <option value="artifact">Artifact Extraction</option>
                    <option value="error">Upstream Timeout Error</option>
                    <option value="rate_limit">Rate Limit (429)</option>
                    <option value="mid_stream_disconnect">Mid-Stream Disconnect</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
