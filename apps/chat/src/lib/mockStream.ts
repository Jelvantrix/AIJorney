export interface StreamChunk {
  token: string;
  isInitial?: boolean;
}

const RESPONSE_TEMPLATES: Array<{
  match: RegExp;
  response: string;
}> = [
  {
    match: /(code|implement|function|algorithm|typescript|python|react|hook|bug|error|refactor|rust)/i,
    response: `Here is a high-performance in-memory ring buffer implementation designed for lock-free single-producer single-consumer concurrency.

\`\`\`typescript
export interface RingBufferOptions {
  capacity: number; // Must be power of two
}

export class RingBuffer<T> {
  private readonly buffer: Array<T | undefined>;
  private readonly mask: number;
  private head = 0;
  private tail = 0;

  constructor(options: RingBufferOptions) {
    if ((options.capacity & (options.capacity - 1)) !== 0) {
      throw new Error("Capacity must be a power of two");
    }
    this.buffer = new Array(options.capacity);
    this.mask = options.capacity - 1;
  }

  public push(item: T): boolean {
    if (this.head - this.tail >= this.buffer.length) {
      return false; // Full
    }
    this.buffer[this.head & this.mask] = item;
    this.head++;
    return true;
  }

  public pop(): T | undefined {
    if (this.tail === this.head) {
      return undefined; // Empty
    }
    const idx = this.tail & this.mask;
    const item = this.buffer[idx];
    this.buffer[idx] = undefined;
    this.tail++;
    return item;
  }

  public size(): number {
    return this.head - this.tail;
  }
}
\`\`\`

### Invariants
1. **Bitwise Masking**: Modulo arithmetic is replaced with \`& this.mask\`.
2. **Zero Allocation**: Buffer elements are reused continually without GC pressure.
3. **Monotonic Pointers**: Cursors increment monotonically avoiding wrap-around branch costs.`,
  },
  {
    match: /(table|compare|comparison|vs|difference|trade-off|database|postgres|dynamo)/i,
    response: `A comparative evaluation of persistence engines for high-concurrency event-driven architectures:

| Parameter | PostgreSQL | Apache Cassandra | Amazon DynamoDB |
| :--- | :--- | :--- | :--- |
| **Transaction Boundary** | ACID across arbitrary foreign keys | Partition-isolated lightweight transactions | Single-partition ACID / TransactItems |
| **Indexing Model** | B-Tree, GIN, BRIN, Partial, Vector | Partition Key + Clustering Key only | Hash Primary Key + Global Secondary Indexes |
| **Horizontal Partitioning** | Citus extension / Declarative Partitioning | Consistent Hash Ring with Virtual Nodes | Managed Partition Router with auto-splits |
| **Storage Engine** | Heap pages with VACUUM MVCC | Log-Structured Merge (LSM) Trees | Proprietary SSD B-Tree log architecture |
| **Operational Effort** | Connection pooling (PgBouncer) | Compaction tuning & repair routines | Fully managed serverless AWS cloud |

### Synthesis
Start with PostgreSQL for general domain models. Migrate high-throughput append-only streams to an LSM-tree based engine only when write volume exceeds single-node SSD IOPS limits.`,
  },
  {
    match: /(design|aura|editorial|typography|light in a dark room)/i,
    response: `The "Light in a dark room" constitution establishes an editorial instrument where illumination is the singular decorative element.

### Architectural Tenets
1. **Absolute Zero Saturation**: Color is not an aesthetic dial; it is eliminated. Luminance contrast alone defines hierarchy.
2. **The Reactive Aura**: A GPU-accelerated atmospheric bloom that pulses with system energy: breathing when idle, heating during token synthesis, decaying upon resolution.
3. **Typography as Structure**: Large Instrument Serif headlines convey human intent; crisp Geist sans conveys machine precision; Geist Mono encodes metadata.`,
  },
  {
    match: /(explain|concept|how does|what is|how do)/i,
    response: `Speculative execution in modern processor architectures and inference pipelines leverages spare compute capacity to predict future states before previous dependencies resolve.

1. **Branch Prediction**: The processing unit guesses the most likely execution path based on historical branching statistics.
2. **Eager Evaluation**: Instructions along the predicted path execute out-of-order, storing results in temporary reorder buffers.
3. **Commit or Rollback**: If the prediction was accurate, results commit to architectural state in zero additional cycles. If inaccurate, the speculative pipeline flushes immediately with no persistent side effects.

In language model serving (speculative decoding), a lightweight draft model generates candidate tokens in parallel batches, which a larger target model verifies in a single forward pass, typically cutting perceived latency by 40% to 60%.`,
  },
];

export async function* streamMockResponse(
  userPrompt: string,
  signal?: AbortSignal,
  forcedScenario?: string,
  style?: 'paragraphs' | 'lists' | 'tables' | 'code_first'
): AsyncGenerator<string, void, unknown> {
  // Scenario testing: Error immediately
  if (forcedScenario === 'error') {
    throw new Error('500: Specialist inference cluster unavailable');
  }

  // Scenario testing: Rate limit
  if (forcedScenario === 'rate_limit') {
    throw new Error('429: Rate limit exceeded. Retry after 20s');
  }

  // 1. Initial "thinking" delay
  const isFast = forcedScenario === 'fast';
  const isSlow = forcedScenario === 'slow';
  const initialDelay = isFast ? 120 : isSlow ? 1800 : 380 + Math.random() * 250;
  await new Promise((resolve) => setTimeout(resolve, initialDelay));

  if (signal?.aborted) return;

  // 2. Select response template based on prompt and style preference
  let selected = RESPONSE_TEMPLATES.find((t) => t.match.test(userPrompt))?.response;

  if (selected) {
    if (style === 'lists' && !selected.includes('- ')) {
      selected = `Structured Invariants & Analysis:\n\n- ${selected.replace(/\n\n/g, '\n- ')}`;
    } else if (style === 'paragraphs' && selected.includes('1. ') && !selected.includes('```')) {
      selected = selected.replace(/\d+\.\s+\*\*(.*?)\*\*:\s*/g, '$1: ');
    }
  } else {
    if (style === 'lists') {
      selected = `Structured Breakdown & Invariants:\n\n- **Invariant Constraints**: Define formal mathematical boundary conditions prior to implementation.\n- **Execution Strategy**: Assemble a verifiable prototype with deterministic error boundaries and strict telemetry.\n- **Continuous Verification**: Validate p99 latency percentiles and edge failure modes under sustained throughput.\n- **Resource Footprint**: Keep memory allocation strictly O(1) in critical paths.\n- **Verification Test**: Execute load test harness and invariant checks.\n\nSpecify which subsystem parameter you wish to analyze further.`;
    } else if (style === 'paragraphs') {
      selected = `When approaching this system, the primary architectural imperative is to establish immutable boundary constraints before committing to implementation details. By clarifying memory guarantees and network fault models up front, the resulting subsystem avoids subtle concurrency regressions.\n\nA verifiable prototype should be constructed with deterministic error boundaries and continuous telemetry. Profiling latency percentiles under realistic load reveals memory bottlenecks early, ensuring that production throughput targets are met without premature complexity.`;
    } else if (style === 'code_first') {
      selected = `\`\`\`typescript\n// Immediate executable solution\nexport function verifyInvariant<T>(state: T, predicate: (s: T) => boolean): boolean {\n  if (!predicate(state)) {\n    throw new Error("State invariant violated");\n  }\n  return true;\n}\n\`\`\`\n\nThis pattern enforces preconditions synchronously before state transitions occur.`;
    } else {
      selected = `Structured Assessment:\n\n1. **First Principles**: Define invariant constraints and boundary conditions before architectural choices.\n2. **Execution Strategy**: Assemble a verifiable prototype with deterministic error boundaries and strict telemetry.\n3. **Continuous Verification**: Validate latency percentiles and edge failure modes under sustained throughput.\n\nSpecify which component you wish to inspect next.`;
    }
  }

  // 3. Tokenize by words and punctuation
  const tokenRegex = /(\s+|[^\s\w]+|\w+)/g;
  const rawTokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(selected)) !== null) {
    rawTokens.push(m[0]);
  }

  const midPoint = Math.floor(rawTokens.length / 2);

  for (let i = 0; i < rawTokens.length; i++) {
    if (signal?.aborted) {
      return;
    }

    // Mid-stream disconnect scenario test
    if (forcedScenario === 'mid_stream_disconnect' && i >= midPoint) {
      throw new Error('Connection reset by peer mid-stream');
    }

    const token = rawTokens[i];
    yield token;

    // Cadence
    let delay = isFast ? 6 : isSlow ? 75 : 18 + Math.random() * 20;
    if (token.includes('.') || token.includes('!') || token.includes('?')) {
      delay += isFast ? 10 : 60;
    } else if (token.includes('\n')) {
      delay += isFast ? 8 : 30;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
