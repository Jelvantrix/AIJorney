import {
  MissionSpec,
  Plan,
  StepSpec,
  MissionIR,
  IRNode,
  IRLink,
  CompileReport,
  CompilePassResult,
  DeterminismClass,
  ActionDescriptor,
} from '../../../packages/contracts/mission.ts';
import { EventStore } from '../storage/event_store.ts';
import { config } from '../config.ts';

/**
 * Plane A: Intent & Compiler (Section 5).
 *
 * Turns a loosely specified goal into a statically validated program before
 * any expensive computation. The planner is a suggestion engine; the compiler
 * is the authority. Static passes (deterministic code) check structure, types,
 * effects, taint, cost, and verification coverage. A bad plan fails compilation
 * with a precise error fed back to the planner for bounded revision.
 *
 * MVP tier (§5.7): IR as JSON schema; passes P1, P3, P5, P6.
 */

// ------------------------------------------------------------
// 5.2 Pipeline: lowering + static passes
// ------------------------------------------------------------

/** Lower a mission spec + plan DAG into a typed Mission IR. */
function lowerToIR(
  missionId: string,
  spec: MissionSpec,
  plan: Plan
): MissionIR {
  const nodes: IRNode[] = plan.steps.map((step) => ({
    id: step.id,
    op: `${step.kind}.${step.agent.domain || 'general'}`,
    inputs: Object.fromEntries(
      step.inputs.from_steps.map((depId) => [
        depId,
        {
          type: 'any',
          from: depId,
          claims: step.kind === 'synthesize' || step.kind === 'verify',
        },
      ])
    ),
    outputs: Object.fromEntries([
      ['out', { type: 'any', claims: step.kind === 'synthesize' }],
    ]),
    effects: step.tools_allowed.map((t) =>
      t.startsWith('write') || t.startsWith('destructive')
        ? t
        : 'read'
    ),
    labels: {
      input_trust: step.tools_allowed.some((t) =>
        ['web.search', 'web.fetch', 'kb.search', 'search'].includes(t)
      )
        ? 'untrusted'
        : 'trusted',
      output_trust: 'derived',
    },
    determinism: 'D2',
    verifiers: step.verifiers,
    policy: { ...step.policy, tier: step.agent.tier },
  }));

  const links: IRLink[] = [];
  for (const step of plan.steps) {
    for (const depId of step.inputs.from_steps) {
      links.push({
        from: depId,
        to: step.id,
        output: 'out',
        input: depId,
      });
    }
  }

  return {
    id: `ir_${plan.id}`,
    mission_id: missionId,
    version: plan.version,
    goal: spec.goal,
    nodes,
    links,
    coverage_target: {
      v1: 0.7,
      sections: [],
    },
    created_at: Date.now(),
  };
}

/** Estimate per-step token cost for the cost forecast (P5). */
function estimateStepTokens(step: StepSpec): number {
  const baseByTier: Record<string, number> = { small: 400, medium: 1500, large: 6000 };
  const base = baseByTier[step.agent.tier] ?? 1500;
  const toolTokens = step.tools_allowed.length * 200;
  return base + toolTokens;
}

// ------------------------------------------------------------
// P1 Structural: acyclic, all references resolve, schemas valid
// ------------------------------------------------------------
function passP1(ir: MissionIR): CompilePassResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeIds = new Set(ir.nodes.map((n) => n.id));

  // All link references resolve to existing nodes
  for (const link of ir.links) {
    if (!nodeIds.has(link.from)) {
      errors.push(`P1: link from unknown node ${link.from}`);
    }
    if (!nodeIds.has(link.to)) {
      errors.push(`P1: link to unknown node ${link.to}`);
    }
  }

  // Every node's from_steps references resolve
  for (const node of ir.nodes) {
    for (const inputPort of Object.keys(node.inputs)) {
      const ref = node.inputs[inputPort].from;
      if (ref && !nodeIds.has(ref)) {
        errors.push(`P1: node ${node.id} input ${inputPort} references unknown node ${ref}`);
      }
    }
  }

  // Acyclicity check via DFS
  const adj = new Map<string, string[]>();
  for (const node of ir.nodes) adj.set(node.id, []);
  for (const link of ir.links) {
    const targets = adj.get(link.from) ?? [];
    targets.push(link.to);
    adj.set(link.from, targets);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of nodeIds) color.set(id, WHITE);

  let hasCycle = false;
  function dfs(u: string) {
    color.set(u, GRAY);
    for (const v of adj.get(u) ?? []) {
      const c = color.get(v);
      if (c === GRAY) {
        hasCycle = true;
        return;
      }
      if (c === WHITE) dfs(v);
    }
    color.set(u, BLACK);
  }
  for (const id of nodeIds) {
    if (color.get(id) === WHITE) dfs(id);
    if (hasCycle) break;
  }
  if (hasCycle) errors.push('P1: IR graph contains a cycle');

  // At least one root node (no inputs) exists for execution to start
  const hasInputs = new Set(ir.links.map((l) => l.to));
  const roots = ir.nodes.filter((n) => !hasInputs.has(n.id));
  if (roots.length === 0) {
    errors.push('P1: no root node — every node has an upstream dependency');
  } else if (roots.length > 3) {
    warnings.push(`P1: ${roots.length} root nodes — consider a single ingestion entry`);
  }

  return {
    pass: 'P1_structural',
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

// ------------------------------------------------------------
// P3 Effect: every side effect declared, classified, permitted by policy
// ------------------------------------------------------------
function passP3(ir: MissionIR, spec: MissionSpec): CompilePassResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allowedExternal = spec.approvals?.external_writes ?? false;

  for (const node of ir.nodes) {
    for (const effect of node.effects) {
      const lower = effect.toLowerCase();
      // Declared effect must be a known class
      if (!['read', 'write_internal', 'write_external', 'destructive', 'exec', 'egress'].includes(lower)) {
        errors.push(`P3: node ${node.id} declares unknown effect "${effect}"`);
        continue;
      }
      // External/destructive effects require explicit approval
      if ((lower === 'write_external' || lower === 'destructive') && !allowedExternal) {
        errors.push(
          `P3: node ${node.id} effect "${effect}" requires external_writes approval, which is disabled`
        );
      }
      if (lower === 'egress') {
        warnings.push(`P3: node ${node.id} egress effect — confirm egress_allowlist covers target`);
      }
    }
  }

  return {
    pass: 'P3_effect',
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

// ------------------------------------------------------------
// P5 Cost: worst-case and expected budget within mission limits
// ------------------------------------------------------------
function passP5(ir: MissionIR, spec: MissionSpec): CompilePassResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const budget = spec.budgets;

  let estimatedTokens = 0;
  let estimatedSeconds = 0;
  let estimatedToolCalls = 0;

  for (const node of ir.nodes) {
    // Find the corresponding step spec for tier
    estimatedTokens += estimateIRNodeTokens(node);
    estimatedSeconds += node.policy.timeout_s / 2; // expected, not worst-case
    estimatedToolCalls += node.effects.length > 0 ? 1 : 0;
  }

  const estUsd = Math.round((estimatedTokens / 1_000_000) * 0.15 * 1000) / 1000;

  const overBudget: string[] = [];
  if (estimatedTokens > budget.tokens) {
    overBudget.push(
      `tokens ${estimatedTokens} > limit ${budget.tokens}`
    );
  }
  if (estimatedSeconds > budget.seconds) {
    overBudget.push(
      `seconds ${estimatedSeconds} > limit ${budget.seconds}`
    );
  }
  if (estimatedToolCalls > budget.tool_calls) {
    overBudget.push(
      `tool_calls ${estimatedToolCalls} > limit ${budget.tool_calls}`
    );
  }
  if (estUsd > budget.usd) {
    overBudget.push(`usd $${estUsd} > limit $${budget.usd}`);
  }

  if (overBudget.length > 0) {
    errors.push(`P5: estimated cost exceeds mission budget: ${overBudget.join(', ')}`);
  }

  // 80% warning
  const tokenRatio = budget.tokens > 0 ? estimatedTokens / budget.tokens : 0;
  if (tokenRatio >= 0.8 && tokenRatio < 1) {
    warnings.push(`P5: token burn forecast at ${Math.round(tokenRatio * 100)}% of budget`);
  }

  return {
    pass: 'P5_cost',
    ok: errors.length === 0,
    errors,
    warnings,
    // Return via a side channel is awkward; attach estimates to warnings is not clean.
    // Instead, we embed estimates in the compile report outside this function.
  };
}

/** Token estimate for an IR node (mirrors estimateStepTokens). */
function estimateIRNodeTokens(node: IRNode): number {
  const baseByTier: Record<string, number> = { small: 400, medium: 1500, large: 6000 };
  return baseByTier[node.policy.tier] ?? 1500;
}

// ------------------------------------------------------------
// P6 Verification coverage: required coverage achieved (forecast)
// ------------------------------------------------------------
function passP6(
  ir: MissionIR,
  spec: MissionSpec
): CompilePassResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const target = ir.coverage_target;

  // Count nodes that declare at least one verifier (V1-class deterministic)
  const totalNodes = ir.nodes.length;
  const verifiedNodes = ir.nodes.filter((n) => n.verifiers.length > 0).length;
  const v1Forecast = totalNodes > 0 ? verifiedNodes / totalNodes : 0;

  // Grounding (V2) forecast: nodes with untrusted inputs should have a grounding verifier
  const untrustedInputNodes = ir.nodes.filter((n) => n.labels.input_trust === 'untrusted');
  const groundedNodes = untrustedInputNodes.filter((n) =>
    n.verifiers.some((v) => v.includes('grounding') || v.includes('v2'))
  ).length;
  const v2Forecast =
    untrustedInputNodes.length > 0 ? groundedNodes / untrustedInputNodes.length : 1;

  if (target?.v1 !== undefined && v1Forecast < target.v1) {
    errors.push(
      `P6: v1 coverage forecast ${(v1Forecast * 100).toFixed(0)}% below target ${(target.v1 * 100).toFixed(0)}%`
    );
  }
  if (target?.v2 !== undefined && v2Forecast < target.v2) {
    errors.push(
      `P6: v2 coverage forecast ${(v2Forecast * 100).toFixed(0)}% below target ${(target.v2 * 100).toFixed(0)}%`
    );
  }

  if (v1Forecast < 0.5) {
    warnings.push(
      `P6: low v1 coverage forecast (${(v1Forecast * 100).toFixed(0)}% of nodes have verifiers)`
    );
  }

  return {
    pass: 'P6_verification_coverage',
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

// ------------------------------------------------------------
// Top-level compile entry point
// ------------------------------------------------------------

export interface CompileInput {
  missionId: string;
  spec: MissionSpec;
  plan: Plan;
}

export function compileMission(input: CompileInput): CompileReport {
  const { missionId, spec, plan } = input;
  const ir = lowerToIR(missionId, spec, plan);

  // Run static passes
  const p1 = passP1(ir);
  const p3 = passP3(ir, spec);

  // Cost estimates (computed once, shared by P5)
  let estimatedTokens = 0;
  let estimatedSeconds = 0;
  let estimatedToolCalls = 0;
  for (const node of ir.nodes) {
    estimatedTokens += estimateIRNodeTokens(node);
    estimatedSeconds += node.policy.timeout_s / 2;
    estimatedToolCalls += node.effects.length > 0 ? 1 : 0;
  }
  const estimatedUsd =
    ir.nodes.length > 0
      ? Math.round((estimatedTokens / 1_000_000) * 0.15 * 1000) / 1000
      : 0;

  const p5 = passP5(ir, spec);
  const p6 = passP6(ir, spec);

  const passes = [p1, p3, p5, p6];
  const ok = passes.every((p) => p.ok);

  return {
    mission_id: missionId,
    ir: ok ? ir : null,
    passes,
    ok,
    cost_estimate: {
      estimated_tokens: estimatedTokens,
      estimated_seconds: estimatedSeconds,
      estimated_tool_calls: estimatedToolCalls,
      estimated_usd: estimatedUsd,
    },
    coverage_forecast: {
      v1:
        ir.nodes.length > 0
          ? ir.nodes.filter((n) => n.verifiers.length > 0).length / ir.nodes.length
          : 0,
      v2: 0, // refined post-run
    },
    skill_substitutions: [], // MVP: no auto skill substitution
    compiled_at: Date.now(),
  };
}

/** Persist a compile report as a mission event. */
export function recordCompileReport(
  missionId: string,
  report: CompileReport,
  actor: string = 'system:compiler'
) {
  return EventStore.appendEvent(missionId, 'CompileReport', {
    report_id: `cr_${Date.now().toString(36).slice(-6)}`,
    ok: report.ok,
    passes: report.passes.map((p) => ({ pass: p.pass, ok: p.ok, errors: p.errors })),
    cost_estimate: report.cost_estimate,
    coverage_forecast: report.coverage_forecast,
    ir: report.ir,
  }, actor);
}

export { passP1, passP3, passP5, passP6, lowerToIR, estimateIRNodeTokens };
