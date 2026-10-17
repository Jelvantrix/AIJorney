import { create } from 'zustand';
import { streamMockResponse } from './mockStream.ts';

export type LensType = 'auto' | 'engineering' | 'design' | 'research' | 'reasoning' | 'writing';

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
  lens?: LensType;
  tokens?: number;
  elapsed_ms?: number;
  pinned?: boolean;
  tool_status?: 'SEARCHING' | 'READING' | 'EXECUTING' | null;
  versions?: string[];       // alternative contents for regenerated or edited messages
  version_index?: number;    // 0-indexed current displayed version
  attachments?: AttachmentItem[];
  isNew?: boolean;           // true only for newly animated messages
  feedback?: {
    rating: 'up' | 'down';
    wrong_lens?: LensType;
    comment?: string;
  };
}

export interface ConversationItem {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  pinned?: boolean;
}

export interface ArtifactItem {
  id: string;
  title: string;
  type: 'code' | 'document' | 'preview';
  language?: string;
  content: string;
}

export type ViewMode = 'app' | 'marketing' | 'lab';

interface ChatState {
  currentView: ViewMode;
  setCurrentView: (v: ViewMode) => void;

  conversations: ConversationItem[];
  activeId: string | null;
  messages: Record<string, ChatMessage[]>; // conversation_id -> ChatMessage[]
  drafts: Record<string, string>;
  draftAttachments: Record<string, AttachmentItem[]>;

  // Streaming & Orchestration
  isStreaming: boolean;
  isThinking: boolean;
  streamingMessageId: string | null;
  streamingText: string;
  streamingError: string | null;
  currentToolStatus: 'SEARCHING' | 'READING' | 'EXECUTING' | null;
  activeLens: LensType;
  selectedLensOverride: LensType; // 'auto' or specific
  elapsedMs: number;
  tokenCount: number;
  abortController: AbortController | null;

  // Typing & Aura State
  isTyping: boolean;
  typingRate: number;
  reduceEffects: boolean;
  setReduceEffects: (v: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  setTypingRate: (rate: number) => void;

  // UI Overlays & Sheets
  isIndexOpen: boolean;
  isLensMenuOpen: boolean;
  isSpacesMenuOpen: boolean;
  isSettingsOpen: boolean;
  isAuthModalOpen: boolean;
  authMode: 'login' | 'signup';
  isArtifactSheetOpen: boolean;
  activeArtifact: ArtifactItem | null;
  activeExchangeIndex: number;
  hasCompletedOnboarding: boolean;
  onboardingStep: number; // 1, 2, 3
  rateLimitCountdown: number | null; // seconds
  isOffline: boolean;
  offlineQueue: string[];

  // User Format & Editor Preferences
  outputStyle: 'paragraphs' | 'lists' | 'tables' | 'code_first';
  responseDepth: 'concise' | 'comprehensive';
  showLineNumbers: boolean;
  codeFontSize: 'sm' | 'base' | 'lg';
  streamSpeed: 'fast' | 'natural' | 'instant';
  defaultCodeLanguage: string;

  // Settings & Actions
  setIndexOpen: (open: boolean) => void;
  setLensMenuOpen: (open: boolean) => void;
  setSpacesMenuOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean, mode?: 'login' | 'signup') => void;
  setArtifactSheetOpen: (open: boolean) => void;
  openArtifact: (art: ArtifactItem) => void;
  setActiveExchangeIndex: (idx: number) => void;
  setSelectedLens: (lens: LensType) => void;
  completeOnboarding: () => void;
  nextOnboardingStep: () => void;
  startOnboarding: () => void;

  setOutputStyle: (style: 'paragraphs' | 'lists' | 'tables' | 'code_first') => void;
  setResponseDepth: (depth: 'concise' | 'comprehensive') => void;
  setShowLineNumbers: (show: boolean) => void;
  setCodeFontSize: (size: 'sm' | 'base' | 'lg') => void;
  setStreamSpeed: (speed: 'fast' | 'natural' | 'instant') => void;
  setDefaultCodeLanguage: (lang: string) => void;

  setActiveConversation: (id: string) => void;
  newChat: (title?: string) => string;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, newTitle: string) => void;
  setDraft: (convId: string, text: string) => void;
  addDraftAttachment: (convId: string, item: AttachmentItem) => void;
  removeDraftAttachment: (convId: string, itemId: string) => void;
  clearDraft: (convId: string) => void;

  sendMessage: (text: string, attachments?: AttachmentItem[], forcedScenario?: string) => Promise<void>;
  editUserMessage: (messageId: string, newContent: string) => Promise<void>;
  regenerateAssistantMessage: (assistantMessageId: string) => Promise<void>;
  setBranchVersion: (messageId: string, newIndex: number) => void;
  rateMessage: (messageId: string, rating: 'up' | 'down', wrongLens?: LensType) => void;
  stopStreaming: () => void;
  togglePinMessage: (messageId: string) => void;
  exportSpace: (convId: string) => string;
}

const STORAGE_KEY_CONVS = 'noevix_spaces_v3';
const STORAGE_KEY_MSGS = 'noevix_messages_v3';
const STORAGE_KEY_ONBOARDING = 'noevix_onboarding_done';
const STORAGE_KEY_REDUCE = 'noevix_reduce_effects';

// High-fidelity seed spaces
const SEED_CONVERSATIONS: ConversationItem[] = [
  {
    id: 'space_neural_arch',
    title: 'Distributed Monotonic Clock Sync',
    created_at: Date.now() - 3600000 * 4,
    updated_at: Date.now() - 3600000 * 4,
  },
  {
    id: 'space_systems_perf',
    title: 'Zero-Copy Ring Buffer in Rust',
    created_at: Date.now() - 3600000 * 24,
    updated_at: Date.now() - 3600000 * 24,
  },
  {
    id: 'space_design_tokens',
    title: 'Monochrome Luminous Design Constitution',
    created_at: Date.now() - 3600000 * 72,
    updated_at: Date.now() - 3600000 * 72,
  },
];

const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  space_neural_arch: [
    {
      id: 'msg_sync_u',
      conversation_id: 'space_neural_arch',
      parent_id: null,
      role: 'user',
      content: 'How do distributed systems achieve causal ordering without perfectly synchronized physical clocks?',
      created_at: Date.now() - 3600000 * 4 - 45000,
    },
    {
      id: 'msg_sync_a',
      conversation_id: 'space_neural_arch',
      parent_id: 'msg_sync_u',
      role: 'assistant',
      lens: 'reasoning',
      elapsed_ms: 640,
      tokens: 284,
      content: `Distributed causal ordering depends on logical causality rather than physical time. When physical clocks drift unpredictably across network boundaries, logical timestamps establish an immutable happens-before relation (→).

### 1. Lamport Timestamps (Scalar Ordering)
Each node maintains a monotonically increasing integer counter.
- On local event: \`L = L + 1\`
- On message send: attach \`L\` to packet
- On message receive: \`L_recv = max(L_local, L_msg) + 1\`

This guarantees if event A caused event B, then \`L(A) < L(B)\`. Note that the converse does not hold: equal timestamps do not imply concurrency without tie-breaking by unique node ID.

### 2. Vector Clocks (Full Concurrency Detection)
To identify true concurrency and detect conflicts:
- Each node \`i\` in a cluster of size \`N\` maintains vector \`V[1..N]\`.
- Node \`i\` increments its own component \`V[i] += 1\` on local event.
- Event A strictly happened before event B if and only if \`V_A[k] <= V_B[k]\` for all \`k\`, and \`V_A[j] < V_B[j]\` for at least one \`j\`.
- If neither vector dominates the other, the events are mathematically concurrent:

| Mechanism | State Size | Can Detect Concurrency? | Real-world Use |
| :--- | :--- | :--- | :--- |
| **Physical UTC** | 64 bits | No (clock skew introduces false order) | Wall-clock metrics |
| **Lamport Clock** | 64 bits | No (partial total order only) | Distributed locks |
| **Vector Clock** | O(N) integers | Yes (dominance check) | DynamoDB version branches |
| **Hybrid Logical Clock (HLC)** | 64 bits | Bounds drift to max physical skew | CockroachDB, Spanner |

### Implementation Note
For multi-tenant storage fabrics, Hybrid Logical Clocks (HLC) represent the modern standard because they combine the monotonicity of Lamport clocks with physical time bounds.`,
      created_at: Date.now() - 3600000 * 4,
      versions: [],
      version_index: 0,
    },
  ],
  space_systems_perf: [
    {
      id: 'msg_rust_u',
      conversation_id: 'space_systems_perf',
      parent_id: null,
      role: 'user',
      content: 'Construct an lock-free single-producer single-consumer circular buffer in Rust with zero heap allocation.',
      created_at: Date.now() - 3600000 * 24 - 30000,
    },
    {
      id: 'msg_rust_a',
      conversation_id: 'space_systems_perf',
      parent_id: 'msg_rust_u',
      role: 'assistant',
      lens: 'engineering',
      elapsed_ms: 710,
      tokens: 340,
      content: `Here is a lock-free Single-Producer Single-Consumer (SPSC) ring buffer in Rust utilizing atomic memory orderings for zero cache-coherency contention.

\`\`\`rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::cell::UnsafeCell;
use std::mem::MaybeUninit;

pub struct SpscRingBuffer<T, const CAP: usize> {
    buffer: [UnsafeCell<MaybeUninit<T>>; CAP],
    head: AtomicUsize, // producer cursor
    tail: AtomicUsize, // consumer cursor
}

unsafe impl<T: Send, const CAP: usize> Sync for SpscRingBuffer<T, CAP> {}

impl<T, const CAP: usize> SpscRingBuffer<T, CAP> {
    pub const fn new() -> Self {
        // Assert power-of-two capacity at compile time for bitwise masking
        assert!(CAP > 0 && (CAP & (CAP - 1)) == 0, "Capacity must be power of two");
        
        Self {
            buffer: [const { UnsafeCell::new(MaybeUninit::uninit()) }; CAP],
            head: AtomicUsize::new(0),
            tail: AtomicUsize::new(0),
        }
    }

    #[inline(always)]
    pub fn try_push(&self, item: T) -> Result<(), T> {
        let head = self.head.load(Ordering::Relaxed);
        let tail = self.tail.load(Ordering::Acquire);

        if head.wrapping_sub(tail) >= CAP {
            return Err(item); // Buffer full
        }

        let idx = head & (CAP - 1);
        unsafe {
            (*self.buffer[idx].get()).write(item);
        }

        self.head.store(head.wrapping_add(1), Ordering::Release);
        Ok(())
    }

    #[inline(always)]
    pub fn try_pop(&self) -> Option<T> {
        let tail = self.tail.load(Ordering::Relaxed);
        let head = self.head.load(Ordering::Acquire);

        if tail == head {
            return None; // Buffer empty
        }

        let idx = tail & (CAP - 1);
        let val = unsafe {
            (*self.buffer[idx].get()).assume_init_read()
        };

        self.tail.store(tail.wrapping_add(1), Ordering::Release);
        Some(val)
    }
}
\`\`\`

### Invariants Verified
1. **Power-of-Two Bitmasking**: \`idx = head & (CAP - 1)\` avoids division/modulo instructions on the critical path.
2. **Memory Ordering**: Producer loads tail with \`Acquire\` to synchronize with the consumer's \`Release\` update, and publishes head with \`Release\`.
3. **Cache Line Isolation**: In production, pad \`head\` and \`tail\` to 64 bytes to eliminate false sharing.`,
      created_at: Date.now() - 3600000 * 24,
      versions: [],
      version_index: 0,
    },
  ],
};

function loadStoredSpaces(): ConversationItem[] {
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

function saveStore(spaces: ConversationItem[], messages: Record<string, ChatMessage[]>) {
  try {
    localStorage.setItem(STORAGE_KEY_CONVS, JSON.stringify(spaces));
    localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(messages));
  } catch {}
}

export const useChatStore = create<ChatState>((set, get) => {
  const initialSpaces = loadStoredSpaces();
  const initialMsgs = loadStoredMessages();
  const initialOnboarding = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ONBOARDING) === 'true' : true;
  const initialReduce = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_REDUCE) === 'true' : false;

  return {
    currentView: 'app',
    setCurrentView: (v) => set({ currentView: v }),

    conversations: initialSpaces,
    activeId: initialSpaces[0]?.id || null,
    messages: initialMsgs,
    drafts: {},
    draftAttachments: {},

    isStreaming: false,
    isThinking: false,
    streamingMessageId: null,
    streamingText: '',
    streamingError: null,
    currentToolStatus: null,
    activeLens: 'reasoning',
    selectedLensOverride: 'auto',
    elapsedMs: 0,
    tokenCount: 0,
    abortController: null,

    isTyping: false,
    typingRate: 0,
    reduceEffects: initialReduce,
    setReduceEffects: (v) => {
      localStorage.setItem(STORAGE_KEY_REDUCE, String(v));
      set({ reduceEffects: v });
    },
    setIsTyping: (typing) => set({ isTyping: typing }),
    setTypingRate: (rate) => set({ typingRate: rate }),

    isIndexOpen: false,
    isLensMenuOpen: false,
    isSpacesMenuOpen: false,
    isSettingsOpen: false,
    isAuthModalOpen: false,
    authMode: 'login',
    isArtifactSheetOpen: false,
    activeArtifact: null,
    activeExchangeIndex: 0,
    hasCompletedOnboarding: initialOnboarding,
    onboardingStep: 1,
    rateLimitCountdown: null,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    offlineQueue: [],

    // User Preferences (lists vs paragraphs, line numbers, etc.)
    outputStyle: (typeof window !== 'undefined' && localStorage.getItem('noevix_output_style') as any) || 'lists',
    responseDepth: (typeof window !== 'undefined' && localStorage.getItem('noevix_response_depth') as any) || 'concise',
    showLineNumbers: typeof window !== 'undefined' ? localStorage.getItem('noevix_line_numbers') !== 'false' : true,
    codeFontSize: (typeof window !== 'undefined' && localStorage.getItem('noevix_code_font_size') as any) || 'base',
    streamSpeed: (typeof window !== 'undefined' && localStorage.getItem('noevix_stream_speed') as any) || 'natural',
    defaultCodeLanguage: (typeof window !== 'undefined' && localStorage.getItem('noevix_default_lang')) || 'typescript',

    setIndexOpen: (open) => set({ isIndexOpen: open }),
    setLensMenuOpen: (open) => set({ isLensMenuOpen: open }),
    setSpacesMenuOpen: (open) => set({ isSpacesMenuOpen: open }),
    setSettingsOpen: (open) => set({ isSettingsOpen: open }),
    setAuthModalOpen: (open, mode = 'login') => set({ isAuthModalOpen: open, authMode: mode }),
    setArtifactSheetOpen: (open) => set({ isArtifactSheetOpen: open }),
    openArtifact: (art) => set({ activeArtifact: art, isArtifactSheetOpen: true }),
    setActiveExchangeIndex: (idx) => set({ activeExchangeIndex: idx }),
    setSelectedLens: (lens) => set({ selectedLensOverride: lens }),

    setOutputStyle: (style) => {
      localStorage.setItem('noevix_output_style', style);
      set({ outputStyle: style });
    },
    setResponseDepth: (depth) => {
      localStorage.setItem('noevix_response_depth', depth);
      set({ responseDepth: depth });
    },
    setShowLineNumbers: (show) => {
      localStorage.setItem('noevix_line_numbers', String(show));
      set({ showLineNumbers: show });
    },
    setCodeFontSize: (size) => {
      localStorage.setItem('noevix_code_font_size', size);
      set({ codeFontSize: size });
    },
    setStreamSpeed: (speed) => {
      localStorage.setItem('noevix_stream_speed', speed);
      set({ streamSpeed: speed });
    },
    setDefaultCodeLanguage: (lang) => {
      localStorage.setItem('noevix_default_lang', lang);
      set({ defaultCodeLanguage: lang });
    },

    completeOnboarding: () => {
      localStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
      set({ hasCompletedOnboarding: true });
    },
    startOnboarding: () => {
      set({ hasCompletedOnboarding: false, onboardingStep: 1 });
    },
    nextOnboardingStep: () => {
      const next = get().onboardingStep + 1;
      if (next > 3) {
        get().completeOnboarding();
      } else {
        set({ onboardingStep: next });
      }
    },

    setActiveConversation: (id) => {
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
        currentToolStatus: null,
        abortController: null,
        activeExchangeIndex: 0,
      });
    },

    newChat: (title = 'Untitled Space') => {
      const id = 'space_' + Date.now();
      const newSpace: ConversationItem = {
        id,
        title,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      const updated = [newSpace, ...get().conversations];
      const updatedMsgs = { ...get().messages, [id]: [] };
      saveStore(updated, updatedMsgs);
      set({
        conversations: updated,
        messages: updatedMsgs,
        activeId: id,
        isStreaming: false,
        isThinking: false,
        streamingMessageId: null,
        streamingText: '',
        streamingError: null,
        currentToolStatus: null,
        abortController: null,
        activeExchangeIndex: 0,
      });
      return id;
    },

    deleteConversation: (id) => {
      const { conversations, messages, activeId } = get();
      const updatedConvs = conversations.filter((c) => c.id !== id);
      const updatedMsgs = { ...messages };
      delete updatedMsgs[id];
      const nextActive = activeId === id ? updatedConvs[0]?.id || null : activeId;
      saveStore(updatedConvs, updatedMsgs);
      set({
        conversations: updatedConvs,
        messages: updatedMsgs,
        activeId: nextActive,
      });
    },

    renameConversation: (id, newTitle) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      const updated = get().conversations.map((c) =>
        c.id === id ? { ...c, title: trimmed, updated_at: Date.now() } : c
      );
      saveStore(updated, get().messages);
      set({ conversations: updated });
    },

    setDraft: (convId, text) => {
      set((state) => ({ drafts: { ...state.drafts, [convId]: text } }));
    },

    addDraftAttachment: (convId, item) => {
      set((state) => {
        const existing = state.draftAttachments[convId] || [];
        return { draftAttachments: { ...state.draftAttachments, [convId]: [...existing, item] } };
      });
    },

    removeDraftAttachment: (convId, itemId) => {
      set((state) => {
        const existing = state.draftAttachments[convId] || [];
        return {
          draftAttachments: { ...state.draftAttachments, [convId]: existing.filter((a) => a.id !== itemId) },
        };
      });
    },

    clearDraft: (convId) => {
      set((state) => {
        const newDrafts = { ...state.drafts };
        delete newDrafts[convId];
        const newAtts = { ...state.draftAttachments };
        delete newAtts[convId];
        return { drafts: newDrafts, draftAttachments: newAtts };
      });
    },

    sendMessage: async (text: string, attachments: AttachmentItem[] = [], forcedScenario?: string) => {
      let spaceId = get().activeId;
      if (!spaceId) {
        spaceId = get().newChat();
      }

      // Check offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        set((state) => ({
          isOffline: true,
          offlineQueue: [...state.offlineQueue, text],
          streamingError: 'Network offline. Your prompt has been queued and will dispatch when connected.',
        }));
        return;
      }

      const abortCtrl = new AbortController();
      const userMsgId = 'msg_' + Date.now();
      const assistantMsgId = 'msg_' + (Date.now() + 1);

      const userMsg: ChatMessage = {
        id: userMsgId,
        conversation_id: spaceId,
        parent_id: null,
        role: 'user',
        content: text,
        created_at: Date.now(),
        attachments: attachments.length > 0 ? attachments : undefined,
        isNew: true,
      };

      const existingMsgs = get().messages[spaceId] || [];
      const updatedWithUser = [...existingMsgs, userMsg];

      // Auto title on first prompt
      let spaces = get().conversations;
      if (existingMsgs.length === 0) {
        const titleSnippet = text.slice(0, 42).trim() || 'Untitled Space';
        spaces = spaces.map((s) =>
          s.id === spaceId ? { ...s, title: titleSnippet, updated_at: Date.now() } : s
        );
      } else {
        spaces = spaces.map((s) =>
          s.id === spaceId ? { ...s, updated_at: Date.now() } : s
        );
      }

      const updatedMsgs = { ...get().messages, [spaceId]: updatedWithUser };
      saveStore(spaces, updatedMsgs);

      // Determine starting lens
      const override = get().selectedLensOverride;
      const detectedLens: LensType = override !== 'auto'
        ? override
        : text.toLowerCase().includes('rust') || text.toLowerCase().includes('code') || text.toLowerCase().includes('function')
        ? 'engineering'
        : text.toLowerCase().includes('design') || text.toLowerCase().includes('layout') || text.toLowerCase().includes('aura')
        ? 'design'
        : text.toLowerCase().includes('research') || text.toLowerCase().includes('history') || text.toLowerCase().includes('study')
        ? 'research'
        : text.toLowerCase().includes('proof') || text.toLowerCase().includes('logic') || text.toLowerCase().includes('why')
        ? 'reasoning'
        : 'writing';

      set({
        conversations: spaces,
        messages: updatedMsgs,
        isStreaming: true,
        isThinking: true,
        streamingMessageId: assistantMsgId,
        streamingText: '',
        streamingError: null,
        currentToolStatus: null,
        activeLens: detectedLens,
        elapsedMs: 0,
        tokenCount: 0,
        abortController: abortCtrl,
        isTyping: false,
      });

      get().clearDraft(spaceId);

      // Stream response
      const startTime = performance.now();
      let accumulated = '';
      let tokens = 0;

      try {
        // If testing tool status scenario
        if (forcedScenario === 'tool_use' || text.toLowerCase().includes('search')) {
          set({ currentToolStatus: 'SEARCHING' });
          await new Promise((r) => setTimeout(r, 600));
          set({ currentToolStatus: 'READING' });
          await new Promise((r) => setTimeout(r, 450));
          set({ currentToolStatus: 'EXECUTING' });
          await new Promise((r) => setTimeout(r, 350));
          set({ currentToolStatus: null });
        }

        const stream = streamMockResponse(text, abortCtrl.signal, forcedScenario, get().outputStyle);
        let firstToken = true;

        for await (const chunk of stream) {
          if (abortCtrl.signal.aborted) break;

          if (firstToken) {
            firstToken = false;
            set({ isThinking: false });
          }

          accumulated += chunk;
          tokens += 1;
          set({
            streamingText: accumulated,
            tokenCount: tokens,
            elapsedMs: Math.round(performance.now() - startTime),
          });
        }

        // Finalize assistant message
        if (!abortCtrl.signal.aborted || accumulated.length > 0) {
          const assistantMsg: ChatMessage = {
            id: assistantMsgId,
            conversation_id: spaceId,
            parent_id: userMsgId,
            role: 'assistant',
            content: accumulated,
            created_at: Date.now(),
            lens: detectedLens,
            tokens,
            elapsed_ms: Math.round(performance.now() - startTime),
            versions: [accumulated],
            version_index: 0,
            isNew: true,
          };

          const finalMsgs = {
            ...get().messages,
            [spaceId]: [...(get().messages[spaceId] || []), assistantMsg],
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
          // If mid-stream partial disconnect: preserve partial text
          if (accumulated.length > 0) {
            const assistantMsg: ChatMessage = {
              id: assistantMsgId,
              conversation_id: spaceId,
              parent_id: userMsgId,
              role: 'assistant',
              content: accumulated,
              created_at: Date.now(),
              lens: detectedLens,
              tokens,
              elapsed_ms: Math.round(performance.now() - startTime),
              versions: [accumulated],
              version_index: 0,
            };
            const partialMsgs = {
              ...get().messages,
              [spaceId]: [...(get().messages[spaceId] || []), assistantMsg],
            };
            saveStore(get().conversations, partialMsgs);
            set({
              messages: partialMsgs,
              isStreaming: false,
              isThinking: false,
              streamingError: 'Inference disconnected mid-stream. Partial output preserved.',
              abortController: null,
            });
          } else {
            set({
              isStreaming: false,
              isThinking: false,
              streamingError: 'Inference request failed. Check connectivity or retry.',
              abortController: null,
            });
          }
        }
      }
    },

    editUserMessage: async (messageId: string, newContent: string) => {
      const spaceId = get().activeId;
      if (!spaceId) return;

      const msgs = get().messages[spaceId] || [];
      const msgIndex = msgs.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      const oldMsg = msgs[msgIndex];
      const versions = oldMsg.versions ? [...oldMsg.versions] : [oldMsg.content];
      versions.push(newContent);
      const newVersionIndex = versions.length - 1;

      const updatedUserMsg: ChatMessage = {
        ...oldMsg,
        content: newContent,
        versions,
        version_index: newVersionIndex,
      };

      const prefix = msgs.slice(0, msgIndex);
      const updatedMsgs = { ...get().messages, [spaceId]: [...prefix, updatedUserMsg] };
      saveStore(get().conversations, updatedMsgs);
      set({ messages: updatedMsgs });

      // Regenerate response for the branch
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
        const stream = streamMockResponse(newContent, abortCtrl.signal, undefined, get().outputStyle);
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
            conversation_id: spaceId,
            parent_id: updatedUserMsg.id,
            role: 'assistant',
            content: accumulated,
            created_at: Date.now(),
            lens: 'reasoning',
            versions: [accumulated],
            version_index: 0,
            isNew: true,
          };
          const finalMsgs = {
            ...get().messages,
            [spaceId]: [...(get().messages[spaceId] || []), assistantMsg],
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
        set({ isStreaming: false, isThinking: false, streamingError: 'Stream interrupted.' });
      }
    },

    regenerateAssistantMessage: async (assistantMessageId: string) => {
      const spaceId = get().activeId;
      if (!spaceId) return;

      const msgs = get().messages[spaceId] || [];
      const astIdx = msgs.findIndex((m) => m.id === assistantMessageId);
      if (astIdx === -1) return;

      const targetMsg = msgs[astIdx];
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
        const stream = streamMockResponse(promptText, abortCtrl.signal, undefined, get().outputStyle);
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

          const finalMap = { ...get().messages, [spaceId]: newMsgs };
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
        set({ isStreaming: false, isThinking: false, streamingError: 'Stream failed.' });
      }
    },

    setBranchVersion: (messageId: string, newIndex: number) => {
      const spaceId = get().activeId;
      if (!spaceId) return;

      const msgs = get().messages[spaceId] || [];
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

      const finalMap = { ...get().messages, [spaceId]: updated };
      saveStore(get().conversations, finalMap);
      set({ messages: finalMap });
    },

    rateMessage: (messageId: string, rating: 'up' | 'down', wrongLens?: LensType) => {
      const spaceId = get().activeId;
      if (!spaceId) return;
      const msgs = get().messages[spaceId] || [];
      const updated = msgs.map((m) =>
        m.id === messageId
          ? { ...m, feedback: { rating, wrong_lens: wrongLens } }
          : m
      );
      const finalMap = { ...get().messages, [spaceId]: updated };
      saveStore(get().conversations, finalMap);
      set({ messages: finalMap });
    },

    stopStreaming: () => {
      const { abortController, streamingMessageId, streamingText, activeId, messages, activeLens, tokenCount, elapsedMs } = get();
      if (abortController) {
        abortController.abort();
      }

      if (activeId && streamingMessageId && streamingText.length > 0) {
        const convMsgs = messages[activeId] || [];
        const assistantMsg: ChatMessage = {
          id: streamingMessageId,
          conversation_id: activeId,
          parent_id: convMsgs[convMsgs.length - 1]?.id || null,
          role: 'assistant',
          content: streamingText,
          created_at: Date.now(),
          lens: activeLens,
          tokens: tokenCount,
          elapsed_ms: elapsedMs,
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

    togglePinMessage: (messageId: string) => {
      const spaceId = get().activeId;
      if (!spaceId) return;
      const msgs = get().messages[spaceId] || [];
      const updated = msgs.map((m) =>
        m.id === messageId ? { ...m, pinned: !m.pinned } : m
      );
      const finalMap = { ...get().messages, [spaceId]: updated };
      saveStore(get().conversations, finalMap);
      set({ messages: finalMap });
    },

    exportSpace: (convId: string) => {
      const space = get().conversations.find((c) => c.id === convId);
      const msgs = get().messages[convId] || [];
      let md = `# ${space?.title || 'Noevix Space'}\n*Exported on ${new Date().toISOString()}*\n\n---\n\n`;
      for (const m of msgs) {
        if (m.role === 'user') {
          md += `## ${m.content}\n\n`;
        } else {
          md += `${m.content}\n\n*Lens: ${m.lens || 'General'} | Tokens: ${m.tokens || '-'}*\n\n---\n\n`;
        }
      }
      return md;
    },
  };
});
