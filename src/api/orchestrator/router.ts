import { loadRouterPrompt } from '../../../packages/prompts/assembler.ts';
import { RouterOutput, RouterOutputSchema, SpecialistId } from '../../../packages/contracts/index.ts';
import { getInferenceBackend } from '../inference/index.ts';
import { config } from '../config.ts';
import { runPreRouter, recordAgreementWithLlm } from './pre_router.ts';

export async function routeTurn(
  userMessage: string,
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  signal?: AbortSignal
): Promise<{ route: RouterOutput; latencyMs: number; fromPreRouter: boolean }> {
  const startTime = Date.now();

  // 1. Run Pre-Router Heuristic
  const preRouter = runPreRouter(userMessage);

  // If pre-router has high confidence (>= 0.88), we can optimize
  // However, we still execute router with timeout 1500ms for verification or fallback
  const routerPrompt = loadRouterPrompt();

  // Build router conversation: last 2 turns + new message
  const boundedHistory = recentTurns.slice(-2);
  const historyText = boundedHistory.map((t) => `${t.role.toUpperCase()}: ${t.content}`).join('\n');
  const userContent = historyText
    ? `Recent turns:\n${historyText}\n\nUser message: ${userMessage}`
    : `User message: ${userMessage}`;

  const messages = [
    { role: 'system' as const, content: routerPrompt },
    { role: 'user' as const, content: userContent },
  ];

  // Timeout controller for 1500ms router timeout
  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutCtrl.abort();
  }, config.ROUTER_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => timeoutCtrl.abort());
  }

  try {
    const backend = getInferenceBackend();
    const routerModel = config.ROUTER_MODEL;

    // First attempt
    let rawText = '';
    try {
      const completion = await backend.complete({
        model: routerModel,
        messages,
        temperature: 0.1,
        max_tokens: 80,
        json_mode: true,
        abortSignal: timeoutCtrl.signal,
      });
      rawText = completion.text;
    } catch (err: any) {
      if (timeoutCtrl.signal.aborted && !signal?.aborted) {
        console.warn(`[Kybernes Router] Timed out after ${config.ROUTER_TIMEOUT_MS}ms, using fallback`);
        return makeFallbackRoute(preRouter.specialist, Date.now() - startTime, preRouter.hit);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // Parse JSON
    let parsed: any;
    try {
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        parsed = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1));
      } else {
        parsed = JSON.parse(rawText);
      }
    } catch {
      // Retry once on failure
      const retryCompletion = await backend.complete({
        model: routerModel,
        messages: [
          ...messages,
          { role: 'assistant' as const, content: rawText },
          { role: 'user' as const, content: 'Format error: output ONLY valid JSON matching the schema.' },
        ],
        temperature: 0.0,
        max_tokens: 80,
        json_mode: true,
        abortSignal: signal,
      });
      const rStart = retryCompletion.text.indexOf('{');
      const rEnd = retryCompletion.text.lastIndexOf('}');
      parsed = JSON.parse(retryCompletion.text.substring(rStart, rEnd + 1));
    }

    const validated = RouterOutputSchema.parse(parsed);
    const latencyMs = Date.now() - startTime;

    // Record agreement with pre-router
    if (preRouter.hit && preRouter.specialist) {
      recordAgreementWithLlm(preRouter.specialist === validated.primary);
    }

    return {
      route: validated,
      latencyMs,
      fromPreRouter: false,
    };
  } catch (err) {
    console.warn('[Kybernes Router] Error during routing, activating fallback:', err);
    return makeFallbackRoute(preRouter.specialist, Date.now() - startTime, preRouter.hit);
  }
}

function makeFallbackRoute(
  preRouterSpecialist: SpecialistId | null,
  latencyMs: number,
  hit: boolean
): { route: RouterOutput; latencyMs: number; fromPreRouter: boolean } {
  // If pre-router had a guess, use it; otherwise fallback to Logos for reasoning or Rhetor
  const fallbackPrimary: SpecialistId = preRouterSpecialist || 'rhetor';
  return {
    route: {
      primary: fallbackPrimary,
      secondary: null,
      parallel: false,
      complexity: 'low',
      needs_tools: [],
      handoff_note: 'Calibrated delivery aligned with domain constraints',
    },
    latencyMs,
    fromPreRouter: hit,
  };
}
