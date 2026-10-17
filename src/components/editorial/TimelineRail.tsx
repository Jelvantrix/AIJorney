import React, { useState } from 'react';
import { useChatStore } from '../../lib/store.ts';

export const TimelineRail: React.FC = () => {
  const { activeId, messages, activeExchangeIndex, setActiveExchangeIndex } = useChatStore();
  const [isHovered, setIsHovered] = useState(false);

  const activeMessages = (activeId && messages[activeId]) || [];
  const userMessages = activeMessages.filter((m) => m.role === 'user');

  if (userMessages.length <= 1) return null;

  const handleJumpTo = (index: number) => {
    setActiveExchangeIndex(index);
    const el = document.getElementById(`exchange-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="hidden lg:flex fixed right-0 top-16 bottom-24 w-6 z-30 flex-col items-center justify-center pointer-events-auto"
      aria-label="Timeline navigation"
    >
      {/* Small vertical track */}
      <div className="relative py-4 flex flex-col items-center gap-3">
        {userMessages.map((msg, idx) => {
          const isActive = activeExchangeIndex === idx;
          return (
            <button
              key={msg.id}
              onClick={() => handleJumpTo(idx)}
              className="group relative flex items-center justify-center p-1 focus:outline-none"
              title={msg.content.slice(0, 48)}
            >
              {/* The tick */}
              <div
                className={`transition-all duration-200 rounded-full ${
                  isActive
                    ? 'w-4 h-[3px] bg-[var(--text)] opacity-100 shadow-[0_0_8px_var(--line-strong)]'
                    : 'w-2 h-[2px] bg-[var(--line-strong)] group-hover:w-3 group-hover:bg-[var(--text-2)] opacity-70'
                }`}
              />
            </button>
          );
        })}

        {/* Floating popover list of exchange prompt snippets on hover */}
        {isHovered && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-64 p-2 rounded-[14px] bg-[var(--elev-1)] border border-[var(--line-strong)] shadow-2xl backdrop-blur-xl animate-[wordReveal_140ms_ease-out] z-50">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-3)]">
              Exchanges ({userMessages.length})
            </div>
            <div className="space-y-1 mt-1 max-h-80 overflow-y-auto">
              {userMessages.map((msg, idx) => {
                const isActive = activeExchangeIndex === idx;
                return (
                  <button
                    key={msg.id}
                    onClick={() => handleJumpTo(idx)}
                    className={`w-full text-left p-2 rounded-[8px] text-[11px] font-mono transition-colors truncate block ${
                      isActive
                        ? 'bg-[var(--elev-2)] text-[var(--text)] font-semibold'
                        : 'text-[var(--text-2)] hover:bg-[var(--elev-2)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span className="text-[var(--text-3)] mr-1.5">{idx + 1}.</span>
                    <span className="truncate">{msg.content}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
