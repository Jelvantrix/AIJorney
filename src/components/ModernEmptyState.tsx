import React from 'react';
import { ModernComposer } from './ModernComposer.tsx';
import { useChatStore } from '../lib/store.ts';
import {
  Zap,
  Code2,
  Database,
  Layers,
  Sparkles,
  ArrowRight,
  Brain,
  Feather,
} from 'lucide-react';

const CAPABILITIES = [
  {
    icon: Code2,
    lens: 'Techne Code',
    title: 'High-Concurrency Rate Limiter',
    desc: 'In-memory token bucket implementation with monotonic clock refill in TypeScript',
    prompt: 'How do I implement an in-memory token bucket rate limiter in TypeScript with window refill?',
  },
  {
    icon: Database,
    lens: 'Architecture',
    title: 'PostgreSQL vs DynamoDB Matrix',
    desc: 'Deep comparative trade-offs: ACID guarantees, partition sharding & cost inflection',
    prompt: 'Compare PostgreSQL vs DynamoDB trade-offs for high-volume transactional workloads.',
  },
  {
    icon: Brain,
    lens: 'Deep Reason',
    title: 'Speculative Execution Principles',
    desc: 'Branch prediction mechanisms and parallel draft model verification in inference',
    prompt: 'Explain how speculative execution works in computer systems and model inference.',
  },
  {
    icon: Feather,
    lens: 'Executive',
    title: 'Deployment & Rollout Memo',
    desc: 'Concise executive memo for internal stakeholders with latency metrics and rollback plan',
    prompt: 'Draft a concise launch announcement email to internal stakeholders about our deployment.',
  },
];

export const ModernEmptyState: React.FC = () => {
  const { setDraft, activeId, sendMessage } = useChatStore();

  const handleSelect = (prompt: string) => {
    const convId = activeId || 'default';
    setDraft(convId, prompt);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-[880px] mx-auto py-8 z-10 select-none animate-in fade-in-0 duration-300">
      {/* Radiant Floating Crest */}
      <div className="mb-6 relative flex items-center justify-center">
        <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-[var(--accent)] via-[#8B5CF6] to-[#06B6D4] p-[1.5px] shadow-[0_0_35px_var(--aura-1)] animate-pulse">
          <div className="w-full h-full rounded-3xl bg-[var(--surface)] flex items-center justify-center">
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-[var(--accent)] to-[#8B5CF6]">
              NX
            </span>
          </div>
        </div>
      </div>

      {/* Modern Typographic Headline */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-center text-[var(--text)] mb-3">
        NOEVIX NEURAL STAGE
      </h1>
      <p className="text-[14px] sm:text-[15px] text-[var(--muted)] text-center max-w-[540px] mb-8 leading-relaxed">
        Living aura orchestration across engineering, structural reasoning, and executive synthesis.
      </p>

      {/* Composer sits centered in empty stage */}
      <div className="w-full mb-8">
        <ModernComposer />
      </div>

      {/* 4 Interactive Glass Capability Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[820px]">
        {CAPABILITIES.map((cap) => {
          const Icon = cap.icon;
          return (
            <button
              key={cap.title}
              onClick={() => handleSelect(cap.prompt)}
              className="group p-4 rounded-2xl glass-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/50 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[var(--surface)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors duration-200 shadow-xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
                    {cap.lens}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" />
              </div>

              <h3 className="text-[13.5px] font-semibold text-[var(--text)] mb-1 group-hover:text-[var(--accent)] transition-colors">
                {cap.title}
              </h3>
              <p className="text-[12px] text-[var(--muted)] leading-relaxed line-clamp-2">
                {cap.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
