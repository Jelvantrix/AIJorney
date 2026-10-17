import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowUp,
  Square,
  Plus,
  Paperclip,
  Mic,
  MicOff,
  Sparkles,
  Command,
  X,
  FileCode,
  FileText,
  Zap,
  Brain,
  Code2,
  Feather,
  FileSpreadsheet,
  Terminal,
} from 'lucide-react';
import { useChatStore, AttachmentItem } from '../lib/store.ts';

const SLASH_COMMANDS = [
  { cmd: '/code', label: 'Write Code', desc: 'Generate strict production-grade implementation' },
  { cmd: '/explain', label: 'Explain Concept', desc: 'Deconstruct into first principles and trade-offs' },
  { cmd: '/refactor', label: 'Refactor Architecture', desc: 'Optimize performance, memory & readability' },
  { cmd: '/summarize', label: 'Executive Summary', desc: 'Distill into bulleted high-density takeaways' },
  { cmd: '/verify', label: 'Verify Invariants', desc: 'Edge cases, security flaws & boundary conditions' },
];

export const ModernComposer: React.FC<{ className?: string }> = ({ className = '' }) => {
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
    selectedLens,
    setLens,
    isVoiceMode,
    setVoiceMode,
  } = useChatStore();

  const convId = activeId || 'default';
  const text = drafts[convId] || '';
  const attachments = draftAttachments[convId] || [];

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [streamTimer, setStreamTimer] = useState(0);

  // Auto-grow textarea up to 8 rows (~180px)
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    const newHeight = Math.min(180, Math.max(26, textareaRef.current.scrollHeight));
    textareaRef.current.style.height = `${newHeight}px`;
  }, [text]);

  // Streaming timer
  useEffect(() => {
    let interval: any;
    if (isStreaming) {
      setStreamTimer(0);
      interval = setInterval(() => {
        setStreamTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setStreamTimer(0);
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Voice recording simulation
  useEffect(() => {
    let timeout: any;
    if (isRecording) {
      timeout = setTimeout(() => {
        setDraft(convId, (text ? text + ' ' : '') + 'How do I optimize system throughput under high concurrency?');
        setIsRecording(false);
      }, 3500);
    }
    return () => clearTimeout(timeout);
  }, [isRecording]);

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
    setSlashMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = SLASH_COMMANDS[slashIndex];
        setDraft(convId, selected.cmd + ' ');
        setSlashMenuOpen(false);
        return;
      }
      if (e.key === 'Escape') {
        setSlashMenuOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraft(convId, val);

    // Slash command trigger
    if (val.startsWith('/')) {
      setSlashMenuOpen(true);
    } else {
      setSlashMenuOpen(false);
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

  const hasContent = text.trim().length > 0 || attachments.length > 0;

  return (
    <div className={`relative w-full max-w-[860px] mx-auto px-3 sm:px-6 ${className}`}>
      {/* Slash Commands Popover */}
      {slashMenuOpen && (
        <div className="absolute left-6 right-6 bottom-full mb-3 p-2 rounded-2xl glass-panel shadow-2xl border border-[var(--border)] z-40 animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Slash Directives</span>
          </div>
          <div className="space-y-1">
            {SLASH_COMMANDS.map((item, idx) => (
              <button
                key={item.cmd}
                onClick={() => {
                  setDraft(convId, item.cmd + ' ');
                  setSlashMenuOpen(false);
                  textareaRef.current?.focus();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                  idx === slashIndex
                    ? 'bg-[var(--surface-active)] text-[var(--text)]'
                    : 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-bold text-[var(--accent)]">{item.cmd}</span>
                  <span className="text-[13px] font-medium text-[var(--text)]">{item.label}</span>
                </div>
                <span className="text-[11px] text-[var(--muted)] hidden sm:inline">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Aura Glass Capsule */}
      <div className="relative rounded-[26px] glass-card composer-aura-halo p-3 sm:p-3.5 transition-all duration-300">
        {/* Attachment Chips */}
        {attachments.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2 px-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="h-10 px-3 rounded-xl bg-[var(--surface)] flex items-center gap-2 text-[12.5px] text-[var(--text)] border border-[var(--border)] shadow-xs animate-in zoom-in-95 duration-150"
              >
                <FileCode className="w-4 h-4 text-[var(--accent)]" />
                <span className="truncate max-w-[160px] font-medium">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeDraftAttachment(convId, att.id)}
                  className="p-1 text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Textarea Area */}
        <div className="flex items-end gap-2.5 px-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? 'Listening to speech waveform...'
                : 'Message Noevix... (Type / for commands)'
            }
            rows={1}
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[var(--text)] placeholder-[var(--muted)] focus:outline-none transition-all py-1 min-h-[30px]"
            style={{ caretColor: 'var(--accent)' }}
          />

          {/* Voice Waveform Animation when Recording */}
          {isRecording && (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)] text-[var(--accent)] text-xs font-semibold animate-pulse">
              <span className="w-1.5 h-3 rounded-full bg-[var(--accent)] animate-bounce" />
              <span className="w-1.5 h-5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-2 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.3s]" />
              <span className="w-1.5 h-4 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.45s]" />
              <span className="ml-1 text-[11px]">Recording</span>
            </div>
          )}
        </div>

        {/* Lower Toolbar Bar: Controls + Send Orb */}
        <div className="mt-2.5 pt-2 border-t border-[var(--border)]/40 flex items-center justify-between px-1">
          {/* Left tools: Attach file, Mic dictate, Quick Lens indicator */}
          <div className="flex items-center gap-1.5">
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
              className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
              title="Attach context files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={() => setIsRecording(!isRecording)}
              className={`p-2 rounded-xl transition-all duration-150 ${
                isRecording
                  ? 'bg-[var(--accent)] text-white shadow-[0_0_12px_var(--aura-1)] animate-pulse'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
              title={isRecording ? 'Stop Recording' : 'Voice Dictate'}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Lens Badge in Composer */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[11.5px] font-medium text-[var(--muted)]">
              <Sparkles className="w-3 h-3 text-[var(--accent)]" />
              <span className="capitalize">{selectedLens} Lens</span>
            </div>
          </div>

          {/* Right: Send / Stop Kinetic Orb */}
          <div className="flex items-center gap-2">
            {isStreaming && (
              <span className="text-[12px] font-mono text-[var(--muted)]">
                {streamTimer}s
              </span>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={!hasContent && !isStreaming}
              className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${
                isStreaming
                  ? 'bg-[var(--surface-active)] text-[var(--text)] border border-[var(--accent)] shadow-[0_0_15px_var(--aura-1)] hover:scale-105'
                  : hasContent
                  ? 'bg-gradient-to-tr from-[var(--accent)] to-[var(--aura-2)] text-white shadow-[0_0_20px_var(--accent)] hover:scale-105 active:scale-95'
                  : 'bg-[var(--surface)] text-[var(--muted)] cursor-not-allowed opacity-60'
              }`}
              title={isStreaming ? 'Stop Generation' : 'Transmit Message'}
            >
              {isStreaming ? (
                <Square className="w-4 h-4 fill-current text-[var(--accent)]" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modern micro-footer tag */}
      <div className="mt-2 text-center text-[11px] text-[var(--muted)] select-none">
        Noevix Multi-Lens AI · Autonomous Real-Time Orchestration
      </div>
    </div>
  );
};
