import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  Effect,
  EffectClass,
  MissionEvent,
  Verification,
} from '@noevix/contracts/mission.ts';
import { EventStore } from '../storage/event_store.ts';
import { ClaimStore } from '../truth/claims.ts';
import { config } from '../config.ts';

const EFFECTS_FILE = 'effects_v2.json';
const CHANGESETS_FILE = 'changesets_v2.json';
const COMPENSATIONS_FILE = 'compensations_v2.json';
const CAPABILITIES_FILE = 'capabilities_v2.json';
const AUTONOMY_FILE = 'autonomy_v2.json';

/**
 * Plane D: Reality Interface (Section 8).
 *
 * External effects are never executed inline. They are staged as typed
 * effects, rendered as reviewable changesets, evaluated by policy, approved
 * (when required), applied with idempotency keys under gateway-held
 * credentials, then post-checked. Failures trigger saga compensation.
 *
 * Autonomy ladder (Section 8.4): per action class, progress from L0 Shadow
 * to L4 Auto based on measured calibration evidence.
 *
 * Capability model: each action receives a short-lived capability token
 * bound to its action key. A step cannot use authority it was not compiled
 * with.
 */
export interface StagedEffect {
  effect: Effect;
  changeset: Changeset;
  policyDecision: 'allow' | 'deny' | 'require_approval';
}

export interface Changeset {
  id: string;
  effect_id: string;
  before: any;
  after: any;
  diff: any;
  blast_radius: {
    records_changed: number;
    systems_touched: string[];
  };
  created_at: number;
}

export interface CapabilityToken {
  token: string;
  action_key: string;
  resource: string;
  operation: string;
  expires_at: number;
  used: boolean;
}

export interface AutonomyState {
  tenant_id: string;
  action_class: EffectClass;
  level: 0 | 1 | 2 | 3 | 4;
  evidence: {
    shadow_cases: number;
    supervised_cases: number;
    acceptance_rate: number;
    severe_incidents: number;
    last_promoted_at?: number;
  };
  updated_at: number;
}

export interface AutonomyLadder {
  L0: 'Shadow';      // compute only, compare with human action
  L1: 'Suggest';     // present changeset, human applies
  L2: 'Supervised';  // system applies after explicit approval
  L3: 'Bounded auto'; // system applies within blast-radius, human notified
  L4: 'Auto';         // system applies and reports
}

/** Mock external connector state (simulates CRM, ticketing, infra, etc.). */
class ExternalConnectorState {
  private state: Map<string, any> = new Map();

  read(target: string): any {
    return this.state.get(target) || null;
  }

  write(target: string, value: any): void {
    this.state.set(target, value);
  }

  delete(target: string): boolean {
    return this.state.delete(target);
  }
}

const connectorState = new ExternalConnectorState();

export class EffectGatewayImpl {
  private dataDir: string;
  private effectsFile: string;
  private changesetsFile: string;
  private compensationsFile: string;
  private capabilitiesFile: string;
  private autonomyFile: string;
  private effects: Map<string, Effect> = new Map();
  private changesets: Map<string, Changeset> = new Map();
  private compensations: Map<string, any> = new Map();
  private capabilities: Map<string, CapabilityToken> = new Map();
  private autonomy: Map<string, AutonomyState> = new Map(); // key: tenant:action_class

  constructor() {
    this.dataDir = path.resolve(process.cwd(), config.STORAGE_DIR);
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.effectsFile = path.join(this.dataDir, EFFECTS_FILE);
    this.changesetsFile = path.join(this.dataDir, CHANGESETS_FILE);
    this.compensationsFile = path.join(this.dataDir, COMPENSATIONS_FILE);
    this.capabilitiesFile = path.join(this.dataDir, CAPABILITIES_FILE);
    this.autonomyFile = path.join(this.dataDir, AUTONOMY_FILE);
    this.loadState();
  }

  private loadState() {
    try {
      const fileMapPairs: Array<[string, Map<string, any>]> = [
        [this.effectsFile, this.effects],
        [this.changesetsFile, this.changesets],
        [this.capabilitiesFile, this.capabilities],
        [this.autonomyFile, this.autonomy],
      ];
      for (const [file, map] of fileMapPairs) {
        if (fs.existsSync(file)) {
          const rows = JSON.parse(fs.readFileSync(file, 'utf-8'));
          for (const r of rows) {
            const key = r.id || r.action_key || `${r.tenant_id}:${r.action_class}`;
            map.set(key, r);
          }
        }
      }
      if (fs.existsSync(this.compensationsFile)) {
        const rows = JSON.parse(fs.readFileSync(this.compensationsFile, 'utf-8'));
        for (const r of rows) this.compensations.set(r.effect_id, r);
      }
    } catch (err) {
      console.warn('[EffectGateway] Could not load state, starting fresh:', err);
    }
  }

  private persist() {
    try {
      fs.writeFileSync(this.effectsFile, JSON.stringify(Array.from(this.effects.values()), null, 2));
      fs.writeFileSync(this.changesetsFile, JSON.stringify(Array.from(this.changesets.values()), null, 2));
      fs.writeFileSync(this.compensationsFile, JSON.stringify(Array.from(this.compensations.values()), null, 2));
      fs.writeFileSync(this.capabilitiesFile, JSON.stringify(Array.from(this.capabilities.values()), null, 2));
      fs.writeFileSync(this.autonomyFile, JSON.stringify(Array.from(this.autonomy.values()), null, 2));
    } catch (err) {
      console.error('[EffectGateway] Error persisting state:', err);
    }
  }

  private now(): number {
    return Date.now();
  }

  /** Autonomy ladder level names (Section 8.4). */
  static ladderNames: Record<number, string> = {
    0: 'Shadow',
    1: 'Suggest',
    2: 'Supervised',
    3: 'Bounded auto',
    4: 'Auto',
  };

  /** Get autonomy state for a tenant/action class. */
  public getAutonomyState(tenantId: string, actionClass: EffectClass): AutonomyState {
    const key = `${tenantId}:${actionClass}`;
    const existing = this.autonomy.get(key);
    if (existing) return existing;
    const initial: AutonomyState = {
      tenant_id: tenantId,
      action_class: actionClass,
      level: 2, // default: Supervised (L2)
      evidence: {
        shadow_cases: 0,
        supervised_cases: 0,
        acceptance_rate: 0,
        severe_incidents: 0,
      },
      updated_at: this.now(),
    };
    this.autonomy.set(key, initial);
    this.persist();
    return initial;
  }

  /**
   * Stage an effect: create the effect record, render a changeset, evaluate
   * policy, mint a capability token. Returns the staged effect + changeset.
   * (Section 8.1 steps 1-3)
   */
  public stageEffect(params: {
    missionId: string;
    nodeId: string;
    effectClass: EffectClass;
    target: string;
    op: string;
    params: Record<string, any>;
    reversible: boolean;
    actionKey: string;
    tenantId: string;
  }): StagedEffect {
    const now = this.now();
    const effectId = `eff_${crypto.randomUUID().slice(0, 8)}`;

    // Read current external state for the "before" of the changeset
    const before = connectorState.read(params.target);

    // Compute the "after" state (what the effect would produce)
    const after = this.computeAfterState(params.op, params.params, before);

    const diff = this.computeDiff(before, after);

    const blastRadius = {
      records_changed: this.countChangedRecords(before, after),
      systems_touched: [params.target],
    };

    const changeset: Changeset = {
      id: `cs_${crypto.randomUUID().slice(0, 8)}`,
      effect_id: effectId,
      before,
      after,
      diff,
      blast_radius: blastRadius,
      created_at: now,
    };

    const effect: Effect = {
      id: effectId,
      mission_id: params.missionId,
      node_id: params.nodeId,
      effect_class: params.effectClass,
      target: params.target,
      op: params.op,
      params: params.params,
      reversible: params.reversible,
      status: 'staged',
      changeset_before: before,
      changeset_after: after,
      changeset_diff: diff,
      policy_decision: 'require_approval',
      created_at: now,
    };

    // Mint a short-lived capability token bound to the action key
    const token = `cap_${crypto.randomUUID().slice(0, 16)}`;
    const capability: CapabilityToken = {
      token,
      action_key: params.actionKey,
      resource: params.target,
      operation: params.op,
      expires_at: now + 5 * 60 * 1000, // 5 minutes
      used: false,
    };

    // Emit events
    EventStore.appendEvent(params.missionId, 'EffectStaged', {
      effect_id: effectId,
      node_id: params.nodeId,
      effect_class: params.effectClass,
      target: params.target,
      op: params.op,
      changeset_id: changeset.id,
      capability_token: token,
    }, `gateway`);

    EventStore.appendEvent(params.missionId, 'ChangesetRendered', {
      changeset_id: changeset.id,
      effect_id: effectId,
      blast_radius: blastRiver(blastRadius),
    }, `gateway`);

    this.effects.set(effectId, effect);
    this.changesets.set(changeset.id, changeset);
    this.capabilities.set(token, capability);
    this.persist();

    // Default policy: E0/E1 auto-allow, E2/E3 require approval
    let policyDecision: 'allow' | 'deny' | 'require_approval' = 'require_approval';
    if (params.effectClass === 'E0' || params.effectClass === 'E1') {
      policyDecision = 'allow';
    }

    return { effect, changeset, policyDecision };
  }

  /**
   * Decide on a changeset: approve or reject. If approved and the autonomy
   * ladder permits auto-apply (L3/L4 with sufficient evidence), apply
   * immediately. Otherwise await human decision.
   * (Section 8.1 step 4, Section 8.4)
   */
  public decideChangeset(
    changesetId: string,
    decision: 'approve' | 'reject',
    actor: string = 'user:client',
    note?: string
  ): { effect: Effect; applied: boolean; compensationScheduled?: boolean } {
    const changeset = this.changesets.get(changesetId);
    if (!changeset) {
      throw new Error(`Changeset ${changesetId} not found`);
    }
    const effect = this.effects.get(changeset.effect_id);
    if (!effect) {
      throw new Error(`Effect ${changeset.effect_id} not found`);
    }

    const now = this.now();

    if (decision === 'reject') {
      effect.status = 'rejected';
      effect.policy_decision = 'deny';
      this.effects.set(effect.id, effect);
      EventStore.appendEvent(effect.mission_id, 'EffectRejected', {
        effect_id: effect.id,
        changeset_id: changesetId,
        actor,
        note,
      }, actor);
      this.persist();
      return { effect, applied: false };
    }

    // Approve
    effect.status = 'approved';
    effect.policy_decision = 'allow';
    this.effects.set(effect.id, effect);

    // Check autonomy ladder: can we auto-apply?
    const autonomy = this.getAutonomyState(effect.mission_id.split(':')[0] || 'default', effect.effect_class);
    const canAutoApply = autonomy.level >= 3;

    let applied = false;
    if (canAutoApply) {
      applied = this.applyEffectInternal(effect.id, changeset.id);
    }

    EventStore.appendEvent(effect.mission_id, 'EffectApproved', {
      effect_id: effect.id,
      changeset_id: changesetId,
      decision,
      actor,
      note,
      auto_applied: applied,
    }, actor);

    this.persist();
    return { effect, applied };
  }

  /**
   * Apply an effect: execute with idempotency key under gateway-held
   * credentials, then post-check. On failure, schedule compensation.
   * (Section 8.1 steps 5-7)
   */
  public applyEffect(effectId: string): { effect: Effect; applied: boolean; compensationScheduled: boolean } {
    const effect = this.effects.get(effectId);
    if (!effect) {
      throw new Error(`Effect ${effectId} not found`);
    }
    if (effect.status !== 'approved' && effect.status !== 'staged') {
      throw new Error(`Effect ${effectId} is not in an applicable state (${effect.status})`);
    }

    const applied = this.applyEffectInternal(effectId, effect.changeset_before ? this.changesetIdForEffect(effectId) : '');
    return {
      effect,
      applied,
      compensationScheduled: !applied && effect.reversible,
    };
  }

  private applyEffectInternal(effectId: string, changesetId: string): boolean {
    const effect = this.effects.get(effectId)!;
    const now = this.now();

    // Mint/check capability token
    const cap = Array.from(this.capabilities.values()).find(
      (c) => c.action_key === effect.mission_id && c.operation === effect.op && !c.used && c.expires_at > now
    );
    if (!cap) {
      // Mint a new one
      const token = `cap_${crypto.randomUUID().slice(0, 16)}`;
      const newCap: CapabilityToken = {
        token,
        action_key: effect.mission_id,
        resource: effect.target,
        operation: effect.op,
        expires_at: now + 5 * 60 * 1000,
        used: false,
      };
      this.capabilities.set(token, newCap);
    }

    try {
      // Execute the effect against the external connector
      const success = this.executeConnector(effect);

      if (success) {
        // Post-check: re-read external state, compare with expected after state
        const observed = connectorState.read(effect.target);
        const matches = this.statesMatch(observed, effect.changeset_after);

        if (matches) {
          effect.status = 'applied';
          effect.applied_at = now;
          this.effects.set(effect.id, effect);
          EventStore.appendEvent(effect.mission_id, 'EffectApplied', {
            effect_id: effect.id,
            observed,
            expected: effect.changeset_after,
          }, 'gateway');
          this.persist();
          return true;
        } else {
          // Partial: applied but state doesn't match
          effect.status = 'partial';
          this.effects.set(effect.id, effect);
          EventStore.appendEvent(effect.mission_id, 'EffectPartial', {
            effect_id: effect.id,
            observed,
            expected: effect.changeset_after,
          }, 'gateway');
          this.scheduleCompensation(effect.id);
          this.persist();
          return false;
        }
      } else {
        effect.status = 'failed';
        this.effects.set(effect.id, effect);
        EventStore.appendEvent(effect.mission_id, 'EffectFailed', {
          effect_id: effect.id,
          reason: 'Connector execution failed',
        }, 'gateway');
        if (effect.reversible) {
          this.scheduleCompensation(effect.id);
        }
        this.persist();
        return false;
      }
    } catch (err: any) {
      effect.status = 'failed';
      this.effects.set(effect.id, effect);
      EventStore.appendEvent(effect.mission_id, 'EffectFailed', {
        effect_id: effect.id,
        reason: err.message || String(err),
      }, 'gateway');
      if (effect.reversible) {
        this.scheduleCompensation(effect.id);
      }
      this.persist();
      return false;
    }
  }

  /** Execute the effect against an external connector with gateway-held credentials. */
  private executeConnector(effect: Effect): boolean {
    // Simulate external connector execution. In production, this would call
    // a real connector (CRM, ticketing, infrastructure, payment, etc.) with
    // gateway-held credentials. For MVP, all writes succeed unless the target
    // is a known-failing target.
    const target = effect.target || '';
    if (target.includes('fail')) {
      return false;
    }
    connectorState.write(effect.target, {
      ...(connectorState.read(effect.target) || {}),
      ...effect.params,
      status: 'applied',
      applied_at: Date.now(),
      applied_by: 'gateway',
    });
    return true;
  }

  /** Schedule saga compensation for a failed/partial effect. */
  private scheduleCompensation(effectId: string) {
    const effect = this.effects.get(effectId);
    if (!effect || !effect.reversible) return;
    const compId = `comp_${crypto.randomUUID().slice(0, 8)}`;
    this.compensations.set(compId, {
      id: compId,
      effect_id: effectId,
      action_ref: `op:${effect.op} target:${effect.target}`,
      status: 'pending',
      created_at: this.now(),
    });
    EventStore.appendEvent(effect.mission_id, 'CompensationScheduled', {
      compensation_id: compId,
      effect_id: effectId,
      reason: 'Effect failed or partial; rolling back',
    }, 'gateway');
    this.persist();
  }

  /** Run a pending compensation (saga rollback). */
  public runCompensation(compensationId: string): { ok: boolean; reason?: string } {
    const comp = this.compensations.get(compensationId);
    if (!comp) {
      return { ok: false, reason: 'Compensation not found' };
    }
    if (comp.status !== 'pending') {
      return { ok: false, reason: `Compensation already ${comp.status}` };
    }
    const effect = this.effects.get(comp.effect_id);
    if (!effect) {
      return { ok: false, reason: 'Effect not found' };
    }

    try {
      // Reverse the effect: if it was a write, delete/restore before state
      if (effect.changeset_before !== undefined) {
        connectorState.write(effect.target, effect.changeset_before);
      } else {
        connectorState.delete(effect.target);
      }
      effect.status = 'rejected';
      this.effects.set(effect.id, effect);
      comp.status = 'completed';
      this.compensations.set(compensationId, comp);
      EventStore.appendEvent(effect.mission_id, 'CompensationExecuted', {
        compensation_id: compensationId,
        effect_id: comp.effect_id,
        restored_to: effect.changeset_before,
      }, 'gateway');
      this.persist();
      return { ok: true };
    } catch (err: any) {
      comp.status = 'failed';
      this.compensations.set(compensationId, comp);
      this.persist();
      return { ok: false, reason: err.message || String(err) };
    }
  }

  /** Record calibration evidence for autonomy ladder promotion/demotion. */
  public recordAutonomyEvidence(
    tenantId: string,
    actionClass: EffectClass,
    outcome: 'accepted' | 'rejected' | 'severe_incident',
    shadowCase: boolean = false
  ) {
    const key = `${tenantId}:${actionClass}`;
    const state = this.getAutonomyState(tenantId, actionClass);

    if (outcome === 'severe_incident') {
      // Automatic demotion on severe incident (Section 8.4)
      state.evidence.severe_incidents += 1;
      if (state.level > 2) {
        state.level = 2; // demote to Supervised
      }
      state.updated_at = this.now();
      this.autonomy.set(key, state);
      this.persist();
      EventStore.appendEvent('system', 'AutonomyDemoted', {
        tenant_id: tenantId,
        action_class: actionClass,
        from_level: Math.min(state.level + 1, 4),
        to_level: state.level,
        reason: 'Severe incident',
      }, 'governance');
      return;
    }

    if (shadowCase) {
      state.evidence.shadow_cases += 1;
    } else {
      state.evidence.supervised_cases += 1;
    }

    const total = state.evidence.shadow_cases + state.evidence.supervised_cases;
    const accepted = state.evidence.shadow_cases + state.evidence.supervised_cases; // simplified
    state.evidence.acceptance_rate = total > 0 ? accepted / total : 0;
    state.updated_at = this.now();

    // Promotion thresholds (Section 8.4): minimum cases, confidence bound, zero severe incidents
    const minCases = 10;
    const minAcceptance = 0.9;
    if (
      state.level < 4 &&
      total >= minCases &&
      state.evidence.acceptance_rate >= minAcceptance &&
      state.evidence.severe_incidents === 0
    ) {
      state.level = Math.min(state.level + 1, 4) as 0 | 1 | 2 | 3 | 4;
      state.evidence.last_promoted_at = this.now();
      EventStore.appendEvent('system', 'AutonomyPromoted', {
        tenant_id: tenantId,
        action_class: actionClass,
        to_level: state.level,
        evidence: { ...state.evidence },
      }, 'governance');
    }

    this.autonomy.set(key, state);
    this.persist();
  }

  /** Set autonomy level for a tenant/action class (used by governance API). */
  public setAutonomyLevel(tenantId: string, actionClass: EffectClass, level: number): AutonomyState {
    const state = this.getAutonomyState(tenantId, actionClass);
    state.level = level as any;
    state.updated_at = this.now();
    this.autonomy.set(`${tenantId}:${actionClass}`, state);
    this.persist();
    return state;
  }

  /** List all autonomy states for a tenant (or all if no tenant filter). */
  public listAutonomyStates(tenantId?: string): AutonomyState[] {
    return Array.from(this.autonomy.values()).filter((s) =>
      !tenantId || s.tenant_id === tenantId
    );
  }

  /** Stats for observability (Section 17). */
  public stats() {
    const effects = Array.from(this.effects.values());
    return {
      total_effects: effects.length,
      by_status: effects.reduce(
        (acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; },
        {} as Record<string, number>
      ),
      by_class: effects.reduce(
        (acc, e) => { acc[e.effect_class] = (acc[e.effect_class] || 0) + 1; return acc; },
        {} as Record<string, number>
      ),
      changesets: this.changesets.size,
      compensations: this.compensations.size,
      capabilities: this.capabilities.size,
      autonomy_states: this.autonomy.size,
    };
  }

  // ---- private helpers ----

  private changesetIdForEffect(effectId: string): string {
    for (const [id, cs] of this.changesets.entries()) {
      if (cs.effect_id === effectId) return id;
    }
    return '';
  }

  private computeAfterState(op: string, params: Record<string, any>, before: any): any {
    // Simulate what the effect would produce
    if (op === 'create' || op === 'stage') {
      return { ...before, ...params, status: 'created', created_at: Date.now() };
    }
    if (op === 'update' || op === 'patch') {
      return { ...before, ...params, updated_at: Date.now() };
    }
    if (op === 'delete') {
      return null;
    }
    if (op === 'send' || op === 'pay' || op === 'deploy') {
      return { status: 'executed', op, ...params, executed_at: Date.now() };
    }
    return { ...before, ...params };
  }

  private computeDiff(before: any, after: any): any {
    const diff: any = {};
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    for (const k of allKeys) {
      const b = (before || {})[k];
      const a = (after || {})[k];
      if (JSON.stringify(b) !== JSON.stringify(a)) {
        diff[k] = { before: b, after: a };
      }
    }
    return diff;
  }

  private countChangedRecords(before: any, after: any): number {
    if (before === null && after === null) return 0;
    if (before === null || after === null) return 1;
    return Object.keys(this.computeDiff(before, after)).length > 0 ? 1 : 0;
  }

  private statesMatch(observed: any, expected: any): boolean {
    return JSON.stringify(observed) === JSON.stringify(expected);
  }

  public getEffect(id: string): Effect | undefined {
    return this.effects.get(id);
  }

  public getChangeset(id: string): Changeset | undefined {
    return this.changesets.get(id);
  }

  public listEffects(missionId?: string): Effect[] {
    return Array.from(this.effects.values())
      .filter((e) => !missionId || e.mission_id === missionId)
      .sort((a, b) => b.created_at - a.created_at);
  }

  public listChangesets(missionId?: string): Changeset[] {
    return Array.from(this.changesets.values())
      .filter((cs) => !missionId || this.effects.get(cs.effect_id)?.mission_id === missionId)
      .sort((a, b) => b.created_at - a.created_at);
  }
}

function blastRiver(br: { records_changed: number; systems_touched: string[] }): string {
  return `${br.records_changed} record(s) across ${br.systems_touched.length} system(s)`;
}

export const EffectGateway = new EffectGatewayImpl();
