import { SYSTEM_CANARY_TOKEN } from '@/packages/prompts/assembler.ts';
import { logAudit } from './audit.ts';

export interface CanaryCheckResult {
  leaked: boolean;
  sanitizedText: string;
}

export function scanForCanaryLeakage(text: string, clientIp?: string): CanaryCheckResult {
  if (text.includes(SYSTEM_CANARY_TOKEN)) {
    logAudit({
      action: 'SYSTEM_PROMPT_CANARY_LEAK_DETECTED',
      ip: clientIp,
      status: 'blocked',
      details: { canaryToken: SYSTEM_CANARY_TOKEN },
    });

    // Truncate at canary token and warn
    const idx = text.indexOf(SYSTEM_CANARY_TOKEN);
    const safePrefix = text.substring(0, idx).trim();
    return {
      leaked: true,
      sanitizedText: safePrefix
        ? `${safePrefix}\n\n[Security Notice: System prompt data redacted.]`
        : '[Security Notice: Direct system prompt inspection is restricted.]',
    };
  }

  return {
    leaked: false,
    sanitizedText: text,
  };
}
