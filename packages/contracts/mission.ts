import { z } from 'zod';

// ============================================================================
// NOEVIX MISSION ARCHITECTURE CONTRACTS (Version 0.1)
// Core Domain Entities: Mission, Plan, Step, Attempt, Event, Artifact, Claim,
// Evidence, Verification, Approval, Budget
// ============================================================================

export const MissionStateSchema = z.enum([
  'created',
  'planning',
  'awaiting_plan_approval',
  'running',
  'verifying',
  'repairing',
  'paused',
  'awaiting_human',
  'completed',
  'failed',
  'cancelled',
]);
export type MissionState = z.infer<typeof MissionStateSchema>;

export const StepKindSchema = z.enum([
  'extract',
  'transform',
  'analyze',
  'generate',
  'verify',
  'synthesize',
]);
export type StepKind = z.infer<typeof StepKindSchema>;

export const StepStateSchema = z.enum([
  'pending',
  'ready',
  'running',
  'produced',
  'verifying',
  'repairing',
  'passed',
  'failed',
  'escalated',
  'human_resolved',
  'abandoned',
]);
export type StepState = z.infer<typeof StepStateSchema>;

export const VerifierTierSchema = z.enum(['V1', 'V2', 'V3', 'V4']);
export type VerifierTier = z.infer<typeof VerifierTierSchema>;

export const VerificationOutcomeSchema = z.enum(['pass', 'fail', 'inconclusive']);
export type VerificationOutcome = z.infer<typeof VerificationOutcomeSchema>;

export const ClaimStatusSchema = z.enum(['verified', 'unsupported', 'contradicted', 'inconclusive']);
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

export const ToolSideEffectSchema = z.enum(['read', 'write_internal', 'write_external', 'destructive']);
export type ToolSideEffect = z.infer<typeof ToolSideEffectSchema>;

// Budget Specification & Consumption
export const BudgetSchema = z.object({
  tokens: z.number().default(100000),
  seconds: z.number().default(600),
  tool_calls: z.number().default(20),
  usd: z.number().default(2.0),
  consumed: z
    .object({
      tokens: z.number().default(0),
      seconds: z.number().default(0),
      tool_calls: z.number().default(0),
      usd: z.number().default(0),
    })
    .default({ tokens: 0, seconds: 0, tool_calls: 0, usd: 0 }),
});
export type Budget = z.infer<typeof BudgetSchema>;

// Acceptance Criterion
export const AcceptanceCriterionSchema = z.object({
  id: z.string(),
  check: z.string(),
  params: z.record(z.string(), z.any()).optional().default({}),
  passed: z.boolean().optional(),
});
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

// Mission Input
export const MissionInputSchema = z.object({
  kind: z.enum(['file', 'dataset', 'url', 'text']),
  ref: z.string(),
  name: z.string().optional(),
  content: z.string().optional(),
});
export type MissionInput = z.infer<typeof MissionInputSchema>;

// Mission Specification
export const MissionSpecSchema = z.object({
  goal: z.string().min(1),
  inputs: z.array(MissionInputSchema).default([]),
  constraints: z.array(z.string()).default([]),
  acceptance: z.array(AcceptanceCriterionSchema).default([]),
  budgets: BudgetSchema.default({
    tokens: 100000,
    seconds: 600,
    tool_calls: 20,
    usd: 2.0,
    consumed: { tokens: 0, seconds: 0, tool_calls: 0, usd: 0 },
  }),
  approvals: z
    .object({
      plan: z.boolean().default(false),
      external_writes: z.boolean().default(true),
      spend_over_usd: z.number().default(1.0),
    })
    .default({
      plan: false,
      external_writes: true,
      spend_over_usd: 1.0,
    }),
  data_policy: z
    .object({
      logging_consent: z.boolean().default(true),
      retention_days: z.number().default(30),
    })
    .default({
      logging_consent: true,
      retention_days: 30,
    }),
});
export type MissionSpec = z.infer<typeof MissionSpecSchema>;

// Step Specification
export const StepSpecSchema = z.object({
  id: z.string(),
  kind: StepKindSchema,
  title: z.string(),
  description: z.string().optional(),
  agent: z.object({
    role: z.enum(['planner', 'executor', 'critic', 'synthesizer', 'summarizer']),
    domain: z.string().optional(),
    tier: z.enum(['small', 'medium', 'large']).default('medium'),
  }),
  inputs: z.object({
    from_steps: z.array(z.string()).default([]),
    artifacts: z.array(z.string()).default([]),
  }),
  tools_allowed: z.array(z.string()).default([]),
  output_schema: z.string().optional(),
  verifiers: z.array(z.string()).default(['schema']),
  policy: z
    .object({
      max_attempts: z.number().default(3),
      timeout_s: z.number().default(300),
      requires_approval: z.boolean().default(false),
    })
    .default({
      max_attempts: 3,
      timeout_s: 300,
      requires_approval: false,
    }),
  idempotency_key: z.string(),
});
export type StepSpec = z.infer<typeof StepSpecSchema>;

// DAG Plan
export const PlanSchema = z.object({
  id: z.string(),
  mission_id: z.string(),
  version: z.number().default(1),
  status: z.enum(['proposed', 'approved', 'rejected', 'superseded']).default('proposed'),
  steps: z.array(StepSpecSchema),
  rationale: z.string().optional(),
  created_at: z.number(),
});
export type Plan = z.infer<typeof PlanSchema>;

// Immutable Artifact
export const ArtifactSchema = z.object({
  hash: z.string(), // SHA-256
  name: z.string(),
  size: z.number(),
  mime: z.string(),
  producer_step: z.string(),
  lineage: z.array(z.string()).default([]),
  content: z.string().optional(),
  created_at: z.number(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

// Evidence Source
export const EvidenceSchema = z.object({
  id: z.string(),
  kind: z.enum(['source_span', 'tool_run', 'calculation', 'document']),
  ref: z.string(),
  span: z.string().optional(),
  hash: z.string().optional(),
  snippet: z.string(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

// Verified Claim
export const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  artifact_ref: z.string().optional(),
  location: z.string().optional(),
  evidence_ids: z.array(z.string()).default([]),
  status: ClaimStatusSchema.default('inconclusive'),
  detail: z.string().optional(),
});
export type Claim = z.infer<typeof ClaimSchema>;

// Verification Result
export const VerificationSchema = z.object({
  id: z.string(),
  target: z.string(), // step_id or claim_id
  verifier: z.string(),
  tier: VerifierTierSchema.default('V1'),
  outcome: VerificationOutcomeSchema,
  confidence: z.number().optional(),
  detail: z.string(),
  evidence: z.array(EvidenceSchema).optional(),
  repair_hint: z.string().optional(),
  created_at: z.number(),
});
export type Verification = z.infer<typeof VerificationSchema>;

// Human Approval
export const ApprovalSchema = z.object({
  id: z.string(),
  mission_id: z.string(),
  target: z.string(), // plan, step, or tool_call
  type: z.enum(['plan', 'external_write', 'spend_threshold', 'step_escalation']),
  decision: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  user: z.string().optional(),
  note: z.string().optional(),
  requested_at: z.number(),
  decided_at: z.number().optional(),
});
export type Approval = z.infer<typeof ApprovalSchema>;

// Immutable Append-Only Event
export const MissionEventSchema = z.object({
  id: z.string(),
  mission_id: z.string(),
  seq: z.number(),
  type: z.string(),
  payload: z.any(),
  actor: z.string(), // user:id | agent:role | system
  causation: z.string().nullable().optional(),
  prev_hash: z.string(),
  hash: z.string(),
  created_at: z.number(),
});
export type MissionEvent = z.infer<typeof MissionEventSchema>;

// Projected Step State
export const StepViewSchema = z.object({
  id: z.string(),
  spec: StepSpecSchema,
  state: StepStateSchema,
  attempts: z.number().default(0),
  fencing_token: z.number().default(0),
  output: z.any().optional(),
  verifications: z.array(VerificationSchema).default([]),
  repair_count: z.number().default(0),
  started_at: z.number().optional(),
  ended_at: z.number().optional(),
  error: z.string().optional(),
});
export type StepView = z.infer<typeof StepViewSchema>;

// Projected Mission State (Materialized View folded from events)
export const MissionViewSchema = z.object({
  id: z.string(),
  project_id: z.string().default('default'),
  state: MissionStateSchema,
  spec: MissionSpecSchema,
  plan: PlanSchema.nullable(),
  steps: z.record(z.string(), StepViewSchema).default({}),
  artifacts: z.array(ArtifactSchema).default([]),
  claims: z.array(ClaimSchema).default([]),
  verifications: z.array(VerificationSchema).default([]),
  approvals: z.array(ApprovalSchema).default([]),
  budget: BudgetSchema,
  current_step_id: z.string().nullable().optional(),
  deliverable: z
    .object({
      summary: z.string().optional(),
      content: z.string().optional(),
      artifact_hashes: z.array(z.string()).default([]),
      audit_report_hash: z.string().optional(),
    })
    .optional(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type MissionView = z.infer<typeof MissionViewSchema>;

// Audit Report
export const AuditReportSchema = z.object({
  mission_id: z.string(),
  goal: z.string(),
  status: MissionStateSchema,
  created_at: z.number(),
  completed_at: z.number().optional(),
  steps_executed: z.number(),
  verifications_run: z.number(),
  verification_pass_rate: z.number(),
  claims_verified_count: z.number(),
  claims_unverified_count: z.number(),
  budget_consumed: BudgetSchema,
  events_count: z.number(),
  chain_head_hash: z.string(),
  tamper_evident_valid: z.boolean(),
  artifacts: z.array(
    z.object({
      hash: z.string(),
      name: z.string(),
      mime: z.string(),
      producer_step: z.string(),
    })
  ),
  claims: z.array(ClaimSchema),
  approvals: z.array(ApprovalSchema),
});
export type AuditReport = z.infer<typeof AuditReportSchema>;

// ============================================================================
// NOEVIX V2 CONTRACTS (Section 12: Data model additions)
// Content-addressed action cache, bitemporal truth store, effects, certificates
// ============================================================================

// Determinism class (Section 5.4)
export const DeterminismClassSchema = z.enum(['D0', 'D1', 'D2']);
export type DeterminismClass = z.infer<typeof DeterminismClassSchema>;

// Effect class (Section 8.2)
export const EffectClassSchema = z.enum(['E0', 'E1', 'E2', 'E3']);
export type EffectClass = z.infer<typeof EffectClassSchema>;

// Claim status (Section 7.2)
export const ClaimStatusV2Schema = z.enum([
  'verified',
  'unsupported',
  'contradicted',
  'inconclusive',
  'retracted',
]);
export type ClaimStatusV2 = z.infer<typeof ClaimStatusV2Schema>;

// Action descriptor: everything that can affect an action's result.
// Used to compute the content-addressed action key (Section 6.1).
export const ActionDescriptorSchema = z.object({
  op_id: z.string(),
  op_version: z.string(),
  determinism: DeterminismClassSchema.default('D2'),
  input_artifact_hashes: z.array(z.string()).default([]),
  prompt_block_hashes: z.record(z.string(), z.string()).default({}),
  model_id: z.string().optional(),
  model_version: z.string().optional(),
  decoding_params: z.record(z.string(), z.any()).default({}),
  tool_versions: z.array(z.string()).default([]),
  sandbox_image_digest: z.string().optional(),
  seed_policy: z.string().default('none'),
  tenant_id: z.string().default('default'),
});
export type ActionDescriptor = z.infer<typeof ActionDescriptorSchema>;

// Computed action key + record (Section 6.1, Section 12)
export const ActionRecordSchema = z.object({
  action_key: z.string(), // SHA-256 of the descriptor
  descriptor: ActionDescriptorSchema,
  op_id: z.string(),
  op_version: z.string(),
  status: z.enum(['cached', 'executed', 'failed', 'skipped']).default('executed'),
  inputs_hash: z.string(), // H of input artifact hashes for dependency tracking
  outputs: z.any().optional(), // recorded outputs (provenance)
  output_artifact_hashes: z.array(z.string()).default([]),
  verifications: z.array(VerificationSchema).default([]),
  created_at: z.number(),
  last_hit_at: z.number().optional(),
  hit_count: z.number().default(0),
  tenant_id: z.string().default('default'),
});
export type ActionRecord = z.infer<typeof ActionRecordSchema>;

// Action dependency edge (Section 12)
export const ActionDepSchema = z.object({
  parent_key: z.string(),
  child_key: z.string(),
});
export type ActionDep = z.infer<typeof ActionDepSchema>;

// Bitemporal claim (Section 7.2)
export const BitemporalClaimSchema = z.object({
  id: z.string(),
  tenant_id: z.string().default('default'),
  subject: z.string(),
  predicate: z.string(),
  object: z.any(),
  valid_from: z.number().optional(),
  valid_to: z.number().optional(),
  tx_from: z.number(),
  tx_to: z.number().optional(), // NULL = currently believed
  status: ClaimStatusV2Schema.default('inconclusive'),
  derivation_id: z.string().optional(),
  confidence: z.number().optional(),
  superseded_by: z.string().optional(),
});
export type BitemporalClaim = z.infer<typeof BitemporalClaimSchema>;

// Evidence link (Section 7.2)
export const EvidenceLinkSchema = z.object({
  claim_id: z.string(),
  evidence_id: z.string(),
  relation: z.enum(['supports', 'contradicts']).default('supports'),
});
export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>;

// Derivation (Section 7.2)
export const DerivationSchema = z.object({
  id: z.string(),
  action_key: z.string().optional(),
  kind: z.enum(['extraction', 'computation', 'inference', 'human']),
  inputs: z.array(z.string()).default([]),
});
export type Derivation = z.infer<typeof DerivationSchema>;

// Certificate (Section 7.5)
export const CertificateSchema = z.object({
  id: z.string(),
  deliverable_hash: z.string(),
  body: z.any(),
  log_head: z.string(),
  signature: z.string().optional(),
  created_at: z.number(),
  mission_id: z.string(),
});
export type Certificate = z.infer<typeof CertificateSchema>;

// Effect (Section 8.1)
export const EffectSchema = z.object({
  id: z.string(),
  mission_id: z.string(),
  node_id: z.string(),
  effect_class: EffectClassSchema,
  target: z.string(),
  op: z.string(),
  params: z.record(z.string(), z.any()).default({}),
  reversible: z.boolean().default(false),
  status: z.enum(['staged', 'approved', 'applied', 'partial', 'failed', 'rejected']).default('staged'),
  changeset_before: z.any().optional(),
  changeset_after: z.any().optional(),
  changeset_diff: z.any().optional(),
  policy_decision: z.enum(['allow', 'deny', 'require_approval']).default('require_approval'),
  created_at: z.number(),
  applied_at: z.number().optional(),
});
export type Effect = z.infer<typeof EffectSchema>;

// Skill (Section 9.1)
export const SkillSchema = z.object({
  id: z.string(),
  version: z.number().default(1),
  tenant_id: z.string().default('default'),
  ir: z.any(), // parameterized IR subgraph
  verifiers: z.array(z.string()).default([]),
  stats: z
    .object({
      runs: z.number().default(0),
      first_pass_acceptance: z.number().default(0),
      cost: z.number().default(0),
      human_edit_distance: z.number().default(0),
    })
    .default({ runs: 0, first_pass_acceptance: 0, cost: 0, human_edit_distance: 0 }),
  status: z.enum(['candidate', 'promoted', 'demoted', 'quarantined']).default('candidate'),
  source_mission_ids: z.array(z.string()).default([]),
  created_at: z.number(),
});
export type Skill = z.infer<typeof SkillSchema>;

// ============================================================================
// PLANE A: INTENT & COMPILER CONTRACTS (Section 5)
// Typed, effect-annotated Mission IR and static validation passes
// ============================================================================

// IR node: a single typed, effect-annotated step in the executable graph.
export const IRNodeSchema = z.object({
  id: z.string(),
  op: z.string(), // e.g. "extract.ingest", "analyze.reconcile", "effect.propose"
  inputs: z.record(
    z.string(),
    z.object({
      type: z.string(), // artifact schema type, e.g. "table<Entry>", "doc<Findings>"
      from: z.string().optional(), // node id producing this input
      artifact: z.string().optional(), // artifact hash ref
      claims: z.boolean().default(false), // whether this output carries claims
    })
  ),
  outputs: z.record(
    z.string(),
    z.object({
      type: z.string(),
      claims: z.boolean().default(false),
    })
  ),
  effects: z.array(z.string()).default([]), // declared effect classes: read, write_external, etc.
  labels: z
    .object({
      input_trust: z.enum(['trusted', 'untrusted']).default('trusted'),
      output_trust: z.enum(['trusted', 'derived', 'untrusted']).default('derived'),
    })
    .default({ input_trust: 'trusted', output_trust: 'derived' }),
  determinism: DeterminismClassSchema.default('D2'),
  verifiers: z.array(z.string()).default([]),
  policy: z
    .object({
      tier: z.enum(['small', 'medium', 'large']).default('medium'),
      max_attempts: z.number().default(3),
      timeout_s: z.number().default(300),
      requires_approval: z.boolean().default(false),
    })
    .default({ tier: 'medium', max_attempts: 3, timeout_s: 300, requires_approval: false }),
});
export type IRNode = z.infer<typeof IRNodeSchema>;

// IR edge: dependency from parent node to child node.
export const IRLinkSchema = z.object({
  from: z.string(), // parent node id
  to: z.string(), // child node id
  output: z.string(), // parent output port consumed
  input: z.string(), // child input port
});
export type IRLink = z.infer<typeof IRLinkSchema>;

// The compiled Mission IR program (Section 5.3).
export const MissionIRSchema = z.object({
  id: z.string(),
  mission_id: z.string(),
  version: z.number().default(1),
  goal: z.string(),
  nodes: z.array(IRNodeSchema),
  links: z.array(IRLinkSchema).default([]),
  coverage_target: z
    .object({
      v1: z.number().min(0).max(1).optional(),
      v2: z.number().min(0).max(1).optional(),
      sections: z.array(z.string()).optional(),
    })
    .optional(),
  created_at: z.number(),
});
export type MissionIR = z.infer<typeof MissionIRSchema>;

// Single static pass result.
export const CompilePassResultSchema = z.object({
  pass: z.string(), // P1..P7
  ok: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type CompilePassResult = z.infer<typeof CompilePassResultSchema>;

// Full compile report (Section 5.2, API: GET /v1/missions/{id}/compile).
export const CompileReportSchema = z.object({
  mission_id: z.string(),
  ir: MissionIRSchema.nullable(),
  passes: z.array(CompilePassResultSchema),
  ok: z.boolean(), // all passes ok -> executable
  cost_estimate: z
    .object({
      estimated_tokens: z.number().default(0),
      estimated_seconds: z.number().default(0),
      estimated_tool_calls: z.number().default(0),
      estimated_usd: z.number().default(0),
    })
    .default({ estimated_tokens: 0, estimated_seconds: 0, estimated_tool_calls: 0, estimated_usd: 0 }),
  coverage_forecast: z
    .object({
      v1: z.number().default(0),
      v2: z.number().default(0),
    })
    .default({ v1: 0, v2: 0 }),
  skill_substitutions: z.array(z.string()).default([]), // op_ids replaced by skills
  compiled_at: z.number(),
});
export type CompileReport = z.infer<typeof CompileReportSchema>;

// Pass name enum (Section 5.2).
export const CompilePassNameSchema = z.enum([
  'P1_structural',
  'P2_type',
  'P3_effect',
  'P4_taint',
  'P5_cost',
  'P6_verification_coverage',
  'P7_skill_substitution',
]);
export type CompilePassName = z.infer<typeof CompilePassNameSchema>;
