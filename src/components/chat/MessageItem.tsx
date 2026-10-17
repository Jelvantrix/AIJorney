import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  GitBranch,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Maximize2,
  FileText,
} from 'lucide-react';
import { Message, PublicLens, LENS_DESCRIPTIONS } from '../../../packages/contracts/index.ts';
import { MarkdownRenderer } from '../../lib/markdown.tsx';
import { ActiveArtifact } from '../../types/client.ts';

interface MessageItemProps {
  message: Message;
  branchIndex?: number;
  totalBranches?: number;
  onSelectBranch?: (index: number) => void;
  onRegenerate?: (lensOverride?: PublicLens) => void;
  onEditAndBranch?: (newContent: string) => void;
  onOpenArtifact?: (artifact: ActiveArtifact) => void;
  onFeedback?: (rating: 'positive' | 'negative') => void;
  isStreaming?: boolean;
}

const ALL_LENSES: PublicLens[] = [
  'Engineering',
  'Design',
  'Research',
  'Reasoning',
  'Writing',
];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  branchIndex = 1,
  totalBranches = 1,
  onSelectBranch,
  onRegenerate,
  onEditAndBranch,
  onOpenArtifact,
  onFeedback,
  isStreaming = false,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showLensMenu, setShowLensMenu] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEditAndBranch?.(editContent);
    }
    setIsEditing(false);
  };

  if (isUser) {
    return (
      <div className="group flex justify-end my-4">
        <div className="max-w-[85%] rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] px-4 py-3 text-[14px] text-[var(--text)]">
          {isEditing ? (
            <div className="space-y-2 min-w-[280px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full text-xs p-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-[6px] text-[var(--text)] focus:outline-none focus:border-[var(--signature-magenta)]"
                rows={3}
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-[var(--signature-magenta)] text-white rounded-[4px] font-medium"
                >
                  Save & Branch
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>

              {/* Attachments preview */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-wrap gap-1.5">
                  {message.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-1.5 text-xs px-2 py-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-[4px] text-[var(--text-muted)]"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[120px]">{att.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Branch navigator & Edit hover button */}
              <div className="flex items-center justify-between mt-2 pt-1.5 text-[11px] text-[var(--text-muted)] border-t border-[var(--border)]/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {totalBranches > 1 ? (
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      onClick={() => onSelectBranch?.(branchIndex - 1)}
                      disabled={branchIndex <= 1}
                      className="p-0.5 hover:text-[var(--text)] disabled:opacity-30"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span>
                      {branchIndex} / {totalBranches}
                    </span>
                    <button
                      onClick={() => onSelectBranch?.(branchIndex + 1)}
                      disabled={branchIndex >= totalBranches}
                      className="p-0.5 hover:text-[var(--text)] disabled:opacity-30"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 hover:text-[var(--text)]"
                    title="Edit and branch"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button onClick={handleCopy} className="hover:text-[var(--text)]" title="Copy text">
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="group my-5 space-y-2">
      {/* Top Lens Chip (Engineering / Design / Research / Reasoning / Writing) */}
      <div className="flex items-center justify-between text-xs">
        <div className="relative inline-flex items-center">
          {message.lens && (
            <div className="relative">
              <button
                onClick={() => setShowLensMenu(!showLensMenu)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-[11px] font-medium hover:border-[var(--signature-magenta)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--signature-magenta)]"
                title="Click to override intelligence lens"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--signature-magenta)]" />
                <span>{message.lens}</span>
              </button>

              {/* Lens override dropdown */}
              {showLensMenu && (
                <div className="absolute left-0 top-full mt-1 z-30 w-64 bg-[var(--surface-1)] border border-[var(--border)] rounded-[8px] p-1.5 shadow-lg space-y-1">
                  <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
                    Override Intelligence Lens
                  </div>
                  {ALL_LENSES.map((lens) => (
                    <button
                      key={lens}
                      onClick={() => {
                        setShowLensMenu(false);
                        onRegenerate?.(lens);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-[4px] text-xs transition-colors ${
                        message.lens === lens
                          ? 'bg-[var(--surface-2)] text-[var(--signature-magenta)] font-medium'
                          : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <div className="font-medium">{lens}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        {LENS_DESCRIPTIONS[lens]}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unboxed Metadata metrics */}
          {message.usage && (
            <div className="ml-2.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
              <span>{message.usage.ms_first_token}ms TTFT</span>
              <span aria-hidden="true">·</span>
              <span>{message.usage.tokens_out} tokens</span>
              {message.usage.cached_tokens > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-500 font-medium">
                    {message.usage.cached_tokens} cached
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Branch Navigation for Assistant Messages */}
        {totalBranches > 1 && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)]">
            <button
              onClick={() => onSelectBranch?.(branchIndex - 1)}
              disabled={branchIndex <= 1}
              className="p-0.5 hover:text-[var(--text)] disabled:opacity-30"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span>
              {branchIndex} / {totalBranches}
            </span>
            <button
              onClick={() => onSelectBranch?.(branchIndex + 1)}
              disabled={branchIndex >= totalBranches}
              className="p-0.5 hover:text-[var(--text)] disabled:opacity-30"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="relative pl-0">
        <MarkdownRenderer
          content={message.content}
          onOpenArtifact={(art) => {
            onOpenArtifact?.({
              id: `art_${Date.now()}`,
              ...art,
            });
          }}
        />

        {/* Artifacts pills/affordances attached to message */}
        {message.artifacts && message.artifacts.length > 0 && (
          <div className="mt-3 pt-2 border-t border-[var(--border)] flex flex-wrap gap-2">
            {message.artifacts.map((art) => (
              <button
                key={art.id}
                onClick={() =>
                  onOpenArtifact?.({
                    id: art.id,
                    type: art.type,
                    title: art.title,
                    language: art.language,
                    content: art.content || '',
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[var(--surface-2)] hover:bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--signature-magenta)] text-xs text-[var(--text)] transition-colors focus-visible:outline-none"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[var(--signature-magenta)]" />
                <span className="font-medium">{art.title}</span>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">
                  [{art.type}]
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Bottom Actions Toolbar */}
        {!isStreaming && (
          <div className="flex items-center gap-3 pt-2 text-[11px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-[var(--text)] transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => onRegenerate?.()}
              className="flex items-center gap-1 hover:text-[var(--text)] transition-colors"
              title="Regenerate response"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Regenerate</span>
            </button>

            <div className="flex items-center gap-1 pl-2 border-l border-[var(--border)]">
              <button
                onClick={() => onFeedback?.('positive')}
                className={`p-1 hover:text-emerald-400 transition-colors ${
                  message.feedback?.rating === 'positive' ? 'text-emerald-500' : ''
                }`}
                title="Good response"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => onFeedback?.('negative')}
                className={`p-1 hover:text-amber-400 transition-colors ${
                  message.feedback?.rating === 'negative' ? 'text-amber-500' : ''
                }`}
                title="Report issue or wrong lens"
              >
                <ThumbsDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
