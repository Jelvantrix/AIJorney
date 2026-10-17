import React, { useState, useEffect, useRef } from 'react';
import { useChatStore, ChatMessage, LensType } from '../../lib/store.ts';
import {
  Copy,
  Check,
  RotateCcw,
  GitBranch,
  Pin,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeEditorBlock } from './CodeEditorBlock.tsx';

export const Stage: React.FC = () => {
  const {
    activeId,
    messages,
    isStreaming,
    isThinking,
    streamingText,
    streamingMessageId,
    streamingError,
    currentToolStatus,
    activeLens,
    elapsedMs,
    tokenCount,
    activeExchangeIndex,
    setActiveExchangeIndex,
    editUserMessage,
    regenerateAssistantMessage,
    setBranchVersion,
    rateMessage,
    togglePinMessage,
    openArtifact,
    sendMessage,
  } = useChatStore();

  const [hoveredExchangeId, setHoveredExchangeId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [ratingMenuMessageId, setRatingMenuMessageId] = useState<string | null>(null);

  const stageEndRef = useRef<HTMLDivElement>(null);

  const activeMessages = (activeId && messages[activeId]) || [];

  // Group messages into exchanges: each exchange has a user prompt and optional assistant reply
  const exchanges: Array<{
    userMsg: ChatMessage;
    assistantMsg?: ChatMessage;
    index: number;
  }> = [];

  for (let i = 0; i < activeMessages.length; i++) {
    const msg = activeMessages[i];
    if (msg.role === 'user') {
      const nextMsg = activeMessages[i + 1];
      const assistantMsg = nextMsg && nextMsg.role === 'assistant' ? nextMsg : undefined;
      exchanges.push({
        userMsg: msg,
        assistantMsg,
        index: exchanges.length,
      });
    }
  }

  // Scroll to bottom on streaming
  useEffect(() => {
    if (isStreaming) {
      stageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isStreaming, streamingText]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEditSubmit = (msgId: string) => {
    if (editingContent.trim()) {
      editUserMessage(msgId, editingContent.trim());
      setEditingPromptId(null);
    }
  };

  // Helper to extract code snippets as Artifacts
  const handleInspectArtifact = (code: string, language?: string) => {
    openArtifact({
      id: 'art_' + Date.now(),
      title: `${language ? language.toUpperCase() : 'SOURCE'} Module`,
      type: 'code',
      language: language || 'typescript',
      content: code,
    });
  };

  return (
    <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-8 pt-20 pb-44 scroll-smooth">
      <div className="max-w-[1040px] mx-auto">
        {exchanges.map(({ userMsg, assistantMsg, index }) => {
          const isActive = activeExchangeIndex === index;
          const isHovered = hoveredExchangeId === userMsg.id;

          const versionsCount = userMsg.versions ? userMsg.versions.length : 1;
          const currentVersionIndex = userMsg.version_index !== undefined ? userMsg.version_index : versionsCount - 1;

          const assistantVersionsCount = assistantMsg?.versions ? assistantMsg.versions.length : 1;
          const assistantVersionIndex = assistantMsg?.version_index !== undefined ? assistantMsg.version_index : assistantVersionsCount - 1;

          return (
            <div
              key={userMsg.id}
              id={`exchange-${index}`}
              onMouseEnter={() => {
                setHoveredExchangeId(userMsg.id);
                setActiveExchangeIndex(index);
              }}
              onMouseLeave={() => setHoveredExchangeId(null)}
              className={`transition-opacity duration-300 ${
                isActive || isHovered ? 'opacity-100' : 'opacity-[0.72]'
              }`}
            >
              <div className="flex flex-col md:flex-row gap-6 md:gap-10">
                {/* 160px Left Margin for Meta Labels & Branch Switchers */}
                <div className="w-full md:w-[160px] shrink-0 pt-2 flex flex-col md:items-end text-left md:text-right font-mono text-[11px] uppercase tracking-wider text-[var(--text-3)]">
                  {/* Branch version switcher if prompt has multiple branches */}
                  {versionsCount > 1 && (
                    <div className="flex items-center gap-1.5 mb-2 px-2 py-0.5 rounded-[4px] bg-[var(--elev-2)] text-[var(--text-2)] border border-[var(--line)]">
                      <button
                        disabled={currentVersionIndex <= 0}
                        onClick={() => setBranchVersion(userMsg.id, currentVersionIndex - 1)}
                        className="disabled:opacity-20 hover:text-[var(--text)]"
                        title="Previous branch"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-[11px]">
                        {currentVersionIndex + 1} / {versionsCount}
                      </span>
                      <button
                        disabled={currentVersionIndex >= versionsCount - 1}
                        onClick={() => setBranchVersion(userMsg.id, currentVersionIndex + 1)}
                        className="disabled:opacity-20 hover:text-[var(--text)]"
                        title="Next branch"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Lens name */}
                  <span className="text-[var(--text-2)] font-semibold mb-1">
                    {assistantMsg?.lens ? assistantMsg.lens.toUpperCase() : 'REASONING'}
                  </span>

                  {/* Elapsed time & Token count */}
                  {assistantMsg?.elapsed_ms !== undefined && (
                    <span className="mb-0.5">{assistantMsg.elapsed_ms}ms</span>
                  )}
                  {assistantMsg?.tokens !== undefined && (
                    <span className="mb-0.5">{assistantMsg.tokens} tok</span>
                  )}

                  {/* Mono timestamp */}
                  <span className="mt-1">
                    {new Date(userMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Pinned badge */}
                  {userMsg.pinned && (
                    <span className="mt-2 px-1.5 py-0.5 rounded-[4px] bg-[var(--elev-3)] text-[var(--text)] text-[9px]">
                      PINNED
                    </span>
                  )}
                </div>

                {/* Content Column (720px max width) */}
                <div className="flex-1 max-w-[720px] min-w-0">
                  {/* User Prompt Headline: Instrument Serif 32px, left aligned, no container */}
                  <div className="mb-8">
                    {editingPromptId === userMsg.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full font-serif-display text-2xl sm:text-3xl text-[var(--text)] bg-[var(--elev-1)] p-4 rounded-[12px] border border-[var(--line-strong)] outline-none resize-none"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditSubmit(userMsg.id)}
                            className="px-4 py-1.5 rounded-[9999px] bg-[var(--text)] text-[var(--bg)] text-[12px] font-medium"
                          >
                            Save & Branch
                          </button>
                          <button
                            onClick={() => setEditingPromptId(null)}
                            className="px-4 py-1.5 rounded-[9999px] border border-[var(--line)] text-[12px] text-[var(--text-2)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h2
                        onClick={() => {
                          setEditingPromptId(userMsg.id);
                          setEditingContent(userMsg.content);
                        }}
                        className="font-serif-display text-2xl sm:text-[32px] leading-[1.12] tracking-[-0.015em] text-[var(--text)] cursor-pointer hover:opacity-90 transition-opacity"
                        title="Click to edit prompt (or press ↑)"
                      >
                        {userMsg.content}
                      </h2>
                    )}
                  </div>

                  {/* Assistant Reply Body */}
                  {assistantMsg && (
                    <div className="editorial-reply mb-6">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            const isInline = !match && !codeString.includes('\n');

                            if (isInline) {
                              return (
                                <code
                                  className="px-1.5 py-0.5 rounded-[4px] bg-[var(--elev-2)] text-[var(--text)] font-mono text-[13px] border border-[var(--line)]"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }

                            return (
                              <CodeEditorBlock
                                code={codeString}
                                language={match ? match[1] : undefined}
                              />
                            );
                          },
                        }}
                      >
                        {assistantMsg.content}
                      </ReactMarkdown>

                      {/* Message Actions Row (appears on hover) */}
                      <div
                        className={`mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px] font-mono transition-opacity duration-200 ${
                          isHovered ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <div className="flex items-center gap-4 text-[var(--text-3)]">
                          {/* Copy */}
                          <button
                            onClick={() => handleCopy(assistantMsg.content, assistantMsg.id)}
                            className="flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                          >
                            {copiedId === assistantMsg.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === assistantMsg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          {/* Regenerate */}
                          <button
                            onClick={() => regenerateAssistantMessage(assistantMsg.id)}
                            className="flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Regenerate</span>
                          </button>

                          {/* Branch indicator */}
                          {assistantVersionsCount > 1 && (
                            <div className="flex items-center gap-1 text-[var(--text-2)]">
                              <button
                                disabled={assistantVersionIndex <= 0}
                                onClick={() => setBranchVersion(assistantMsg.id, assistantVersionIndex - 1)}
                                className="disabled:opacity-20 hover:text-[var(--text)]"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <span>
                                {assistantVersionIndex + 1} / {assistantVersionsCount}
                              </span>
                              <button
                                disabled={assistantVersionIndex >= assistantVersionsCount - 1}
                                onClick={() => setBranchVersion(assistantMsg.id, assistantVersionIndex + 1)}
                                className="disabled:opacity-20 hover:text-[var(--text)]"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Pin */}
                          <button
                            onClick={() => togglePinMessage(userMsg.id)}
                            className={`flex items-center gap-1 hover:text-[var(--text)] transition-colors ${
                              userMsg.pinned ? 'text-[var(--text)] font-semibold' : ''
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                            <span>{userMsg.pinned ? 'Pinned' : 'Pin'}</span>
                          </button>
                        </div>

                        {/* Thumbs Feedback with Lens correction */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => rateMessage(assistantMsg.id, 'up')}
                            className={`p-1 rounded-[4px] hover:bg-[var(--elev-2)] ${
                              assistantMsg.feedback?.rating === 'up' ? 'text-[var(--text)]' : 'text-[var(--text-3)]'
                            }`}
                            title="Helpful reply"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              rateMessage(assistantMsg.id, 'down');
                              setRatingMenuMessageId(ratingMenuMessageId === assistantMsg.id ? null : assistantMsg.id);
                            }}
                            className={`p-1 rounded-[4px] hover:bg-[var(--elev-2)] ${
                              assistantMsg.feedback?.rating === 'down' ? 'text-[var(--text)]' : 'text-[var(--text-3)]'
                            }`}
                            title="Mark wrong lens or poor response"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>

                          {ratingMenuMessageId === assistantMsg.id && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[var(--elev-2)] border border-[var(--line)]">
                              <span className="text-[10px] text-[var(--text-3)]">Wrong Lens?</span>
                              {(['engineering', 'design', 'research', 'reasoning', 'writing'] as LensType[]).map((lens) => (
                                <button
                                  key={lens}
                                  onClick={() => {
                                    rateMessage(assistantMsg.id, 'down', lens);
                                    setRatingMenuMessageId(null);
                                  }}
                                  className="px-1.5 py-0.5 rounded-[3px] text-[10px] uppercase hover:bg-[var(--elev-3)] hover:text-[var(--text)]"
                                >
                                  {lens[0].toUpperCase()}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hairline Divider & 96px vertical separation between exchanges */}
              <div className="w-full my-12 md:my-16 h-[1px] bg-[var(--line)]" />
            </div>
          );
        })}

        {/* Currently Streaming Exchange */}
        {isStreaming && (
          <div className="opacity-100 mb-12">
            <div className="flex flex-col md:flex-row gap-6 md:gap-10">
              {/* Left Margin Telemetry */}
              <div className="w-full md:w-[160px] shrink-0 pt-2 flex flex-col md:items-end font-mono text-[11px] uppercase tracking-wider text-[var(--text-3)]">
                <span className="text-[var(--text)] font-semibold mb-1">{activeLens.toUpperCase()}</span>
                <span>{elapsedMs}ms</span>
                <span>{tokenCount} tok</span>
                <span className="mt-2 text-[var(--text)] animate-pulse">SYNTHESIZING</span>
              </div>

              {/* Streaming Content Column */}
              <div className="flex-1 max-w-[720px] min-w-0">
                {/* Tool running status bar if active */}
                {currentToolStatus && (
                  <div className="mb-4 p-3 rounded-[8px] bg-[var(--elev-1)] border border-[var(--line)]">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-2)] mb-2">
                      <span>STATUS: {currentToolStatus}</span>
                      <span>ACTIVE PIPELINE</span>
                    </div>
                    <div className="status-line-track rounded-full">
                      <div className="status-line-indicator rounded-full" />
                    </div>
                  </div>
                )}

                {/* Thinking pulse before first token */}
                {isThinking && (
                  <div className="flex items-center gap-3 py-4 text-[13px] font-mono text-[var(--text-3)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--text)] animate-ping" />
                    <span>Routing to {activeLens.toUpperCase()} specialist...</span>
                  </div>
                )}

                {/* Streamed Tokens with Word-Level Reveal (last 12 words animated) */}
                {streamingText && (
                  <div className="editorial-reply whitespace-pre-wrap font-sans text-[17px] leading-[1.7] text-[var(--text)]">
                    {(() => {
                      const words = streamingText.split(' ');
                      const threshold = Math.max(0, words.length - 12);
                      const staticPart = words.slice(0, threshold).join(' ');
                      const freshWords = words.slice(threshold);

                      return (
                        <>
                          {staticPart && <span>{staticPart} </span>}
                          {freshWords.map((w, idx) => (
                            <span key={threshold + idx} className="word-reveal-fresh mr-1">
                              {w}{' '}
                            </span>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error or Disconnect Banner */}
        {streamingError && (
          <div className="my-6 p-4 rounded-[12px] bg-[var(--elev-1)] border border-[var(--line-strong)] flex items-center justify-between max-w-[720px] ml-0 md:ml-[200px]">
            <div className="flex items-center gap-3 text-[13px] text-[var(--text-2)]">
              <AlertCircle className="w-4 h-4 text-[var(--text)] shrink-0" />
              <span>{streamingError}</span>
            </div>
            <button
              onClick={() => {
                const lastUser = [...activeMessages].reverse().find((m) => m.role === 'user');
                if (lastUser) sendMessage(lastUser.content);
              }}
              className="px-3 py-1 rounded-[9999px] bg-[var(--text)] text-[var(--bg)] text-[12px] font-medium"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={stageEndRef} />
      </div>
    </div>
  );
};
