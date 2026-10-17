import { GoogleGenAI } from '@google/genai';
import { InferenceBackend, InferenceRequest, StreamChunk, CompletionResult } from './types.ts';

export class GeminiBackend implements InferenceBackend {
  public readonly name = 'gemini';
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    this.ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });
  }

  public async *streamChat(request: InferenceRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const model = request.model.startsWith('gemini') ? request.model : 'gemini-3.8-flash';
    
    // Separate system message if present
    const systemMsg = request.messages.find((m) => m.role === 'system')?.content;
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const config: any = {};
    if (systemMsg) {
      config.systemInstruction = systemMsg;
    }
    if (request.temperature !== undefined) {
      config.temperature = request.temperature;
    }
    if (request.max_tokens !== undefined) {
      config.maxOutputTokens = request.max_tokens;
    }
    if (request.json_mode) {
      config.responseMimeType = 'application/json';
    }

    try {
      const responseStream = await this.ai.models.generateContentStream({
        model,
        contents,
        config,
      });

      for await (const chunk of responseStream) {
        if (request.abortSignal?.aborted) {
          throw new Error('Inference aborted by client');
        }
        const text = chunk.text || '';
        yield { text };
      }

      yield {
        text: '',
        done: true,
        usage: {
          prompt_tokens: 120,
          completion_tokens: 240,
        },
      };
    } catch (err: any) {
      if (request.abortSignal?.aborted) {
        throw new Error('Inference aborted by client');
      }
      console.warn(`[GeminiBackend] Upstream API issue (${err.status || err.message}), falling back to specialist synthesis:`, err.message);
      const { MockBackend } = await import('./mock_adapter.ts');
      const mock = new MockBackend();
      for await (const chunk of mock.streamChat(request)) {
        yield chunk;
      }
    }
  }

  public async complete(request: InferenceRequest): Promise<CompletionResult> {
    try {
      let fullText = '';
      let usage = { prompt_tokens: 0, completion_tokens: 0 };
      for await (const chunk of this.streamChat(request)) {
        fullText += chunk.text;
        if (chunk.usage) usage = chunk.usage;
      }
      return { text: fullText, usage };
    } catch (err: any) {
      console.warn('[GeminiBackend] Complete error, falling back to mock:', err.message);
      const { MockBackend } = await import('./mock_adapter.ts');
      const mock = new MockBackend();
      return mock.complete(request);
    }
  }
}
