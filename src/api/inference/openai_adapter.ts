import { InferenceBackend, InferenceRequest, StreamChunk, CompletionResult } from './types.ts';

export interface OpenAIConfig {
  baseUrl: string;
  apiKey: string;
  name?: string;
  defaultHeaders?: Record<string, string>;
}

export class OpenAICompatibleBackend implements InferenceBackend {
  public readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(cfg: OpenAIConfig) {
    this.name = cfg.name || 'openai-compatible';
    this.baseUrl = cfg.baseUrl.replace(/\/+$/, '');
    this.apiKey = cfg.apiKey;
    this.defaultHeaders = cfg.defaultHeaders || {};
  }

  public async *streamChat(request: InferenceRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const url = `${this.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.json_mode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: request.abortSignal,
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Inference API error (${response.status}): ${errText}`);
      (err as any).status = response.status;
      throw err;
    }

    if (!response.body) {
      throw new Error('No response body returned from inference upstream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        if (request.abortSignal?.aborted) {
          await reader.cancel();
          throw new Error('Inference aborted by client');
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // comments/heartbeats
          if (trimmed === 'data: [DONE]') {
            yield { text: '', done: true };
            return;
          }
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              const usage = parsed.usage
                ? {
                    prompt_tokens: parsed.usage.prompt_tokens || 0,
                    completion_tokens: parsed.usage.completion_tokens || 0,
                    cached_tokens:
                      parsed.usage.prompt_tokens_details?.cached_tokens ||
                      parsed.usage.cached_tokens ||
                      0,
                  }
                : undefined;

              if (delta || usage) {
                yield { text: delta, usage };
              }
            } catch {
              // Ignore unparseable chunk
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  public async complete(request: InferenceRequest): Promise<CompletionResult> {
    const url = `${this.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: false,
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.json_mode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: request.abortSignal,
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Inference API error (${response.status}): ${errText}`);
      (err as any).status = response.status;
      throw err;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage
      ? {
          prompt_tokens: data.usage.prompt_tokens || 0,
          completion_tokens: data.usage.completion_tokens || 0,
          cached_tokens:
            data.usage.prompt_tokens_details?.cached_tokens ||
            data.usage.cached_tokens ||
            0,
        }
      : undefined;

    return { text, usage };
  }
}
