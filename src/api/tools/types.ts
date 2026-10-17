import { z } from 'zod';

export interface ToolDefinition<TParams = any, TResult = any> {
  name: string;
  description: string;
  schema: z.ZodType<TParams>;
  execute(params: TParams, context?: any): Promise<TResult>;
}

export interface ToolExecutionRecord {
  tool: string;
  params: Record<string, unknown>;
  output: string;
  status: 'start' | 'end' | 'error';
  durationMs: number;
}
