import React, { useState } from 'react';
import { ChatMessage } from '../lib/store.ts';
import { UserActions } from './MessageActions.tsx';
import { FileText } from 'lucide-react';

interface UserMessageProps {
  message: ChatMessage;
  onEdit: (newContent: string) => void;
  onSelectVersion: (idx: number) => void;
}

export const UserMessage: React.FC<UserMessageProps> = ({
  message,
  onEdit,
  onSelectVersion,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(message.content);

  const handleSendEdit = () => {
    const trimmed = draftContent.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(trimmed);
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setDraftContent(message.content);
    }
  };

  return (
    <div
      className={`group flex flex-col items-end w-full ${
        message.isNew ? 'animate-in fade-in-0 duration-200 ease-out' : ''
      }`}
    >
      {/* Inline editor or User bubble */}
      {isEditing ? (
        <div className="w-full max-w-[80%] md:max-w-[70%] bg-[var(--user-bubble)] rounded-[22px] p-4 text-[16px]">
          <textarea
            autoFocus
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={Math.min(6, Math.max(2, draftContent.split('\n').length))}
            className="w-full bg-transparent resize-none focus:outline-none text-[16px] leading-[1.65] text-[var(--text)] caret-[var(--accent)]"
          />
          <div className="mt-3 flex items-center justify-end gap-2 text-[14px]">
            <button
              onClick={() => {
                setIsEditing(false);
                setDraftContent(message.content);
              }}
              className="px-3 py-1.5 rounded-[8px] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEdit}
              className="px-4 py-1.5 rounded-[8px] bg-[var(--text)] text-[var(--bg)] font-medium hover:opacity-90 transition-opacity duration-150"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="max-w-[88%] md:max-w-[80%] rounded-[22px] bg-[var(--user-bubble)] px-4 py-2.5 text-[16px] leading-[1.65] text-[var(--text)] select-text">
            {/* Attached file chips */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {message.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-[var(--surface)] text-[12px] text-[var(--muted)]"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[140px]">{att.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>

          {/* Hover actions below bubble */}
          <UserActions
            content={message.content}
            onEdit={() => setIsEditing(true)}
            versions={message.versions}
            versionIndex={message.version_index}
            onSelectVersion={onSelectVersion}
          />
        </>
      )}
    </div>
  );
};
