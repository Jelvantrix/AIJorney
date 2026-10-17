import React, { useState } from 'react';
import { ChatMessage, useChatStore } from '../lib/store.ts';
import { Markdown } from './Markdown.tsx';
import {
  RotateCcw,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  Brain,
  Sparkles,
  Volume2,
  VolumeX,
  FileText,
  Code2,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ModernAssistantMessageProps {
  message?: ChatMessage;
  isStreaming?: boolean;
  isThinking?: boolean;
  streamingText?: string;
  streamingError?: string | null;
  onRegenerate: () => void;
  onSelectVersion?: (idx: number) => void;
  isLatest?: boolean;
}

export const ModernAssistantMessage: React.FC<ModernAssistantMessageProps> = ({
  message,
  isStreaming = false,
  isThinking = false,
  streamingText = '',
  streamingError = null,
  onRegenerate,
  onSelectVersion,
  isLatest = false,
}) => {
  const { sendMessage, setDraft, activeId, selectedLens } = useChatStore();

  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showThoughtStream, setShowThoughtStream] = useState(false);

  const content = isStreaming ? streamingText : message?.content || '';
  const versions = message?.versions || (content ? [content] : []);
  const versionIndex = message?.version_index ?? versions.length - 1;
  const hasMultipleVersions = versions.length > 1;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayVoice = () => {
    setIsAudioPlaying(!isAudioPlaying);
    if (!isAudioPlaying) {
      setTimeout(() => setIsAudioPlaying(false), 6000);
    }
  };

  const handleApplyTrajectory = (prompt: string) => {
    sendMessage(prompt);
  };

  // Generate smart dynamic follow-up trajectories based on content
  const getFollowups = () => {
    if (content.toLowerCase().includes('typescript') || content.toLowerCase().includes('tokenbucket') || content.toLowerCase().includes('code')) {
      return [
        'Add distributed Redis Lua script implementation',
        'Write complete unit tests with edge cases',
        'Benchmark time and memory complexity',
      ];
    }
    if (content.toLowerCase().includes('database') || content.toLowerCase().includes('postgresql') || content.toLowerCase().includes('dynamodb')) {
      return [
        'How does partition sharding behave during failovers?',
        'Provide schema migration strategies with zero downtime',
        'Compare read vs write pricing at 10M requests/day',
      ];
    }
    return [
      'Deconstruct the core failure modes of this approach',
      'Provide a checklist for production rollout',
      'Summarize into 3 executive bullet points',
    ];
  };

  const followups = getFollowups();

  return (
    <div className="w-full flex flex-col items-start my-6 animate-in fade-in-0 duration-200">
      {/* Elevated Neural Card with Glass Aura */}
      <div className="w-full rounded-[24px] glass-card border border-white/20 dark:border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Top Header Row: Neural Crest + Lens Tag + Latency Badge */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[var(--border)]/50">
          <div className="flex items-center gap-2.5">
            {/* Radiant Neural Crest */}
            <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-[var(--aura-2)] shadow-[0_0_12px_var(--aura-1)]">
              <span className="text-white text-xs font-black tracking-widest">N</span>
              <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-[13.5px] text-[var(--text)] tracking-tight">
                Noevix Intelligence
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--surface-active)] text-[var(--accent)] text-[11px] font-medium border border-[var(--border)] flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span className="capitalize">{selectedLens} Lens</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] font-mono">
            <span className="hidden sm:inline">18ms TTFT</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </div>
        </div>

        {/* Cognitive Flow & Reasoning Stream Accordion */}
        <div className="mb-4">
          <button
            onClick={() => setShowThoughtStream(!showThoughtStream)}
            className="flex items-center gap-2 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors px-2.5 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)]/70 w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Brain className={`w-3.5 h-3.5 ${isThinking ? 'text-[var(--accent)] animate-pulse' : 'text-[var(--muted)]'}`} />
              <span>
                {isThinking
                  ? 'Active Cognitive Synthesis (evaluating constraints)...'
                  : 'Cognitive Flow & Reasoning Trace (3 Steps Verified)'}
              </span>
            </div>
            {showThoughtStream ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showThoughtStream && (
            <div className="mt-2 p-3.5 rounded-xl bg-[var(--surface)]/80 border border-[var(--border)] text-[12.5px] text-[var(--text-secondary)] space-y-2 animate-in fade-in-0 duration-150">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
                <div><strong>Constraint Extraction:</strong> Analyzed input invariants, concurrency assumptions, and latency boundaries.</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
                <div><strong>Heuristic Routing:</strong> Mapped to Techne Engineering role module with monotonic refill arithmetic.</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
                <div><strong>Verification:</strong> Checked against drift under idle intervals, thread safety, and memory ceilings.</div>
              </div>
            </div>
          )}
        </div>

        {/* Response Body Content */}
        <div className="w-full">
          {isThinking ? (
            <div className="py-6 flex flex-col items-center justify-center gap-3">
              <div className="relative flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)] animate-spin" />
                <div className="absolute w-4 h-4 rounded-full bg-[var(--accent)] animate-pulse" />
              </div>
              <span className="text-[13px] font-medium text-[var(--muted)] animate-pulse">
                Synthesizing multi-lens perspective...
              </span>
            </div>
          ) : (
            <Markdown content={content} isStreaming={isStreaming} />
          )}

          {/* Streaming Error Display */}
          {streamingError && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[13px] flex items-center justify-between">
              <span>{streamingError}</span>
              <button
                onClick={onRegenerate}
                className="px-2.5 py-1 rounded-lg bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>

        {/* Lower Action Deck & Perspective Shifter */}
        {!isStreaming && content && (
          <div className="mt-5 pt-3.5 border-t border-[var(--border)]/50 flex flex-wrap items-center justify-between gap-3 select-none">
            {/* Left: Interactive Tools (Voice readout, Copy, Thumbs, Regenerate) */}
            <div className="flex items-center gap-1.5">
              {/* Voice Readout Player Simulation */}
              <button
                onClick={handlePlayVoice}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
                  isAudioPlaying
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_0_10px_var(--aura-1)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border-[var(--border)]'
                }`}
                title="Synthesize Voice Readout"
              >
                {isAudioPlaying ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-[11.5px] font-medium">Speaking</span>
                    <span className="flex items-center gap-0.5 ml-1">
                      <span className="w-1 h-2 rounded-full bg-white animate-bounce" />
                      <span className="w-1 h-3 rounded-full bg-white animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1 h-1.5 rounded-full bg-white animate-bounce [animation-delay:0.3s]" />
                    </span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="text-[11.5px] font-medium hidden sm:inline">Listen</span>
                  </>
                )}
              </button>

              {/* Copy Full Output */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors text-[11.5px] font-medium"
                title="Copy formatted markdown"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Thumbs Feedback */}
              <button
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                className={`p-1.5 rounded-xl border transition-colors ${
                  feedback === 'up'
                    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border-[var(--border)]'
                }`}
                title="Helpful response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                className={`p-1.5 rounded-xl border transition-colors ${
                  feedback === 'down'
                    ? 'bg-red-500/15 text-red-500 border-red-500/30'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border-[var(--border)]'
                }`}
                title="Unhelpful response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              {/* Regenerate */}
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors"
                title="Regenerate alternative perspective"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right: Branch navigator if available */}
            {hasMultipleVersions && onSelectVersion && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[12px] text-[var(--muted)] font-mono">
                <button
                  disabled={versionIndex <= 0}
                  onClick={() => onSelectVersion(versionIndex - 1)}
                  className="p-0.5 rounded hover:text-[var(--text)] disabled:opacity-30"
                  title="Previous generation"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span>
                  {versionIndex + 1}/{versions.length}
                </span>
                <button
                  disabled={versionIndex >= versions.length - 1}
                  onClick={() => onSelectVersion(versionIndex + 1)}
                  className="p-0.5 rounded hover:text-[var(--text)] disabled:opacity-30"
                  title="Next generation"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Smart Follow-up Trajectories */}
        {!isStreaming && content && (
          <div className="mt-4 pt-3 border-t border-[var(--border)]/40">
            <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[var(--accent)]" />
              <span>Recommended Follow-up Trajectories</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {followups.map((q) => (
                <button
                  key={q}
                  onClick={() => handleApplyTrajectory(q)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--accent)]/50 text-[12.5px] text-[var(--text)] transition-all shadow-xs group"
                >
                  <span className="truncate max-w-[280px] sm:max-w-[420px]">{q}</span>
                  <ArrowRight className="w-3 h-3 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
