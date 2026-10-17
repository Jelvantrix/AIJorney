import {
  ChatRequest,
  RouteEvent,
  RouteEventSchema,
  SpecialistStartEventSchema,
  TokenEventSchema,
  ToolEvent,
  ToolEventSchema,
  ArtifactEvent,
  ArtifactEventSchema,
  ErrorEvent,
  ErrorEventSchema,
  DoneEvent,
  DoneEventSchema,
  PublicLens,
} from '../../packages/contracts/index.ts';

export interface SSECallbacks {
  onRoute?: (route: RouteEvent) => void;
  onSpecialistStart?: (lens: PublicLens) => void;
  onToken?: (deltaText: string, fullText: string) => void;
  onTool?: (tool: ToolEvent) => void;
  onArtifact?: (artifact: ArtifactEvent) => void;
  onSpecialistEnd?: (lens: PublicLens) => void;
  onError?: (err: ErrorEvent) => void;
  onDone?: (done: DoneEvent) => void;
}

export async function streamChatCompletion(
  req: ChatRequest,
  callbacks: SSECallbacks,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch('/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(req),
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After') || '15');
      const errPayload = await response.json().catch(() => ({}));
      callbacks.onError?.({
        code: 'RATE_LIMIT_EXCEEDED',
        message: errPayload.message || `Rate limit reached. Retry after ${retryAfter}s`,
        retryable: true,
      });
      return;
    }

    const errText = await response.text();
    callbacks.onError?.({
      code: `HTTP_${response.status}`,
      message: errText || 'Network request failed',
      retryable: response.status >= 500,
    });
    return;
  }

  if (!response.body) {
    throw new Error('Readable stream not supported by browser/backend');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let accumulatedText = '';

  let currentEventName = 'message';
  let currentEventData = '';

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith(':')) {
          // SSE Comment / heartbeat
          continue;
        }

        if (trimmed.startsWith('event: ')) {
          currentEventName = trimmed.slice(7).trim();
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          currentEventData = trimmed.slice(6);

          try {
            const parsed = JSON.parse(currentEventData);

            switch (currentEventName) {
              case 'route': {
                const validated = RouteEventSchema.parse(parsed);
                callbacks.onRoute?.(validated);
                break;
              }
              case 'specialist_start': {
                const validated = SpecialistStartEventSchema.parse(parsed);
                callbacks.onSpecialistStart?.(validated.lens);
                break;
              }
              case 'token': {
                const validated = TokenEventSchema.parse(parsed);
                accumulatedText += validated.text;
                callbacks.onToken?.(validated.text, accumulatedText);
                break;
              }
              case 'tool': {
                const validated = ToolEventSchema.parse(parsed);
                callbacks.onTool?.(validated);
                break;
              }
              case 'artifact': {
                const validated = ArtifactEventSchema.parse(parsed);
                callbacks.onArtifact?.(validated);
                break;
              }
              case 'specialist_end': {
                callbacks.onSpecialistEnd?.(parsed.lens);
                break;
              }
              case 'error': {
                const validated = ErrorEventSchema.parse(parsed);
                callbacks.onError?.(validated);
                break;
              }
              case 'done': {
                const validated = DoneEventSchema.parse(parsed);
                callbacks.onDone?.(validated);
                break;
              }
            }
          } catch (parseErr) {
            console.warn('[SSE Parser] Dropped malformed event safely:', currentEventName, parseErr);
          }

          currentEventName = 'message';
          currentEventData = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
