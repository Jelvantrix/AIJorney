import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChatStore, type ChatMessage, type LensType, AVAILABLE_MODELS } from '../../lib/store.ts';
import {
  Copy,
  Check,
  RotateCcw,
  Pin,
  PinOff,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Clock,
  Cpu,
  Hash,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeEditorBlock } from './CodeEditorBlock.tsx';
import { EmptyState } from './EmptyState.tsx';

/* ────────────────────────────────────────────────────────────────────────── */

const MetaCell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <span
    className={`flex items-center justify-end gap-1.5 font-mono text-[10.5px] leading-none ${className}`}
    style={{ color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums' }}
  >
    {children}
  </span>
);

export const Stage: React.FC = () => {
  const {
    activeId,
    messages,
    isStreaming,
    isThinking,
    streamingText,
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
    sendMessage,
  } = useChatStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [ratingFor, setRatingFor] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const activeMessages = (activeId && messages[activeId]) || [];

  const exchanges = useMemo(() => {
    const list: Array<{ user: ChatMessage; assistant?: ChatMessage; index: number }> = [];
    activeMessages.forEach((m, i) => {
      if (m.role !== 'user') return;
      const next = activeMessages[i + 1];
      list.push({
        user: m,
        assistant: next && next.role === 'assistant' ? next : undefined,
        index: list.length,
      });
    });
    return list;
  }, [activeMessages]);

  useEffect(() => {
    if (isStreaming) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isStreaming, streamingText]);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (exchanges.length === 0) {
    return (
      <div className="nv-scroll relative z-10 flex-1 overflow-y-auto">
        <EmptyState
          onSeed={(t) => {
            sendMessage(t);
          }}
        />
      </div>
    );
  }

  return (
    <div className="nv-scroll relative z-10 flex-1 overflow-x-hidden overflow-y-auto">
      <div className="mx-auto w-full max-w-[1040px] px-5 pb-40 pt-12 sm:px-8 lg:px-12">
        {exchanges.map(({ user, assistant, index }) => {
          const isActive = activeExchangeIndex === index;
          const uv = user.versions?.length || 1;
          const ui = user.version_index ?? uv - 1;
          const av = assistant?.versions?.length || 1;
          const ai = assistant?.version_index ?? av - 1;
          const isEditing = editingId === user.id;

          return (
            <article
              key={user.id}
              id={`exchange-${index}`}
              onMouseEnter={() => setActiveExchangeIndex(index)}
              className="group/turn relative"
              style={{ opacity: isActive ? 1 : 0.86, transition: 'opacity 260ms var(--ease)' }}
            >
              <div className="grid grid-cols-1 gap-x-0 md:grid-cols-[172px_1px_minmax(0,1fr)]">
                {/* ── Margin column ─────────────────────────────── */}
                <div className="hidden flex-col items-end gap-2.5 pr-6 pt-1.5 md:flex">
                  <span
                    className="nv-display leading-none"
                    style={{ fontSize: '30px', color: 'var(--text-3)' }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span
                    className="font-mono text-[9px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: 'var(--text-3)' }}
                    title="Work specialization lens"
                  >
                    WORK · {assistant?.lens || 'reasoning'}
                  </span>

                  {assistant?.model && (
                    <span
                      className="nv-chip !h-[18px] !text-[9px] !px-1.5"
                      style={{ color: 'var(--text-2)' }}
                      title="AI Model used"
                    >
                      <Cpu className="h-2.5 w-2.5" />
                      {AVAILABLE_MODELS.find((m) => m.id === assistant.model)?.shortName || assistant.model}
                    </span>
                  )}

                  {assistant && (
                    <div className="flex flex-col items-end gap-1.5">
                      {assistant.elapsed_ms !== undefined && (
                        <MetaCell>
                          <Clock className="h-2.5 w-2.5" />
                          {assistant.elapsed_ms}ms
                        </MetaCell>
                      )}
                      {assistant.tokens !== undefined && (
                        <MetaCell>
                          <Hash className="h-2.5 w-2.5" />
                          {assistant.tokens}
                        </MetaCell>
                      )}
                    </div>
                  )}

                  <MetaCell>
                    {new Date(user.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </MetaCell>

                  {uv > 1 && (
                    <div className="mt-1 flex items-center gap-0.5 rounded-full px-1 py-0.5" style={{ background: 'var(--glass-2)', border: '1px solid var(--line-faint)' }}>
                      <button
                        disabled={ui <= 0}
                        onClick={() => setBranchVersion(user.id, ui - 1)}
                        className="rounded-full p-0.5 disabled:opacity-25"
                        style={{ color: 'var(--text-2)' }}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                      <span className="nv-num px-0.5 text-[10px]" style={{ color: 'var(--text-2)' }}>
                        {ui + 1}/{uv}
                      </span>
                      <button
                        disabled={ui >= uv - 1}
                        onClick={() => setBranchVersion(user.id, ui + 1)}
                        className="rounded-full p-0.5 disabled:opacity-25"
                        style={{ color: 'var(--text-2)' }}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {user.pinned && (
                    <span className="nv-badge !h-[18px] !text-[9px]">
                      <Pin className="h-2.5 w-2.5" />
                      Pinned
                    </span>
                  )}
                </div>

                {/* ── Margin rule ───────────────────────────────── */}
                <div
                  className="hidden w-px transition-colors duration-300 md:block"
                  style={{ background: isActive ? 'var(--line-strong)' : 'var(--line)' }}
                />

                {/* ── Content column ────────────────────────────── */}
                <div className="min-w-0 md:pl-9">
                  {/* Prompt */}
                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        autoFocus
                        rows={3}
                        className="nv-display w-full resize-none rounded-[14px] p-4 outline-none"
                        style={{
                          fontSize: '24px',
                          background: 'var(--glass-2)',
                          border: '1px solid var(--line-bright)',
                          color: 'var(--text)',
                          boxShadow: '0 0 0 3px var(--ring-soft)',
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (editDraft.trim()) editUserMessage(user.id, editDraft.trim());
                            setEditingId(null);
                          }}
                          className="nv-btn nv-btn--primary nv-btn--sm"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                          Save & branch
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="nv-btn nv-btn--sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h2
                      onClick={() => {
                        setEditingId(user.id);
                        setEditDraft(user.content);
                      }}
                      title="Click to edit and branch"
                      className="nv-display cursor-text text-balance transition-colors duration-200"
                      style={{ fontSize: 'clamp(22px, 2.6vw, 31px)' }}
                    >
                      {user.content}
                    </h2>
                  )}

                  {/* Mobile meta strip */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 md:hidden">
                    {assistant?.model && (
                      <span className="nv-chip !h-[18px] !text-[9px]">
                        <Cpu className="h-2.5 w-2.5" />
                        {AVAILABLE_MODELS.find((m) => m.id === assistant.model)?.shortName || assistant.model}
                      </span>
                    )}
                    <span className="nv-chip !h-[18px] !text-[9px]">
                      WORK: {(assistant?.lens || 'reasoning').toUpperCase()}
                    </span>
                    {assistant?.tokens !== undefined && (
                      <span className="font-mono text-[10px]" style={{ color: 'var(--text-4)' }}>
                        {assistant.tokens} tok · {assistant.elapsed_ms}ms
                      </span>
                    )}
                  </div>

                  {/* Reply */}
                  {assistant && (
                    <div className="mt-7">
                      <div className="editorial-reply">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const text = String(children).replace(/\n$/, '');
                              const inline = !match && !text.includes('\n');
                              if (inline) {
                                return (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <CodeEditorBlock code={text} language={match?.[1] || undefined} />
                              );
                            },
                          }}
                        >
                          {assistant.content}
                        </ReactMarkdown>
                      </div>

                      {/* Actions */}
                      <div
                        className="mt-5 flex flex-wrap items-center justify-between gap-3 opacity-0 transition-opacity duration-200 group-hover/turn:opacity-100 focus-within:opacity-100"
                      >
                        <div className="flex flex-wrap items-center gap-0.5">
                          <button
                            onClick={() => copy(assistant.content, assistant.id)}
                            className="nv-btn nv-btn--ghost nv-btn--sm"
                          >
                            {copiedId === assistant.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedId === assistant.id ? 'Copied' : 'Copy'}
                          </button>

                          <button
                            onClick={() => regenerateAssistantMessage(assistant.id)}
                            className="nv-btn nv-btn--ghost nv-btn--sm"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Regenerate
                          </button>

                          <button
                            onClick={() => togglePinMessage(user.id)}
                            className="nv-btn nv-btn--ghost nv-btn--sm"
                            style={user.pinned ? { color: 'var(--text)' } : undefined}
                          >
                            {user.pinned ? (
                              <PinOff className="h-3.5 w-3.5" />
                            ) : (
                              <Pin className="h-3.5 w-3.5" />
                            )}
                            {user.pinned ? 'Unpin' : 'Pin'}
                          </button>

                          {av > 1 && (
                            <div className="ml-1 flex items-center gap-0.5 px-1.5 py-1 font-mono text-[10.5px]" >
                              <button
                                disabled={ai <= 0}
                                onClick={() => setBranchVersion(assistant.id, ai - 1)}
                                className="disabled:opacity-25"
                                style={{ color: 'var(--text-2)' }}
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </button>
                              <span className="nv-num" style={{ color: 'var(--text-3)' }}>
                                revision {ai + 1}/{av}
                              </span>
                              <button
                                disabled={ai >= av - 1}
                                onClick={() => setBranchVersion(assistant.id, ai + 1)}
                                className="disabled:opacity-25"
                                style={{ color: 'var(--text-2)' }}
                              >
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="nv-label mr-1">Rate</span>
                          <button
                            onClick={() => rateMessage(assistant.id, 'up')}
                            className="nv-iconbtn nv-iconbtn--sm !h-9 !w-9 lg:!h-7 lg:!w-7"
                            style={
                              assistant.feedback?.rating === 'up'
                                ? { color: 'var(--text)', background: 'var(--glass-3)' }
                                : undefined
                            }
                            title="Sound"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              rateMessage(assistant.id, 'down');
                              setRatingFor(ratingFor === assistant.id ? null : assistant.id);
                            }}
                            className="nv-iconbtn nv-iconbtn--sm !h-9 !w-9 lg:!h-7 lg:!w-7"
                            style={
                              assistant.feedback?.rating === 'down'
                                ? { color: 'var(--text)', background: 'var(--glass-3)' }
                                : undefined
                            }
                            title="Needs revision"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>

                          {ratingFor === assistant.id && (
                            <div
                              className="anim-fade ml-1 flex items-center gap-1 rounded-full px-2 py-1"
                              style={{ background: 'var(--glass-2)', border: '1px solid var(--line)' }}
                            >
                              <span className="nv-label mr-0.5">Lens off?</span>
                              {(['engineering', 'design', 'research', 'reasoning', 'writing'] as LensType[]).map(
                                (l) => (
                                  <button
                                    key={l}
                                    onClick={() => {
                                      rateMessage(assistant.id, 'down', l);
                                      setRatingFor(null);
                                    }}
                                    className="rounded-[5px] px-1.5 py-0.5 font-mono text-[10px] uppercase transition-colors hover:bg-[var(--glass-3)]"
                                    style={{ color: 'var(--text-3)' }}
                                  >
                                    {l.slice(0, 3)}
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Turn divider */}
              <div className="mt-14 mb-14 flex items-center gap-4">
                <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
                <span className="nv-label" style={{ opacity: 0.55 }}>
                  {String(index + 1).padStart(2, '0')} / {String(exchanges.length).padStart(2, '0')}
                </span>
                <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
              </div>
            </article>
          );
        })}

        {/* ── Live turn ─────────────────────────────────────────── */}
        {isStreaming && (
          <div className="anim-fade grid grid-cols-1 md:grid-cols-[172px_1px_minmax(0,1fr)]">
            <div className="hidden flex-col items-end gap-2.5 pr-6 pt-1.5 md:flex">
              <span className="nv-display leading-none" style={{ fontSize: '30px', color: 'var(--text-2)' }}>
                {String(exchanges.length + 1).padStart(2, '0')}
              </span>
              <span
                className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
                style={{ color: 'var(--text)' }}
              >
                {activeLens}
              </span>
              <MetaCell>
                <Clock className="h-2.5 w-2.5" />
                {elapsedMs}ms
              </MetaCell>
              <MetaCell>
                <Hash className="h-2.5 w-2.5" />
                {tokenCount}
              </MetaCell>
            </div>

            <div className="hidden w-px md:block" style={{ background: 'var(--line-strong)' }} />

            <div className="min-w-0 md:pl-9">
              {currentToolStatus && (
                <div
                  className="anim-fade mb-5 flex items-center gap-3 rounded-[12px] px-3.5 py-2.5"
                  style={{ background: 'var(--glass-1)', border: '1px solid var(--line)' }}
                >
                  <Cpu className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-3)' }} />
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-2)' }}>
                    {currentToolStatus}
                  </span>
                  <span className="nv-meter nv-meter--sweep ml-auto h-[3px] max-w-[160px]" />
                </div>
              )}

              {isThinking && !streamingText && (
                <div className="flex items-center gap-3 py-1">
                  <span className="nv-spinner" />
                  <span className="nv-shimmer text-[13px] font-medium">
                    Routing to the {activeLens} specialist…
                  </span>
                </div>
              )}

              {streamingText && (
                <div className="editorial-reply">
                  {(() => {
                    const words = streamingText.split(' ');
                    const cut = Math.max(0, words.length - 10);
                    return (
                      <>
                        {words.slice(0, cut).join(' ')}
                        {cut > 0 ? ' ' : ''}
                        {words.slice(cut).map((w, i) => (
                          <span key={`${cut}-${i}`} className="nv-word">
                            {w}
                            {i < words.length - cut - 1 ? '\u00A0' : ''}
                          </span>
                        ))}
                        <span className="nv-caret" />
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────── */}
        {streamingError && (
          <div
            className="anim-rise my-8 flex flex-wrap items-center gap-3 rounded-[16px] p-4"
            style={{ background: 'var(--glass-1)', border: '1px solid var(--line-strong)' }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--glass-3)', border: '1px solid var(--line)' }}
            >
              <AlertTriangle className="h-4 w-4" style={{ color: 'var(--text)' }} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                Something interrupted the synthesis
              </div>
              <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-3)' }}>
                {streamingError}
              </div>
            </div>
            <button
              onClick={() => {
                const last = [...activeMessages].reverse().find((m) => m.role === 'user');
                if (last) sendMessage(last.content);
              }}
              className="nv-btn nv-btn--primary nv-btn--sm"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={endRef} className="h-4" />
      </div>
    </div>
  );
};
