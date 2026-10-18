# Noevix: System Architecture

**Version:** 0.1 (design baseline)
**Status:** Draft for implementation
**Scope:** A platform for long-running, verifiable professional work. Not a chat product.

---

## 0. How to read this document

- **Facts** are stated plainly. **Targets** are design goals, not measurements. **Assumptions** are marked `[A]`. **Open decisions** are marked `[OD]`.
- Every section distinguishes four build tiers where it matters: **MVP** (build now), **Production**, **Large-scale**, **Research**.
- Nothing here claims a benchmark result. All numeric values are proposed budgets to be validated by measurement.

---

## 1. Thesis and design principles

### 1.1 Thesis

The unit of work in professional and heavy tasks is not a conversation turn. It is a **mission**: a durable, budgeted, verifiable, auditable unit of work that may run for minutes to hours, touch sensitive data, execute code, and produce artifacts a professional signs their name to.

Chat is one possible client of the mission system. It is not the system.

### 1.2 Why this architecture fits the constraints

The base models are open-weight or hosted, and weaker than frontier models. Long tasks compound error: a step that is 95% reliable, run 20 times in sequence, succeeds about 36% of the time (0.95^20). Therefore the durable advantage must come from:

1. **Decomposition** into steps that are individually checkable.
2. **Verification** that is mostly deterministic, not model-judged.
3. **Durability** so failures are recoverable rather than fatal.
4. **Provenance** so every output is traceable.

These survive model upgrades. Prompt cleverness does not.

### 1.3 Principles

| # | Principle | Consequence |
|---|---|---|
| P1 | Prefer "could not verify" over confident wrongness | Every claim has a verification status; unverified claims are labeled, never hidden |
| P2 | State is an append-only event log | Resume, replay, audit, and training data come from one mechanism |
| P3 | Plans are DAGs, not free-form agent loops | Bounded, inspectable, resumable execution |
| P4 | Every step is idempotent and keyed | Retries and crashes never double-apply effects |
| P5 | Deterministic verification first, model critique last | Weak models become usable |
| P6 | Assume any document the model reads is hostile | Untrusted-data tagging, least privilege, approval gates |
| P7 | Budgets are hard limits | Tokens, time, tool calls, and dollars pause the mission, never silently overrun |
| P8 | The model plane is swappable | No application logic depends on one vendor or serving stack |
| P9 | Humans approve irreversible actions | External writes, destructive operations, and spend above threshold require sign-off |
| P10 | Build the thinnest vertical slice first | One mission type end to end before breadth |

---

## 2. Requirements, constraints, non-goals

### 2.1 Functional requirements

- F1. Accept a mission specification (goal, inputs, constraints, acceptance criteria, budgets).
- F2. Produce a plan as a DAG; allow human review and edit before execution.
- F3. Execute steps with agents and tools; stream live progress.
- F4. Verify outputs per step and for the final deliverable.
- F5. Pause for human approval at configured checkpoints.
- F6. Resume after any failure or deploy without data loss.
- F7. Produce artifacts (files, datasets, reports) with full provenance.
- F8. Export an audit report (steps, sources, tool runs, verification outcomes).
- F9. Support multi-tenant organizations with isolation.
- F10. Expose a stable API; the UI is a client of the same API.

### 2.2 Non-functional requirements (targets, to be validated)

| Area | Target |
|---|---|
| Durability | No acknowledged event lost; mission resumable from last committed event |
| Isolation | No cross-tenant data access under any single-component compromise |
| Interactivity | Plan visible within seconds of submit; step status updates streamed with sub-second delay |
| Throughput | Mission concurrency scales horizontally via stateless workers |
| Cost control | Hard per-mission and per-tenant budgets enforced pre-call |
| Auditability | Every output element traceable to step, source, or tool run |

### 2.3 Non-goals (v1)

- Training or fine-tuning foundation models.
- General-purpose "do anything" missions across all domains.
- Real-time collaborative editing between users.
- On-device inference.
- A consumer chat product.

### 2.4 Constraints

- Solo or very small team; one-year horizon.
- Limited capital: no custom pretraining; minimize fixed infrastructure.
- Model supply: hosted APIs and open weights. NVIDIA NIM is an allowed serving option, but production self-hosting of NIM requires an NVIDIA AI Enterprise license; developer-program access is for research, development, and testing. Design so this cost is avoidable.

---

## 3. System overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│ L1  CLIENTS      Mission Control UI · REST/SSE API · SDK · Chat view  │
├──────────────────────────────────────────────────────────────────────┤
│ L2  GATEWAY      authn/z · tenancy · quotas · idempotency · CSRF      │
├──────────────────────────────────────────────────────────────────────┤
│ L3  ORCHESTRATOR  Planner · DAG scheduler · Step runner ·             │
│                   Checkpoint & approval manager · Budget governor     │
├───────────────┬────────────────────────────┬─────────────────────────┤
│ L4  AGENTS    │ L5  VERIFICATION PLANE     │ L6  TOOL PLANE          │
│ role configs  │ deterministic · grounding  │ sandbox exec · search · │
│ over model    │ · redundancy · critic      │ file/RAG · connectors   │
│ plane         │                            │                         │
├───────────────┴────────────────────────────┴─────────────────────────┤
│ L7  WORKSPACE & STATE   event log · artifact store · KB · memory     │
├──────────────────────────────────────────────────────────────────────┤
│ L8  MODEL PLANE   router · tiers · adapters (NIM/vLLM/API) · cache   │
├──────────────────────────────────────────────────────────────────────┤
│ L9  CROSS-CUTTING   provenance · security · observability · cost ·   │
│                     evals                                            │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.1 Control flow (happy path)

```text
Client ──submit mission──▶ Gateway ──▶ Orchestrator
Orchestrator: create mission, emit MissionCreated
Planner agent ──▶ plan DAG ──▶ emit PlanProposed
Human (optional) approves/edits ──▶ emit PlanApproved
Scheduler: pick ready steps (deps satisfied, budget available)
  Step runner:
    assemble context ─▶ agent call(s) ─▶ tool calls (sandboxed)
    ─▶ emit StepOutputProduced
    ─▶ Verification plane ─▶ emit VerificationResult
    pass ─▶ StepCompleted
    fail ─▶ bounded repair loop ─▶ pass | escalate to human
All steps complete ─▶ Synthesizer ─▶ final deliverable
Final verification ─▶ MissionCompleted ─▶ audit report available
```

### 3.2 Data flow

- **Write path:** all state changes are events appended to the log inside a transaction with the outbox.
- **Read path:** UI and API read projections (materialized views folded from events) and stream live deltas.
- **Artifacts:** large binary or text outputs go to the content-addressed store; events reference them by hash.

---

## 4. Domain model

### 4.1 Entities

| Entity | Description | Key fields |
|---|---|---|
| Tenant | Organization boundary | id, plan, region, policy |
| User | Person in a tenant | id, tenant_id, role |
| Project | Container for knowledge and missions | id, tenant_id, settings |
| Mission | Unit of work | id, project_id, spec, state, budgets, created_by |
| Plan | Versioned DAG for a mission | id, mission_id, version, status |
| Step | Node in the DAG | id, plan_id, kind, inputs, outputs_schema, deps, policy |
| Attempt | One execution of a step | id, step_id, n, status, started_at, ended_at |
| Event | Immutable fact | id, mission_id, seq, type, payload, ts, actor |
| Artifact | Immutable content | hash, size, mime, producer_step, lineage |
| Claim | Atomic assertion in an output | id, text, artifact_ref, location |
| Evidence | Source passage or tool run supporting a claim | id, kind, ref, span, hash |
| Verification | Result of a check | id, target, verifier, outcome, detail |
| Approval | Human decision at a gate | id, target, decision, user, ts |
| Budget | Limits and consumption | tokens, seconds, tool_calls, dollars |

### 4.2 Mission specification (input contract)

```json
{
  "goal": "string, the outcome required",
  "inputs": [{ "kind": "file|dataset|url|text", "ref": "artifact hash or id" }],
  "constraints": ["string rules the result must obey"],
  "acceptance": [
    { "id": "A1", "check": "verifier id or rubric", "params": {} }
  ],
  "budgets": { "tokens": 0, "seconds": 0, "tool_calls": 0, "usd": 0 },
  "approvals": { "plan": true, "external_writes": true, "spend_over_usd": 0 },
  "data_policy": { "logging_consent": false, "retention_days": 30 }
}
```

Acceptance criteria are the contract. A mission is `completed` only when all required acceptance checks pass or are explicitly waived by a human.

### 4.3 Step specification

```json
{
  "id": "s_12",
  "kind": "extract|transform|analyze|generate|verify|synthesize",
  "agent": { "role": "executor", "domain": "optional", "tier": "small|medium|large" },
  "inputs": { "from_steps": ["s_3"], "artifacts": ["sha256:..."] },
  "tools_allowed": ["sandbox.python", "kb.search"],
  "output_schema": "json-schema ref",
  "verifiers": ["schema", "reexecute", "grounding"],
  "policy": { "max_attempts": 3, "timeout_s": 600, "requires_approval": false },
  "idempotency_key": "mission_id:step_id"
}
```

---

## 5. Mission lifecycle

### 5.1 State machine

```text
created ─▶ planning ─▶ awaiting_plan_approval ─▶ running ─▶ verifying ─┐
   │           │                 │                  │  ▲       │        │
   │           ▼                 ▼                  ▼  │       ▼        ▼
   │        failed           cancelled           paused  repairing  completed
   │                                              (budget │  │
   │                                               / human)│  ▼
   └──────────────────────────────────────────────────────┴─ awaiting_human
```

Transitions are events. The state is derived by folding events; there is no mutable "status" column that can disagree with history (a projection column exists for query speed and is rebuildable).

### 5.2 Step state machine

`pending → ready → running → produced → verifying → (passed | failed)`
`failed → repairing → running` (bounded by `max_attempts`) `→ escalated → (human_resolved | abandoned)`

### 5.3 Invariants

- I1. Events for a mission are totally ordered by `seq`.
- I2. A step executes only if all dependencies are `passed` (or explicitly waived).
- I3. No two attempts of the same step run concurrently (lease with fencing token).
- I4. A side-effecting tool call is recorded as intent before execution and as result after.
- I5. A budget check precedes every model call and tool call.
- I6. No artifact is mutated; edits create new hashes with lineage.

---

## 6. Orchestrator

### 6.1 Responsibilities

Plan lifecycle, DAG scheduling, step leasing, checkpointing, repair loops, approvals, budget governance, cancellation, and emitting the canonical event stream.

### 6.2 Event sourcing design

**Event store:** Postgres table, append-only, partitioned by time or mission hash at scale.

```sql
CREATE TABLE events (
  id          BIGSERIAL PRIMARY KEY,
  mission_id  UUID        NOT NULL,
  seq         BIGINT      NOT NULL,           -- per-mission monotonically increasing
  type        TEXT        NOT NULL,
  payload     JSONB       NOT NULL,
  actor       TEXT        NOT NULL,           -- user:id | agent:role | system
  causation   BIGINT,                         -- event id that caused this one
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id, seq)
);
```

- **Optimistic concurrency:** writers supply the expected `seq`; the unique constraint rejects conflicts.
- **Outbox pattern:** event insert and "work to dispatch" insert occur in one transaction; a dispatcher publishes after commit. This prevents lost or phantom work after crashes.
- **Projections:** `mission_view`, `step_view`, `budget_view`, `claims_view`, rebuilt by replaying events. Projection lag is monitored.
- **Snapshots:** per-mission snapshots every N events to bound replay time.

### 6.3 Core event types

`MissionCreated, PlanProposed, PlanEdited, PlanApproved, StepReady, StepLeased, StepStarted, ModelCallRequested, ModelCallCompleted, ToolCallIntent, ToolCallResult, StepOutputProduced, VerificationRequested, VerificationResult, RepairStarted, StepPassed, StepFailed, StepEscalated, ApprovalRequested, ApprovalDecided, BudgetWarning, BudgetExhausted, MissionPaused, MissionResumed, MissionCompleted, MissionFailed, MissionCancelled`

### 6.4 Scheduling and leasing

- Ready-step discovery: a step is ready when all dependency steps are `passed`.
- **MVP queue:** Postgres with `SELECT ... FOR UPDATE SKIP LOCKED` over a `work_items` table.
- **Lease:** worker takes a lease with a TTL and a monotonically increasing **fencing token**; every write from that worker carries the token, and the store rejects stale tokens (prevents zombie workers from writing after lease loss).
- **Heartbeats:** workers extend leases; missed heartbeats return the item to the queue.
- **Priority and fairness:** weighted fair queuing per tenant to prevent noisy-neighbor starvation.

### 6.5 Planner

- Input: mission spec, project knowledge summary, available tools and verifiers.
- Output: a DAG validated against a schema and static checks: acyclic, every step has a verifier or an explicit waiver, every output schema resolves, estimated budget ≤ mission budget.
- **Re-planning:** allowed only via `PlanEdited` events with a recorded reason; after a failed verification, the planner may propose a replacement subgraph. Re-plan count is capped.
- **Plan validation is deterministic code**, not a model opinion.

### 6.6 Repair loop

```text
on VerificationResult(fail):
  if attempts < max_attempts:
      build repair context = {original input, output, verifier detail}
      escalate tier if attempt >= 2
      re-run step
  else:
      emit StepEscalated -> human checkpoint (accept, edit, retry, abandon)
```

Repair prompts include the **specific verifier failure** (for example failing test output), which is far more effective than a generic "try again."

### 6.7 Budget governor

- Pre-call reservation: estimate tokens/cost, reserve against the mission budget, reconcile after the call.
- Hierarchy: tenant → project → mission → step.
- On 80% consumption: `BudgetWarning`. On exhaustion: `MissionPaused` with all partial artifacts preserved and a clear resume path (raise budget or accept partial).

### 6.8 Build vs buy for workflow durability

| Option | Pros | Cons | Use when |
|---|---|---|---|
| Postgres event log + SKIP LOCKED worker (custom) | Minimal infra, full control, one datastore | You own retries, timers, sagas | MVP |
| Temporal | Mature durable execution, timers, signals | Operational weight, learning curve, determinism constraints | Production, when workflow variety grows |
| Cloud step functions | Managed | Vendor lock-in, awkward for long LLM steps | Rarely recommended here |

**Recommendation:** custom Postgres runner for MVP behind an interface (`WorkflowEngine`) so that migrating to Temporal later changes one adapter, not the domain logic.

---

## 7. Agents

### 7.1 Definition

An agent is **configuration**, not an entity: `{ role prompt, tool allowlist, output schema, context policy, model tier }`. All agents run on the same model plane.

### 7.2 Roles

| Role | Purpose | Notes |
|---|---|---|
| Planner | Produce and revise the DAG | Highest tier available; output schema-validated |
| Executor | Perform a step (domain-configurable) | Domain variants added only if evals show gains over generalist |
| Critic | Rubric-based review | Advisory; never the sole gate |
| Synthesizer | Assemble final deliverable with claim-evidence links | Must cite evidence IDs, not free-text sources |
| Summarizer | Rolling context compression | Off the critical path |

### 7.3 Prompt assembly (cache-friendly order)

1. **Constitution** (static, versioned, identical bytes across roles).
2. **Role module** (static, versioned).
3. **Mission context** (spec, plan, project memory; changes rarely).
4. **Step context** (inputs, retrieved evidence, prior failures).

Static-first ordering enables prefix-cache reuse on backends that support it. Each block is hashed and the hash is recorded on the event, so any output can be tied to exact prompt versions.

### 7.4 Context policy

- Hard token cap per call with deterministic truncation order: oldest tool logs first, then older step summaries; never the constitution, role module, or acceptance criteria.
- Evidence is injected as numbered, delimited passages so the model can cite IDs.
- Untrusted content (documents, web, tool output) is wrapped in tagged delimiters and the constitution states these are data, not instructions.

### 7.5 Structured outputs

Every agent output has a schema. Use constrained decoding where the backend supports it; otherwise validate and retry once with the validation error appended. Unstructured prose is only permitted in designated `narrative` fields.

---

## 8. Verification plane

The differentiator. Treat the verifier library as a product.

### 8.1 Verifier hierarchy (strongest first)

| Tier | Type | Examples |
|---|---|---|
| V1 | Deterministic, executable | Compile, run tests, type-check, lint, re-execute calculations, schema validation, unit/dimension checks, query against fixtures, golden-file diff, reconcile totals |
| V2 | Grounding | Cited passage exists in source; passage lexically/semantically supports claim; numbers in claim match source |
| V3 | Redundancy | Independent re-derivation (different prompt or model); disagreement flags for review |
| V4 | Model critic | Rubric-driven LLM review; advisory only |

### 8.2 Verifier interface

```ts
interface Verifier {
  id: string;
  version: string;
  applies(step: Step, output: Output): boolean;
  run(ctx: VerifyContext): Promise<VerificationResult>;
}

type VerificationResult = {
  outcome: "pass" | "fail" | "inconclusive";
  confidence?: number;          // only for non-deterministic verifiers
  detail: string;               // machine- and human-readable reason
  evidence?: EvidenceRef[];     // what was checked
  repair_hint?: string;         // fed to the repair loop
};
```

`inconclusive` is a first-class outcome. It is surfaced to the user, not coerced to pass.

### 8.3 Claim-level verification

1. Extraction: the synthesizer emits `claims[]` with `evidence_ids[]` (schema-enforced).
2. Grounding verifier resolves each evidence ID to its stored span and checks support.
3. Result per claim: `verified | unsupported | contradicted | inconclusive`.
4. Final report displays claim status; unverified claims are visually distinct and exportable as a list.

### 8.4 Calibration

Track, per verifier and per model tier, the relationship between verification outcome and downstream human acceptance. Use this to (a) tune repair-loop limits, (b) decide which steps need human gates, (c) measure whether a verifier is actually predictive. Never present a confidence number that has not been calibrated against outcomes.

### 8.5 Failure modes of the verification plane itself

- **False pass:** verifier too weak. Mitigation: mutation tests on verifiers (seed known errors, confirm detection).
- **False fail:** verifier too strict, causing repair thrash. Mitigation: cap loops, log for tuning.
- **Verifier gaming:** model optimizes to satisfy the checker rather than the goal. Mitigation: hold-out checks the executor never sees, and test-writing separated from code-writing roles.

---

## 9. Tool plane

### 9.1 Tool contract

Each tool declares: name, version, JSON-schema args and result, side-effect class (`read`, `write_internal`, `write_external`, `destructive`), required permissions, timeout, and cost model. The registry enforces schemas on both sides.

### 9.2 Sandbox execution

| Tier | Technology | Use |
|---|---|---|
| MVP | Docker containers with seccomp, dropped capabilities, read-only root, tmpfs workspace, no network, cgroup limits | Single-tenant dev, trusted users |
| Production | gVisor (runsc) containers | Multi-tenant with stronger syscall isolation |
| Large-scale | Firecracker microVMs (snapshot-restore for fast starts) | Untrusted code at scale |

Controls: no network by default; per-mission egress allowlist via proxy if needed; CPU, memory, disk, wall-clock, and process limits; ephemeral filesystem; deterministic base images pinned by digest; outputs copied out only via the artifact interface; full stdout/stderr captured into the event log.

### 9.3 Standard tools

- `sandbox.python`, `sandbox.shell`, `sandbox.node`: isolated execution.
- `kb.search`, `kb.read`: retrieval over project knowledge with provenance.
- `web.search`, `web.fetch`: external information; SSRF-protected, content tagged untrusted.
- `artifact.read/write`: content-addressed store access.
- `connector.*`: external systems (git hosts, drives, databases) behind per-tenant credentials and approval gates for writes.

### 9.4 Side-effect handling

- Read tools run freely within budget.
- Internal writes go to the workspace only.
- External writes and destructive tools require a pre-recorded intent event and, by default, human approval. After approval, execution carries the idempotency key so a retry cannot duplicate the effect.

---

## 10. Workspace and state

### 10.1 Artifact store

- Content-addressed (SHA-256), immutable, S3-compatible. Key layout: `tenant/{tenant_id}/blobs/{sha256}`.
- Metadata in Postgres: mime, size, producer step, parent hashes (lineage DAG).
- Benefits: free deduplication, trivial diffs, reproducible missions (same inputs by hash), tamper evidence.
- Encryption at rest with per-tenant keys at Production tier and above.

### 10.2 Knowledge base

- Ingest: parse (type-aware), chunk with structure awareness (headings, tables, code), embed, store with metadata (source hash, page/line span).
- Index: pgvector plus Postgres full-text for hybrid retrieval; reranking added when measurement justifies it.
- Every chunk carries a stable `evidence_id` so claims can cite it.
- Re-ingestion creates new versions; old evidence remains resolvable for audit.

### 10.3 Project memory

Explicit, user-editable records (conventions, glossary, preferences, prior decisions). Injected into mission context only when relevant. No hidden memory: users can inspect, edit, and delete every item.

### 10.4 Tenancy isolation

| Layer | Mechanism |
|---|---|
| Database | `tenant_id` on every row, Postgres Row-Level Security enforced via session variable |
| Object store | Bucket prefix per tenant, scoped credentials issued per request |
| Sandbox | One sandbox per step attempt, never reused across tenants |
| Queue | Tenant-scoped fairness and quotas |
| Keys | Per-tenant encryption keys (Production+) |

---

## 11. Model plane

### 11.1 Interface

```ts
interface InferenceBackend {
  chat(req: ChatRequest, opts: { signal: AbortSignal }): AsyncIterable<ChatDelta>;
  structured<T>(req: ChatRequest, schema: JsonSchema): Promise<T>;
  embed(inputs: string[]): Promise<number[][]>;
  capabilities(): { prefixCache: boolean; constrainedDecoding: boolean; maxContext: number };
}
```

### 11.2 Adapters

1. **NVIDIA NIM** (OpenAI-compatible endpoint): hosted catalog for development. Self-hosted NIM in production requires an NVIDIA AI Enterprise license; record cost per GPU in the unit-economics model.
2. **Generic OpenAI-compatible server** (vLLM, SGLang): production self-hosting without a per-GPU license.
3. **Hosted API adapter**: any provider with a compatible chat interface.

Selected per tier by configuration. No domain logic may depend on adapter-specific behavior.

### 11.3 Tiering and routing

- Tiers: `small` (routing, extraction, summaries), `medium` (most executor steps), `large` (planning, hard repair, synthesis).
- **Routing is per step**, based on declared step kind, retry count, and verifier feedback, not per user message. A step escalates tier on repeated failure.
- A small cost-aware router may be added later, trained on the event log (which tier first passed verification for which step kind).

### 11.4 Performance mechanics

| Mechanism | Purpose | Condition |
|---|---|---|
| Prefix caching | Reuse KV for static prompt blocks | Backend support; stable block ordering |
| Continuous batching | Throughput on self-hosted GPUs | vLLM/SGLang-class servers |
| Constrained decoding | Valid structured output without retries | Backend support |
| Speculative decoding | Lower decode latency | Self-hosted, measure first |
| Parallel step execution | Latency for independent DAG branches | Budget and rate limits permitting |
| Streaming | Perceived responsiveness | Always |

Heavy missions are throughput-bound rather than latency-bound; optimize tokens per dollar and batch utilization before shaving first-token milliseconds.

### 11.5 Resilience

- Per-backend circuit breakers, retries with jitter, hedged requests only for idempotent low-cost calls.
- Failover order configured per tier; if no backend is available, the mission pauses (not fails).
- Pin model versions. A model change is a deploy that must pass the regression eval suite first.

---

## 12. Provenance and audit

### 12.1 Provenance graph

```text
Deliverable ─┬─ Claim c1 ── Evidence e7 ── Source span (doc hash, page 14, lines 3-9)
             ├─ Claim c2 ── ToolRun t4  ── Sandbox exec (image digest, code hash, stdout hash)
             └─ Figure f1 ── Step s9 ── Inputs (artifact hashes) + Prompt block hashes + Model id/version
```

### 12.2 Audit report (exportable)

Contents: mission spec, plan versions, every step with inputs/outputs by hash, model and prompt versions, tool runs with captured output, verification results, approvals with user and time, budget consumption, unresolved items. Delivered as PDF and JSON.

**Tamper evidence:** hash-chain the event log (each event includes the hash of the previous). Production tier adds periodic signing of the chain head with a managed key. This yields a verifiable "this is what happened" record.

### 12.3 Reproducibility

Given the same input artifact hashes, plan, prompt-block hashes, and pinned model versions, a mission can be re-executed. Model nondeterminism means outputs may differ; the system records seeds and temperature and reports divergence rather than pretending exact reproducibility.

---

## 13. Security architecture

### 13.1 Trust boundaries

```text
[Internet/User] ─┃─ [Gateway] ─┃─ [Orchestrator/DB] ─┃─ [Workers] ─┃─ [Sandbox] ─┃─ [Egress proxy]
                 B1            B2                     B3            B4           B5
```

Each boundary has its own authentication, authorization, and logging. A compromise inside a boundary must not grant access beyond it.

### 13.2 Threat model

| Threat | Vector | Primary controls |
|---|---|---|
| Prompt injection | Documents, web pages, tool output, filenames | Untrusted-data tagging; no tool access for routing/classification calls; side-effect gates; output scanning; least-privilege tool allowlists per step |
| Sandbox escape | Malicious generated or user code | gVisor/Firecracker, no network, seccomp, ephemeral FS, resource limits, no shared mounts |
| Cross-tenant leakage | Query bugs, shared caches, sandbox reuse | RLS, per-tenant object prefixes and keys, no sandbox reuse, tenant-scoped retrieval filters tested in CI |
| Data exfiltration | Agent writes secrets to external tool or URL | Egress allowlists, external-write approval, secrets never in model context, DLP patterns on outbound payloads |
| SSRF | `web.fetch` and connectors | Block private/link-local ranges, resolve-then-connect, redirect limits, dedicated egress proxy |
| Credential theft | Prompt exfiltration of keys | Credentials held by the tool layer, injected at execution, never in prompts or logs |
| Denial of wallet | Looping agents, abusive tenants | Hard budgets, per-tenant quotas, max plan size, loop detection |
| Supply chain | Sandbox images, dependencies | Pinned digests, SBOM, vulnerability scanning, locked dependencies |
| Audit tampering | Insider or attacker edits history | Append-only log, hash chain, signed heads, restricted DB roles |
| Output poisoning | Malicious artifact rendered in UI | Sanitized rendering, sandboxed iframe previews, strict CSP, no raw HTML |

### 13.3 Authentication and authorization

- AuthN: OIDC/SAML SSO (Production), magic link plus OAuth (MVP). Short-lived session tokens.
- AuthZ: role-based (owner, admin, member, viewer) plus project-level grants. Policy enforced in the gateway **and** in the data layer (RLS) so one cannot bypass the other.
- Service-to-service: workload identity or mTLS; no shared long-lived secrets.

### 13.4 Data protection

- TLS everywhere; encryption at rest; per-tenant keys at Production+.
- Logging consent and retention are per-tenant policy; deletion requests cascade to artifacts, KB entries, and derived embeddings, with the audit trail retaining only metadata where legally required.
- Training or evaluation use of customer data requires explicit opt-in recorded in settings.

### 13.5 Principle: assume model compromise

Design so that a fully hijacked model, steered by hostile document content, can at worst: waste its own mission's budget, produce wrong output (caught by verification), or request actions that are denied by policy or paused for approval. It must not be able to reach other tenants, other missions' data, credentials, or the open network.

---

## 14. Failure model

| Failure | Detection | Response | Residual risk |
|---|---|---|---|
| Malformed model output | Schema validation | Retry with error; escalate tier | Persistent failure pauses step |
| Step fails verification | Verifier outcome | Bounded repair loop, then human checkpoint | Weak verifier may pass wrong output |
| Worker crash mid-step | Lease expiry | Another worker resumes from last event; idempotency keys prevent double effects | External non-idempotent systems need connector-level keys |
| Orchestrator deploy | Process restart | State rebuilt from events; in-flight leases expire and requeue | Brief scheduling delay |
| Inference backend outage | Health checks, errors | Circuit breaker, failover, else pause mission | Capacity if all backends down |
| Provider silently changes model | Regression evals, drift monitors | Version pinning; alert on metric shift | Hosted providers may deprecate |
| Budget exhausted | Governor | Pause with partial results | User must act |
| Poisoned document | Injection detectors, gates | Treated as data; actions gated | Novel attack patterns |
| DB failure | Replication health | Failover to replica; RPO per tier | Short write unavailability |
| Object store loss | Checksums, replication | Restore from replica; hash verification detects corruption | Depends on replication config |
| Network partition between workers and DB | Heartbeat loss | Fencing tokens reject stale writes | Duplicate model spend possible |
| Runaway cost | Rate and budget monitors | Kill switch per tenant and global | Detection delay |

### 14.1 Behavior at 10×, 100×, 1000× load

- **10×:** Postgres queue and event log remain adequate; scale workers horizontally; add read replicas for projections; watch connection counts (use PgBouncer).
- **100×:** Partition the events table; move projections to a stream processor; consider Temporal or a dedicated broker; sandbox pool pre-warming becomes necessary; model plane needs reserved GPU capacity or multi-provider routing.
- **1000×:** Shard by tenant or region; dedicated inference fleets with scheduling by priority; cell-based architecture to bound blast radius; verifier workloads become a major compute line item.

---

## 15. Observability and cost accounting

### 15.1 Telemetry

- **Traces** (OpenTelemetry): one trace per mission, spans per step, model call, tool call, verification.
- **Metrics:** step success rate by kind and tier; verification pass/fail by verifier; repair loops per step; time in queue, run, verify; tokens in/out, cached tokens; cost per mission; sandbox start time; budget burn rate; projection lag.
- **Logs:** structured, correlated by mission and step; no customer content unless consent is set.

### 15.2 Product-quality metrics

- Mission completion rate; human-escalation rate; human-edit distance on outputs; claim verification coverage (verified claims over total); time to accepted deliverable; cost per accepted deliverable.

### 15.3 Unit economics

Track per mission: model cost + sandbox compute + storage + verification compute (+ NVIDIA licensing if applicable). The key ratio is **cost per accepted deliverable**, not cost per token. If repair loops dominate cost, improve verifiers and planning before changing models.

---

## 16. Evaluation and quality system

### 16.1 Eval layers

| Layer | Question | Method |
|---|---|---|
| Unit | Does each verifier detect known errors? | Mutation tests with seeded faults |
| Step | Does an agent config pass its verifiers? | Fixed step cases, pass@k |
| Mission | Does the whole pipeline meet acceptance criteria? | Golden missions with reference outcomes |
| Regression | Did a prompt/model change break behavior? | Full suite gates deploys |
| Human | Would an expert accept the output? | Periodic blinded review with rubric |

### 16.2 Decision rules

- A specialized executor remains only if it beats the generalist baseline on its task class with statistical support on a hold-out set.
- A model or prompt change deploys only if the regression suite shows no significant degradation.
- A new verifier ships only after its mutation-test detection rate is measured.

### 16.3 Data flywheel

The event log yields: failed-then-repaired pairs (repair data), human edits (preference data), verifier outcomes (calibration data). Use only data with recorded consent. These support later fine-tuning of small models for planning or routing, which is the legitimate route to "own models."

---

## 17. API and contracts

### 17.1 REST endpoints (v1)

```text
POST   /v1/missions                    create (idempotency-key header required)
GET    /v1/missions/{id}               state projection
POST   /v1/missions/{id}/cancel
POST   /v1/missions/{id}/resume
GET    /v1/missions/{id}/plan
PUT    /v1/missions/{id}/plan          human edit (creates PlanEdited)
POST   /v1/missions/{id}/approvals/{approval_id}   { decision, note }
GET    /v1/missions/{id}/events?after_seq=N
GET    /v1/missions/{id}/artifacts
GET    /v1/artifacts/{hash}
GET    /v1/missions/{id}/claims
GET    /v1/missions/{id}/audit         JSON or PDF
POST   /v1/projects/{id}/knowledge     ingest
GET    /v1/projects/{id}/memory ; PUT/DELETE items
```

### 17.2 Streaming

`GET /v1/missions/{id}/stream` (SSE) emits typed events: `plan`, `step_status`, `model_delta`, `tool_status`, `artifact`, `verification`, `approval_requested`, `budget`, `state`, `error`. Clients resume with `Last-Event-ID` equal to the event `seq`, so reconnects never lose or duplicate events.

### 17.3 Conventions

Zod/JSON-Schema contracts shared by server and clients; versioned URLs; cursor pagination; problem+json errors with stable codes; rate-limit headers; webhook delivery with signed payloads and retries for mission state changes.

---

## 18. Mission Control (interface architecture)

The UI is a projection of the event stream. Core views:

| View | Content |
|---|---|
| Brief | Mission spec editor, acceptance criteria, budgets, approval policy |
| Plan | Interactive DAG; edit, reorder, pin constraints, approve |
| Run | Live step timeline, streaming outputs, tool activity, budget burn |
| Verification | Per-step and per-claim status, failure detail, repair history |
| Evidence | Click any claim to open the source span or tool run |
| Deliverable | Final artifacts with claim overlays (verified / unsupported / contradicted) |
| Audit | Exportable provenance and approvals |

Design requirements: state is always recoverable from the API; no UI-only state that matters; every action is a command that results in events; works over reconnects; large artifacts virtualized; all untrusted content rendered sanitized or sandboxed. Visual direction (monochrome, editorial, restrained) is a separate design document and does not affect this architecture.

---

## 19. Deployment architecture

### 19.1 MVP

```text
[Web/API: Next.js or Fastify] ─ [Worker processes] ─ [Postgres (events, queue, pgvector)]
                │                       │
                │                  [Docker sandbox host]
                └────────────── [S3-compatible store (MinIO/R2)]
                                [Inference: hosted API or NIM dev endpoint]
```

- Single region, one Postgres, 2-N stateless workers, one sandbox host.
- Deployed with Docker Compose or a single small cluster. No Kubernetes unless already familiar.

### 19.2 Production

- Managed Postgres with replicas and PITR; PgBouncer; object store with versioning and replication.
- Workers on an autoscaled group; separate sandbox pool (gVisor) on dedicated nodes.
- Inference via vLLM/SGLang on reserved GPUs and/or multi-provider routing; secrets in a manager; WAF at the edge.
- Infrastructure as code; staged environments; canary deploys gated on evals.

### 19.3 Large-scale

- Cell-based architecture (each cell a full stack for a tenant set); global control plane for routing and billing.
- Firecracker fleet with snapshot pools; dedicated inference clusters with priority scheduling.
- Per-tenant keys, regional data residency, customer-managed keys.

### 19.4 Private and on-prem option

Packaged deployment (containers plus Helm chart or Compose bundle) with a customer-hosted inference endpoint. For regulated buyers this is often the deciding feature. Design all components to run without outbound internet.

### 19.5 Research architecture

Learned verifiers; plan-search over alternative DAGs with verifier-guided selection; cross-mission skill libraries (reusable verified step templates); calibrated uncertainty; small tuned models for planning and routing trained on the consented event log.

---

## 20. Technology choices

| Concern | MVP choice | Alternative | Switch trigger |
|---|---|---|---|
| Language | TypeScript (API/orchestrator), Python (sandbox tools, data work) | Go/Rust for hot paths | Measured CPU bottleneck |
| API framework | Fastify or Hono | Next.js route handlers | Team preference |
| Database | PostgreSQL + pgvector | Dedicated vector DB | Retrieval scale/latency evidence |
| Queue | Postgres SKIP LOCKED | Temporal, NATS, SQS | Workflow complexity or throughput |
| Object store | S3-compatible (R2/MinIO) | Cloud-native | Compliance needs |
| Sandbox | Docker hardened → gVisor | Firecracker | Multi-tenant untrusted scale |
| Schemas | Zod / JSON Schema | Protobuf | Cross-language service split |
| Inference | OpenAI-compatible adapters | Native SDKs | Feature need |
| Observability | OpenTelemetry + Grafana stack | Vendor APM | Team capacity |
| Frontend | Next.js + React + TypeScript | Vite SPA | Marketing site needs SSR |

---

## 21. Roadmap (domain-agnostic skeleton)

**Prerequisite `[OD-1]`:** choose one professional domain and one mission type with mechanically checkable outputs. The verifier list and tools below are domain-specific and cannot be finalized until then.

### Phase 0 (weeks 0-2): Foundations
- Domain interviews and 10 real task samples collected from target users.
- Define the mission spec, acceptance criteria, and success metric for one mission type.
- Repo scaffold, schemas package, CI, environment validation.

### Phase 1 (weeks 2-5): Thin kernel
- Event store, projections, outbox, worker with leases and fencing.
- Model plane interface with one hosted adapter.
- Planner producing validated DAGs; step runner; schema-validated outputs.
- Mock mission end to end on synthetic data.

### Phase 2 (weeks 5-8): Verification and tools
- Sandbox execution (hardened Docker), artifact store, KB ingestion and retrieval.
- Three to five deterministic verifiers for the chosen domain; grounding verifier.
- Repair loop, budgets, approvals.
- Eval harness with 20-40 golden cases.

### Phase 3 (weeks 8-11): Mission Control and real users
- Minimal UI: brief, plan, run, verification, deliverable with claim overlays.
- Audit report export.
- Pilot with one to three real users on real tasks; collect failure data.

### Phase 4 (weeks 11-13): Hardening
- Security review against the threat model, injection test suite, RLS tests.
- Load test; cost-per-accepted-deliverable measured.
- Decide: stay on hosted models, add self-hosted via vLLM/SGLang, or buy NIM licensing, based on measured economics.

### Later (months 4-12)
- Second mission type; gVisor sandboxes; SSO; per-tenant encryption; private deployment package; first fine-tuned small models (planner or router) from consented traces.

---

## 22. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Weak base models fail on hard steps | Low acceptance rate | Smaller steps, stronger verifiers, tier escalation, human gates |
| Verifiers miss errors | False confidence, trust loss | Mutation testing, hold-out checks, honest "unverified" labels |
| Domain choice wrong | Wasted build | Pre-sell via manual pilot before building automation |
| Scope creep into general agent | Never ships | One mission type until acceptance rate is proven |
| Cost per mission too high | No margin | Track cost per accepted deliverable; cache; tiering; cheaper verifiers first |
| Security incident | Existential for enterprise sales | Threat model first, sandbox discipline, approvals, third-party review before enterprise pilots |
| Vendor/model churn | Regression | Adapters, pinned versions, regression gate |
| Licensing surprises (NIM) | Unplanned cost | Treat as explicit line item; keep vLLM path warm |
| Solo-founder operational load | Burnout | Managed services early; avoid Kubernetes until needed |

---

## 23. Decision log (initial)

| ID | Decision | Alternatives considered | Reason |
|---|---|---|---|
| D1 | Mission-centric architecture, chat as a client | Chat-first with agents added | Professional work needs durability, verification, audit |
| D2 | Event-sourced state in Postgres | Mutable state tables; Temporal first | One datastore, full audit, resume; Temporal deferred behind an interface |
| D3 | DAG plans with bounded replanning | Free-form agent loops | Boundedness, inspectability, resumability |
| D4 | Verification-first quality strategy | Larger models only | Weak-model compatibility; durable moat |
| D5 | Agents as configs on one model plane | Distinct model per specialist | No fine-tuning capacity; evals decide specialization |
| D6 | Content-addressed artifacts | Mutable file storage | Provenance, dedup, reproducibility |
| D7 | Adapter-based inference | Direct coupling to NIM | Licensing cost, swappability |
| D8 | Hardened Docker → gVisor → Firecracker progression | Start with microVMs | Match isolation to threat level and team capacity |
| D9 | Human approval on external/destructive actions | Full autonomy | Trust and risk |

---

## 24. Open decisions

- **[OD-1] Target domain and mission type.** Highest-impact open variable. Determines verifiers, tools, KB parsing, compliance needs.
- **[OD-2] Hosting posture:** hosted-only versus private/on-prem as a day-one requirement.
- **[OD-3] Inference economics:** hosted API versus self-hosted open weights versus licensed NIM, to be decided from measured cost per accepted deliverable.
- **[OD-4] Compliance targets** (for example SOC 2, regional residency) and timing relative to first enterprise pilot.
- **[OD-5] Pricing unit:** per mission, per accepted deliverable, per seat, or usage-based with budgets.
- **[OD-6] Approval defaults:** how conservative the default human gates should be per domain.

---

## Appendix A: Example mission (illustrative, domain-neutral)

```text
Goal: Produce a verified analysis report from uploaded dataset D.
Plan DAG:
  s1 ingest(D)            verifiers: schema, row-count reconcile
  s2 clean(s1)            verifiers: re-execute, invariants (no nulls in keys)
  s3 analyze(s2)          verifiers: re-execute notebook, independent recompute
  s4 draft_report(s3)     verifiers: claim grounding to s3 outputs
  s5 synthesize(s4)       verifiers: all claims resolved; formatting schema
Gates: plan approval; final approval before export.
Result: report where each figure links to a re-executable cell and each claim to evidence.
```

## Appendix B: Minimal work queue pattern

```sql
-- Claim one ready work item with a lease and fencing token
UPDATE work_items
SET lease_owner = $1,
    lease_expires_at = now() + interval '60 seconds',
    fence = fence + 1
WHERE id = (
  SELECT id FROM work_items
  WHERE status = 'ready' AND (lease_expires_at IS NULL OR lease_expires_at < now())
  ORDER BY priority DESC, created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING id, mission_id, step_id, fence;
-- All subsequent writes include WHERE fence = <token>; stale workers are rejected.
```

## Appendix C: Glossary

- **Mission:** durable unit of work with a spec, plan, budgets, and acceptance criteria.
- **Event sourcing:** persisting state as an append-only log of facts and deriving current state by replay.
- **Fencing token:** monotonically increasing number that lets storage reject writes from workers whose lease expired.
- **Outbox:** pattern that commits an event and its dispatch intent atomically.
- **Claim:** atomic assertion in an output that can be linked to evidence and verified.
- **Verifier:** component that checks an output and returns pass, fail, or inconclusive with detail.
- **Provenance:** the traceable lineage from an output back to sources, tools, prompts, and models.
