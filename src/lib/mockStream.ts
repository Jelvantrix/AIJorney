export interface StreamChunk {
  token: string;
  isInitial?: boolean;
}

const RESPONSE_TEMPLATES: Array<{
  match: RegExp;
  response: string;
}> = [
  {
    match: /(code|implement|function|algorithm|typescript|python|react|hook|bug|error|refactor)/i,
    response: `Here is an implementation of a token bucket rate limiter in TypeScript. It tracks replenishments with millisecond precision without requiring a background timer interval.

\`\`\`typescript
export interface TokenBucketOptions {
  capacity: number;       // Maximum burst tokens
  refillRatePerSec: number; // Tokens added per second
}

export class TokenBucket {
  private capacity: number;
  private tokens: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.tokens = options.capacity;
    this.refillRate = options.refillRatePerSec;
    this.lastRefill = Date.now();
  }

  public consume(tokensRequested = 1): boolean {
    this.refill();

    if (this.tokens >= tokensRequested) {
      this.tokens -= tokensRequested;
      return true;
    }

    return false;
  }

  public getRemainingTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
    this.lastRefill = now;
  }
}
\`\`\`

### Key Considerations
1. **Memory efficiency**: Each instance only holds four numeric properties.
2. **Monotonic drift**: Calculations compute elapsed delta on demand, preventing timer pileup during idle periods.
3. **Cluster scaling**: For distributed workloads across multiple nodes, sync state with Redis via atomic Lua scripts.`,
  },
  {
    match: /(table|compare|comparison|vs|difference|trade-off|database|postgres|dynamo)/i,
    response: `When deciding between relational and document databases for transactional workloads, the primary criteria are schema predictability, join complexity, and scale inflection points.

| Dimension | PostgreSQL | DynamoDB | SQLite |
| :--- | :--- | :--- | :--- |
| **Data Model** | Relational / Strict Schema | Document / Key-Value | Embedded Relational |
| **ACID Guarantees** | Full across arbitrary joins | Single-item / Opt-in multi-table | Full on single writer |
| **Scaling Profile** | Vertical first, read replicas | Near-infinite horizontal partitions | Single node / Embedded |
| **Operational Overhead** | Connection pooling, vacuuming | Fully managed AWS native | Zero administration |
| **Cost at Low Volume** | Fixed instance cost | Pay-per-request free tier | Local zero cost |

### Recommendation
For early-to-mid stage web applications, PostgreSQL remains the most flexible choice. Introduce DynamoDB or ScyllaDB only when horizontal write volume surpasses the single primary throughput ceiling (typically 15,000+ writes/second on modern NVMe drives).`,
  },
  {
    match: /(explain|concept|how does|what is|how do)/i,
    response: `Speculative execution in modern processor architectures and inference pipelines leverages spare compute capacity to predict future states before previous dependencies resolve.

1. **Branch Prediction**: The processing unit guesses the most likely execution path based on historical branching statistics.
2. **Eager Evaluation**: Instructions along the predicted path execute out-of-order, storing results in temporary reorder buffers.
3. **Commit or Rollback**: If the prediction was accurate, results commit to architectural state in zero additional cycles. If inaccurate, the speculative pipeline flushes immediately with no persistent side effects.

In language model serving (speculative decoding), a lightweight draft model generates candidate tokens in parallel batches, which a larger target model verifies in a single forward pass, typically cutting perceived latency by 40% to 60%.`,
  },
  {
    match: /(plan|email|draft|write|memo|project)/i,
    response: `Here is a concise launch announcement ready to share with internal stakeholders:

**Subject:** Noevix Core Deployment & Rollout Schedule

Team,

We are rolling out Noevix v1.0 across all staging environments today at 15:00 UTC, with production availability slated for Thursday.

### What is changing:
- **Perceived Latency**: Sub-300ms time-to-first-token via pre-warmed inference pipelines.
- **Unified Interface**: Clean, content-first layout with zero visual clutter.
- **Reliability**: Deterministic retry fallbacks and client-side draft preservation.

Please report any unexpected behavior directly in the #product-releases channel. All metrics are live on our internal telemetry dashboard.`,
  },
];

export async function* streamMockResponse(
  userPrompt: string,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  // 1. Initial "thinking" delay (300ms - 700ms)
  const initialDelay = 350 + Math.random() * 300;
  await new Promise((resolve) => setTimeout(resolve, initialDelay));

  if (signal?.aborted) return;

  // 2. Select response template
  let selected = RESPONSE_TEMPLATES.find((t) => t.match.test(userPrompt))?.response;
  if (!selected) {
    selected = `Here is a structured overview regarding your request:

1. **First Principle**: State constraints and assumptions directly before choosing an approach.
2. **Implementation**: Build minimal verifiable solutions with defensive boundary checks.
3. **Iteration**: Profile latency and memory under realistic concurrency before optimizing prematurely.

If you have specific criteria or code to review, paste it here and we can dissect the exact requirements.`;
  }

  // 3. Break into tokens (words with punctuation attachment)
  // Split preserving spaces and punctuation
  const tokenRegex = /(\s+|[^\s\w]+|\w+)/g;
  const rawTokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(selected)) !== null) {
    rawTokens.push(m[0]);
  }

  for (let i = 0; i < rawTokens.length; i++) {
    if (signal?.aborted) {
      return;
    }

    const token = rawTokens[i];
    yield token;

    // Natural cadence: 20-50ms for normal tokens, longer for sentence terminators
    let delay = 22 + Math.random() * 25;
    if (token.includes('.') || token.includes('!') || token.includes('?')) {
      delay += 80;
    } else if (token.includes(',') || token.includes(';')) {
      delay += 40;
    } else if (token.includes('\n')) {
      delay += 30;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
