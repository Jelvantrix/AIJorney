import { z } from 'zod';

export const ToolSideEffectSchema = z.enum(['read', 'write_internal', 'write_external', 'destructive']);
export type ToolSideEffect = z.infer<typeof ToolSideEffectSchema>;

/**
 * Side-effect class (§9.1 of the architecture doc):
 * - read: no side effects, safe to run freely within budget
 * - write_internal: writes to the workspace/artifact store only
 * - write_external: writes outside the system (requires intent + approval)
 * - destructive: deletes or mutates existing data (requires intent + approval)
 */
export interface ToolDefinition<TParams = any, TResult = any> {
  name: string;
  description: string;
  sideEffect: ToolSideEffect;
  schema: z.ZodType<TParams>;
  execute(params: TParams, context?: any): Promise<TResult>;
  /** When true, this tool always requires human approval before execution (§9.4, P9). */
  requiresApproval?: boolean;
}

export interface ToolExecutionRecord {
  tool: string;
  sideEffect?: ToolSideEffect;
  params: Record<string, unknown>;
  output: string;
  status: 'start' | 'end' | 'error';
  durationMs: number;
  /** Whether a ToolCallIntent event was emitted before execution (§9.4 / Invariant I4). */
  intentRecorded?: boolean;
  /** Whether human approval was required and granted. */
  approvalRequired?: boolean;
  approvalDecision?: 'pending' | 'approved' | 'rejected';
  /** Fencing token of the step lease that owns this call. */
  fenceToken?: number;
}
