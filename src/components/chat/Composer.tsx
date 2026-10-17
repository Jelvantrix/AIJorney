import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Paperclip,
  X,
  FileText,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { PublicLens, Attachment, LENS_DESCRIPTIONS } from '../../../packages/contracts/index.ts';

interface ComposerProps {
  onSend: (text: string, attachments: Attachment[], lensOverride?: PublicLens) => void;
  onStop: () => void;
  isStreaming: boolean;
  selectedLens: PublicLens | null;
  onSelectLens: (lens: PublicLens | null) => void;
  onOpenEvals?: () => void;
  onClearChat?: () => void;
}

const ALL_LENSES: PublicLens[] = [
  'Engineering',
  'Design',
  'Research',
  'Reasoning',
  'Writing',
];

export const Composer: React.FC<ComposerProps> = ({
  onSend,
  onStop,
  isStreaming,
  selectedLens,
  onSelectLens,
  onOpenEvals,
  onClearChat,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showLensDropdown, setShowLensDropdown] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollH, 200)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Slash command trigger
    if (val.startsWith('/')) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSend = () => {
    if (isStreaming) {
      onStop();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    // Handle slash commands directly
    if (trimmed.startsWith('/clear')) {
      onClearChat?.();
      setText('');
      setShowSlashMenu(false);
      return;
    }
    if (trimmed.startsWith('/eval')) {
      onOpenEvals?.();
      setText('');
      setShowSlashMenu(false);
      return;
    }
    if (trimmed.startsWith('/lens')) {
      const parts = trimmed.split(' ');
      if (parts[1]) {
        const found = ALL_LENSES.find(
          (l) => l.toLowerCase() === parts[1].toLowerCase()
        );
        if (found) {
          onSelectLens(found);
          setText('');
          setShowSlashMenu(false);
          return;
        }
      }
    }

    onSend(trimmed, attachments, selectedLens || undefined);
    setText('');
    setAttachments([]);
    setShowSlashMenu(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 2 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 2MB limit.`);
        continue;
      }

      try {
        const textContent = await file.text();
        const resp = await fetch('/v1/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            content: textContent,
            type: file.type || 'text/plain',
          }),
        });

        if (resp.ok) {
          const doc = await resp.json();
          setAttachments((prev) => [
            ...prev,
            {
              id: doc.id,
              name: file.name,
              size: file.size,
              type: file.type || 'text/plain',
              content: textContent,
            },
          ]);
        }
      } catch (err) {
        console.error('File upload error:', err);
      }
    }
    setIsUploading(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="relative w-full max-w-[760px] mx-auto px-4 pb-4">
      {/* Slash command popover */}
      {showSlashMenu && (
        <div className="absolute bottom-full mb-2 left-4 z-30 w-72 bg-[var(--surface-1)] border border-[var(--border)] rounded-[8px] p-1.5 shadow-xl text-xs space-y-1">
          <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
            Quick Slash Commands
          </div>
          <button
            onClick={() => {
              setText('/lens Engineering');
              setShowSlashMenu(false);
            }}
            className="w-full text-left px-2 py-1 rounded hover:bg-[var(--surface-2)] text-[var(--text)] flex justify-between"
          >
            <span>/lens &lt;name&gt;</span>
            <span className="text-[10px] text-[var(--text-muted)]">Set lens override</span>
          </button>
          <button
            onClick={() => {
              onClearChat?.();
              setText('');
              setShowSlashMenu(false);
            }}
            className="w-full text-left px-2 py-1 rounded hover:bg-[var(--surface-2)] text-[var(--text)] flex justify-between"
          >
            <span>/clear</span>
            <span className="text-[10px] text-[var(--text-muted)]">Clear conversation</span>
          </button>
          <button
            onClick={() => {
              onOpenEvals?.();
              setText('');
              setShowSlashMenu(false);
            }}
            className="w-full text-left px-2 py-1 rounded hover:bg-[var(--surface-2)] text-[var(--text)] flex justify-between"
          >
            <span>/eval</span>
            <span className="text-[10px] text-[var(--text-muted)]">Open Evals Harness</span>
          </button>
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative rounded-[10px] bg-[var(--surface-1)] border border-[var(--border)] focus-within:border-[var(--signature-magenta)] transition-colors shadow-xs">
        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 text-xs px-2 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-[4px] text-[var(--text)]"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--signature-magenta)]" />
                <span className="truncate max-w-[140px]">{att.name}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="hover:text-red-400 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask Noevix or type / for commands..."
          rows={1}
          className="w-full px-3.5 pt-3 pb-2 text-[14px] bg-transparent text-[var(--text)] placeholder-[var(--text-muted)] resize-none focus:outline-none leading-relaxed"
        />

        {/* Composer Toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            {/* File upload trigger */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileSelect(e.target.files)}
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 rounded-[4px] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
              title="Attach document or code file for retrieval"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Lens Override Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLensDropdown(!showLensDropdown)}
                className={`flex items-center gap-1 px-2 py-1 rounded-[4px] border transition-colors ${
                  selectedLens
                    ? 'bg-[var(--signature-magenta)]/10 text-[var(--signature-magenta-text)] border-[var(--signature-magenta)]/40 font-medium'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border-[var(--border)]'
                }`}
              >
                <span>{selectedLens ? selectedLens : 'Adaptive Route'}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {showLensDropdown && (
                <div className="absolute left-0 bottom-full mb-1 z-30 w-56 bg-[var(--surface-1)] border border-[var(--border)] rounded-[8px] p-1.5 shadow-xl space-y-1">
                  <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)]">
                    Preset Lens
                  </div>
                  <button
                    onClick={() => {
                      onSelectLens(null);
                      setShowLensDropdown(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-[4px] text-xs transition-colors ${
                      !selectedLens
                        ? 'bg-[var(--surface-2)] text-[var(--signature-magenta)] font-medium'
                        : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    Adaptive (Autonomous Router)
                  </button>
                  {ALL_LENSES.map((lens) => (
                    <button
                      key={lens}
                      onClick={() => {
                        onSelectLens(lens);
                        setShowLensDropdown(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-[4px] text-xs transition-colors ${
                        selectedLens === lens
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
          </div>

          {/* Action button: Send or Stop */}
          <div>
            {isStreaming ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-[6px] font-medium text-xs transition-colors shadow-xs"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!text.trim() && attachments.length === 0}
                className={`p-1.5 rounded-[6px] transition-colors ${
                  text.trim() || attachments.length > 0
                    ? 'bg-[var(--signature-magenta)] text-white hover:opacity-90 shadow-xs'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                }`}
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Signature 2px Magenta Streaming Line directly beneath composer */}
      <div className="h-[2px] w-full mt-1 overflow-hidden rounded-full">
        {isStreaming && (
          <div className="h-full w-full bg-[var(--signature-magenta)] animate-streaming-line" />
        )}
      </div>
    </div>
  );
};
