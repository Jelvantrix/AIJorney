import React, { useRef, useEffect, useState } from 'react';
import { Plus, ArrowUp, Square, X, FileText } from 'lucide-react';
import { useChatStore, AttachmentItem } from '../lib/store.ts';

interface ComposerProps {
  className?: string;
}

export const Composer: React.FC<ComposerProps> = ({ className = '' }) => {
  const {
    activeId,
    drafts,
    draftAttachments,
    setDraft,
    addDraftAttachment,
    removeDraftAttachment,
    sendMessage,
    stopStreaming,
    isStreaming,
  } = useChatStore();

  const convId = activeId || 'default';
  const text = drafts[convId] || '';
  const attachments = draftAttachments[convId] || [];

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea up to 8 rows (~192px)
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    const newHeight = Math.min(192, Math.max(26, textareaRef.current.scrollHeight));
    textareaRef.current.style.height = `${newHeight}px`;
  }, [text]);

  // Global '/' shortcut focuses the composer when not typing in an input
  useEffect(() => {
    const handleGlobalSlash = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalSlash);
    return () => window.removeEventListener('keydown', handleGlobalSlash);
  }, []);

  const handleSend = () => {
    if (isStreaming) {
      stopStreaming();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    sendMessage(trimmed, attachments);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      textareaRef.current?.blur();
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const item: AttachmentItem = {
        id: 'att_' + Date.now() + '_' + i,
        name: file.name,
        size: file.size,
        type: file.type || 'text/plain',
      };
      addDraftAttachment(convId, item);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          const item: AttachmentItem = {
            id: 'att_paste_' + Date.now() + '_' + i,
            name: file.name || 'Pasted image',
            size: file.size,
            type: file.type || 'image/png',
          };
          addDraftAttachment(convId, item);
        }
      }
    }
  };

  const hasContent = text.trim().length > 0 || attachments.length > 0;

  return (
    <div className={`w-full max-w-[768px] mx-auto px-4 md:px-0 ${className}`}>
      {/* Container: 28px radius, border, surface bg */}
      <div className="relative rounded-[28px] bg-[var(--surface)] border border-[var(--border)] p-[12px_12px_12px_20px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none focus-within:border-[var(--muted)]/40 transition-colors duration-150">
        {/* Attachment chips above textarea */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="h-[44px] px-3 rounded-[12px] bg-[var(--user-bubble)] flex items-center gap-2 text-[13px] text-[var(--text)] border border-[var(--border)]"
              >
                <FileText className="w-4 h-4 text-[var(--muted)]" />
                <span className="truncate max-w-[160px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeDraftAttachment(convId, att.id)}
                  className="p-1 text-[var(--muted)] hover:text-[var(--text)] rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea and Action row */}
        <div className="flex items-end gap-2">
          {/* File input trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-[36px] h-[36px] shrink-0 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
            title="Attach file"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setDraft(convId, e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Message Noevix"
            rows={1}
            className="flex-1 bg-transparent border-0 outline-none text-[16px] leading-[1.65] text-[var(--text)] placeholder-[var(--muted)] caret-[var(--accent)] resize-none max-h-[192px] overflow-y-auto py-1"
          />

          {/* Send / Stop button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={handleSend}
              className="w-[36px] h-[36px] shrink-0 rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center hover:opacity-90 transition-opacity duration-150 shadow-sm"
              title="Stop streaming"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!hasContent}
              className={`w-[36px] h-[36px] shrink-0 rounded-full flex items-center justify-center transition-all duration-150 ${
                hasContent
                  ? 'bg-[var(--accent)] text-white hover:opacity-90 shadow-sm'
                  : 'bg-[var(--surface-hover)] text-[var(--muted)] cursor-not-allowed opacity-60'
              }`}
              title="Send message (Enter)"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Centered disclaimer text */}
      <div className="mt-2 text-center text-[12px] text-[var(--muted)] select-none">
        Noevix can make mistakes. Check important info.
      </div>
    </div>
  );
};
