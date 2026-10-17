# DECISIONS.md - Noevix Architectural & Design Decisions

This document records architectural, product, and implementation decisions made during the design and construction of Noevix, along with rejected alternatives and trade-offs.

---

### D-001: Monorepo & Single-Process Express + Vite Server
- **Decision**: Run the backend orchestration and frontend Vite SPA within a unified Node.js process using `express` and `vite.middlewares` in dev mode, mounting API routes under `/v1/*` and health probes under `/healthz` and `/readyz`.
- **Alternative Rejected**: Separate Next.js App Router server and Fastify service on multiple ports.
- **Rationale**: The execution environment operates in an iframe proxy on port 3000 where cross-port routing is fragile. Express with Vite middleware provides zero-latency SSR/HMR, direct shared-memory event pipelines, and instant startup while strictly preserving the monorepo structure in `/packages/*` and `/apps/*`.

### D-002: Swappable Inference Backend with Universal Interface
- **Decision**: Define a single `InferenceBackend` interface (`streamChat(request): AsyncGenerator<StreamChunk>`) with implementations for:
  1. `NvidiaNimBackend`: OpenAI-compatible NVIDIA NIM endpoint (`https://integrate.api.nvidia.com/v1` or custom base URL).
  2. `OpenAICompatibleBackend`: Standard vLLM / SGLang / OpenAI endpoint (`/v1/chat/completions`).
  3. `GeminiBackend`: Server-side Gemini API provider fallback using `@google/genai`.
  4. `MockBackend`: High-fidelity scripted scenario runner for development, automated testing, and offline verification (scenarios: fast, slow, tool_use, artifact, error, rate_limit, mid_stream_disconnect).
- **Alternative Rejected**: Hardcoding NVIDIA NIM SDK or client-side direct API calls.
- **Rationale**: Strict adherence to constraint 1 ("No application code may depend on NIM-specific behavior. Inference backend is swappable behind one interface").

### D-003: Single Intelligence Presentation & Lens Mapping
- **Decision**: The user interface never reveals internal specialist codenames (`techne`, `morphe`, `gnosis`, `logos`, `rhetor`) or internal routing mechanics. The user only observes an adaptive "lens" chip:
  - `techne` $\rightarrow$ `Engineering`
  - `morphe` $\rightarrow$ `Design`
  - `gnosis` $\rightarrow$ `Research`
  - `logos` $\rightarrow$ `Reasoning`
  - `rhetor` $\rightarrow$ `Writing`
  Users can click this chip to override the route or correct a classification.
- **Alternative Rejected**: Displaying "Multi-agent committee" or individual agent avatars.
- **Rationale**: Meets section 1 requirements ("Noevix presents itself to users as ONE intelligence... Users must never see internal specialist names, routing JSON, or any sign of multiple models").

### D-004: Strict 4-Block Prompt Assembly with SHA-256 Prefix Hashes
- **Decision**: Prompts are assembled in strict static-first, dynamic-last order:
  - Block 1: Constitution (`constitution.v1.md`, identical bytes across all specialists, includes prompt-injection canary string).
  - Block 2: Specialist Role Module (`<specialist>.v1.md`, static domain guidelines, operating principles, contract, few-shots).
  - Block 3: Session State (compact JSON of rolling summary + user preferences + task state).
  - Block 4: Dynamic Turn (handoff note + last $N=6$ message turns + user query + sandboxed tool outputs).
  Each block is hashed with SHA-256; block hashes are recorded in turn telemetry to measure prefix cache hit efficiency.
- **Alternative Rejected**: Dynamic Jinja/handlebars templates with variable system prompts at the top.
- **Rationale**: Guarantees KV-cache reuse on NVIDIA NIM, vLLM, and modern LLM serving engines.

### D-005: Heuristic Pre-Router with Speculative Dispatch
- **Decision**: Implement a sub-millisecond heuristic pre-router that scans the incoming user prompt for strong signals (code fences, stack traces, "create a component", UI layout queries, formal proofs/math, document editing). When confidence $\ge 0.82$, it triggers a speculative dispatch of the primary specialist while Kybernes (router) executes concurrently. If Kybernes agrees, speculative tokens stream without delay. If it disagrees, the speculative request is aborted via `AbortController` and redispatched.
- **Alternative Rejected**: Always waiting 800–1500ms for LLM routing before initiating specialist generation.
- **Rationale**: Slashes time-to-first-token (TTFT) by up to 60% on predictable inputs.

### D-006: Conversation Tree Architecture for Edit-and-Branch
- **Decision**: Represent conversations as an acyclic message tree where each message has a `parent_id`. When a user edits an earlier message or regenerates a response, a new branch is created with branch navigation (`< 1 / 3 >`) rather than clobbering history.
- **Alternative Rejected**: Linear flat array of messages.
- **Rationale**: Mandated in section 2.8 ("Conversation model is a TREE (message has parent_id) to support edit-and-branch").

### D-007: Magenta Budget $\le 5\%$ and Zero-Pill Design Discipline
- **Decision**: Pure minimalist dark (#0A0A0A) and light (#FAFAFA) palette following Linear/Vercel/Raycast restraint. Signature magenta (`#FF2E8A`, `#D10F6B` for text) is strictly budgeted under 5% of screen area, restricted to primary CTA, active lens indicator, focus ring, and streaming indicator line. No candy pills, no glow cards, no decorative pulsing dots.
- **Alternative Rejected**: Generic gradient borders and purple card capsules.
- **Rationale**: Frontend design skill compliance and brief constraints.

### D-008: Privacy Consent and Local Persistence
- **Decision**: User consent toggle for data logging stored locally. When consent is disabled (`user_logging_consent: false`), turn inputs and raw message content are excluded from disk logs; only anonymized latency telemetry and route accuracy counters are stored.
- **Alternative Rejected**: Forcing full logging regardless of user choice.
- **Rationale**: Hard constraint in section 1 and 2.9 ("Include a consent flag per user; do not log when it is off").
