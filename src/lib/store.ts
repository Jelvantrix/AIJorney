import { create } from 'zustand';
import { streamMockResponse } from './mockStream.ts';

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  parent_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
  versions?: string[];       // alternative contents for regenerated or edited messages
  version_index?: number;    // 0-indexed current displayed version
  attachments?: AttachmentItem[];
  isNew?: boolean;           // true only for newly animated messages
}

export interface ConversationItem {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

interface ChatState {
  conversations: ConversationItem[];
  activeId: string | null;
  messages: Record<string, ChatMessage[]>; // conversation_id -> ChatMessage[]
  drafts: Record<string, string>;
  draftAttachments: Record<string, AttachmentItem[]>;
  isSidebarOpen: boolean; // on desktop (true = open, false = collapsed). on mobile, controls drawer overlay.
  isStreaming: boolean;
  isThinking: boolean;
  streamingMessageId: string | null;
  streamingText: string;
  streamingError: string | null;
  abortController: AbortController | null;
  isCommandPaletteOpen: boolean;

  // Modern Multi-Lens & Aura Lighting System
  selectedLens: 'neural' | 'reason' | 'code' | 'creative' | 'executive';
  auraTheme: 'cosmic' | 'cyber' | 'emerald' | 'solar' | 'minimal';
  auraIntensity: 'subtle' | 'radiant' | 'hyper';
  isArtifactsOpen: boolean;
  activeArtifact: { id: string; title: string; language?: string; content: string; type: 'code' | 'document' | 'preview' } | null;
  isVoiceMode: boolean;
  railCollapsed: boolean;

  // Actions
  setActiveConversation: (id: string) => void;
  newChat: () => string;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, newTitle: string) => void;
  setDraft: (convId: string, text: string) => void;
  addDraftAttachment: (convId: string, item: AttachmentItem) => void;
  removeDraftAttachment: (convId: string, itemId: string) => void;
  clearDraft: (convId: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;

  setLens: (lens: 'neural' | 'reason' | 'code' | 'creative' | 'executive') => void;
  setAuraTheme: (theme: 'cosmic' | 'cyber' | 'emerald' | 'solar' | 'minimal') => void;
  setAuraIntensity: (intensity: 'subtle' | 'radiant' | 'hyper') => void;
  toggleArtifacts: () => void;
  setArtifactsOpen: (open: boolean) => void;
  setActiveArtifact: (art: { id: string; title: string; language?: string; content: string; type: 'code' | 'document' | 'preview' } | null) => void;
  setVoiceMode: (v: boolean) => void;
  toggleRailCollapsed: () => void;

  sendMessage: (text: string, attachments?: AttachmentItem[]) => Promise<void>;
  editUserMessage: (messageId: string, newContent: string) => Promise<void>;
  regenerateAssistantMessage: (assistantMessageId: string) => Promise<void>;
  setBranchVersion: (messageId: string, newIndex: number) => void;
  stopStreaming: () => void;
}

const STORAGE_KEY_CONVS = 'noevix_conversations_v2';
const STORAGE_KEY_MSGS = 'noevix_messages_v2';

// Realistic sample seed data
const SEED_CONVERSATIONS: ConversationItem[] = [
  {
    id: 'seed_conv_1',
    title: 'TypeScript Rate Limiter Implementation',
    created_at: Date.now() - 3600000 * 2,
    updated_at: Date.now() - 3600000 * 2,
  },
  {
    id: 'seed_conv_2',
    title: 'PostgreSQL vs DynamoDB Trade-offs',
    created_at: Date.now() - 3600000 * 26,
    updated_at: Date.now() - 3600000 * 26,
  },
  {
    id: 'seed_conv_3',
    title: 'Speculative Execution Principles',
    created_at: Date.now() - 3600000 * 72,
    updated_at: Date.now() - 3600000 * 72,
  },
];

const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  seed_conv_1: [
    {
      id: 'msg_1_u',
      conversation_id: 'seed_conv_1',
      parent_id: null,
      role: 'user',
      content: 'How do I implement an in-memory token bucket rate limiter in TypeScript with window refill?',
      created_at: Date.now() - 3600000 * 2 - 30000,
    },
    {
      id: 'msg_1_a',
      conversation_id: 'seed_conv_1',
      parent_id: 'msg_1_u',
      role: 'assistant',
      content: `Here is a production-grade in-memory token bucket rate limiter in TypeScript. It computes refill deltas on demand using elapsed monotonic timestamps, avoiding background timer drift.

\`\`\`typescript
export interface TokenBucketOptions {
  capacity: number;       // Maximum burst limit
  refillRatePerSec: number; // Tokens replenished per second
}

export class TokenBucket {
  private readonly capacity: number;
  private readonly refillRate: number;
  private tokens: number;
  private lastRefill: number;

  constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.tokens = options.capacity;
    this.refillRate = options.refillRatePerSec;
    this.lastRefill = Date.now();
  }

  public consume(tokensRequested = 1): boolean {
    this.refill();

    if (this.tokens >= tokensRequested) {
      this.tokens -= tokensRequested;
      return true;
    }

    return false;
  }

  public getRemainingTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
    this.lastRefill = now;
  }
}
\`\`\`

### Invariants & Operational Details
1. **O(1) Evaluation**: No loops or queues; cost is a single millisecond timestamp subtraction.
2. **Memory Footprint**: Exactly four 64-bit numbers per tracked subject.
3. **Multi-Node Deployment**: When running across multiple stateless containers, back this algorithm with an atomic Lua script in Redis.`,
      created_at: Date.now() - 3600000 * 2,
    },
  ],
  seed_conv_2: [
    {
      id: 'msg_2_u',
      conversation_id: 'seed_conv_2',
      parent_id: null,
      role: 'user',
      content: 'Can you compare PostgreSQL and DynamoDB for a transactional web app? Please include a table.',
      created_at: Date.now() - 3600000 * 26 - 30000,
    },
    {
      id: 'msg_2_a',
      conversation_id: 'seed_conv_2',
      parent_id: 'msg_2_u',
      role: 'assistant',
      content: `Here is a breakdown of architectural trade-offs between PostgreSQL and Amazon DynamoDB for transactional web workloads.

| Dimension | PostgreSQL | DynamoDB |
| :--- | :--- | :--- |
| **Primary Data Model** | Relational tables with strict typed schemas | Document / Key-Value store |
| **Transaction Scope** | Multi-table ACID across arbitrary foreign keys | Single-partition ACID / Opt-in 25-item TransactWrite |
| **Query Flexibility** | Rich SQL, window functions, full-text, joins | Single-table index design, exact partition key lookups |
| **Scaling Mechanism** | Vertical instance sizing + read replicas | Automatic horizontal hash partitioning |
| **Operational Effort** | Connection pooling (PgBouncer), VACUUM management | Fully managed serverless AWS infrastructure |
| **Cost Profile** | Predictable fixed hourly compute/storage instance cost | Variable pay-per-request or provisioned RCU/WCU |

### Recommendation
Start with PostgreSQL unless you know upfront that single-table write volume will consistently exceed 15,000 requests per second or dataset size will quickly outgrow a single multi-terabyte SSD.`,
      created_at: Date.now() - 3600000 * 26,
    },
  ],
  seed_conv_3: [
    {
      id: 'msg_3_u',
      conversation_id: 'seed_conv_3',
      parent_id: null,
      role: 'user',
      content: 'Explain how speculative execution works in computer systems in 3 clear points.',
      created_at: Date.now() - 3600000 * 72 - 30000,
    },
    {
      id: 'msg_3_a',
      conversation_id: 'seed_conv_3',
      parent_id: 'msg_3_u',
      role: 'assistant',
      content: `Speculative execution maximizes hardware throughput by computing probable outcomes before preceding conditions are known.

1. **Path Prediction**: The branch prediction unit estimates whether a conditional branch will be taken using dynamic history tables.
2. **Speculative Computation**: The core decodes and executes instructions along that predicted branch ahead of time, buffering the uncommitted results in a reorder buffer.
3. **Commit or Pipeline Flush**: Once the condition resolves, the CPU commits the speculative results to architectural state in zero extra latency if the prediction was right, or flushes the speculative pipeline immediately if mispredicted.

This same principle powers speculative decoding in modern LLM serving, where a small draft model predicts tokens for a large model to verify in parallel.`,
      created_at: Date.now() - 3600000 * 72,
    },
  ],
};

function loadStoredConversations(): ConversationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return SEED_CONVERSATIONS;
}

function loadStoredMessages(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MSGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return SEED_MESSAGES;
}

function saveStore(conversations: ConversationItem[], messages: Record<string, ChatMessage[]>) {
  try {
    localStorage.setItem(STORAGE_KEY_CONVS, JSON.stringify(conversations));
    localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(messages));
  } catch {}
}

export const useChatStore = create<ChatState>((set, get) => {
  const initialConvs = loadStoredConversations();
  const initialMsgs = loadStoredMessages();

  return {
    conversations: initialConvs,
    activeId: initialConvs[0]?.id || null,
    messages: initialMsgs,
    drafts: {},
    draftAttachments: {},
    isSidebarOpen: true,
    railCollapsed: false,
    selectedLens: 'neural',
    auraTheme: (localStorage.getItem('noevix_aura_theme') as any) || 'cosmic',
    auraIntensity: (localStorage.getItem('noevix_aura_intensity') as any) || 'radiant',
    isArtifactsOpen: false,
    activeArtifact: null,
    isVoiceMode: false,
    isStreaming: false,
    isThinking: false,
    streamingMessageId: null,
    streamingText: '',
    streamingError: null,
    abortController: null,
    isCommandPaletteOpen: false,

    setActiveConversation: (id: string) => {
      // Abort any ongoing stream if switching chats
      const current = get();
      if (current.isStreaming && current.abortController) {
        current.abortController.abort();
      }
      set({
        activeId: id,
        isStreaming: false,
        isThinking: false,
        streamingMessageId: null,
        streamingText: '',
        streamingError: null,
        abortController: null,
      });
    },

    newChat: () => {
      const id = 'conv_' + Date.now();
      const newConv: ConversationItem = {
        id,
        title: 'New conversation',
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      const updatedConvs = [newConv, ...get().conversations];
      const updatedMsgs = { ...get().messages, [id]: [] };

      saveStore(updatedConvs, updatedMsgs);
      set({
        conversations: updatedConvs,
        messages: updatedMsgs,
        activeId: id,
        isStreaming: false,
        isThinking: false,
        streamingMessageId: null,
        streamingText: '',
        streamingError: null,
        abortController: null,
      });
      return id;
    },

    deleteConversation: (id: string) => {
      const { conversations, messages, activeId } = get();
      const updatedConvs = conversations.filter((c) => c.id !== id);
      const updatedMsgs = { ...messages };
      delete updatedMsgs[id];

      let nextActive = activeId;
      if (activeId === id) {
        nextActive = updatedConvs[0]?.id || null;
      }

      saveStore(updatedConvs, updatedMsgs);
      set({
        conversations: updatedConvs,
        messages: updatedMsgs,
        activeId: nextActive,
      });
    },

    renameConversation: (id: string, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      const updatedConvs = get().conversations.map((c) =>
        c.id === id ? { ...c, title: trimmed, updated_at: Date.now() } : c
      );
      saveStore(updatedConvs, get().messages);
      set({ conversations: updatedConvs });
    },

    setDraft: (convId: string, text: string) => {
      set((state) => ({
        drafts: { ...state.drafts, [convId]: text },
      }));
    },

    addDraftAttachment: (convId: string, item: AttachmentItem) => {
      set((state) => {
        const existing = state.draftAttachments[convId] || [];
        return {
          draftAttachments: {
            ...state.draftAttachments,
            [convId]: [...existing, item],
          },
        };
      });
    },

    removeDraftAttachment: (convId: string, itemId: string) => {
      set((state) => {
        const existing = state.draftAttachments[convId] || [];
        return {
          draftAttachments: {
            ...state.draftAttachments,
            [convId]: existing.filter((a) => a.id !== itemId),
          },
        };
      });
    },

    clearDraft: (convId: string) => {
      set((state) => {
        const newDrafts = { ...state.drafts };
        delete newDrafts[convId];
        const newAtts = { ...state.draftAttachments };
        delete newAtts[convId];
        return { drafts: newDrafts, draftAttachments: newAtts };
      });
    },

    toggleSidebar: () => {
      set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
    },

    setSidebarOpen: (open: boolean) => {
      set({ isSidebarOpen: open });
    },

    setCommandPaletteOpen: (open: boolean) => {
      set({ isCommandPaletteOpen: open });
    },

    setLens: (lens) => {
      set({ selectedLens: lens });
    },

    setAuraTheme: (theme) => {
      localStorage.setItem('noevix_aura_theme', theme);
      document.documentElement.setAttribute('data-aura', theme);
      set({ auraTheme: theme });
    },

    setAuraIntensity: (intensity) => {
      localStorage.setItem('noevix_aura_intensity', intensity);
      set({ auraIntensity: intensity });
    },

    toggleArtifacts: () => {
      set((state) => ({ isArtifactsOpen: !state.isArtifactsOpen }));
    },

    setArtifactsOpen: (open) => {
      set({ isArtifactsOpen: open });
    },

    setActiveArtifact: (art) => {
      set({ activeArtifact: art, isArtifactsOpen: !!art });
    },

    setVoiceMode: (v) => {
      set({ isVoiceMode: v });
    },

    toggleRailCollapsed: () => {
      set((state) => ({ railCollapsed: !state.railCollapsed }));
    },

    sendMessage: async (text: string, attachments: AttachmentItem[] = []) => {
      let convId = get().activeId;
      if (!convId) {
        convId = get().newChat();
      }

      const abortCtrl = new AbortController();
      const userMsgId = 'msg_' + Date.now();
      const assistantMsgId = 'msg_' + (Date.now() + 1);

      const userMsg: ChatMessage = {
        id: userMsgId,
        conversation_id: convId,
        parent_id: null,
        role: 'user',
        content: text,
        created_at: Date.now(),
        attachments: attachments.length > 0 ? attachments : undefined,
        isNew: true,
      };

      const existingMsgs = get().messages[convId] || [];
      const updatedWithUser = [...existingMsgs, userMsg];

      // Update conversation title if this is the first message
      let convs = get().conversations;
      if (existingMsgs.length === 0) {
        const titleSnippet = text.slice(0, 36).trim() || 'New conversation';
        convs = convs.map((c) =>
          c.id === convId ? { ...c, title: titleSnippet, updated_at: Date.now() } : c
        );
      } else {
        convs = convs.map((c) =>
          c.id === convId ? { ...c, updated_at: Date.now() } : c
        );
      }

      const updatedMsgs = { ...get().messages, [convId]: updatedWithUser };
      saveStore(convs, updatedMsgs);

      set({
        conversations: convs,
        messages: updatedMsgs,
        isStreaming: true,
        isThinking: true,
        streamingMessageId: assistantMsgId,
        streamingText: '',
        streamingError: null,
        abortController: abortCtrl,
      });

      // Clear draft
      get().clearDraft(convId);

      let accumulated = '';
      try {
        const stream = streamMockResponse(text, abortCtrl.signal);
        let firstToken = true;

        for await (const chunk of stream) {
          if (abortCtrl.signal.aborted) break;

          if (firstToken) {
            firstToken = false;
            set({ isThinking: false });
          }

          accumulated += chunk;
          set({ streamingText: accumulated });
        }

        // Commit assistant message
        if (!abortCtrl.signal.aborted || accumulated.length > 0) {
          const assistantMsg: ChatMessage = {
            id: assistantMsgId,
            conversation_id: convId,
            parent_id: userMsgId,
            role: 'assistant',
            content: accumulated,
            created_at: Date.now(),
            versions: [accumulated],
            version_index: 0,
            isNew: true,
          };

          const finalMsgs = {
            ...get().messages,
            [convId]: [...(get().messages[convId] || []), assistantMsg],
          };
          saveStore(get().conversations, finalMsgs);
          set({
            messages: finalMsgs,
            isStreaming: false,
            isThinking: false,
            streamingMessageId: null,
            streamingText: '',
            abortController: null,
          });
        }
      } catch (err: any) {
        if (!abortCtrl.signal.aborted) {
          set({
            isStreaming: false,
            isThinking: false,
            streamingError: 'Something went wrong.',
            abortController: null,
          });
        }
      }
    },

    editUserMessage: async (messageId: string, newContent: string) => {
      const convId = get().activeId;
      if (!convId) return;

      const msgs = get().messages[convId] || [];
      const msgIndex = msgs.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      const oldMsg = msgs[msgIndex];
      const versions = oldMsg.versions ? [...oldMsg.versions] : [oldMsg.content];
      versions.push(newContent);
      const newVersionIndex = versions.length - 1;

      // Update user message with new version
      const updatedUserMsg: ChatMessage = {
        ...oldMsg,
        content: newContent,
        versions,
        version_index: newVersionIndex,
      };

      // Discard messages after this user message and re-run
      const prefix = msgs.slice(0, msgIndex);
      const updatedMsgs = { ...get().messages, [convId]: [...prefix, updatedUserMsg] };
      saveStore(get().conversations, updatedMsgs);
      set({ messages: updatedMsgs });

      // Trigger streaming reply for the edited user message
      const abortCtrl = new AbortController();
      const assistantMsgId = 'msg_' + Date.now();
      set({
        isStreaming: true,
        isThinking: true,
        streamingMessageId: assistantMsgId,
        streamingText: '',
        streamingError: null,
        abortController: abortCtrl,
      });

      let accumulated = '';
      try {
        const stream = streamMockResponse(newContent, abortCtrl.signal);
        let firstToken = true;

        for await (const chunk of stream) {
          if (abortCtrl.signal.aborted) break;
          if (firstToken) {
            firstToken = false;
            set({ isThinking: false });
          }
          accumulated += chunk;
          set({ streamingText: accumulated });
        }

        if (!abortCtrl.signal.aborted || accumulated.length > 0) {
          const assistantMsg: ChatMessage = {
            id: assistantMsgId,
            conversation_id: convId,
            parent_id: updatedUserMsg.id,
            role: 'assistant',
            content: accumulated,
            created_at: Date.now(),
            versions: [accumulated],
            version_index: 0,
            isNew: true,
          };
          const finalMsgs = {
            ...get().messages,
            [convId]: [...(get().messages[convId] || []), assistantMsg],
          };
          saveStore(get().conversations, finalMsgs);
          set({
            messages: finalMsgs,
            isStreaming: false,
            isThinking: false,
            streamingMessageId: null,
            streamingText: '',
            abortController: null,
          });
        }
      } catch {
        set({ isStreaming: false, isThinking: false, streamingError: 'Something went wrong.' });
      }
    },

    regenerateAssistantMessage: async (assistantMessageId: string) => {
      const convId = get().activeId;
      if (!convId) return;

      const msgs = get().messages[convId] || [];
      const astIdx = msgs.findIndex((m) => m.id === assistantMessageId);
      if (astIdx === -1) return;

      const targetMsg = msgs[astIdx];
      // Find preceding user message
      const prevUserMsg = msgs.slice(0, astIdx).reverse().find((m) => m.role === 'user');
      const promptText = prevUserMsg ? prevUserMsg.content : 'Continue';

      const abortCtrl = new AbortController();
      set({
        isStreaming: true,
        isThinking: true,
        streamingMessageId: assistantMessageId,
        streamingText: '',
        streamingError: null,
        abortController: abortCtrl,
      });

      let accumulated = '';
      try {
        const stream = streamMockResponse(promptText, abortCtrl.signal);
        let firstToken = true;

        for await (const chunk of stream) {
          if (abortCtrl.signal.aborted) break;
          if (firstToken) {
            firstToken = false;
            set({ isThinking: false });
          }
          accumulated += chunk;
          set({ streamingText: accumulated });
        }

        if (!abortCtrl.signal.aborted || accumulated.length > 0) {
          const versions = targetMsg.versions ? [...targetMsg.versions, accumulated] : [targetMsg.content, accumulated];
          const newIdx = versions.length - 1;

          const updatedMsg: ChatMessage = {
            ...targetMsg,
            content: accumulated,
            versions,
            version_index: newIdx,
            created_at: Date.now(),
          };

          const newMsgs = [...msgs];
          newMsgs[astIdx] = updatedMsg;

          const finalMap = { ...get().messages, [convId]: newMsgs };
          saveStore(get().conversations, finalMap);
          set({
            messages: finalMap,
            isStreaming: false,
            isThinking: false,
            streamingMessageId: null,
            streamingText: '',
            abortController: null,
          });
        }
      } catch {
        set({ isStreaming: false, isThinking: false, streamingError: 'Something went wrong.' });
      }
    },

    setBranchVersion: (messageId: string, newIndex: number) => {
      const convId = get().activeId;
      if (!convId) return;

      const msgs = get().messages[convId] || [];
      const updated = msgs.map((m) => {
        if (m.id === messageId && m.versions && newIndex >= 0 && newIndex < m.versions.length) {
          return {
            ...m,
            version_index: newIndex,
            content: m.versions[newIndex],
          };
        }
        return m;
      });

      const finalMap = { ...get().messages, [convId]: updated };
      saveStore(get().conversations, finalMap);
      set({ messages: finalMap });
    },

    stopStreaming: () => {
      const { abortController, streamingMessageId, streamingText, activeId, messages } = get();
      if (abortController) {
        abortController.abort();
      }

      // If we have partial text, commit it as the message
      if (activeId && streamingMessageId && streamingText.length > 0) {
        const convMsgs = messages[activeId] || [];
        const assistantMsg: ChatMessage = {
          id: streamingMessageId,
          conversation_id: activeId,
          parent_id: convMsgs[convMsgs.length - 1]?.id || null,
          role: 'assistant',
          content: streamingText,
          created_at: Date.now(),
          versions: [streamingText],
          version_index: 0,
        };
        const finalMap = { ...messages, [activeId]: [...convMsgs, assistantMsg] };
        saveStore(get().conversations, finalMap);
        set({ messages: finalMap });
      }

      set({
        isStreaming: false,
        isThinking: false,
        streamingMessageId: null,
        streamingText: '',
        abortController: null,
      });
    },
  };
});
