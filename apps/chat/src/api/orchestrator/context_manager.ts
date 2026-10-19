import { getInferenceBackend } from '../inference/index.ts';
import { config } from '../config.ts';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_TURNS_IN_CONTEXT = 6;
const MAX_TOTAL_CHARS = 12000;

export function boundConversationTurns(turns: ConversationTurn[]): ConversationTurn[] {
  if (turns.length <= MAX_TURNS_IN_CONTEXT) {
    return turns;
  }
  // Deterministic truncation order: drop oldest turns first
  let bounded = turns.slice(-MAX_TURNS_IN_CONTEXT);

  // If character count is too large, drop earlier turns
  let totalChars = bounded.reduce((sum, t) => sum + t.content.length, 0);
  while (totalChars > MAX_TOTAL_CHARS && bounded.length > 2) {
    bounded = bounded.slice(1);
    totalChars = bounded.reduce((sum, t) => sum + t.content.length, 0);
  }

  return bounded;
}

/**
 * Updates rolling summary asynchronously in the background (never on the critical path)
 */
export async function triggerAsyncSummaryUpdate(
  existingSummary: string | undefined,
  recentTurns: ConversationTurn[],
  onUpdated: (newSummary: string) => void
): Promise<void> {
  // Fire and forget
  setTimeout(async () => {
    try {
      if (recentTurns.length < 2) return;
      const backend = getInferenceBackend();
      const prompt = `You are a concise memory condenser. Update the rolling summary of this conversation in at most 2-3 sentences. Capture key constraints, decisions, and context.\n\nPrevious Summary: ${
        existingSummary || 'None'
      }\n\nRecent Turns:\n${recentTurns
        .slice(-4)
        .map((t) => `${t.role.toUpperCase()}: ${t.content.slice(0, 500)}`)
        .join('\n')}`;

      const res = await backend.complete({
        model: config.FAST_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.2,
      });

      if (res.text && res.text.trim()) {
        onUpdated(res.text.trim());
      }
    } catch (err) {
      // Background summary failure is non-blocking
      console.warn('[ContextManager] Background summary update skipped:', err);
    }
  }, 10);
}
