import fs from 'node:fs';
import path from 'node:path';
import { Conversation, Message, FeedbackRequest } from '../../../packages/contracts/index.ts';
import { config } from '../config.ts';

export interface TurnLogEntry {
  id: string;
  timestamp: number;
  conversation_id: string;
  message_id: string;
  route: {
    primary: string;
    secondary: string | null;
    complexity: string;
    fromPreRouter: boolean;
  };
  metrics: {
    t_route: number;
    t_first_token: number;
    t_total: number;
    tokens_in: number;
    tokens_out: number;
    cached_tokens: number;
  };
  user_input?: string; // Excluded if consent is false
  output?: string;     // Excluded if consent is false
  user_consent_logged: boolean;
}

export interface UserPreferences {
  user_logging_consent: boolean;
  theme: 'dark' | 'light' | 'system';
  developer_mode?: boolean;
}

class StoreService {
  private dataDir: string;
  private conversationsFile: string;
  private messagesFile: string;
  private turnLogsFile: string;
  private feedbackFile: string;
  private prefsFile: string;

  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message> = new Map();
  private turnLogs: TurnLogEntry[] = [];
  private userPreferences: UserPreferences = {
    user_logging_consent: true,
    theme: 'dark',
    developer_mode: true,
  };

  constructor() {
    this.dataDir = path.resolve(process.cwd(), config.STORAGE_DIR);
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.conversationsFile = path.join(this.dataDir, 'conversations.json');
    this.messagesFile = path.join(this.dataDir, 'messages.json');
    this.turnLogsFile = path.join(this.dataDir, 'turn_logs.jsonl');
    this.feedbackFile = path.join(this.dataDir, 'feedback.json');
    this.prefsFile = path.join(this.dataDir, 'preferences.json');

    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(this.conversationsFile)) {
        const data = JSON.parse(fs.readFileSync(this.conversationsFile, 'utf-8'));
        for (const c of data) this.conversations.set(c.id, c);
      }
      if (fs.existsSync(this.messagesFile)) {
        const data = JSON.parse(fs.readFileSync(this.messagesFile, 'utf-8'));
        for (const m of data) this.messages.set(m.id, m);
      }
      if (fs.existsSync(this.prefsFile)) {
        this.userPreferences = JSON.parse(fs.readFileSync(this.prefsFile, 'utf-8'));
      }
    } catch (err) {
      console.warn('[Store] Could not load stored state, starting fresh:', err);
    }
  }

  private saveConversations() {
    try {
      const arr = Array.from(this.conversations.values());
      fs.writeFileSync(this.conversationsFile, JSON.stringify(arr, null, 2));
    } catch (err) {
      console.error('[Store] Error saving conversations:', err);
    }
  }

  private saveMessages() {
    try {
      const arr = Array.from(this.messages.values());
      fs.writeFileSync(this.messagesFile, JSON.stringify(arr, null, 2));
    } catch (err) {
      console.error('[Store] Error saving messages:', err);
    }
  }

  public getPreferences(): UserPreferences {
    return { ...this.userPreferences };
  }

  public setPreferences(prefs: Partial<UserPreferences>): UserPreferences {
    this.userPreferences = { ...this.userPreferences, ...prefs };
    try {
      fs.writeFileSync(this.prefsFile, JSON.stringify(this.userPreferences, null, 2));
    } catch (err) {
      console.error('[Store] Error saving preferences:', err);
    }
    return this.getPreferences();
  }

  public getConversations(): Conversation[] {
    return Array.from(this.conversations.values()).sort((a, b) => b.updated_at - a.updated_at);
  }

  public getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  public createConversation(id: string, title?: string): Conversation {
    const now = Date.now();
    const conv: Conversation = {
      id,
      title: title || 'New Conversation',
      created_at: now,
      updated_at: now,
      root_message_id: null,
      active_leaf_id: null,
      archived: false,
    };
    this.conversations.set(id, conv);
    this.saveConversations();
    return conv;
  }

  public updateConversation(id: string, updates: Partial<Conversation>): Conversation | undefined {
    const conv = this.conversations.get(id);
    if (!conv) return undefined;
    Object.assign(conv, updates, { updated_at: Date.now() });
    this.saveConversations();
    return conv;
  }

  public deleteConversation(id: string): boolean {
    const deleted = this.conversations.delete(id);
    if (deleted) {
      for (const [mid, m] of this.messages.entries()) {
        if (m.conversation_id === id) {
          this.messages.delete(mid);
        }
      }
      this.saveConversations();
      this.saveMessages();
    }
    return deleted;
  }

  public getMessagesByConversation(conversationId: string): Message[] {
    const results: Message[] = [];
    for (const m of this.messages.values()) {
      if (m.conversation_id === conversationId) {
        results.push(m);
      }
    }
    return results.sort((a, b) => a.created_at - b.created_at);
  }

  public getMessage(id: string): Message | undefined {
    return this.messages.get(id);
  }

  public saveMessage(message: Message): Message {
    this.messages.set(message.id, message);
    const conv = this.conversations.get(message.conversation_id);
    if (conv) {
      if (!conv.root_message_id && !message.parent_id) {
        conv.root_message_id = message.id;
      }
      conv.active_leaf_id = message.id;
      conv.updated_at = Date.now();
      if (conv.title === 'New Conversation' && message.role === 'user') {
        conv.title = message.content.slice(0, 40).trim() || 'New Conversation';
      }
      this.saveConversations();
    }
    this.saveMessages();
    return message;
  }

  public recordFeedback(req: FeedbackRequest): boolean {
    const msg = this.messages.get(req.message_id);
    if (!msg) return false;
    msg.feedback = {
      rating: req.rating,
      correct_lens: req.correct_lens,
      comment: req.comment,
      timestamp: Date.now(),
    };
    this.saveMessages();

    // Append to feedback log
    try {
      const line = JSON.stringify({ ...req, timestamp: Date.now() }) + '\n';
      fs.appendFileSync(this.feedbackFile, line);
    } catch (err) {
      console.warn('[Store] Feedback log write error:', err);
    }
    return true;
  }

  public logTurn(entry: Omit<TurnLogEntry, 'user_consent_logged'>) {
    const consent = this.userPreferences.user_logging_consent;
    const finalEntry: TurnLogEntry = {
      ...entry,
      user_consent_logged: consent,
      // Hard privacy constraint: do not log content when consent is off
      user_input: consent ? entry.user_input : undefined,
      output: consent ? entry.output : undefined,
    };

    this.turnLogs.push(finalEntry);
    try {
      fs.appendFileSync(this.turnLogsFile, JSON.stringify(finalEntry) + '\n');
    } catch (err) {
      console.error('[Store] Turn log write error:', err);
    }
  }

  public getRecentLogs(limit = 100): TurnLogEntry[] {
    return this.turnLogs.slice(-limit);
  }
}

export const Store = new StoreService();
