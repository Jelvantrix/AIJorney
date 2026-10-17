import { PublicLens, Message, Conversation, ArtifactEvent } from '../../packages/contracts/index.ts';

export type WorkspaceTab = 'code' | 'document' | 'preview' | 'diff' | 'telemetry';

export interface ActiveArtifact {
  id: string;
  type: 'code' | 'document' | 'preview' | 'diff';
  title: string;
  language?: string;
  content: string;
  version?: number;
}

export interface StreamingState {
  isStreaming: boolean;
  activeLens: PublicLens | null;
  secondaryLens: PublicLens | null;
  currentTool: { name: string; status: 'start' | 'end' | 'error' } | null;
  partialContent: string;
  error: { code: string; message: string; retryable: boolean } | null;
  rateLimitCountdown: number | null;
  t_route?: number;
  ms_first_token?: number;
  ms_total?: number;
  tokens_in?: number;
  tokens_out?: number;
}
