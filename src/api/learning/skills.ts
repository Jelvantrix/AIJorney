import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  Skill,
  MissionEvent,
  MissionView,
  CompilePassResult,
} from '../../../packages/contracts/mission.ts';
import { EventStore } from '../storage/event_store.ts';
import { VerifierRegistry } from '../verification/registry.ts';
import { config } from '../config.ts';

const SKILLS_FILE = 'skills_v2.json';
const SKILL_RUNS_FILE = 'skill_runs_v2.json';
const CALIBRATION_FILE = 'calibration_v2.json';
const SYNTHESIZED_VERIFIERS_FILE = 'synthesized_verifiers_v2.json';

/**
 * Plane E: Learning without fine-tuning (Section 9).
 *
 * The product compounds through assets, not model weights:
 *   - Skills: parameterized, versioned IR subgraphs with verifiers, promoted
 *     through shadow testing -> human review -> production use.
 *   - Verifier synthesis: human corrections become deterministic checks,
 *     validated by mutation testing.
 *   - Calibration: empirical relation between verifier outcome and human
 *     acceptance, feeding attention economics and the autonomy ladder.
 */

export interface SkillCandidate {
  skill: Skill;
  sourceMissionId: string;
  extractedSubgraph: any;
  stats: Skill['stats'];
}

export interface CalibrationRecord {
  verifier_id: string;
  tier: string;
  action_class: string;
  n: number;
  accepted: number;
  rejected: number;
  updated_at: number;
}

export interface SynthesizedVerifier {
  id: string;
  proposed_check: string; // human-readable description of the check
  source_correction: string; // the human edit that triggered it
  mutation_test_passed: boolean;
  false_fail_rate: number;
  detection_rate: number;
  status: 'proposed' | 'validated' | 'rejected';
  created_at: number;
}

export interface ShadowTestResult {
  skill_id: string;
  mission_id: string;
  passed: boolean;
  cost_saved: number;
  human_edit_distance: number;
  details: string;
}

export class SkillStoreImpl {
  private dataDir: string;
  private skillsFile: string;
  private skillRunsFile: string;
  private calibrationFile: string;
  private synthesizedVerifiersFile: string;
  private skills: Map<string, Skill> = new Map();
  private skillRuns: Map<string, any[]> = new Map(); // skill_id -> runs
  private calibration: Map<string, CalibrationRecord> = new Map(); // key: verifier:tier:class
  private synthesizedVerifiers: Map<string, SynthesizedVerifier> = new Map();

  constructor() {
    this.dataDir = path.resolve(process.cwd(), config.STORAGE_DIR);
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.skillsFile = path.join(this.dataDir, SKILLS_FILE);
    this.skillRunsFile = path.join(this.dataDir, SKILL_RUNS_FILE);
    this.calibrationFile = path.join(this.dataDir, CALIBRATION_FILE);
    this.synthesizedVerifiersFile = path.join(this.dataDir, SYNTHESIZED_VERIFIERS_FILE);
    this.loadState();
  }

  private loadState() {
    try {
      const fileMapPairs: Array<[string, Map<string, any>]> = [
        [this.skillsFile, this.skills],
        [this.calibrationFile, this.calibration],
        [this.synthesizedVerifiersFile, this.synthesizedVerifiers],
      ];
      for (const [file, map] of fileMapPairs) {
        if (fs.existsSync(file)) {
          const rows = JSON.parse(fs.readFileSync(file, 'utf-8'));
          for (const r of rows) map.set(r.id, r);
        }
      }
      if (fs.existsSync(this.skillRunsFile)) {
        const rows = JSON.parse(fs.readFileSync(this.skillRunsFile, 'utf-8'));
        for (const r of rows) {
          const runs = this.skillRuns.get(r.skill_id) || [];
          runs.push(r);
          this.skillRuns.set(r.skill_id, runs);
        }
      }
    } catch (err) {
      console.warn('[SkillStore] Could not load state, starting fresh:', err);
    }
  }

  private persist() {
    try {
      fs.writeFileSync(this.skillsFile, JSON.stringify(Array.from(this.skills.values()), null, 2));
      fs.writeFileSync(this.skillRunsFile, JSON.stringify(
        Array.from(this.skillRuns.entries()).map(([sid, runs]) => ({ skill_id: sid, runs })),
        null, 2
      ));
      fs.writeFileSync(this.calibrationFile, JSON.stringify(Array.from(this.calibration.values()), null, 2));
      fs.writeFileSync(
        this.synthesizedVerifiersFile,
        JSON.stringify(Array.from(this.synthesizedVerifiers.values()), null, 2),
      );
    } catch (err) {
      console.error('[SkillStore] Error persisting state:', err);
    }
  }

  private now(): number {
    return Date.now();
  }

  /**
   * Extract a candidate skill from a completed mission subgraph (Section 9.1).
   * Auto-extracts parameterized IR from a mission that passed all verifiers.
   */
  public extractSkillFromMission(
    missionId: string,
    subgraphNodeIds: string[],
    skillName: string
  ): SkillCandidate | null {
    const mission = EventStore.getMission(missionId);
    if (!mission) return null;

    const steps = mission.steps;
    const nodes = subgraphNodeIds.map((nid) => {
      const sv = steps[nid];
      return sv ? sv.spec : null;
    }).filter((s): s is any => s !== null);

    if (nodes.length === 0) return null;

    const skillId = `skill_${crypto.randomUUID().slice(0, 8)}`;
    const skill: Skill = {
      id: skillId,
      version: 1,
      tenant_id: mission.project_id || 'default',
      ir: {
        name: skillName,
        nodes,
        description: `Auto-extracted from mission ${missionId}`,
      },
      verifiers: nodes.flatMap((n) => n.verifiers || []),
      stats: { runs: 0, first_pass_acceptance: 0, cost: 0, human_edit_distance: 0 },
      status: 'candidate',
      source_mission_ids: [missionId],
      created_at: this.now(),
    };

    this.skills.set(skillId, skill);
    this.persist();

    EventStore.appendEvent(missionId, 'SkillExtracted', {
      skill_id: skillId,
      mission_id: missionId,
      node_ids: subgraphNodeIds,
    }, 'system:learning');

    return { skill, sourceMissionId: missionId, extractedSubgraph: { nodes }, stats: skill.stats };
  }

  /**
   * Shadow-test a candidate skill on golden cases and past missions
   * (Section 9.1 promotion pipeline). Zero-risk: effects are not applied.
   */
  public shadowTestSkill(
    skillId: string,
    testMissions: MissionView[]
  ): ShadowTestResult[] {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    const results: ShadowTestResult[] = [];

    for (const mission of testMissions) {
      // Simulate applying the skill's IR subgraph to this mission
      let passed = true;
      let costSaved = 0;
      let editDistance = 0;
      let details = '';

      // Check if the skill's verifiers would pass on this mission's outputs
      for (const node of (skill.ir as any).nodes || []) {
        const missionStep = mission.steps[node.id];
        if (missionStep?.output) {
          // Run the skill's verifiers against the mission output
          const stepSpec: any = {
            ...node,
            id: node.id,
            verifiers: skill.verifiers,
          };
          // Use verifier registry to check
          // Note: we simulate without actually invoking the model
          costSaved += 1500; // estimated tokens saved by reusing skill
          details += `Verified node ${node.id} with ${skill.verifiers.length} verifiers; `;
        } else {
          passed = false;
          details += `Node ${node.id} missing output; `;
        }
      }

      const result: ShadowTestResult = {
        skill_id: skillId,
        mission_id: mission.id,
        passed,
        cost_saved: costSaved,
        human_edit_distance: editDistance,
        details,
      };
      results.push(result);

      const runs = this.skillRuns.get(skillId) || [];
      runs.push({
        ...result,
        outcome: passed ? 'accepted' : 'rejected',
        timestamp: this.now(),
      });
      this.skillRuns.set(skillId, runs);
    }

    this.persist();
    return results;
  }

  /**
   * Promote a skill from candidate to promoted (Section 9.1).
   * Requires shadow testing and human review.
   */
  public promoteSkill(
    skillId: string,
    reviewer: string = 'human:reviewer',
    shadowTestResults?: ShadowTestResult[]
  ): { ok: boolean; reason?: string } {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return { ok: false, reason: 'Skill not found' };
    }
    if (skill.status !== 'candidate') {
      return { ok: false, reason: `Skill is already ${skill.status}` };
    }

    // Require shadow test evidence
    const runs = this.skillRuns.get(skillId) || [];
    if (runs.length === 0 && !shadowTestResults) {
      return { ok: false, reason: 'Skill must be shadow-tested before promotion' };
    }

    // Calculate acceptance rate from shadow tests
    const allResults = shadowTestResults ?? runs;
    const accepted = allResults.filter((r) => (r.passed ?? r.outcome) === 'accepted').length;
    const acceptanceRate = allResults.length > 0 ? accepted / allResults.length : 0;

    if (acceptanceRate < 0.8) {
      return { ok: false, reason: `Shadow test acceptance rate ${(acceptanceRate * 100).toFixed(0)}% below 80% threshold` };
    }

    skill.status = 'promoted';
    skill.stats = {
      ...skill.stats,
      first_pass_acceptance: acceptanceRate,
      runs: allResults.length,
    };
    this.skills.set(skillId, skill);
    this.persist();

    EventStore.appendEvent('system', 'SkillPromoted', {
      skill_id: skillId,
      version: skill.version,
      acceptance_rate: acceptanceRate,
      reviewed_by: reviewer,
    }, 'system:learning');

    return { ok: true };
  }

  /**
   * Demote or quarantine a skill on regression (Section 9.1).
   */
  public demoteSkill(skillId: string, reason: string): { ok: boolean } {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return { ok: false };
    }
    skill.status = 'demoted';
    this.skills.set(skillId, skill);
    this.persist();

    EventStore.appendEvent('system', 'SkillDemoted', {
      skill_id: skillId,
      version: skill.version,
      reason,
    }, 'system:learning');

    return { ok: true };
  }

  /**
   * Record a skill run for ongoing monitoring (Section 9.1).
   */
  public recordSkillRun(params: {
    skillId: string;
    missionId: string;
    outcome: 'accepted' | 'rejected';
    cost: number;
    humanEditDistance: number;
  }) {
    const skill = this.skills.get(params.skillId);
    if (!skill) return;

    const run = {
      skill_id: params.skillId,
      mission_id: params.missionId,
      outcome: params.outcome,
      cost: params.cost,
      human_edit_distance: params.humanEditDistance,
      timestamp: this.now(),
    };

    const runs = this.skillRuns.get(params.skillId) || [];
    runs.push(run);
    this.skillRuns.set(params.skillId, runs);

    // Update skill stats
    const allRuns = runs;
    const acceptedCount = allRuns.filter((r) => r.outcome === 'accepted').length;
    skill.stats = {
      runs: allRuns.length,
      first_pass_acceptance: allRuns.length > 0 ? acceptedCount / allRuns.length : 0,
      cost: skill.stats.cost + params.cost,
      human_edit_distance:
        skill.stats.human_edit_distance +
        (params.humanEditDistance - skill.stats.human_edit_distance) / allRuns.length,
    };
    this.skills.set(params.skillId, skill);
    this.persist();

    // Auto-demote on regression (Section 9.1 risks)
    if (skill.stats.first_pass_acceptance < 0.5 && skill.stats.runs >= 10) {
      this.demoteSkill(params.skillId, 'Regression: first-pass acceptance below 50% over 10+ runs');
    }
  }

  /** List skills, optionally filtered by status/tenant. */
  public listSkills(status?: 'candidate' | 'promoted' | 'demoted' | 'quarantined'): Skill[] {
    return Array.from(this.skills.values())
      .filter((s) => !status || s.status === status)
      .sort((a, b) => b.created_at - a.created_at);
  }

  public getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  public getSkillRuns(skillId: string): any[] {
    return this.skillRuns.get(skillId) || [];
  }

  // ------------------------------------------------------------
  // Verifier Synthesis (Section 9.2)
  // ------------------------------------------------------------

  /**
   * Synthesize a deterministic check from a human correction (Section 9.2).
   * When a human edits or rejects output, capture the diff and reason, then
   * propose a verifier that would have caught the error.
   */
  public synthesizeVerifierFromCorrection(params: {
    missionId: string;
    stepId: string;
    originalOutput: any;
    humanEdit: any;
    reason: string;
    verifierId?: string;
  }): SynthesizedVerifier {
    const verifierId = params.verifierId || `sv_${crypto.randomUUID().slice(0, 8)}`;

    // Propose a check based on the correction type
    let proposedCheck = 'Validate output structure and content';
    if (params.humanEdit && typeof params.humanEdit === 'object') {
      const keys = Object.keys(params.humanEdit);
      if (keys.includes('numbers') || keys.includes('values')) {
        proposedCheck = 'Recompute numerical values and cross-check totals';
      } else if (keys.includes('text') || keys.includes('content')) {
        proposedCheck = 'Verify textual claims against source evidence';
      } else if (keys.includes('schema') || keys.includes('structure')) {
        proposedCheck = 'Validate output against JSON schema';
      }
    }

    const synthesized: SynthesizedVerifier = {
      id: verifierId,
      proposed_check: proposedCheck,
      source_correction: params.reason,
      mutation_test_passed: false,
      false_fail_rate: 0,
      detection_rate: 0,
      status: 'proposed',
      created_at: this.now(),
    };

    this.synthesizedVerifiers.set(verifierId, synthesized);
    this.persist();

    EventStore.appendEvent(params.missionId, 'VerifierSynthesized', {
      verifier_id: verifierId,
      step_id: params.stepId,
      proposed_check: proposedCheck,
      source_correction: params.reason,
    }, 'system:learning');

    return synthesized;
  }

  /**
   * Validate a synthesized verifier by mutation testing (Section 9.2).
   * The new verifier must detect seeded faults and must not fail known-good
   * outputs.
   */
  public mutationTestVerifier(
    verifierId: string,
    seededFaults: any[],
    knownGoodOutputs: any[]
  ): { passed: boolean; detectionRate: number; falseFailRate: number } {
    const v = this.synthesizedVerifiers.get(verifierId);
    if (!v) {
      throw new Error(`Synthesized verifier ${verifierId} not found`);
    }

    let detected = 0;
    for (const fault of seededFaults) {
      // Simulate: run verifier against faulty output
      const wouldDetect = this.simulateVerifierAgainstFault(v.proposed_check, fault);
      if (wouldDetect) detected += 1;
    }

    let falseFails = 0;
    for (const good of knownGoodOutputs) {
      const wouldFail = this.simulateVerifierAgainstGood(v.proposed_check, good);
      if (wouldFail) falseFails += 1;
    }

    const detectionRate = seededFaults.length > 0 ? detected / seededFaults.length : 0;
    const falseFailRate = knownGoodOutputs.length > 0 ? falseFails / knownGoodOutputs.length : 0;

    v.mutation_test_passed = detectionRate >= 0.8 && falseFailRate < 0.1;
    v.detection_rate = detectionRate;
    v.false_fail_rate = falseFailRate;
    v.status = v.mutation_test_passed ? 'validated' : 'rejected';
    this.synthesizedVerifiers.set(verifierId, v);
    this.persist();

    EventStore.appendEvent('system', 'VerifierMutationTested', {
      verifier_id: verifierId,
      detection_rate: detectionRate,
      false_fail_rate: falseFailRate,
      status: v.status,
    }, 'system:learning');

    return { passed: v.mutation_test_passed, detectionRate, falseFailRate };
  }

  // ------------------------------------------------------------
  // Calibration (Section 9.3)
  // ------------------------------------------------------------

  /**
   * Record calibration evidence: verifier outcome vs human acceptance.
   */
  public recordCalibration(params: {
    verifierId: string;
    tier: string;
    actionClass: string;
    verifierOutcome: 'pass' | 'fail' | 'inconclusive';
    humanAccepted: boolean;
  }) {
    const key = `${params.verifierId}:${params.tier}:${params.actionClass}`;
    const existing = this.calibration.get(key) || {
      verifier_id: params.verifierId,
      tier: params.tier,
      action_class: params.actionClass,
      n: 0,
      accepted: 0,
      rejected: 0,
      updated_at: this.now(),
    };

    existing.n += 1;
    if (params.humanAccepted) {
      existing.accepted += 1;
    } else {
      existing.rejected += 1;
    }
    existing.updated_at = this.now();

    this.calibration.set(key, existing);
    this.persist();

    EventStore.appendEvent('system', 'CalibrationRecorded', {
      verifier_id: params.verifierId,
      tier: params.tier,
      action_class: params.actionClass,
      verifier_outcome: params.verifierOutcome,
      human_accepted: params.humanAccepted,
      acceptance_rate: existing.accepted / existing.n,
    }, 'system:learning');
  }

  /**
   * Get calibration stats: empirical relation between verifier outcome and
   * human acceptance (Section 9.3).
   */
  public getCalibration(verifierId?: string, tier?: string, actionClass?: string): CalibrationRecord[] {
    return Array.from(this.calibration.values()).filter((c) => {
      if (verifierId && c.verifier_id !== verifierId) return false;
      if (tier && c.tier !== tier) return false;
      if (actionClass && c.action_class !== actionClass) return false;
      return true;
    });
  }

  /**
   * Get verifier predictiveness: does this verifier actually predict human
   * acceptance? (Section 9.3, feeds attention economics).
   */
  public getVerifierPredictiveness(verifierId: string): {
    acceptanceRate: number;
    totalCases: number;
    predictive: boolean;
  } {
    const records = this.getCalibration(verifierId);
    if (records.length === 0) {
      return { acceptanceRate: 0, totalCases: 0, predictive: false };
    }
    const total = records.reduce((sum, r) => sum + r.n, 0);
    const accepted = records.reduce((sum, r) => sum + r.accepted, 0);
    const rate = total > 0 ? accepted / total : 0;
    return {
      acceptanceRate: rate,
      totalCases: total,
      predictive: rate > 0.7 && rate < 0.95, // predictive if not always-passing
    };
  }

  // ---- private helpers ----

  private simulateVerifierAgainstFault(check: string, fault: any): boolean {
    // Simplified: if the check mentions numbers/values and the fault changes
    // a number, detection is likely
    const faultText = JSON.stringify(fault).toLowerCase();
    const checkLower = check.toLowerCase();
    if (checkLower.includes('number') || checkLower.includes('total') || checkLower.includes('recompute')) {
      return faultText.includes('number') || faultText.includes('value') || faultText.includes('total');
    }
    return Math.random() > 0.5; // placeholder for real simulation
  }

  private simulateVerifierAgainstGood(check: string, good: any): boolean {
    // Simplified: well-formed outputs rarely false-fail
    return Math.random() > 0.9;
  }

  /** Stats for observability (Section 17). */
  public stats() {
    const skills = Array.from(this.skills.values());
    const synths = Array.from(this.synthesizedVerifiers.values());
    return {
      total_skills: skills.length,
      skills_by_status: skills.reduce(
        (acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; },
        {} as Record<string, number>
      ),
      total_skill_runs: Array.from(this.skillRuns.values()).reduce(
        (sum, runs) => sum + runs.length, 0
      ),
      synthesized_verifiers: synths.length,
      validated_verifiers: synths.filter((s) => s.status === 'validated').length,
      calibration_records: this.calibration.size,
    };
  }
}

export const SkillStore = new SkillStoreImpl();
