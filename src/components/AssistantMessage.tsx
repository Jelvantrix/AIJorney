import React from 'react';
import { ChatMessage } from '../lib/store.ts';
import { Markdown } from './Markdown.tsx';
import { AssistantActions } from './MessageActions.tsx';
import { RotateCcw } from 'lucide-react';

interface AssistantMessageProps {
  message?: ChatMessage;
  isStreaming?: boolean;
  isThinking?: boolean;
  streamingText?: string;
  streamingError?: string | null;
  onRegenerate: () => void;
  onSelectVersion?: (idx: number) => void;
  isLatest?: boolean;
}

// Neutral 24px circular logo mark (monochrome, no color background)
export const NoevixLogoIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0 text-[var(--text)]"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M8 15V9L16 15V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  isStreaming = false,
  isThinking = false,
  streamingText = '',
  streamingError = null,
  onRegenerate,
  onSelectVersion,
  isLatest = false,
}) => {
  const content = isStreaming ? streamingText : message?.content || '';
  const isNew = message?.isNew && !isStreaming;

  return (
    <div
      className={`group w-full flex flex-col items-start ${
        isNew ? 'animate-in fade-in-0 duration-200 ease-out' : ''
      }`}
    >
      {/* 24px neutral monochrome logo mark */}
      <div className="mb-2 flex items-center gap-2">
        <NoevixLogoIcon size={22} />
      </div>

      {/* Body: plain text directly on page background. NO bubble, NO border, NO card. */}
      <div className="w-full">
        {isThinking ? (
          <div className="py-2 flex items-center">
            <span className="streaming-dot" aria-label="Thinking" />
          </div>
        ) : (
          <Markdown content={content} isStreaming={isStreaming} />
        )}

        {/* Inline error row if error occurred */}
        {streamingError && (
          <div className="mt-3 flex items-center gap-3 text-[14px] text-red-500 dark:text-red-400">
            <span>{streamingError}</span>
            <button
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text)] text-[13px] border border-[var(--border)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>

      {/* Hover actions */}
      {!isStreaming && content && (
        <AssistantActions
          content={content}
          onRegenerate={onRegenerate}
          versions={message?.versions}
          versionIndex={message?.version_index}
          onSelectVersion={onSelectVersion}
          isLatest={isLatest}
        />
      )}
    </div>
  );
};
