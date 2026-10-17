import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AssistantActionsProps {
  content: string;
  onRegenerate: () => void;
  versions?: string[];
  versionIndex?: number;
  onSelectVersion?: (idx: number) => void;
  isLatest?: boolean;
}

export const AssistantActions: React.FC<AssistantActionsProps> = ({
  content,
  onRegenerate,
  versions,
  versionIndex = 0,
  onSelectVersion,
  isLatest = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasMultipleVersions = versions && versions.length > 1;

  return (
    <div
      className={`mt-2 flex items-center gap-1 transition-opacity duration-150 ${
        isLatest ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
      }`}
    >
      {/* Branch navigation if multiple versions */}
      {hasMultipleVersions && onSelectVersion && (
        <div className="flex items-center gap-0.5 mr-2 text-[12px] font-mono text-[var(--muted)] select-none">
          <button
            onClick={() => onSelectVersion(Math.max(0, versionIndex - 1))}
            disabled={versionIndex <= 0}
            className="w-[20px] h-[20px] flex items-center justify-center rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:pointer-events-none text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            title="Previous version"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>
            {versionIndex + 1}/{versions.length}
          </span>
          <button
            onClick={() => onSelectVersion(Math.min(versions.length - 1, versionIndex + 1))}
            disabled={versionIndex >= versions.length - 1}
            className="w-[20px] h-[20px] flex items-center justify-center rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:pointer-events-none text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            title="Next version"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
        title="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-[var(--text)]" /> : <Copy className="w-4 h-4" />}
      </button>

      {/* Thumbs up */}
      <button
        onClick={() => setRating(rating === 'up' ? null : 'up')}
        className={`w-[28px] h-[28px] flex items-center justify-center rounded-[6px] transition-colors duration-150 ${
          rating === 'up'
            ? 'text-[var(--text)] bg-[var(--surface-hover)]'
            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
        }`}
        title="Good response"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>

      {/* Thumbs down */}
      <button
        onClick={() => setRating(rating === 'down' ? null : 'down')}
        className={`w-[28px] h-[28px] flex items-center justify-center rounded-[6px] transition-colors duration-150 ${
          rating === 'down'
            ? 'text-[var(--text)] bg-[var(--surface-hover)]'
            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
        }`}
        title="Bad response"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>

      {/* Regenerate */}
      <button
        onClick={onRegenerate}
        className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
        title="Regenerate reply"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
};

interface UserActionsProps {
  content: string;
  onEdit: () => void;
  versions?: string[];
  versionIndex?: number;
  onSelectVersion?: (idx: number) => void;
}

export const UserActions: React.FC<UserActionsProps> = ({
  content,
  onEdit,
  versions,
  versionIndex = 0,
  onSelectVersion,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasMultipleVersions = versions && versions.length > 1;

  return (
    <div className="mt-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
      {hasMultipleVersions && onSelectVersion && (
        <div className="flex items-center gap-0.5 mr-2 text-[12px] font-mono text-[var(--muted)] select-none">
          <button
            onClick={() => onSelectVersion(Math.max(0, versionIndex - 1))}
            disabled={versionIndex <= 0}
            className="w-[20px] h-[20px] flex items-center justify-center rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:pointer-events-none text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            title="Previous version"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>
            {versionIndex + 1}/{versions.length}
          </span>
          <button
            onClick={() => onSelectVersion(Math.min(versions.length - 1, versionIndex + 1))}
            disabled={versionIndex >= versions.length - 1}
            className="w-[20px] h-[20px] flex items-center justify-center rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:pointer-events-none text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            title="Next version"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
        title="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-[var(--text)]" /> : <Copy className="w-4 h-4" />}
      </button>

      {/* Edit */}
      <button
        onClick={onEdit}
        className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
        title="Edit message"
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  );
};
