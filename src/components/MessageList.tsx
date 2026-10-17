import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useChatStore, ChatMessage } from '../lib/store.ts';
import { UserMessage } from './UserMessage.tsx';
import { AssistantMessage } from './AssistantMessage.tsx';
import { ArrowDown } from 'lucide-react';

export const MessageList: React.FC = () => {
  const {
    activeId,
    messages,
    isStreaming,
    isThinking,
    streamingText,
    streamingError,
    editUserMessage,
    regenerateAssistantMessage,
    setBranchVersion,
  } = useChatStore();

  const activeMessages = (activeId && messages[activeId]) || [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isNearBottomRef = useRef(true);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Monitor user scroll position (within 80px of bottom)
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const nearBottom = distanceFromBottom <= 80;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottom(!nearBottom);
  };

  // Auto-follow while streaming only if user is within 80px
  useEffect(() => {
    if (isStreaming && isNearBottomRef.current) {
      scrollToBottom(false);
    }
  }, [streamingText, isThinking, isStreaming, scrollToBottom]);

  // Initial scroll to bottom on conversation switch
  useEffect(() => {
    isNearBottomRef.current = true;
    scrollToBottom(false);
  }, [activeId, scrollToBottom]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="w-full max-w-[768px] mx-auto px-4 md:px-6 pt-6 pb-[160px] flex flex-col gap-[32px]">
        {activeMessages.map((msg: ChatMessage, index: number) => {
          const isLatest = index === activeMessages.length - 1 && !isStreaming;

          if (msg.role === 'user') {
            return (
              <UserMessage
                key={msg.id}
                message={msg}
                onEdit={(newContent) => editUserMessage(msg.id, newContent)}
                onSelectVersion={(newIdx) => setBranchVersion(msg.id, newIdx)}
              />
            );
          }

          return (
            <AssistantMessage
              key={msg.id}
              message={msg}
              onRegenerate={() => regenerateAssistantMessage(msg.id)}
              onSelectVersion={(newIdx) => setBranchVersion(msg.id, newIdx)}
              isLatest={isLatest}
            />
          );
        })}

        {/* Live streaming message row */}
        {isStreaming && (
          <AssistantMessage
            isStreaming={true}
            isThinking={isThinking}
            streamingText={streamingText}
            streamingError={streamingError}
            onRegenerate={() => {
              if (activeMessages.length > 0) {
                const last = activeMessages[activeMessages.length - 1];
                if (last.role === 'assistant') {
                  regenerateAssistantMessage(last.id);
                }
              }
            }}
          />
        )}
      </div>

      {/* Floating scroll to bottom button (36px circle, var(--surface), 1px border) */}
      {showScrollBottom && (
        <div className="sticky bottom-[120px] flex justify-center pointer-events-none z-20">
          <button
            onClick={() => {
              scrollToBottom(true);
              setShowScrollBottom(false);
              isNearBottomRef.current = true;
            }}
            className="pointer-events-auto w-[36px] h-[36px] rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center shadow-sm hover:bg-[var(--surface-hover)] transition-all duration-150"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
