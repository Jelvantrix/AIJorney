import React, { useState } from 'react';
import { X, ThumbsDown } from 'lucide-react';
import { PublicLens } from '../../../packages/contracts/index.ts';

interface FeedbackModalProps {
  messageId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { message_id: string; rating: 'negative'; correct_lens?: PublicLens; comment?: string }) => void;
}

const ALL_LENSES: PublicLens[] = [
  'Engineering',
  'Design',
  'Research',
  'Reasoning',
  'Writing',
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  messageId,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [correctLens, setCorrectLens] = useState<PublicLens | ''>('');
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      message_id: messageId,
      rating: 'negative',
      correct_lens: correctLens ? (correctLens as PublicLens) : undefined,
      comment: comment.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border)] rounded-[14px] p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-[var(--text)]">Provide Feedback</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-muted)] mb-1 font-medium">
              Did Noevix use the wrong lens? (Optional)
            </label>
            <select
              value={correctLens}
              onChange={(e) => setCorrectLens(e.target.value as any)}
              className="w-full p-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-[6px] text-[var(--text)] focus:outline-none focus:border-[var(--signature-magenta)]"
            >
              <option value="">No / Keep current lens</option>
              {ALL_LENSES.map((l) => (
                <option key={l} value={l}>
                  Should be {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[var(--text-muted)] mb-1 font-medium">
              What went wrong or broke?
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Unhandled boundary case in code, incorrect citation, or verbose rationale..."
              rows={3}
              className="w-full p-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-[6px] text-[var(--text)] focus:outline-none focus:border-[var(--signature-magenta)] placeholder-[var(--text-muted)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-[6px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[var(--signature-magenta)] text-white rounded-[6px] font-medium"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
