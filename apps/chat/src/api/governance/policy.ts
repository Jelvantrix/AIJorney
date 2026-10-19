import {
  Effect,
  EffectClass,
  MissionView,
} from '@noevix/contracts/mission.ts';
import { EffectGateway } from '../reality/effect_gateway.ts';

/**
 * Plane F: Governance (Section 10).
 *
 * Policy engine: policies as code, evaluated by a dedicated engine. Inputs:
 * actor, mission, node, effect, labels, tenant policy. Outputs: allow, deny,
 * require-approval, with reasons. Policies are versioned and attached to the
 * mission at compile time so a run is judged under the policy that existed
 * when it started.
 *
 * MVP tier: simple policy file, mandatory approvals for E2/E3.
 * Production tier: Cedar/OPA class engine, policy tests, dry-run evaluation.
 */

export interface PolicyDecision {
  effect: 'allow' | 'deny' | 'require_approval';
  reason: string;
  policyVersion: string;
  ruleMatched?: string;
}

export interface PolicyRule {
  id: string;
  effectClass: EffectClass | '*';
  condition: string; // human-readable description
  decision: 'allow' | 'deny' | 'require_approval';
  appliesTo: string[]; // actor roles, mission types, or 'all'
}

export interface TenantPolicy {
  tenant_id: string;
  version: number;
  rules: PolicyRule[];
  irreversible_approvers: number; // two-person rule count for E3
  egress_allowlist: string[];
  updated_at: number;
}

// Default MVP policy: E0/E1 auto, E2/E3 require approval, E3 needs 2 approvers
const DEFAULT_TENANT_POLICY: TenantPolicy = {
  tenant_id: 'default',
  version: 1,
  rules: [
    {
      id: 'R1',
      effectClass: 'E0',
      condition: 'Read operations are always allowed within budget',
      decision: 'allow',
      appliesTo: ['all'],
    },
    {
      id: 'R2',
      effectClass: 'E1',
      condition: 'Workspace writes are auto-allowed',
      decision: 'allow',
      appliesTo: ['all'],
    },
    {
      id: 'R3',
      effectClass: 'E2',
      condition: 'Reversible external actions require approval',
      decision: 'require_approval',
      appliesTo: ['all'],
    },
    {
      id: 'R4',
      effectClass: 'E3',
      condition: 'Irreversible external actions always require approval',
      decision: 'require_approval',
      appliesTo: ['all'],
    },
    // R5 (tainted data → external writes denied) is enforced as a special case
    // in the evaluate() method, not as a rule, because it depends on labels.
  ],
  irreversible_approvers: 2,
  egress_allowlist: [],
  updated_at: Date.now(),
};

export class PolicyEngineImpl {
  private policies: Map<string, TenantPolicy> = new Map();

  constructor() {
    this.policies.set('default', { ...DEFAULT_TENANT_POLICY });
  }

  /** Get or create a tenant policy. */
  public getPolicy(tenantId: string): TenantPolicy {
    const existing = this.policies.get(tenantId);
    if (existing) return existing;
    const policy: TenantPolicy = {
      ...DEFAULT_TENANT_POLICY,
      tenant_id: tenantId,
      updated_at: Date.now(),
    };
    this.policies.set(tenantId, policy);
    return policy;
  }

  /** Set a tenant policy (versioned). */
  public setPolicy(tenantId: string, policy: Partial<TenantPolicy>): TenantPolicy {
    const current = this.getPolicy(tenantId);
    const updated: TenantPolicy = {
      ...current,
      ...policy,
      tenant_id: tenantId,
      version: current.version + 1,
      updated_at: Date.now(),
    };
    this.policies.set(tenantId, updated);
    return updated;
  }

  /**
   * Evaluate a policy decision for a proposed effect (Section 10.1).
   * Inputs: actor, mission, node, effect, labels, tenant policy.
   * Output: allow, deny, or require-approval with reasons.
   */
  public evaluate(params: {
    actor: string;
    actorRole: string;
    missionId: string;
    mission: MissionView;
    nodeId: string;
    effect: Effect;
    labels: { inputTrust: string; outputTrust: string };
    tenantId: string;
  }): PolicyDecision {
    const { actor, actorRole, mission, effect, labels, tenantId } = params;
    const policy = this.getPolicy(tenantId);

    // R5: Tainted data cannot flow to external writes
    if (
      (effect.effect_class === 'E2' || effect.effect_class === 'E3') &&
      labels.inputTrust === 'untrusted'
    ) {
      return {
        effect: 'deny',
        reason: 'Tainted untrusted data cannot flow to external write (R5)',
        policyVersion: String(policy.version),
        ruleMatched: 'R5',
      };
    }

    // Find matching rules for this effect class
    const matchingRules = policy.rules.filter(
      (r) => (r.effectClass === '*' || r.effectClass === effect.effect_class) &&
             (r.appliesTo.includes('all') || r.appliesTo.includes(actorRole))
    );

    // Most restrictive decision wins: deny > require_approval > allow
    let decision: 'allow' | 'deny' | 'require_approval' = 'allow';
    let reason = 'Allowed by default';
    let ruleMatched: string | undefined;

    for (const rule of matchingRules) {
      if (rule.decision === 'deny') {
        decision = 'deny';
        reason = rule.condition;
        ruleMatched = rule.id;
        break; // deny overrides everything
      } else if (rule.decision === 'require_approval') {
        decision = 'require_approval';
        reason = rule.condition;
        ruleMatched = rule.id;
      }
    }

    // E3 irreversible: two-person rule (Section 10.3)
    if (effect.effect_class === 'E3' && decision === 'require_approval') {
      reason += ` (two-person rule: ${policy.irreversible_approvers} approvers required)`;
    }

    return {
      effect: decision,
      reason,
      policyVersion: String(policy.version),
      ruleMatched,
    };
  }

  /** List all policies (for compliance audit, Section 10.3). */
  public listPolicies(): TenantPolicy[] {
    return Array.from(this.policies.values());
  }

  /** Dry-run evaluate a policy change against historical missions (Production tier). */
  public dryRunPolicyChange(
    tenantId: string,
    proposedRules: PolicyRule[],
    historicalMissions: MissionView[]
  ): {
    affectedMissions: number;
    changedDecisions: number;
    details: string[];
  } {
    const current = this.getPolicy(tenantId);
    const details: string[] = [];
    let changedDecisions = 0;
    let affectedMissions = 0;

    for (const mission of historicalMissions) {
      const missionEffects = mission.approvals; // proxy for effects in MVP
      let missionChanged = false;
      for (const effect of missionEffects as any[]) {
        const currentDecision = this.evaluate({
          actor: 'system:dry-run',
          actorRole: 'system',
          missionId: mission.id,
          mission,
          nodeId: 'dry-run',
          effect: {
            id: 'dry-run',
            mission_id: mission.id,
            node_id: 'dry-run',
            effect_class: effect.type || 'E2',
            target: effect.target || 'unknown',
            op: effect.op || 'unknown',
            params: {},
            reversible: false,
            status: 'staged',
            created_at: Date.now(),
          } as any,
          labels: { inputTrust: 'trusted', outputTrust: 'derived' },
          tenantId,
        });

        // Simulate with proposed rules (simplified)
        const proposedDecision = this.evaluateWithRules(
          effect.type || 'E2',
          proposedRules,
          'system'
        );

        if (currentDecision.effect !== proposedDecision.effect) {
          changedDecisions += 1;
          missionChanged = true;
          details.push(
            `Mission ${mission.id}: effect ${effect.type} would change from ${currentDecision.effect} to ${proposedDecision.effect}`
          );
        }
      }
      if (missionChanged) affectedMissions += 1;
    }

    return { affectedMissions, changedDecisions, details };
  }

  private evaluateWithRules(
    effectClass: string,
    rules: PolicyRule[],
    actorRole: string
  ): { effect: 'allow' | 'deny' | 'require_approval'; reason: string } {
    let decision: 'allow' | 'deny' | 'require_approval' = 'allow';
    let reason = 'Allowed by proposed rules';
    for (const rule of rules) {
      if ((rule.effectClass === '*' || rule.effectClass === effectClass as EffectClass) &&
          (rule.appliesTo.includes('all') || rule.appliesTo.includes(actorRole))) {
        if (rule.decision === 'deny') {
          decision = 'deny';
          reason = rule.condition;
          break;
        } else if (rule.decision === 'require_approval') {
          decision = 'require_approval';
          reason = rule.condition;
        }
      }
    }
    return { effect: decision, reason };
  }
}

export const PolicyEngine = new PolicyEngineImpl();
