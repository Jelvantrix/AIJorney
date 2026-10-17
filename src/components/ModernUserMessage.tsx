import React, { useState } from 'react';
import { ChatMessage, useChatStore } from '../lib/store.ts';
import { Pencil, Copy, Check, ChevronLeft, ChevronRight, CornerDownLeft, X, FileCode } from 'lucide-react';

interface ModernUserMessageProps {
  message: ChatMessage;
  onEdit: (newContent: string) => void;
  onSelectVersion: (index: number) => void;
}

export const ModernUserMessage: React.FC<ModernUserMessageProps> = ({
  message,
  onEdit,
  onSelectVersion,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [copied, setCopied] = useState(false);

  const versions = message.versions || [message.content];
  const versionIndex = message.version_index ?? versions.length - 1;
  const hasMultipleVersions = versions.length > 1;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.content) {
      onEdit(editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="group w-full flex flex-col items-end my-4 animate-in fade-in-0 duration-200">
      {isEditing ? (
        <div className="w-full max-w-[85%] sm:max-w-[75%] rounded-2xl glass-card border border-[var(--accent)] p-3 shadow-xl">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full bg-transparent text-[15px] leading-relaxed text-[var(--text)] focus:outline-none resize-none"
            autoFocus
          />
          <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditText(message.content);
              }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--accent)] text-white shadow-[0_0_10px_var(--aura-1)] hover:opacity-95 transition-opacity"
            >
              Update & Send
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[78%]">
          {/* User message capsule with ambient glass aura */}
          <div className="relative rounded-[22px] rounded-tr-[6px] px-4 py-3 glass-card border border-white/20 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] shadow-md hover:shadow-lg transition-all">
            {/* Attachment Chips */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {message.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface)] text-[12px] text-[var(--text)] border border-[var(--border)]"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span className="truncate max-w-[130px] font-medium">{att.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[15px] leading-relaxed text-[var(--text)] whitespace-pre-wrap select-text">
              {message.content}
            </div>
          </div>

          {/* Action Row & Branching */}
          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {/* Branch Navigator */}
            {hasMultipleVersions && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border)]">
                <button
                  disabled={versionIndex <= 0}
                  onClick={() => onSelectVersion(versionIndex - 1)}
                  className="p-0.5 rounded hover:text-[var(--text)] disabled:opacity-30 disabled:pointer-events-none"
                  title="Previous version"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="font-mono text-[11px]">
                  {versionIndex + 1}/{versions.length}
                </span>
                <button
                  disabled={versionIndex >= versions.length - 1}
                  onClick={() => onSelectVersion(versionIndex + 1)}
                  className="p-0.5 rounded hover:text-[var(--text)] disabled:opacity-30 disabled:pointer-events-none"
                  title="Next version"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}

            <button
              onClick={handleCopy}
              className="p-1 rounded-md hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
              title="Copy prompt"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setIsEditing(true)}
              className="p-1 rounded-md hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
              title="Edit message"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
