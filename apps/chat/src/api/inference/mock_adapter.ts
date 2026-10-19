import { InferenceBackend, InferenceRequest, StreamChunk, CompletionResult } from './types.ts';

export type MockScenario =
  | 'default'
  | 'fast'
  | 'slow'
  | 'tool_use'
  | 'artifact'
  | 'error'
  | 'rate_limit'
  | 'mid_stream_disconnect';

let activeScenario: MockScenario = 'default';

export function setMockScenario(scenario: MockScenario) {
  activeScenario = scenario;
}

export function getMockScenario(): MockScenario {
  return activeScenario;
}

export class MockBackend implements InferenceBackend {
  public readonly name = 'mock';

  public async *streamChat(request: InferenceRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const isRouter = request.json_mode || request.messages[0]?.content.includes('routing function');

    if (isRouter) {
      // Kybernes Router response in mock
      const userText = request.messages[request.messages.length - 1]?.content.toLowerCase() || '';
      let primary = 'techne';
      let needsTools: string[] = [];

      if (userText.includes('design') || userText.includes('ui') || userText.includes('token') || userText.includes('layout')) {
        primary = 'morphe';
      } else if (userText.includes('research') || userText.includes('paper') || userText.includes('citation') || userText.includes('fact')) {
        primary = 'gnosis';
        needsTools = ['search'];
      } else if (userText.includes('math') || userText.includes('reasoning') || userText.includes('proof') || userText.includes('trade-off') || userText.includes('shard')) {
        primary = 'logos';
      } else if (userText.includes('write') || userText.includes('email') || userText.includes('memo') || userText.includes('summary') || userText.includes('tone')) {
        primary = 'rhetor';
      }

      if (activeScenario === 'tool_use') {
        needsTools = ['search', 'retrieval'];
      }

      const routerJson = JSON.stringify({
        primary,
        secondary: null,
        parallel: false,
        complexity: 'low',
        needs_tools: needsTools,
        handoff_note: 'Calibrated domain response aligned with requested delivery invariants',
      });

      yield { text: routerJson };
      return;
    }

    // Specialist response simulation
    if (activeScenario === 'rate_limit') {
      const err = new Error('Rate limit exceeded: 429 Too Many Requests. Retry after 12 seconds.');
      (err as any).status = 429;
      throw err;
    }

    if (activeScenario === 'error') {
      const err = new Error('Inference upstream timeout: specialist compute pipeline timed out.');
      (err as any).code = 'UPSTREAM_TIMEOUT';
      throw err;
    }

    const sys = request.messages[0]?.content || '';
    const userMsg = request.messages[request.messages.length - 1]?.content || '';
    const delay = activeScenario === 'slow' ? 60 : activeScenario === 'fast' ? 10 : 25;

    // Generate domain-contract compliant response
    let responseText = '';
    if (sys.includes('ROLE: TECHNE')) {
      responseText = `The implementation uses an in-memory sliding window algorithm with monotonic millisecond timestamps to enforce strict concurrency limits without background timer drift.

\`\`\`typescript
export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export class SlidingWindowLimiter {
  private timestamps: number[] = [];

  constructor(private readonly options: RateLimitOptions) {}

  public isAllowed(now = Date.now()): { allowed: boolean; remaining: number } {
    const windowStart = now - this.options.windowMs;
    this.timestamps = this.timestamps.filter((ts) => ts > windowStart);

    if (this.timestamps.length < this.options.maxRequests) {
      this.timestamps.push(now);
      return {
        allowed: true,
        remaining: this.options.maxRequests - this.timestamps.length,
      };
    }

    return { allowed: false, remaining: 0 };
  }
}
\`\`\`

What breaks:
- Memory footprint grows linearly with high RPS if timestamps array is not pruned on read.
- Clock skew across multi-tenant servers can cause edge boundary jitter.`;
    } else if (sys.includes('ROLE: MORPHE')) {
      responseText = `Rationale:
A clean single-elevation card utilizing surface-1 (#111111), hairline border (#262626), and tabular numbers eliminates layout jitter while respecting the strict 5% magenta accent budget.

\`\`\`tsx
export function WorkspaceArtifactCard({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#262626] rounded-[10px] p-4 text-[#FAFAFA]">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#262626]">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <span className="text-xs text-[#A3A3A3] font-mono tabular-nums">{badge}</span>
      </div>
      <div className="text-xs text-[#A3A3A3] leading-relaxed">
        {children}
      </div>
    </div>
  );
}
\`\`\`

Accessibility Notes:
- Text contrast ratio between #FAFAFA and #111111 is 15.8:1, well above the 4.5:1 WCAG AA threshold.
- Interactive boundaries use explicit 1px borders rather than color alone to signal enclosure.`;
    } else if (sys.includes('ROLE: GNOSIS')) {
      responseText = `Empirical literature demonstrates that speculative decoding reduces time-to-first-token and overall wall-clock generation latency by 1.8x to 2.4x on structured queries without altering output distribution.

Key Findings:
- Speculative verification accepts tokens from a lightweight draft model in parallel batches using the target model's forward pass [Established, High Confidence].
- KV-cache prefix reuse achieves up to 85% cache hit rates when system prompts and role modules are strictly positioned before dynamic conversation context [Established, High Confidence].
- Speculative dispatch in orchestration skips routing latency for unambiguous inputs with >90% precision.

Comparison:
| Optimization | Target Metric | Trade-Off |
| :--- | :--- | :--- |
| KV-Cache Prefix Reuse | Time-to-First-Token | Strict prompt block ordering requirement |
| Speculative Dispatch | End-to-End Latency | Speculative abort overhead when route disagrees |

Confidence & Unknowns:
- Overall Confidence: High.
- Unknowns: Exact speedup on heterogeneous GPU clusters depends on interconnect bandwidth and PCIe contention.`;
    } else if (sys.includes('ROLE: LOGOS')) {
      responseText = `Problem & Constraints:
Evaluate whether to implement eager speculative dispatch or serialized router execution given a 1,500ms router timeout budget and a 92% pre-router heuristic precision.

Decision Framework:
1. Expected Latency:
   - Serialized: $E[L] = T_{\\text{router}} + T_{\\text{spec}} \\approx 800\\text{ms} + 1200\\text{ms} = 2000\\text{ms}$.
   - Speculative: $E[L] = 0.92 \\times T_{\\text{spec}} + 0.08 \\times (T_{\\text{spec}} + T_{\\text{redispatch}}) \\approx 1200\\text{ms} + 96\\text{ms} = 1296\\text{ms}$.
2. Net Latency Reduction: 704ms ($35.2\\%$ improvement on perceived TTFT).
3. Compute Waste: $8\\%$ of requests incur an aborted specialist generation, which is trivial compared to the user responsiveness gain.

Conclusion:
Enable speculative dispatch whenever heuristic pre-router confidence exceeds 0.82.
Deciding Assumption: Upstream API permits non-blocking request cancellation via AbortController with zero billing penalty for unstreamed tokens.`;
    } else if (sys.includes('ROLE: RHETOR')) {
      responseText = `**Noevix System Architecture Brief**

Noevix consolidates specialized computational intelligence behind a single, unified interface. By decoupling user intent into modular cognitive lenses—engineering, design, research, reasoning, and editorial writing—it achieves surgical precision while preserving a calm, direct, and authoritative voice.

We enforce sub-millisecond prefix caching, heuristic pre-routing, and zero-pill visual discipline to deliver exceptional perceived speed and interface craft.

---
*Rationale: Delivers the core architectural identity and value proposition with high density and no corporate fluff.*`;
    } else {
      // Generalist response
      responseText = `Noevix is ready. What problem or system are we building today? State the constraints or code requirements to begin.`;
    }

    // Stream tokens in words/chunks
    const words = responseText.split(' ');
    let charCount = 0;
    const totalChars = responseText.length;

    for (let i = 0; i < words.length; i++) {
      if (request.abortSignal?.aborted) {
        throw new Error('Inference aborted by client');
      }

      if (activeScenario === 'mid_stream_disconnect' && i > 12) {
        // Halt midway to simulate connection break
        break;
      }

      const chunk = (i === 0 ? '' : ' ') + words[i];
      charCount += chunk.length;
      yield { text: chunk };

      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    yield {
      text: '',
      done: true,
      usage: {
        prompt_tokens: Math.round(request.messages.reduce((acc, m) => acc + m.content.length / 4, 0)),
        completion_tokens: Math.round(totalChars / 4),
        cached_tokens: Math.round(totalChars / 8),
      },
    };
  }

  public async complete(request: InferenceRequest): Promise<CompletionResult> {
    let fullText = '';
    let usage: CompletionResult['usage'] = { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0 };
    for await (const chunk of this.streamChat(request)) {
      fullText += chunk.text;
      if (chunk.usage) {
        usage = chunk.usage;
      }
    }
    return { text: fullText, usage };
  }
}
