import React, { useState } from 'react';
import { useChatStore } from '../../lib/store.ts';

export const TimelineRail: React.FC = () => {
  const { activeId, messages, activeExchangeIndex, setActiveExchangeIndex } = useChatStore();
  const [hovered, setHovered] = useState(false);

  const convo = (activeId && messages[activeId]) || [];
  const prompts = convo.filter((m) => m.role === 'user');

  if (prompts.length <= 1) return null;

  const jump = (i: number) => {
    setActiveExchangeIndex(i);
    document.getElementById(`exchange-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Turn navigator"
      className="fixed right-0 top-[var(--topbar-h)] bottom-[168px] z-30 hidden w-9 flex-col items-center justify-center lg:flex"
    >
      <div className="relative flex flex-col items-center gap-2.5 py-3">
        {prompts.map((m, i) => {
          const active = activeExchangeIndex === i;
          return (
            <button
              key={m.id}
              onClick={() => jump(i)}
              title={m.content.slice(0, 60)}
              aria-label={`Turn ${i + 1}`}
              className="group relative flex h-3 items-center justify-center"
              style={{ width: 20 }}
            >
              <span
                className="rounded-full transition-all duration-200"
                style={{
                  width: active ? 16 : 8,
                  height: active ? 3 : 2,
                  background: active ? 'var(--text)' : 'var(--line-strong)',
                  boxShadow: active ? '0 0 10px var(--line-strong)' : 'none',
                }}
              />
            </button>
          );
        })}

        {hovered && (
          <div
            className="nv-menu absolute right-[calc(100%+8px)] top-1/2 z-50 w-[248px] -translate-y-1/2"
            style={{ ['--menu-origin' as any]: 'right center' }}
          >
            <div className="nv-menu__label flex items-center justify-between">
              <span>Turns</span>
              <span className="nv-num text-[9px] opacity-60">{prompts.length}</span>
            </div>
            <div className="nv-scroll max-h-[300px] overflow-y-auto">
              {prompts.map((m, i) => {
                const active = activeExchangeIndex === i;
                return (
                  <button key={m.id} data-active={active} onClick={() => jump(i)} className="nv-menu__item">
                    <span
                      className="nv-num w-4 shrink-0 text-[10px]"
                      style={{ color: active ? 'var(--text-2)' : 'var(--text-4)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate text-[12px]">{m.content}</span>
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
