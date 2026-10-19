export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface InferenceRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  json_mode?: boolean;
  abortSignal?: AbortSignal;
}

export interface StreamChunk {
  text: string;
  done?: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    cached_tokens?: number;
  };
}

export interface CompletionResult {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    cached_tokens?: number;
  };
}

export interface InferenceBackend {
  readonly name: string;
  streamChat(request: InferenceRequest): AsyncGenerator<StreamChunk, void, unknown>;
  complete(request: InferenceRequest): Promise<CompletionResult>;
}
