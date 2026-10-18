# Noevix V2: The Verified Work Fabric

**Version:** 0.2 (advanced architecture)
**Relationship to V1:** V1 is the kernel. V2 is built on it and does not replace it.
**UI:** Unchanged. The existing design consumes the projections defined here (see Section 15). Nothing in this document specifies or alters visual design.

---

## 0. Reading guide

- **Fact** = established engineering. **Judgment** = my engineering opinion. `[A]` = assumption. `[OD]` = open decision. `[H]` = testable hypothesis (Section 18). **Research** = unproven; do not depend on it.
- Every major component is tagged with a build tier: **MVP** (build now), **Production**, **Large-scale**, **Research**.
- No benchmark results are claimed. All numbers are budgets or placeholders to be measured.
- Named external techniques (Bazel/Nix-style build semantics, bitemporal modeling, capability security, dual-LLM and CaMeL-style injection defenses, Cedar/OPA policy engines, SMT solvers, property-based testing) are real, but verify current details before citing them in any external document.

---

## 1. What V1 gets right, and where it stops

V1 delivers durable missions: an event-sourced orchestrator, DAG plans, a verification plane, a sandboxed tool plane, provenance, and audit. That is the correct foundation. Its limits, as a rigorous reviewer would state them:

| # | V1 limitation | Why it matters |
|---|---|---|
| L1 | **Every mission starts cold.** Nothing learned in mission N helps mission N+1 except through prompts. | Cost and quality do not improve with use. No compounding. |
| L2 | **Deliverables are snapshots.** When an input changes, the whole mission reruns or the output silently goes stale. | Professional work is maintained, not produced once. |
| L3 | **Verification is attached per step, ad hoc.** There is no global measure of how much of an output is actually checked. | A report can look verified while its riskiest claims are not. |
| L4 | **Cost is linear in mission count.** No reuse of work across missions or reruns. | Weak margins at scale. |
| L5 | **Injection defense is gates plus tagging.** Policy-by-prompt remains the first line. | A compromised model still sits inside the control loop. |
| L6 | **Knowledge is a retrieval index, not a belief system.** Facts have no validity time, no contradiction handling, no source reliability. | Wrong or stale facts propagate silently. |
| L7 | **External actions are gated by approval but not modeled.** There is no dry-run, diff, or compensation. | Approvals are blind yes/no decisions. |
| L8 | **Autonomy is binary.** Either a human approves or the system acts. | No path to earned trust. |

V2 is the set of architectural changes that resolve L1 to L8.

---

## 2. Thesis

> **AI work is a build system running over a living, verified knowledge graph.**

Concretely, six ideas, each borrowed from a mature discipline where it is already proven:

| Idea | Borrowed from | Resolves |
|---|---|---|
| 1. Intent is **compiled** into a typed, effect-annotated intermediate representation and statically checked before any model runs | Compilers, type and effect systems | L3, L5 |
| 2. Execution is **hermetic and content-addressed**; work is cached, shared, and incrementally recomputed | Bazel, Nix, incremental computation | L2, L4 |
| 3. Truth is a **bitemporal claim graph**; outputs carry **machine-checkable certificates** | Temporal databases, proof-carrying code | L3, L6 |
| 4. External actions follow **plan/apply** semantics with compensation and capability security | Terraform-style IaC, sagas, object-capabilities | L5, L7 |
| 5. The system **compounds**: verified procedures, calibrated verifiers, learned routing | Program synthesis, skill libraries, calibration | L1, L8 |
| 6. Deliverables are **living**: standing missions recompute affected parts when inputs change | Spreadsheets, reactive systems | L2 |

What this is **not**: a more complicated agent swarm. The agents remain simple configurations. The sophistication lives in the compiler, the cache, the truth store, and the effect system, which are all deterministic code you can test. That is the correct place for complexity when the models are the weak and replaceable part.

---

## 3. Design principles (added to V1's P1 to P10)

| # | Principle | Consequence |
|---|---|---|
| Q1 | **Control flow comes only from trusted sources** | Untrusted data can never change what the system does, only what values flow through it |
| Q2 | **Compile before you compute** | Cost, security, and verification coverage are statically analyzable and enforceable before spend |
| Q3 | **Record rather than re-run** | Nondeterministic model calls are made reproducible by pinning recorded outcomes, not by pretending determinism |
| Q4 | **Beliefs have time and provenance** | Every fact has validity time, recording time, sources, and a derivation |
| Q5 | **Small trusted computing base** | The component that vouches for an output is tiny, deterministic, and independently auditable |
| Q6 | **Effects are staged, diffed, then applied** | No external write happens without a reviewable changeset and a compensation path |
| Q7 | **Autonomy is earned per action class, from data** | Trust ladders are driven by calibration, not configuration |
| Q8 | **Work is an asset** | Cached actions, verified skills, and the claim graph are the compounding assets; models are consumables |
| Q9 | **Human attention is a budgeted resource** | Escalate when expected value of review exceeds its cost |

---

## 4. Architecture overview

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ CLIENTS    Existing UI · REST/SSE API · SDK · Webhooks   (design unchanged) │
├───────────────────────────────────────────────────────────────────────────┤
│ GATEWAY    authn/z · tenancy · quotas · idempotency                         │
├───────────────────────────────────────────────────────────────────────────┤
│ PLANE A  INTENT & COMPILER                                                  │
│   planner (proposes) → Mission IR → static passes (type, effect, taint,     │
│   cost, verification-coverage) → optimizer → executable graph              │
├───────────────────────────────────────────────────────────────────────────┤
│ PLANE B  COMPUTE FABRIC (kernel)                                            │
│   hermetic actions · content-addressed cache · scheduler · sandboxes ·      │
│   dual-model split (privileged / quarantined) · incremental recompute      │
├─────────────────────────────┬─────────────────────────────────────────────┤
│ PLANE C  TRUTH              │ PLANE D  REALITY INTERFACE                   │
│ bitemporal claim graph      │ plan/apply effects · simulation/shadow ·     │
│ evidence · derivations      │ changesets · sagas · autonomy ladder         │
│ certificates + checker (TCB)│                                               │
├─────────────────────────────┴─────────────────────────────────────────────┤
│ PLANE E  LEARNING        skills (verified procedures) · verifier synthesis ·│
│                          calibration · router learning · distillation       │
├───────────────────────────────────────────────────────────────────────────┤
│ PLANE F  GOVERNANCE      policy engine · attention economics · audit ·      │
│                          compliance mapping                                 │
├───────────────────────────────────────────────────────────────────────────┤
│ SUBSTRATE  event log · artifact store · Postgres · queue · model plane      │
│            (V1 L7, L8 unchanged)                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

The V1 orchestrator, event store, verifier library, tool plane, and model plane remain. V2 inserts the compiler in front of the orchestrator, replaces the step runner with the compute fabric, and adds the Truth, Reality, Learning, and Governance planes.

---

## 5. Plane A: Intent and compiler

### 5.1 Purpose

Turn a loosely specified goal into a **statically validated program** before any expensive computation, so that cost, risk, and verification coverage are known up front.

### 5.2 Pipeline

```text
Mission spec (user)
   → Planner agent proposes a draft graph (untrusted suggestion)
   → Lowering to Mission IR (typed nodes, effects, labels)
   → Static passes (deterministic code):
        P1 structural: acyclic, all references resolve, schemas valid
        P2 type: artifact schemas and units compatible across edges
        P3 effect: every side effect declared, classified, permitted by policy
        P4 information-flow: taint labels propagate; forbidden flows rejected
        P5 cost: worst-case and expected budget within mission limits
        P6 verification coverage: required coverage achieved
        P7 skill substitution: replace subgraphs with verified skills where applicable
   → Optimizer: dedupe against cache, parallelize, assign model tiers, fuse cheap steps
   → Executable graph handed to Plane B
```

The planner is a **suggestion engine**. The compiler is the authority. A bad plan fails compilation with a precise error that is fed back to the planner for a bounded number of revisions.

### 5.3 Mission IR

Each node has: `op`, typed `inputs`, typed `outputs`, `effects`, `labels`, `determinism`, `verifiers`, `policy`.

```json
{
  "id": "n7",
  "op": "analyze.reconcile",
  "inputs": { "ledger": { "type": "table<Entry>", "from": "n3.out" } },
  "outputs": { "report": { "type": "doc<Findings>", "claims": true } },
  "effects": [],
  "labels": { "input_trust": "untrusted", "output_trust": "derived" },
  "determinism": "D1",
  "verifiers": ["reexecute", "sum-invariant", "grounding"],
  "policy": { "tier": "medium", "max_attempts": 3, "timeout_s": 600 }
}
```

### 5.4 Determinism classes

| Class | Meaning | Example | Reproducibility |
|---|---|---|---|
| D0 | Pure deterministic code | Parsing, SQL on fixtures, arithmetic | Re-run gives identical bytes |
| D1 | Deterministic given pinned model, seed, and params (where backend supports) | Temperature-0 extraction | Mostly reproducible; divergence is detected and reported |
| D2 | Inherently nondeterministic | Creative synthesis, web content | Reproduced by **replaying the recorded outcome**, not re-computing |

### 5.5 Verification coverage as a compile-time metric

Define coverage over the claims a mission will produce:

```text
coverage_V1 = |claims covered by a deterministic verifier| / |claims in deliverable|
coverage_V2 = |claims covered by grounding verifier|       / |claims in deliverable|
```

Policy can require, for example, that high-stakes sections reach a minimum `coverage_V1` or the mission fails compilation or is marked "draft only." This turns "we verify things" into a measurable, enforceable property. `[A]` Claim counts are estimated pre-run from output schemas and refined post-run.

### 5.6 Effect system

Effects are declared per node and checked against policy:

`read(resource)`, `write_workspace`, `write_external(target)`, `destructive(target)`, `spend(amount)`, `egress(domain)`, `exec(sandbox_profile)`.

A node that performs an undeclared effect at runtime is a **violation event** and is blocked by the sandbox and effect gateway, not merely logged.

### 5.7 Tiers

- **MVP:** IR as JSON schema; passes P1, P3 (basic), P5, P6. Deterministic validator in TypeScript.
- **Production:** P2, P4, P7; policy-driven coverage thresholds; compile error UX.
- **Research:** compiler-guided plan search (generate several plans, score by predicted cost and coverage, pick best).

---

## 6. Plane B: Compute fabric

### 6.1 Execution model

Every unit of work is an **action**: a hermetic, versioned computation described by its complete inputs.

```text
action_key = H( op_id, op_version,
                input_artifact_hashes[],
                prompt_block_hashes[],
                model_id, model_version, decoding_params,
                tool_versions[], sandbox_image_digest,
                determinism_class, seed_policy )
```

- **Cache lookup before execution.** A hit returns the recorded outputs (artifacts by hash) and the recorded provenance. No recomputation, no spend.
- **Cache semantics by class:** D0 hits are exact. D1 hits are reused by policy, with periodic re-validation sampling. D2 hits are **pinned outcomes**: the system returns what happened before, with an explicit "recorded on date X" attribute, and a user can force regeneration.
- **Invalidation:** automatic and structural. Changing any input hash, prompt block hash, model version, or tool version changes the key, so stale reuse is impossible by construction. There is no manual cache busting to forget.

### 6.2 Why this matters economically `[H2]`

Let `h` be the cache hit rate for actions in a mission. Expected execution cost per mission:

```text
C_mission ≈ (1 - h) · C_exec + C_verify_misses + C_human
```

Repeated runs, shared sub-computations (parsing the same document, embedding the same corpus, running the same analysis step), and living-deliverable recomputation all drive `h` up. For a mission type with substantial overlap, cost falls with usage instead of staying linear. How large `h` becomes is an empirical question; instrument it from day one.

### 6.3 Incremental recomputation (living deliverables)

The executable graph retains dependency edges. When an input artifact changes:

1. Compute the new hash; find downstream actions whose keys change.
2. Re-execute only those, reusing cached siblings.
3. Re-verify only affected claims.
4. Emit a **semantic diff** (claims added, removed, changed, verification status changed).

This is the same mechanism a build system uses for incremental builds, applied to analysis work.

### 6.4 Dual-model split (control/data separation)

Principle Q1 implemented as two roles of the same model plane:

| Role | Sees | Can do | Cannot do |
|---|---|---|---|
| **Privileged** | Only trusted inputs: user instructions, approved plan, schemas, and **symbolic handles** to data | Decide next steps, call tools, request effects | Read raw untrusted content |
| **Quarantined** | Untrusted content (documents, web, tool output) | Extract, summarize, classify into **typed values** | Call tools, request effects, alter control flow |

Untrusted-derived values return to the privileged side as **typed variables with taint labels** (for example `invoice_total: Money [tainted:doc7]`), never as free text spliced into the privileged prompt. Taint labels propagate through the IR; the effect gateway enforces forbidden flows (for example tainted value to external write requires approval).

This mirrors published control/data-separation defenses (the dual-LLM pattern and CaMeL-style designs); verify the current literature before relying on specific guarantees. **Judgment:** this is the single most important security upgrade over V1 because it moves defense from "the model hopefully ignores the injection" to "the injection has no path to a privileged action."

**Cost of the design:** extra model calls and reduced flexibility, because the privileged model cannot "just read the document." For some tasks the split is awkward. Policy can relax it per mission type with explicit risk acceptance.

### 6.5 Scheduling

- DAG-level parallelism with budget-aware admission.
- **Speculative execution** `[Research-adjacent]`: start likely-needed downstream actions early when the cache makes them cheap or likely to hit; cancel on plan change. Speculation overhead must be measured against `h`; disable per mission type if net cost increases.
- **Batching:** group same-prompt-prefix actions to exploit prefix caching and continuous batching on self-hosted backends.
- Per-tenant weighted fair queuing, priority for interactive steps, backpressure on sandbox pool.

### 6.6 Hermeticity requirements

An action must declare all inputs. Runtime enforcement: sandbox has no ambient filesystem or network beyond declared inputs; wall-clock time and randomness are injected as declared inputs (or the action is classed D2). Violations either fail the action or downgrade its determinism class. This discipline is what makes the cache trustworthy.

### 6.7 Tiers

- **MVP:** content-addressed action keys and a local cache table; D0/D2 classes only; no speculation; incremental recompute for linear graphs.
- **Production:** shared remote cache, D1 re-validation sampling, dual-model split for untrusted-input missions, batching.
- **Large-scale:** distributed cache with tiered storage, cell-local caches, preemptible workers.
- **Research:** cost-aware speculative scheduling, learned cache-admission policy.

---

## 7. Plane C: Truth

### 7.1 Purpose

Replace "a retrieval index with chunks" with a **belief store**: facts that know when they were true, when the system learned them, where they came from, and how they were derived.

### 7.2 Bitemporal claim model

Two time axes:

- **Valid time:** when the fact is true in the world.
- **Transaction time:** when the system recorded or revised it.

```sql
CREATE TABLE claims (
  id             UUID PRIMARY KEY,
  tenant_id      UUID NOT NULL,
  subject        TEXT NOT NULL,          -- entity id
  predicate      TEXT NOT NULL,          -- ontology term
  object         JSONB NOT NULL,         -- typed value or entity ref
  valid_from     TIMESTAMPTZ,
  valid_to       TIMESTAMPTZ,
  tx_from        TIMESTAMPTZ NOT NULL DEFAULT now(),
  tx_to          TIMESTAMPTZ,            -- NULL = currently believed
  status         TEXT NOT NULL,          -- verified | unsupported | contradicted | inconclusive | retracted
  derivation_id  UUID,                   -- how it was produced
  confidence     REAL,                   -- only if calibrated
  superseded_by  UUID
);

CREATE TABLE evidence_links (
  claim_id    UUID, evidence_id UUID, relation TEXT, -- supports | contradicts
  PRIMARY KEY (claim_id, evidence_id)
);

CREATE TABLE derivations (
  id UUID PRIMARY KEY, action_key BYTEA, kind TEXT,   -- extraction | computation | inference | human
  inputs JSONB                                         -- claim/evidence/artifact refs
);
```

Revisions never overwrite: a revision sets `tx_to` on the old row and inserts a new row. Queries can ask "what did we believe on date T" and "what was true on date T", which is exactly what professionals need for audit, restatement, and dispute.

### 7.3 Belief revision and contradiction handling

- On insert, a **contradiction detector** (deterministic rules per predicate: functional predicates admit one value per valid interval) flags conflicts.
- Conflicts create a `Conflict` record linking claims; resolution policy per predicate: prefer higher source reliability, prefer later valid time, or require human decision.
- **Source reliability** is a per-source score updated from outcomes (how often claims from this source were later contradicted or retracted). It must be calibrated against outcomes, not asserted.

### 7.4 Ontology

Light, versioned, per-domain: entity types, predicates, units, and functional constraints. `[A]` Ontologies are the highest domain-specific cost in the system. Keep them small and grow from real missions. Do not attempt a universal ontology.

### 7.5 Proof-carrying outputs

Each deliverable ships with a **certificate**:

```json
{
  "deliverable": "sha256:...",
  "claims": [
    { "id": "c14", "text": "...", "status": "verified",
      "support": [ { "kind": "source_span", "hash": "sha256:..", "span": [1204,1318] },
                   { "kind": "tool_run", "action_key": "..", "verifier": "reexecute@1.3",
                     "outcome": "pass" } ] }
  ],
  "coverage": { "v1": 0.72, "v2": 0.91 },
  "unresolved": ["c22","c31"],
  "model_versions": ["..."], "prompt_hashes": ["..."],
  "log_head": "sha256:...", "signature": "..."
}
```

### 7.6 The trusted computing base (TCB)

A small standalone **Certificate Checker** validates a certificate without trusting the orchestrator, agents, or models:

1. Recompute artifact hashes and confirm they match.
2. Confirm every cited span exists in the cited source and matches its hash.
3. Re-run D0 verifiers on recorded inputs (deterministic, so independent confirmation is possible).
4. Verify the event-log hash chain up to the signed head.
5. Emit pass or a list of failures.

Target: a few thousand lines, no network, no model calls, open to customer audit. Q5 in practice: **trust concentrates in one reviewable component.** Models, agents, and prompts can be wrong; the checker still catches unsupported claims and altered evidence.

**Limit, stated plainly:** the checker proves "this output is consistent with its recorded evidence and checks," not "this output is true in the world." Truth still depends on source quality and verifier strength. The certificate makes that dependency explicit.

### 7.7 Formal methods where available

For domains with formalizable constraints (arithmetic identities, access-control properties, schema/type invariants, configuration policies), use SMT solvers or property-based testing as V1-class verifiers. This is applicable only where the domain admits a formal spec; do not force it elsewhere.

### 7.8 Tiers

- **MVP:** claims table with `valid_*` and `tx_*` columns, evidence links, status, derivation pointer. No ontology beyond a flat predicate list. Certificate as JSON generated by the orchestrator.
- **Production:** contradiction rules, source reliability, standalone checker, signed log heads.
- **Large-scale:** graph-optimized storage for traversal, per-tenant ontology tooling.
- **Research:** probabilistic belief aggregation, learned conflict resolution, verified checker (formally proven TCB).

---

## 8. Plane D: Reality interface

### 8.1 Plan/apply

External effects are never executed inline. They are **staged**:

```text
1. Step proposes an Effect (typed, with target, operation, parameters, reversibility).
2. Effect Gateway renders a Changeset: precise before/after diff against current external state
   (read via a connector with read-only credentials).
3. Policy engine evaluates: allowed? needs approval? within blast-radius limits?
4. Approval (if required): human sees the diff, not a prose summary.
5. Apply: executed with an idempotency key under write credentials held only by the gateway.
6. Post-check: re-read external state, compare with expected; record result event.
7. On failure or later rollback: run the declared compensation action (saga).
```

Credentials for write operations never enter model context or sandboxes. The gateway is the only component that can mutate external systems.

### 8.2 Effect classes

| Class | Examples | Default policy |
|---|---|---|
| E0 read | Fetch, query | Auto within budget |
| E1 workspace write | Create artifacts | Auto |
| E2 reversible external | Create draft, open PR, stage config | Approval by default; autonomy ladder can relax |
| E3 irreversible external | Send email, deploy, delete, pay | Approval always; two-person rule optional |

### 8.3 Simulation and shadow mode

- **Dry run:** connectors that support it return the would-be result without mutation.
- **Shadow mode:** the system computes the effect it *would* apply and compares it with what the human did. This produces calibration data with zero risk.
- **Digital twin `[Research-adjacent]`:** for some domains (infrastructure configs, data pipelines, financial models), a sandbox replica allows executing effects before production. High value where feasible; high cost per domain.

### 8.4 Autonomy ladder (Q7)

Per **action class** (not per user globally), progress through levels:

```text
L0 Shadow       compute only, compare with human action, no effect
L1 Suggest      present changeset, human applies
L2 Supervised   system applies after explicit approval
L3 Bounded auto system applies within blast-radius and reversibility limits, human notified
L4 Auto         system applies and reports (only for E0-E2 with strong track record)
```

Promotion requires measured thresholds from the calibration data: minimum number of shadow/supervised cases, observed acceptance rate with a statistical confidence bound, zero severe incidents in a window. Demotion is automatic on any severe incident. E3 effects never exceed L2 by default. `[OD-4]` Thresholds are domain and customer specific.

### 8.5 Blast-radius limits

Declarative caps per policy: records changed per apply, spend per day, recipients per message, systems touched. A changeset exceeding limits is blocked or escalated regardless of ladder level.

### 8.6 Tiers

- **MVP:** effect typing, changeset rendering for one connector, approval required for all E2/E3, idempotency keys, post-check.
- **Production:** blast-radius policy, saga compensation library, shadow mode, ladder tracking.
- **Research:** digital twins, learned risk scoring of changesets.

---

## 9. Plane E: Learning without fine-tuning

The product compounds through **assets**, not model weights.

### 9.1 Skills (verified procedures)

A **skill** is a parameterized, versioned subgraph of the IR with:

- typed inputs and outputs, preconditions, required effects;
- the verifier set that must pass;
- provenance (source missions);
- statistics (runs, first-pass acceptance, cost, human edit distance).

**Promotion pipeline:**

```text
successful mission subgraph → candidate skill (auto-extracted, parameterized)
   → shadow-tested on golden cases and past missions
   → human review of the skill definition
   → promoted (versioned) → used by compiler pass P7
   → continuously monitored; auto-demoted on regression
```

Benefits: lower planning cost (skills bypass the planner), higher reliability (proven subgraphs), faster execution (cache-friendly). Retrieval is by type signature plus embedding of the description, ranked by historical performance.

**Risks:** skill poisoning (a bad mission becomes a "skill"), overfitting to one customer's quirks, version drift. Mitigations: mandatory shadow testing, tenant scoping by default (cross-tenant sharing only for anonymized, opted-in, generic skills), quarantine and demotion, and skill versions pinned inside missions.

### 9.2 Verifier synthesis

Human corrections and verification failures are the richest signal. Pipeline:

1. When a human edits or rejects output, capture the diff and reason.
2. A synthesizer proposes a **deterministic check** (a test, assertion, schema constraint, or invariant) that would have caught the error.
3. Validate by **mutation testing**: the new verifier must detect seeded faults and must not fail known-good outputs.
4. Human review, then add to the verifier library.

Over time the verifier library, a deterministic and cheap asset, absorbs institutional knowledge. This is the closest thing to a moat that survives model change.

### 9.3 Calibration

Maintain, per verifier, model tier, skill, and action class: the empirical relation between verifier outcome and eventual human acceptance. Outputs: which verifiers actually predict acceptance, where humans are being asked unnecessarily, where they are not asked enough. Feeds Plane F attention economics and the autonomy ladder.

### 9.4 Learned routing and planning aids

Train small classifiers from the event log: which tier first passes verification for which step type; which skill best matches a goal. These are cheap, low-risk, measurable, and replaceable. Use only consented data.

### 9.5 Distillation and tuning (later)

From the consented log: failed-then-repaired pairs, human edits, accepted outputs. Use to tune **small** models for planning, routing, extraction. Gate by the same regression suite. This is the honest answer to "later I'll use my own models": own the small, specialized, measurable pieces; rent the large general ones.

### 9.6 Tiers

- **MVP:** manual skill creation from completed missions (saved templates with verifiers), basic acceptance stats.
- **Production:** auto-extraction, shadow testing, verifier synthesis with mutation tests, calibration dashboards.
- **Research:** automated skill discovery at scale, learned verifiers (treated as V4 until calibrated), distillation pipelines.

---

## 10. Plane F: Governance

### 10.1 Policy engine

Policies as code, evaluated by a dedicated engine (Cedar or OPA class). Inputs: actor, mission, node, effect, labels, tenant policy. Outputs: allow, deny, require-approval, with reasons. Policies are versioned and attached to the mission at compile time so a run is judged under the policy that existed when it started.

```text
// illustrative pseudo-policy
permit(effect.class == E2, target in tenant.allowed_targets)
  when { input.labels.exclude("tainted") or approval.exists }
forbid(effect.class == E3)
  unless { approval.count >= tenant.policy.irreversible_approvers }
forbid(egress) unless { domain in mission.egress_allowlist }
```

### 10.2 Human attention economics (Q9)

Escalate to a human when:

```text
EVI(review) > cost_of_interruption + reviewer_time_cost
EVI ≈ P(error | verifiers, calibration) × severity(error) × (1 - P(caught later))
```

Inputs come from calibration (Section 9.3) and effect class severity. Consequences: low-risk, well-calibrated steps stop asking for approval; high-severity or poorly covered steps always ask. Review queues batch similar items, sample-audit auto-approved work, and display the **diff and certificate**, not a wall of text.

### 10.3 Audit and compliance

- V1 audit export plus certificates and changeset history.
- **Two-person rule** and **separation of duties** for E3.
- Retention, residency, deletion cascades (including derived claims and embeddings) per tenant policy.
- Control mapping for frameworks such as SOC 2 `[OD-5]`: evidence produced from the event log, policy versions, and access records.

---

## 11. Security delta over V1

| Threat | V1 control | V2 upgrade |
|---|---|---|
| Prompt injection via documents | Tagging, gates | **Dual-model split plus taint tracking**; injection has no path to privileged effects |
| Exfiltration through tools | Egress allowlist, approval | **Effect gateway** holds credentials; taint-to-sink policy; changeset review |
| Cache poisoning | n/a | Cache entries bound to full action key; entries written only by verified actions; per-tenant cache namespaces; recorded D2 outputs carry provenance and can be quarantined |
| Skill poisoning | n/a | Shadow testing, human review, tenant scoping, pinned versions, auto-demotion |
| Claim-graph poisoning | Provenance | Source reliability, contradiction detection, evidence requirement for `verified` status, bitemporal retraction |
| Confused deputy | Least-privilege tools | **Capability-based access**: steps receive unforgeable, narrowly scoped capability tokens (resource, operation, expiry) rather than ambient authority |
| Audit tampering | Hash chain | Signed heads; independent **checker** reproduces validity |
| Verifier gaming | Hold-out checks | Separation of roles (writer of tests is not writer of code); hidden verifiers; mutation-tested library |
| Supply chain | Pinned digests | SBOM per sandbox image; action keys include image digest, so a changed dependency invalidates the cache |

**Capability model `[Production]`:** each action receives a capability bundle derived from its IR `effects` and the policy, minted by the gateway, short-lived, and bound to the action key. A step cannot use authority it was not compiled with.

**Residual risk, stated plainly:** the quarantined model can still produce wrong typed values (a mis-extracted number). That is a correctness risk handled by verification, not a control-flow risk. Also, taint tracking creates friction: false positives will block legitimate flows. Plan for a policy tuning loop and an explicit approval path.

---

## 12. Data model additions (summary)

```text
actions(action_key PK, op_id, op_version, determinism, status, outputs jsonb, created_at, last_hit_at, hit_count)
action_deps(parent_key, child_key)
cache_policies(op_id, tenant_id, max_age, revalidate_sample_rate)
claims, evidence_links, derivations, conflicts        -- Section 7
certificates(id, deliverable_hash, body jsonb, log_head, signature, created_at)
effects(id, mission_id, node_id, class, target, op, params, reversible, status)
changesets(id, effect_id, before jsonb, after jsonb, diff jsonb, policy_decision jsonb)
compensations(effect_id, action_ref, status)
labels(artifact_hash, taint_set jsonb)
capabilities(id, action_key, resource, operation, expires_at, token_hash)
skills(id, version, tenant_id, ir jsonb, verifiers jsonb, stats jsonb, status)
skill_runs(skill_id, mission_id, outcome, cost, human_edit_distance)
calibration(verifier_id, tier, class, n, accepted, rejected, updated_at)
autonomy_state(tenant_id, action_class, level, evidence jsonb, updated_at)
standing_missions(id, trigger jsonb, mission_template, freshness_sla, state)
```

All V1 tables remain. All new tables are tenant-scoped with row-level security.

---

## 13. Living deliverables and standing missions

### 13.1 Concept

A **standing mission** is a mission template bound to triggers, producing a deliverable that stays current.

Triggers: schedule, webhook, data-change in a watched source, claim-graph change (a new contradicting fact), or manual.

### 13.2 Behavior

```text
trigger → detect changed inputs (hash diff) → incremental recompute (Section 6.3)
        → re-verify affected claims → semantic diff vs last version
        → policy: material change? → notify / request review / apply effects (plan/apply)
```

Each version of a deliverable is immutable and linked; the user sees what changed and why, with the certificate for the new version. Freshness SLAs are explicit (for example "recompute within N minutes of source change") and monitored.

### 13.3 Failure semantics

If recomputation fails or verification regresses, the **previous certified version remains current**, the deliverable is marked stale with the reason, and a human is notified. The system never silently publishes an uncertified update.

---

## 14. Failure model and adversarial analysis

| Scenario | Effect | Response |
|---|---|---|
| Compiler bug accepts an unsafe plan | Unsafe effect staged | Defense in depth: effect gateway re-checks policy at apply time; compiler is deterministic and heavily tested; fuzz the passes |
| Cache returns a wrong result (hash collision, mislabelled determinism) | Silent incorrectness | Content hashing with SHA-256; D1 sampling revalidation; verifiers run on cache hits for high-stakes steps; ability to quarantine by op version |
| Stale D2 pinned outcome reused when freshness matters | Outdated content | Per-op max-age and freshness attributes; web-derived actions default to short TTL |
| Quarantined model mis-extracts a value | Wrong typed input | Verifiers on extractions (cross-check totals, redundancy), human gate for high-severity fields |
| Contradictory sources | Conflicting claims | Conflict records, policy resolution, human arbitration |
| Skill regression after a model upgrade | Lower quality | Skills pinned to verified model versions; re-shadow-test on model change |
| Ladder promotion on thin evidence | Premature autonomy | Statistical lower-bound thresholds; minimum sample sizes; automatic demotion |
| Taint false positives stall work | Poor UX and abandonment | Tunable policies, explicit approval paths, measure block rate as a product metric |
| Effect partially applied then failure | Inconsistent external state | Saga compensations; post-check; reconciliation job comparing intended and actual state |
| Event-log or truth-store corruption | Loss of audit integrity | Hash chain, replicas, PITR, checker detects tampering |
| Speculation burns budget | Cost overrun | Speculative spend capped separately; net-benefit tracking |
| Policy misconfiguration allows too much | Security incident | Policy tests, dry-run evaluation of policy changes against historical missions, change approval |

**Scale behavior:**

- **10×:** cache and truth store on Postgres suffice; add read replicas; index by action key and claim subject/predicate.
- **100×:** partition events and claims; separate cache service with tiered storage; remote execution workers; policy engine caching.
- **1000×:** cell-based tenancy; distributed cache with per-cell locality; dedicated verifier fleets; claim graph in a graph-optimized store; formalize TCB review.

**When original assumptions fail:** if cache hit rates are low (missions rarely overlap), V2's economic benefit shrinks but its correctness benefits (certificates, taint, plan/apply) remain. If the domain lacks deterministic verifiers, coverage metrics will be low and the product positions as "draft with provenance," not "certified." These are legitimate outcomes to detect early, not reasons to avoid the design.

---

## 15. Interface boundary (design unchanged)

The existing UI is not modified. It consumes the following projections through the same API and event stream pattern as V1.

| Capability | API surface (additions) |
|---|---|
| Compile report | `GET /v1/missions/{id}/compile` returns passes, errors, cost estimate, coverage forecast |
| Cache and recompute | `GET /v1/missions/{id}/actions` returns per-action status including cache hit/miss |
| Claims | `GET /v1/missions/{id}/claims`, `GET /v1/claims/{id}/history` (bitemporal), `POST /v1/claims/{id}/review` |
| Certificates | `GET /v1/deliverables/{hash}/certificate`, `POST /v1/certificates/verify` |
| Effects | `GET /v1/missions/{id}/changesets`, `POST /v1/changesets/{id}/decision` |
| Skills | `GET /v1/skills`, `POST /v1/skills/{id}/promote` |
| Standing missions | `POST/GET/PUT /v1/standing-missions`, `GET .../versions`, `GET .../diff?from=&to=` |
| Autonomy | `GET /v1/autonomy`, `PUT /v1/autonomy/{action_class}` (policy-limited) |
| Stream events (added) | `compile`, `cache_hit`, `claim_status`, `changeset`, `taint_block`, `recompute_diff`, `staleness` |

The UI team decides how or whether to display any of this. The backend guarantees these are available.

---

## 16. Performance and economics model

**Unit economics per accepted deliverable:**

```text
Cost_per_accepted =
  [ (1 - h) · Σ C_action
  + Σ C_verify_executed
  + C_planning · (1 - s)          -- s = fraction of plan covered by skills
  + C_quarantine_overhead
  + C_sandbox + C_storage
  + C_human · P(escalation) ]
  / P(accepted)
```

Levers, in order of expected leverage `[A]`:

1. **Raise first-pass acceptance** (reduces repairs and human time): better verifiers and skills.
2. **Raise `h`** (cache reuse): hermetic design, shared sub-computations, living-deliverable recompute.
3. **Raise `s`** (skills): cheaper, more reliable planning.
4. **Reduce `P(escalation)`** (calibrated attention economics, autonomy ladder).
5. **Model tiering and batching** (cost per token).

Throughput-bound heavy missions favor self-hosted batching when utilization is high; below a utilization threshold, hosted APIs are cheaper than owned GPUs or licensed serving. Decide by measured utilization and the licensing cost (NVIDIA NIM production self-hosting requires an NVIDIA AI Enterprise license; developer-program use is for development and testing only).

---

## 17. Observability

Added to V1 telemetry: cache hit rate by op and tenant, D1 divergence rate, coverage achieved vs forecast, certificate-check failures, taint-block rate and approval overrides, skill usage and acceptance, verifier predictiveness, ladder level per action class, recompute latency and staleness, changeset rejection reasons, cost per accepted deliverable, human edit distance.

**Headline metrics:** certified-claim coverage, first-pass acceptance, cost per accepted deliverable, human minutes per deliverable, severe-incident count.

---

## 18. Research agenda and testable hypotheses

All hypotheses must be tested on **your own** golden missions in the chosen domain. No external result should be assumed to transfer.

| ID | Hypothesis | Experiment | Metric | Falsified if |
|---|---|---|---|---|
| H1 | Higher deterministic coverage predicts human acceptance | Run N missions, record `coverage_V1` vs accept/reject | AUC or rank correlation | Coverage uncorrelated with acceptance |
| H2 | Action caching reduces cost materially on repeated and living missions | Replay a mission set with cache on vs off | Cost ratio, hit rate | Hit rate too low to matter |
| H3 | Skills raise first-pass acceptance over time | Track acceptance for skilled vs unskilled plans across weeks | Acceptance delta, planning cost | No improvement beyond noise |
| H4 | Dual-model split reduces injection success with acceptable utility loss | Seeded injection suite (use a recognized agent-injection benchmark where applicable, and your own domain attacks) | Attack success rate, task success rate | Utility loss too high or no security gain |
| H5 | Incremental recompute beats full rerun for living deliverables | Perturb inputs, compare recompute vs rerun | Cost and latency | Dependency granularity too coarse to help |
| H6 | Plan/apply plus ladder lowers incident rate without raising review burden | Shadow vs supervised study | Incidents, human minutes | Review burden rises without incident reduction |
| H7 | Synthesized verifiers catch real errors | Mutation tests plus held-out historical failures | Detection rate, false-fail rate | Low detection or high false fails |
| H8 | Calibrated attention economics reduces human minutes at equal quality | A/B review policies | Minutes per deliverable, error escape rate | Escapes increase |

**Established vs frontier:** content-addressed build semantics, bitemporal modeling, capability security, saga patterns, and policy engines are established engineering. Dual-model/CaMeL-style defenses are credible but still evolving research. Verifier synthesis, skill discovery, learned verifiers, and calibrated autonomy ladders for LLM work are frontier. Treat frontier parts as experiments with kill criteria.

---

## 19. What to build: three architectures, one decision

| | Simplest viable | Theoretically superior | **Build today** |
|---|---|---|---|
| Compiler | JSON IR, structural and budget checks | Full type/effect/taint system, plan search | **JSON IR with passes P1, P3, P5, P6** |
| Compute | Step runner (V1) | Distributed hermetic fabric, remote cache, speculation | **Hermetic actions + local content-addressed cache** |
| Truth | Chunk retrieval | Bitemporal belief graph, learned source reliability, proven checker | **Claims + evidence + status + two time columns + JSON certificate** |
| Effects | Approvals | Digital twins, learned risk | **Typed effects, changeset diff, approval, idempotency, post-check** |
| Learning | None | Skill discovery, verifier synthesis, distillation | **Manual skills + verifier library + acceptance stats** |
| Security | Tagging | Dual-model split everywhere, capabilities everywhere | **Gateway-held credentials, taint labels on untrusted artifacts, effect approval** |
| Governance | RBAC | Full policy engine, attention economics | **Simple policy file, mandatory approvals for E2/E3** |

**Decision:** build the **MVP column**. It is the thinnest slice that still demonstrates the three claims no chatbot makes: *work is cached and cheaper over time, outputs ship with checkable evidence, and actions are reviewed as diffs.* Defer everything in the middle column until measured data justifies it.

**What changes the decision:** if the target domain is high-stakes with irreversible actions (finance operations, infrastructure changes), pull the dual-model split and the capability model forward. If the domain is analysis and documents with no external actions, defer Plane D and spend effort on the Truth plane and verifiers.

---

## 20. Roadmap

Assumes V1 Phase 0 to 2 (kernel, verification, tools) are done or in progress. `[OD-1]` (target domain) remains the blocking prerequisite.

| Phase | Weeks | Deliverables | Exit criterion |
|---|---|---|---|
| V2-0 | 1-2 | IR schema, compile passes P1/P3/P5/P6, coverage metric | Invalid plans rejected with useful errors; coverage forecast matches actuals within a tolerance you define |
| V2-1 | 3-5 | Action keys, local cache, D0/D2 classes, incremental recompute on a linear graph | Rerun of an unchanged mission costs near zero; a single input change recomputes only affected steps |
| V2-2 | 5-8 | Claims table (bitemporal columns), evidence links, claim-level grounding, JSON certificates | Every claim in a deliverable resolves to evidence or is labeled unsupported |
| V2-3 | 8-10 | Effect typing, changeset diff for one connector, approvals, idempotency, post-check | An external change is reviewable as a diff and applies exactly once |
| V2-4 | 10-12 | Manual skills, verifier library growth, acceptance stats, calibration tables | A second mission of the same type is measurably cheaper or higher first-pass than the first |
| V2-5 | 12-14 | Standing mission prototype (one trigger), semantic diff, staleness semantics | A changed source updates a deliverable with a reviewable diff and fresh certificate |
| V2-6 | 14-16 | Standalone certificate checker (minimal), taint labels, security test suite, evaluation of H1, H2, H3 | Hypothesis results recorded honestly, including negative ones; go/no-go on Production tier components |

Then, from evidence: dual-model split, capability tokens, policy engine, shadow mode and ladder, remote cache, verifier synthesis.

---

## 21. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Over-engineering for a solo builder | Never ships | Strict MVP column; each plane enters only after its predecessor shows measured value |
| Ontology and verifier work is domain-heavy | Slow progress | One domain, one mission type; reuse domain tools and open standards where they exist |
| Cache or certificate creates false trust | Reputational and legal exposure | Certificates state exactly what they prove; the checker is open to audit; labels never hide "unverified" |
| Dual-model split degrades usability | Adoption | Per-mission-type policy, measured utility loss, explicit risk-acceptance mode |
| Demand not validated | Wasted architecture | Pre-sell a manual pilot before building automation; V2 features follow customer pain |
| Frontier components do not work | Wasted time | Kill criteria per hypothesis; keep frontier work off the critical path |
| Compliance burden early | Slows sales | Defer formal certification until a paying enterprise pilot requires it, but build audit-friendly from day one |

---

## 22. Decision log (V2 additions)

| ID | Decision | Alternatives | Reason |
|---|---|---|---|
| D10 | Compile intent to a typed, effect-annotated IR before execution | Execute planner output directly | Static cost, security, and coverage guarantees |
| D11 | Hermetic content-addressed actions with record-and-replay for nondeterminism | Re-run always | Cost, reproducibility, incremental recompute |
| D12 | Bitemporal claim store | Mutable fact table | Audit, restatement, correct handling of change |
| D13 | Small standalone certificate checker as the TCB | Trust the orchestrator | Concentrated, auditable trust |
| D14 | Plan/apply with gateway-held credentials | Agent calls tools directly with credentials | Reviewable diffs, blast radius, no credential exposure |
| D15 | Dual-model control/data split for untrusted-input missions | Policy via prompts | Structural injection defense |
| D16 | Autonomy ladder per action class from calibration data | Global autonomy setting | Earned, measurable trust |
| D17 | Compounding via skills, verifiers, and calibration before any weight tuning | Early fine-tuning | Cheaper, measurable, model-independent |
| D18 | Standing missions with last-certified-version fallback | Always publish latest | Never ship uncertified updates |

---

## 23. Open decisions

- **[OD-1] Target domain and mission type** (unchanged, still the blocker; V2's ontology, verifiers, and effects all depend on it).
- **[OD-2] Persistence of D2 outputs:** retention duration and legal treatment of recorded model outputs and source material.
- **[OD-3] Certificate trust model:** self-signed per tenant, platform-signed, or third-party timestamping.
- **[OD-4] Autonomy thresholds** per action class and customer risk appetite.
- **[OD-5] Compliance roadmap** and timing relative to first enterprise pilot.
- **[OD-6] Cross-tenant skill sharing policy** (default: none; opt-in anonymized generic skills only).
- **[OD-7] Ontology ownership:** platform-provided starter ontologies versus customer-authored.

---

## Appendix A: Example IR program (illustrative, domain-neutral)

```text
mission: quarterly-reconciliation-report
n1  ingest.table        in: file(D)                          D0  verifiers: schema, rowcount
n2  clean.normalize     in: n1.out                           D0  verifiers: reexecute, key-nonnull
n3  extract.entities    in: file(notes)  [quarantined]       D1  verifiers: totals-crosscheck, redundancy
n4  analyze.reconcile   in: n2.out, n3.out                   D0  verifiers: reexecute, sum-invariant
n5  draft.findings      in: n4.out       claims: true        D2  verifiers: grounding
n6  effect.propose      in: n5.out       effect: E2 (create draft ticket)  gate: approval
coverage target: v1 >= 0.70 on sections marked "material"
```

Cache behavior on rerun with only `notes` changed: `n1, n2` hit; `n3, n4, n5` recompute; `n6` produces a new changeset diffed against the existing ticket.

## Appendix B: Bitemporal queries

```sql
-- What do we believe NOW was true on 2026-03-31?
SELECT * FROM claims
WHERE subject = $1 AND predicate = $2
  AND valid_from <= '2026-03-31' AND (valid_to IS NULL OR valid_to > '2026-03-31')
  AND tx_to IS NULL;

-- What did we believe on 2026-04-15 about that same fact?
SELECT * FROM claims
WHERE subject = $1 AND predicate = $2
  AND valid_from <= '2026-03-31' AND (valid_to IS NULL OR valid_to > '2026-03-31')
  AND tx_from <= '2026-04-15' AND (tx_to IS NULL OR tx_to > '2026-04-15');
```

## Appendix C: Effect gateway apply protocol

```text
apply(changeset):
  assert policy_decision == allow AND approvals satisfied
  token = capabilities.mint(effect.resource, effect.op, ttl=short, bound_to=action_key)
  begin idempotent(effect.id):
     result = connector.execute(effect, token)
     observed = connector.read(effect.target)
     assert matches(observed, changeset.after) else mark_partial + schedule_compensation
  emit EffectApplied | EffectPartial | EffectFailed
```

## Appendix D: Certificate checker contract

```text
Inputs : certificate.json, artifact store (read-only), event log (read-only)
Checks : hashes match · cited spans exist and match · D0 verifiers re-run on recorded inputs
         · hash chain valid to signed head · no claim marked verified without support
Output : PASS | FAIL(list of violations)
Constraints: no network, no model calls, deterministic, single static binary, open source for audit
```

## Appendix E: Glossary (V2 additions)

- **Mission IR:** typed, effect-annotated program representation of a mission, checked before execution.
- **Action key:** hash of every input that can affect an action's result; the cache key.
- **Pinned outcome:** the recorded result of a nondeterministic action, reused instead of recomputed.
- **Taint label:** metadata marking data derived from untrusted sources; governs permitted flows.
- **Bitemporal:** tracking both when a fact is true (valid time) and when the system believed it (transaction time).
- **Certificate:** machine-checkable record binding a deliverable to its evidence, checks, and log state.
- **TCB (trusted computing base):** the minimal component whose correctness the guarantees depend on.
- **Changeset:** reviewable before/after diff of a proposed external effect.
- **Saga:** sequence of effects paired with compensating actions to recover from partial failure.
- **Autonomy ladder:** staged levels of system independence, advanced per action class from measured evidence.
- **Standing mission:** mission bound to triggers that keeps a deliverable current.
