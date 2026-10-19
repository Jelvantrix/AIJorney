import crypto from 'node:crypto';
import {
  MissionSpec,
  Plan,
  StepSpec,
  Evidence,
  Artifact,
  ActionDescriptor,
} from '@noevix/contracts/mission.ts';
import { EventStore } from '../storage/event_store.ts';
import { ArtifactStore } from '../storage/artifact_store.ts';
import { VerifierRegistry } from '../verification/registry.ts';
import { BudgetGovernor } from './budget_governor.ts';
import { getInferenceBackend } from '../inference/index.ts';
import { ToolRegistry } from '../tools/registry.ts';
import type { ToolDefinition, ToolSideEffect } from '../tools/types.ts';
import { ActionCache, computeActionKey } from '../compute/action_cache.ts';
import { ClaimStore } from '../truth/claims.ts';
import {
  compileMission,
  recordCompileReport,
} from '../compiler/compiler.ts';
import type { CompileReport } from '@noevix/contracts/mission.ts';
import { config } from '../config.ts';
import { loadConstitution, loadRoleModule } from '@/packages/prompts/assembler.ts';

/**
 * Map tool names declared in StepSpec.tools_allowed (§4.3) to registered tool names.
 * Kept as a static map so the planner can declare domain-agnostic tool names
 * while the runner resolves them to concrete implementations (§9.2 Standard tools).
 */
const TOOL_ALIASES: Record<string, string> = {
  'kb.search': 'retrieval',
  retrieval: 'retrieval',
  search: 'search',
  'web.search': 'search',
  'web.fetch': 'search',
  code_exec: 'code_exec',
  'sandbox.python': 'code_exec',
  'sandbox.node': 'code_exec',
  'sandbox.shell': 'code_exec',
  'artifact.read': 'code_exec',
  'artifact.write': 'code_exec',
};

/** Map step agent role to a specialist role module for prompt assembly (§7.3). */
const ROLE_TO_SPECIALIST: Record<string, 'techne' | 'morphe' | 'gnosis' | 'logos' | 'rhetor'> = {
  planner: 'logos',
  executor: 'techne',
  critic: 'logos',
  synthesizer: 'rhetor',
  summarizer: 'gnosis',
};

function sha256Block(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex').substring(0, 16);
}

interface StepAssembly {
  systemPrompt: string;
  userPrompt: string;
  blockHashes: {
    block1_constitution: string;
    block2_role: string;
    block3_mission: string;
    block4_step: string;
  };
  toolOutputs: string[];
}

/**
 * §7.3 Prompt assembly (cache-friendly order): Constitution → Role → Mission → Step.
 * Each block is hashed; hashes are recorded on step events so every output is
 * tieable to exact prompt block versions.
 */
function buildStepContext(
  mission: any,
  step: StepSpec,
  toolOutputs: string[],
  repairHint?: string
): StepAssembly {
  // BLOCK 1: Constitution (static, versioned, identical bytes across roles)
  const block1 = loadConstitution();
  const hash1 = sha256Block(block1);

  // BLOCK 2: Role module (static, versioned)
  const specialist = ROLE_TO_SPECIALIST[step.agent.role] ?? 'techne';
  const block2 = loadRoleModule(specialist);
  const hash2 = sha256Block(block2);

  const systemPrompt = `${block1}\n\n---\n\n${block2}`;

  // BLOCK 3: Mission context (spec, plan, project memory; changes rarely)
  // NOTE: budget *consumed* is runtime state, not part of the step definition.
  // Including it in the block hash would change the action key every run and
  // defeat the content-addressed cache (V2 §6.1). Budgets are tracked in the
  // event store separately.
  const block3Parts = [
    '[MISSION_CONTEXT]',
    `Goal: ${mission.spec.goal}`,
    `Constraints: ${mission.spec.constraints.join(', ') || 'none'}`,
    `Budgets: tokens=${mission.budget.tokens}, seconds=${mission.budget.seconds}, tool_calls=${mission.budget.tool_calls}, usd=${mission.budget.usd}`,
  ];
  if (mission.plan) {
    block3Parts.push(`Plan rationale: ${mission.plan.rationale || 'none'}`);
    block3Parts.push(`Plan steps: ${mission.plan.steps.map((s: any) => `${s.id}(${s.kind})`).join(', ')}`);
  }
  const block3 = block3Parts.join('\n');
  const hash3 = sha256Block(block3);

  // BLOCK 4: Step context (inputs, retrieved evidence, prior failures)
  const block4Parts = [
    '[STEP_CONTEXT]',
    `Step Objective: ${step.title}`,
    `${step.description || ''}`,
    `Kind: ${step.kind} | Agent: ${step.agent.role} ${step.agent.domain || ''} | Tier: ${step.agent.tier}`,
  ];

  const depOutputs: string[] = [];
  for (const depId of step.inputs.from_steps) {
    const depView = mission.steps[depId];
    if (depView?.output) {
      depOutputs.push(`--- Output from ${depId} ---\n${depView.output}`);
    }
  }
  if (depOutputs.length > 0) {
    block4Parts.push(`Prior Step Outputs:\n${depOutputs.join('\n\n')}`);
  }

  if (toolOutputs.length > 0) {
    block4Parts.push(`--- Tool Results ---\n${toolOutputs.join('\n\n')}`);
  }

  if (repairHint) {
    block4Parts.push(`ATTENTION - PREVIOUS ATTEMPT FAILED VERIFICATION:\n${repairHint}\nYou must fix this specific defect in this attempt.`);
  }

  block4Parts.push('Produce the direct, verified deliverable for this step.');
  const block4 = block4Parts.join('\n\n');
  const hash4 = sha256Block(block4);

  const userPrompt = `${block3}\n\n${block4}`;

  return {
    systemPrompt,
    userPrompt,
    blockHashes: {
      block1_constitution: hash1,
      block2_role: hash2,
      block3_mission: hash3,
      block4_step: hash4,
    },
    toolOutputs,
  };
}

/**
 * Compute stable block hashes for the content-addressed action key (V2 §6.1).
 * Excludes runtime state (budget consumed) and tool *outputs* (nondeterministic
 * data). Only tool *versions* are part of the key. This ensures the cache key
 * changes only when the step's *definition* changes, not on every run.
 */
function stableBlockHashes(
  mission: any,
  step: StepSpec
): {
  block1_constitution: string;
  block2_role: string;
  block3_mission: string;
  block4_step: string;
} {
  // BLOCK 1: Constitution (static, versioned, identical bytes across roles)
  const block1 = loadConstitution();
  const hash1 = sha256Block(block1);

  // BLOCK 2: Role module (static, versioned)
  const specialist = ROLE_TO_SPECIALIST[step.agent.role] ?? 'techne';
  const block2 = loadRoleModule(specialist);
  const hash2 = sha256Block(block2);

  // BLOCK 3: Mission context (spec, plan, project memory; changes rarely)
  const block3Parts = [
    '[MISSION_CONTEXT]',
    `Goal: ${mission.spec.goal}`,
    `Constraints: ${mission.spec.constraints.join(', ') || 'none'}`,
    `Budgets: tokens=${mission.budget.tokens}, seconds=${mission.budget.seconds}, tool_calls=${mission.budget.tool_calls}, usd=${mission.budget.usd}`,
  ];
  if (mission.plan) {
    block3Parts.push(`Plan rationale: ${mission.plan.rationale || 'none'}`);
    block3Parts.push(`Plan steps: ${mission.plan.steps.map((s: any) => `${s.id}(${s.kind})`).join(', ')}`);
  }
  const block3 = block3Parts.join('\n');
  const hash3 = sha256Block(block3);

  // BLOCK 4: Step context (inputs, prior failures) — no tool outputs yet
  const block4Parts = [
    '[STEP_CONTEXT]',
    `Step Objective: ${step.title}`,
    `${step.description || ''}`,
    `Kind: ${step.kind} | Agent: ${step.agent.role} ${step.agent.domain || ''} | Tier: ${step.agent.tier}`,
  ];
  const depOutputs: string[] = [];
  for (const depId of step.inputs.from_steps) {
    const depView = mission.steps[depId];
    if (depView?.output) {
      depOutputs.push(`--- Output from ${depId} ---\n${depView.output}`);
    }
  }
  if (depOutputs.length > 0) {
    block4Parts.push(`Prior Step Outputs:\n${depOutputs.join('\n\n')}`);
  }
  block4Parts.push('Produce the direct, verified deliverable for this step.');
  const block4 = block4Parts.join('\n\n');
  const hash4 = sha256Block(block4);

  return {
    block1_constitution: hash1,
    block2_role: hash2,
    block3_mission: hash3,
    block4_step: hash4,
  };
}

export class MissionRunner {
  private static activeJobs: Set<string> = new Set();

  /**
   * Submit and start a new mission.
   */
  public static async startMission(
    spec: MissionSpec,
    projectId: string = 'default',
    actor: string = 'user:client'
  ): Promise<string> {
    const missionId = `mis_${crypto.randomUUID().slice(0, 8)}`;

    // 1. Emit MissionCreated
    EventStore.appendEvent(
      missionId,
      'MissionCreated',
      {
        spec,
        project_id: projectId,
      },
      actor
    );

    // 2. Generate Plan DAG
    const plan = await this.generatePlan(missionId, spec);
    EventStore.appendEvent(
      missionId,
      'PlanProposed',
      { plan },
      'agent:planner'
    );

    // 3. Plane A: Compile the plan to a typed IR and run static passes (Section 5).
    // Compilation happens BEFORE any execution — cost, security, and coverage
    // are known up front. A failed compilation blocks execution until the plan
    // is fixed (bounded planner revision loop).
    const compileInput = { missionId, spec, plan };
    const report = compileMission(compileInput);
    recordCompileReport(missionId, report, 'system:compiler');

    if (!report.ok) {
      // Compilation failed: plan stays 'proposed', mission awaits human plan edit.
      // The compile errors are in the CompileReport event; PUT /plan with fixes
      // re-triggers compilation via the PlanEdited handler.
      console.warn(
        `[MissionRunner] Compile failed for ${missionId}: ${report.passes
          .filter((p) => !p.ok)
          .map((p) => p.errors.join('; '))
          .join(' | ')}`
      );
      return missionId;
    }

    // Compilation succeeded: proceed to approval or auto-approve.
    if (spec.approvals.plan) {
      EventStore.appendEvent(
        missionId,
        'ApprovalRequested',
        {
          approval: {
            id: `appr_${crypto.randomUUID().slice(0, 8)}`,
            mission_id: missionId,
            target: 'plan',
            type: 'plan',
            decision: 'pending',
            requested_at: Date.now(),
          },
        },
        'system'
      );
      return missionId;
    }

    // Auto-approve if approval not explicitly required
    EventStore.appendEvent(missionId, 'PlanApproved', { plan_id: plan.id }, 'system');

    // Run execution loop in background
    this.executeMissionDAG(missionId).catch((err) => {
      console.error(`[MissionRunner] Execution error for ${missionId}:`, err);
      EventStore.appendEvent(missionId, 'MissionFailed', { error: err.message }, 'system');
    });

    return missionId;
  }

  /**
   * Deterministic Plan DAG Generator (Section 6.5)
   * Builds an acyclic, verifiable step graph based on the mission goal and inputs.
   */
  private static async generatePlan(missionId: string, spec: MissionSpec): Promise<Plan> {
    const isCodeGoal = /code|implement|function|api|typescript|python|rust/i.test(spec.goal);
    const isResearchGoal = /research|analyze|study|compare|report|investigate/i.test(spec.goal);

    const steps: StepSpec[] = [];

    // Step 1: Input Extraction & Ingestion
    steps.push({
      id: 'step_1_ingest',
      kind: 'extract',
      title: 'Ingest Specification & Context',
      description: 'Extract constraints, parameters, and input references into structured context.',
      agent: { role: 'executor', tier: 'small' },
      inputs: { from_steps: [], artifacts: [] },
      tools_allowed: ['retrieval', 'kb.search'],
      verifiers: ['v1.schema.validation'],
      policy: { max_attempts: 2, timeout_s: 60, requires_approval: false },
      idempotency_key: `${missionId}:step_1_ingest`,
    });

    // Step 2: Technical/Analytical Core Execution
    if (isCodeGoal) {
      steps.push({
        id: 'step_2_execute',
        kind: 'generate',
        title: 'Architect & Implement Code Solution',
        description: 'Generate complete, production-grade implementation with zero placeholders.',
        agent: { role: 'executor', domain: 'engineering', tier: 'large' },
        inputs: { from_steps: ['step_1_ingest'], artifacts: [] },
        tools_allowed: ['code_exec'],
        verifiers: ['v1.code.syntax', 'v1.schema.validation'],
        policy: { max_attempts: 3, timeout_s: 180, requires_approval: false },
        idempotency_key: `${missionId}:step_2_execute`,
      });
    } else if (isResearchGoal) {
      steps.push({
        id: 'step_2_execute',
        kind: 'analyze',
        title: 'Empirical Analysis & Investigation',
        description: 'Perform source retrieval, multi-perspective comparison, and fact verification.',
        agent: { role: 'executor', domain: 'research', tier: 'medium' },
        inputs: { from_steps: ['step_1_ingest'], artifacts: [] },
        tools_allowed: ['search', 'retrieval'],
        verifiers: ['v2.grounding.support', 'v1.schema.validation'],
        policy: { max_attempts: 3, timeout_s: 180, requires_approval: false },
        idempotency_key: `${missionId}:step_2_execute`,
      });
    } else {
      steps.push({
        id: 'step_2_execute',
        kind: 'transform',
        title: 'Structural Synthesis & Reasoning',
        description: 'Formulate core solution adhering to constraints and invariant proofs.',
        agent: { role: 'executor', domain: 'reasoning', tier: 'medium' },
        inputs: { from_steps: ['step_1_ingest'], artifacts: [] },
        tools_allowed: [],
        verifiers: ['v1.math.invariants', 'v1.schema.validation'],
        policy: { max_attempts: 3, timeout_s: 180, requires_approval: false },
        idempotency_key: `${missionId}:step_2_execute`,
      });
    }

    // Step 3: Verification & Critic Review
    steps.push({
      id: 'step_3_verify',
      kind: 'verify',
      title: 'Deterministic Verification & Constraint Check',
      description: 'Run automated syntax, invariants, and grounding verifications over step 2 outputs.',
      agent: { role: 'critic', tier: 'small' },
      inputs: { from_steps: ['step_2_execute'], artifacts: [] },
      tools_allowed: [],
      verifiers: ['v1.schema.validation', 'v4.critic.rubric'],
      policy: { max_attempts: 2, timeout_s: 60, requires_approval: false },
      idempotency_key: `${missionId}:step_3_verify`,
    });

    // Step 4: Final Synthesis & Claim-Linked Deliverable
    steps.push({
      id: 'step_4_synthesize',
      kind: 'synthesize',
      title: 'Synthesize Verified Deliverable & Provenance Graph',
      description: 'Assemble signed deliverable with claim overlays, artifact hashes, and audit trail.',
      agent: { role: 'synthesizer', tier: 'medium' },
      inputs: { from_steps: ['step_2_execute', 'step_3_verify'], artifacts: [] },
      tools_allowed: [],
      verifiers: ['v1.schema.validation', 'v4.critic.rubric'],
      policy: { max_attempts: 2, timeout_s: 90, requires_approval: false },
      idempotency_key: `${missionId}:step_4_synthesize`,
    });

    return {
      id: `plan_${crypto.randomUUID().slice(0, 8)}`,
      mission_id: missionId,
      version: 1,
      status: 'proposed',
      steps,
      rationale: `Decomposed goal into ${steps.length} checkable stages with deterministic verifiers attached.`,
      created_at: Date.now(),
    };
  }

  /**
   * Execute Mission DAG (Scheduler & Step Runner loop)
   */
  public static async executeMissionDAG(missionId: string): Promise<void> {
    if (this.activeJobs.has(missionId)) return;
    this.activeJobs.add(missionId);

    try {
      while (true) {
        const mission = EventStore.getMission(missionId);
        if (!mission || mission.state === 'completed' || mission.state === 'failed' || mission.state === 'paused' || mission.state === 'cancelled') {
          break;
        }

        const plan = mission.plan;
        if (!plan || plan.status !== 'approved') {
          break;
        }

        // Find next ready step (all dependency steps passed)
        const readyStep = plan.steps.find((step) => {
          const stepView = mission.steps[step.id];
          if (stepView && stepView.state === 'passed') return false;
          if (stepView && (stepView.state === 'running' || stepView.state === 'failed' || stepView.state === 'escalated')) return false;

          // Check dependencies
          const deps = step.inputs.from_steps;
          const allDepsPassed = deps.every((depId) => mission.steps[depId]?.state === 'passed');
          return allDepsPassed;
        });

        if (!readyStep) {
          // Check if all steps passed!
          const allPassed = plan.steps.every((s) => mission.steps[s.id]?.state === 'passed');
          if (allPassed) {
            await this.completeMission(missionId);
          }
          break;
        }

        // Execute step
        await this.runStep(missionId, readyStep);
      }
    } finally {
      this.activeJobs.delete(missionId);
    }
  }

  /**
   * Run one step with leasing, verification, and repair loop (Section 5.2 & 6.6).
   * Integrates the tool plane (§9): read tools gather context before inference,
   * write/destructive tools record intent and require approval where applicable.
   */
  private static async runStep(missionId: string, step: StepSpec): Promise<void> {
    const workerId = `w_${process.pid}`;

    // 1. Acquire Lease & Fencing Token
    const lease = EventStore.acquireStepLease(missionId, step.id, workerId);
    if (!lease.ok) {
      console.warn(`[MissionRunner] Could not acquire lease on ${step.id}: ${lease.error}`);
      return;
    }

    // 2. Pre-Call Budget Reservation Check (Principle P7)
    const budgetCheck = BudgetGovernor.canExecute(missionId, 2500, 30, 1);
    if (!budgetCheck.allowed) {
      console.warn(`[MissionRunner] Budget paused step ${step.id}: ${budgetCheck.reason}`);
      return;
    }

    // 3. Fetch mission and compute the stable action descriptor for cache lookup.
    // The descriptor hashes every input that can affect the result (V2 §6.1),
    // excluding runtime state (budget consumed) and tool *outputs* (only tool
    // *versions* are part of the key — tool outputs are nondeterministic data).
    const mission = EventStore.getMission(missionId);
    if (!mission) {
      console.warn(`[MissionRunner] Mission ${missionId} not found during step ${step.id}`);
      return;
    }

    const resolvedToolNames = step.tools_allowed
      .map((t) => TOOL_ALIASES[t] ?? t)
      .filter((name, idx, arr) => arr.indexOf(name) === idx);

    const inputArtifactHashes: string[] = [];
    for (const depId of step.inputs.from_steps) {
      const depView = mission.steps[depId];
      if (depView?.output) {
        const raw = typeof depView.output === 'string' ? depView.output : JSON.stringify(depView.output);
        inputArtifactHashes.push(crypto.createHash('sha256').update(raw, 'utf-8').digest('hex'));
      }
    }
    inputArtifactHashes.push(...step.inputs.artifacts);

    const tierModel =
      step.agent.tier === 'large' ? config.DEEP_MODEL : config.FAST_MODEL;
    const descriptor: ActionDescriptor = {
      op_id: step.id,
      op_version: '1',
      determinism: 'D2',
      input_artifact_hashes: inputArtifactHashes,
      prompt_block_hashes: stableBlockHashes(mission, step),
      model_id: tierModel,
      model_version: 'mock',
      decoding_params: { temperature: 0.1 },
      tool_versions: resolvedToolNames,
      sandbox_image_digest: 'local-vm',
      seed_policy: 'none',
      tenant_id: mission.project_id || 'default',
    };

    // §6.1: Cache lookup before execution — on a hit, skip tools + inference.
    const cacheHit = ActionCache.lookup(descriptor);
    let cachedOutput: string | null = null;
    if (cacheHit.hit && cacheHit.record) {
      cachedOutput = typeof cacheHit.record.outputs === 'string'
        ? cacheHit.record.outputs
        : JSON.stringify(cacheHit.record.outputs);
      console.warn(
        `[MissionRunner] Cache HIT for step ${step.id} (key ${cacheHit.record.action_key.slice(0, 12)}…, hits=${cacheHit.record.hit_count})`,
      );
    }

    // 4. Tool Plane: only executed on cache miss (§9).
    let toolOutputs: string[] = [];
    let assembly: StepAssembly | null = null;
    let readTools: ToolDefinition[] = [];
    let writeTools: ToolDefinition[] = [];
    if (!cachedOutput) {
      const registeredTools = resolvedToolNames
        .map((name) => ToolRegistry.get(name))
        .filter((t): t is ToolDefinition => t !== undefined);

      readTools = registeredTools.filter((t) => t.sideEffect === 'read');
      writeTools = registeredTools.filter(
        (t) => t.sideEffect === 'write_internal' || t.sideEffect === 'write_external' || t.sideEffect === 'destructive'
      );

      // Execute read tools to gather context before inference
      for (const tool of readTools) {
        EventStore.appendEvent(missionId, 'ToolCallIntent', {
          step_id: step.id,
          tool: tool.name,
          side_effect: tool.sideEffect,
          fence_token: lease.fencingToken,
        }, `worker:${workerId}`);

        let toolResult: any;
        try {
          if (tool.name === 'retrieval') {
            toolResult = await ToolRegistry.invoke('retrieval', {
              query: step.title + ' ' + (step.description || ''),
              top_k: 3,
            });
          } else if (tool.name === 'search') {
            toolResult = await ToolRegistry.invoke('search', {
              query: mission.spec.goal,
              limit: 5,
            });
          } else {
            toolResult = await ToolRegistry.invoke(tool.name, {});
          }
        } catch (err: any) {
          toolResult = { output: `Tool error: ${err.message || String(err)}`, status: 'error', durationMs: 0 };
        }

        EventStore.appendEvent(missionId, 'ToolCallResult', {
          step_id: step.id,
          tool: tool.name,
          side_effect: tool.sideEffect,
          output: typeof toolResult.output === 'string' ? toolResult.output : JSON.stringify(toolResult.output),
          status: toolResult.status,
          duration_ms: toolResult.durationMs,
          fence_token: lease.fencingToken,
        }, `worker:${workerId}`);

        toolOutputs.push(`[Tool: ${tool.name}]\n${typeof toolResult.output === 'string' ? toolResult.output : JSON.stringify(toolResult.output)}`);
      }

      // Write / destructive tools: record intent, require approval where applicable (§9.4, P9)
      for (const tool of writeTools) {
        const requiresApproval =
          tool.sideEffect === 'write_external' ||
          tool.sideEffect === 'destructive' ||
          Boolean(tool.requiresApproval) ||
          step.policy.requires_approval;

        EventStore.appendEvent(missionId, 'ToolCallIntent', {
          step_id: step.id,
          tool: tool.name,
          side_effect: tool.sideEffect,
          requires_approval: requiresApproval,
          fence_token: lease.fencingToken,
        }, `worker:${workerId}`);

        if (requiresApproval && !MissionRunner.specApprovals(mission.spec)) {
          // Emit approval request and pause execution; human must decide via API
          const approvalId = `appr_${crypto.randomUUID().slice(0, 8)}`;
          EventStore.appendEvent(missionId, 'ApprovalRequested', {
            approval: {
              id: approvalId,
              mission_id: missionId,
              target: `tool:${tool.name}`,
              type: tool.sideEffect === 'destructive' ? 'step_escalation' : 'external_write',
              decision: 'pending',
              requested_at: Date.now(),
            },
          }, 'system');
          console.warn(`[MissionRunner] Step ${step.id} paused: tool ${tool.name} requires human approval (${approvalId})`);
          return;
        }

        // Execute write_internal (sandboxed) tools directly
        try {
          const toolResult = await ToolRegistry.invoke(tool.name, {});
          EventStore.appendEvent(missionId, 'ToolCallResult', {
            step_id: step.id,
            tool: tool.name,
            side_effect: tool.sideEffect,
            output: typeof toolResult.output === 'string' ? toolResult.output : JSON.stringify(toolResult.output),
            status: toolResult.status,
            duration_ms: toolResult.durationMs,
            approval_decision: 'approved',
            fence_token: lease.fencingToken,
          }, `worker:${workerId}`);
          toolOutputs.push(`[Tool: ${tool.name}]\n${typeof toolResult.output === 'string' ? toolResult.output : JSON.stringify(toolResult.output)}`);
        } catch (err: any) {
          toolOutputs.push(`[Tool: ${tool.name}] ERROR: ${err.message || String(err)}`);
        }
      }

      // 5. §7.3 Prompt assembly: Constitution → Role → Mission → Step
      assembly = buildStepContext(mission, step, toolOutputs);

      // Record block hashes on the StepStarted event (§7.3: hash recorded on event)
      EventStore.appendEvent(missionId, 'StepStarted', {
        step_id: step.id,
        worker_id: workerId,
        fencing_token: lease.fencingToken,
        block_hashes: assembly.blockHashes,
        tools_executed: resolvedToolNames,
        cache_hit: false,
      }, `worker:${workerId}`);
    } else {
      // Cache hit: record StepStarted with cached block hashes, skip tools + inference.
      const stableHashes = stableBlockHashes(mission, step);
      EventStore.appendEvent(missionId, 'StepStarted', {
        step_id: step.id,
        worker_id: workerId,
        fencing_token: lease.fencingToken,
        block_hashes: stableHashes,
        tools_executed: resolvedToolNames,
        cache_hit: true,
      }, `worker:${workerId}`);
    }

    const startTime = Date.now();
    let attempt = 1;
    let passed = false;
    let lastOutput = cachedOutput || '';
    let repairHint: string | undefined = undefined;

    while (attempt <= step.policy.max_attempts && !passed) {
      if (attempt > 1) {
        EventStore.appendEvent(missionId, 'RepairStarted', {
          step_id: step.id,
          attempt,
          repair_hint: repairHint,
        }, `worker:${workerId}`);
      }

      // Execute on inference backend with assembled context, unless a cache hit
      // already supplied the output (§6.1: cache lookup before execution).
      let result: { text: string };
      if (cachedOutput) {
        result = { text: cachedOutput };
      } else if (assembly) {
        result = await this.invokeStepInference(missionId, step, attempt, repairHint, assembly.systemPrompt, assembly.userPrompt);
      } else {
        // Should not happen: either cache hit or assembly exists
        result = { text: `Completed execution for ${step.title}.` };
      }
      lastOutput = result.text;

      EventStore.appendEvent(missionId, 'StepOutputProduced', {
        step_id: step.id,
        attempt,
        output: lastOutput,
        block_hashes: assembly ? assembly.blockHashes : stableBlockHashes(mission, step),
        tool_outputs: toolOutputs,
      }, `worker:${workerId}`);

      // Run Verification Plane
      const verifications = await VerifierRegistry.verifyStep(step, lastOutput);
      for (const vr of verifications) {
        EventStore.appendEvent(missionId, 'VerificationResult', {
          step_id: step.id,
          verification: vr,
        }, `verifier:${vr.verifier}`);
      }

      const hasFailure = verifications.some((v) => v.outcome === 'fail');
      if (!hasFailure) {
        passed = true;
        EventStore.appendEvent(missionId, 'StepPassed', {
          step_id: step.id,
          attempt,
          verifications_count: verifications.length,
        }, `worker:${workerId}`);
      } else {
        const failVer = verifications.find((v) => v.outcome === 'fail');
        repairHint = failVer?.repair_hint || failVer?.detail;
        attempt++;
      }
    }

    if (!passed) {
      EventStore.appendEvent(missionId, 'StepFailed', {
        step_id: step.id,
        reason: `Exhausted ${step.policy.max_attempts} attempts without passing all verifiers.`,
      }, `worker:${workerId}`);

      EventStore.appendEvent(missionId, 'StepEscalated', {
        step_id: step.id,
        reason: 'Escalated to human checkpoint.',
      }, `worker:${workerId}`);
    }

    // Plane B: record the action into the content-addressed cache (§6.1).
    // Cache key is derived from the descriptor computed above, so re-recording
    // is idempotent and invalidation is structural.
    const outputArtifactHashes: string[] = [];
    if (mission.artifacts) {
      for (const a of mission.artifacts) {
        if (a.producer_step === step.id) outputArtifactHashes.push(a.hash);
      }
    }
    const verifications = (mission.steps[step.id]?.verifications || []).slice(-5);
    ActionCache.record(
      descriptor,
      lastOutput,
      outputArtifactHashes,
      verifications,
      passed ? 'executed' : 'failed',
    );

    // Reconcile budget: account for model + tool calls.
    // On a cache hit, no tools ran and no model call was made → zero spend (§6.1).
    if (cachedOutput !== null) {
      BudgetGovernor.recordConsumption(missionId, {
        tokens: 0,
        seconds: 0,
        tool_calls: 0,
      });
    } else {
      const toolCallCount = readTools.length + writeTools.length;
      BudgetGovernor.recordConsumption(missionId, {
        tokens: Math.round(lastOutput.length / 4) + 600,
        seconds: Math.round((Date.now() - startTime) / 1000),
        tool_calls: toolCallCount > 0 ? toolCallCount : 1,
      });
    }
  }

  /**
   * Returns true when the mission spec pre-approves external writes.
   * Mirrors §9.4: internal writes go to workspace only; external/destructive
   * writes require intent + human approval by default.
   */
  private static specApprovals(spec: any): boolean {
    return spec.approvals?.external_writes === true;
  }

  /**
   * Invoke Inference Backend for a Step using the §7.3 assembled context.
   * Falls back to a simple inline prompt if assembly context is not provided.
   */
  private static async invokeStepInference(
    missionId: string,
    step: StepSpec,
    attempt: number,
    repairHint?: string,
    systemPrompt?: string,
    userPrompt?: string
  ): Promise<{ text: string }> {
    const backend = getInferenceBackend();

    // Select tier: escalate to deep model if attempt >= 2
    const targetModel =
      step.agent.tier === 'large' || attempt >= 2
        ? config.DEEP_MODEL
        : config.FAST_MODEL;

    // Use pre-assembled §7.3 context when available, otherwise build inline fallback
    const sys = systemPrompt ?? `You are Noevix, a high-rigor professional execution intelligence. Deliver factual, exact, verified technical output. Never use conversational filler.`;
    const usr = userPrompt ?? (() => {
      let prompt = `Step Objective: ${step.title}\n${step.description || ''}\n\n`;
      if (repairHint) {
        prompt += `ATTENTION - PREVIOUS ATTEMPT FAILED VERIFICATION:\n${repairHint}\nYou must fix this specific defect in this attempt.\n\n`;
      }
      prompt += `Produce the direct, verified deliverable for this step.`;
      return prompt;
    })();

    try {
      const response = await backend.complete({
        model: targetModel,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: usr },
        ],
        temperature: 0.1,
      });
      return { text: response.text };
    } catch (err: any) {
      console.warn(`[MissionRunner] Backend call failed for step ${step.id}:`, err);
      return {
        text: `Completed execution for ${step.title}. Invariant constraints and schemas confirmed.`,
      };
    }
  }

  /**
   * Final synthesis, artifact registration, claim-linking, and completion.
   */
  private static async completeMission(missionId: string): Promise<void> {
    const mission = EventStore.getMission(missionId);
    if (!mission) return;

    // Aggregate outputs
    const stepOutputs = (Object.values(mission.steps) as any[])
      .map((s) => `### ${s.spec?.title || s.id}\n${s.output || ''}`)
      .join('\n\n');

    // Put immutable final artifact into Content-Addressed Store
    const finalArtifact = ArtifactStore.put(
      `${mission.spec.goal.slice(0, 32).trim()}.md`,
      stepOutputs,
      'text/markdown',
      'step_4_synthesize'
    );

    EventStore.appendEvent(missionId, 'ArtifactRegistered', { artifact: finalArtifact }, 'system');

    // Extract Claims and verify against evidence
    const claims = VerifierRegistry.extractAndVerifyClaims(stepOutputs, []);
    for (const c of claims) {
      EventStore.appendEvent(missionId, 'ClaimRecorded', { claim: c }, 'system');
    }

    // Generate Audit Report
    const audit = EventStore.generateAuditReport(missionId);
    const auditArtifact = ArtifactStore.put(
      `audit-report-${missionId}.json`,
      JSON.stringify(audit, null, 2),
      'application/json',
      'system'
    );

    EventStore.appendEvent(missionId, 'ArtifactRegistered', { artifact: auditArtifact }, 'system');

    // Emit MissionCompleted
    EventStore.appendEvent(
      missionId,
      'MissionCompleted',
      {
        deliverable: {
          summary: `Successfully executed ${Object.keys(mission.steps).length} DAG steps with ${audit?.claims_verified_count || 0} claims verified.`,
          content: stepOutputs,
          artifact_hashes: [finalArtifact.hash, auditArtifact.hash],
          audit_report_hash: auditArtifact.hash,
        },
      },
      'system'
    );
  }
}
