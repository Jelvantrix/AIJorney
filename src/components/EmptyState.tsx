import React from 'react';
import { NoevixLogoIcon } from './AssistantMessage.tsx';
import { Composer } from './Composer.tsx';
import { useChatStore } from '../lib/store.ts';

const SUGGESTIONS = [
  { label: 'Explain a concept', prompt: 'Explain how speculative execution works in computer systems in 3 clear points.' },
  { label: 'Review my code', prompt: 'How do I implement an in-memory token bucket rate limiter in TypeScript with window refill?' },
  { label: 'Plan a project', prompt: 'Create a deployment and testing checklist for a high-concurrency Node.js API.' },
  { label: 'Draft an email', prompt: 'Draft a concise launch announcement email to internal stakeholders about our deployment.' },
];

export const EmptyState: React.FC = () => {
  const { activeId, setDraft } = useChatStore();

  const handleSelectSuggestion = (prompt: string) => {
    const convId = activeId || 'default';
    setDraft(convId, prompt);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-[768px] mx-auto pb-12 animate-in fade-in-0 duration-200">
      {/* 40px monochrome logo mark */}
      <div className="mb-4">
        <NoevixLogoIcon size={40} />
      </div>

      {/* Greeting 28px/600 centered */}
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-[var(--text)] mb-8 text-center select-none">
        What can I help with?
      </h1>

      {/* Composer sits directly below greeting in empty state */}
      <div className="w-full mb-6">
        <Composer />
      </div>

      {/* 4 suggestion chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-[620px]">
        {SUGGESTIONS.map((item) => (
          <button
            key={item.label}
            onClick={() => handleSelectSuggestion(item.prompt)}
            className="rounded-full border border-[var(--border)] px-[14px] py-[8px] text-[14px] text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
