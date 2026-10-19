import crypto from 'node:crypto';
import {
  Skill,
  Verification,
} from '@noevix/contracts/mission.ts';
import { SkillStore } from '../learning/skills.ts';

/**
 * Plane F: Human attention economics (Section 10.2).
 *
 * Escalate to a human when:
 *   EVI(review) > cost_of_interruption + reviewer_time_cost
 *   EVI ≈ P(error | verifiers, calibration) × severity(error) × (1 - P(caught later))
 *
 * Inputs come from calibration (Section 9.3) and effect class severity.
 * Review queues batch similar items, sample-audit auto-approved work, and
 * display the diff and certificate.
 */

export interface EscalationDecision {
  escalate: boolean;
  reason: string;
  evi: number;
  costOfInterruption: number;
  reviewerTimeCost: number;
  errorProbability: number;
  severity: number;
  caughtLaterProbability: number;
}

export interface ReviewQueueItem {
  id: string;
  missionId: string;
  stepId: string;
  type: 'plan' | 'effect' | 'claim' | 'verification';
  priority: number; // 0-100, higher = more urgent
  evi: number;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'auto_audited';
}

const DEFAULT_COST_OF_INTERRUPTION = 300; // seconds (5 minutes)
const DEFAULT_REVIEWER_TIME_COST = 600; // seconds (10 minutes)

/** Severity by effect class (Section 8.2 / 10.2). */
const SEVERITY_BY_CLASS: Record<string, number> = {
  E0: 0.1,   // read - minimal
  E1: 0.2,   // workspace write - low
  E2: 0.6,   // reversible external - medium
  E3: 1.0,   // irreversible external - maximum
};

export class AttentionEconomicsImpl {
  private reviewQueue: Map<string, ReviewQueueItem> = new Map();
  private autoAuditSampleRate: number = 0.05; // 5% sample audit of auto-approved work

  /**
   * Decide whether to escalate to human review (Section 10.2, Q9).
   * Uses Expected Value of Information vs cost of interruption.
   */
  public shouldEscalate(params: {
    verifierOutcome: 'pass' | 'fail' | 'inconclusive';
    verifierId: string;
    tier: string;
    actionClass: string;
    effectClass?: string;
    severity?: number; // 0-1 override
    caughtLaterProbability?: number; // 0-1 override
    missionId: string;
    stepId: string;
  }): EscalationDecision {
    const { verifierOutcome, verifierId, tier, actionClass, missionId, stepId } = params;

    // Get calibration data for this verifier
    const calibration = SkillStore.getCalibration(verifierId, tier, actionClass);
    const totalCases = calibration.reduce((sum, r) => sum + r.n, 0);
    const acceptedCases = calibration.reduce((sum, r) => sum + r.accepted, 0);

    // P(error | verifiers, calibration): probability output is wrong despite verifier
    let errorProbability: number;
    if (totalCases === 0) {
      // No calibration data: conservative default
      errorProbability = verifierOutcome === 'fail' ? 0.9 : 0.3;
    } else {
      const acceptanceRate = acceptedCases / totalCases;
      // If verifier passed but human acceptance is low, error probability is higher
      if (verifierOutcome === 'pass') {
        errorProbability = 1 - acceptanceRate;
      } else if (verifierOutcome === 'fail') {
        errorProbability = 0.8; // verifier caught it, likely real error
      } else {
        errorProbability = 0.5; // inconclusive
      }
    }

    // Clamp to [0, 1]
    errorProbability = Math.max(0, Math.min(1, errorProbability));

    const severity = params.severity ?? SEVERITY_BY_CLASS[params.effectClass || 'E0'] ?? 0.3;
    const caughtLater = params.caughtLaterProbability ?? 0.3; // default: 30% chance caught later

    // EVI = P(error) × severity × (1 - P(caught later))
    const evi = errorProbability * severity * (1 - caughtLater);

    const costOfInterruption = DEFAULT_COST_OF_INTERRUPTION;
    const reviewerTimeCost = DEFAULT_REVIEWER_TIME_COST;
    const totalCost = costOfInterruption + reviewerTimeCost;

    // Normalize EVI to comparable units (seconds of reviewer time equivalent)
    // EVI is a 0-1 probability-severity score; scale to seconds for comparison
    const eviInSeconds = evi * 3600; // 1 hour = max EVI value

    const escalate = eviInSeconds > totalCost;

    let reason: string;
    if (escalate) {
      reason = `EVI ${eviInSeconds.toFixed(0)}s > cost ${totalCost}s: escalate for review`;
    } else {
      reason = `EVI ${eviInSeconds.toFixed(0)}s <= cost ${totalCost}s: auto-approve`;
    }

    // Add to review queue if escalating
    if (escalate) {
      const queueItem: ReviewQueueItem = {
        id: `rq_${cryptoRandomUUID().slice(0, 8)}`,
        missionId,
        stepId,
        type: 'verification',
        priority: Math.round(evi * 100),
        evi,
        createdAt: Date.now(),
        status: 'pending',
      };
      this.reviewQueue.set(queueItem.id, queueItem);
    }

    return {
      escalate,
      reason,
      evi,
      costOfInterruption,
      reviewerTimeCost,
      errorProbability,
      severity,
      caughtLaterProbability: caughtLater,
    };
  }

  /**
   * Decide whether to escalate an effect for human approval based on
   * autonomy ladder level and calibration evidence (Section 8.4, 10.2).
   */
  public shouldEscalateEffect(params: {
    effectClass: string;
    autonomyLevel: number; // 0-4
    missionId: string;
    stepId: string;
    acceptanceRate?: number;
  }): EscalationDecision {
    const { effectClass, autonomyLevel, missionId, stepId, acceptanceRate } = params;

    const severity = SEVERITY_BY_CLASS[effectClass] ?? 0.3;

    // L0 Shadow: never escalate (compute only)
    if (autonomyLevel === 0) {
      return {
        escalate: false,
        reason: 'L0 Shadow: compute only, no human review',
        evi: 0,
        costOfInterruption: 0,
        reviewerTimeCost: 0,
        errorProbability: 0,
        severity,
        caughtLaterProbability: 1,
      };
    }

    // L1 Suggest: always present to human
    if (autonomyLevel === 1) {
      return {
        escalate: true,
        reason: 'L1 Suggest: human applies changeset',
        evi: 1000,
        costOfInterruption: DEFAULT_COST_OF_INTERRUPTION,
        reviewerTimeCost: DEFAULT_REVIEWER_TIME_COST,
        errorProbability: 0.5,
        severity,
        caughtLaterProbability: 0,
      };
    }

    // L2 Supervised: always require explicit approval
    if (autonomyLevel === 2) {
      return {
        escalate: true,
        reason: 'L2 Supervised: explicit approval required',
        evi: 800,
        costOfInterruption: DEFAULT_COST_OF_INTERRUPTION,
        reviewerTimeCost: DEFAULT_REVIEWER_TIME_COST,
        errorProbability: 0.3,
        severity,
        caughtLaterProbability: 0.2,
      };
    }

    // L3 Bounded auto: escalate if acceptance rate is low or severity is high
    if (autonomyLevel === 3) {
      const accRate = acceptanceRate ?? 0.9;
      const evi = (1 - accRate) * severity * 1000;
      const escalate = evi > DEFAULT_COST_OF_INTERRUPTION + DEFAULT_REVIEWER_TIME_COST || severity > 0.8;
      return {
        escalate,
        reason: escalate
          ? `L3 Bounded auto: acceptance ${(accRate * 100).toFixed(0)}% too low or severity ${severity} too high`
          : 'L3 Bounded auto: within trust bounds, auto-apply',
        evi,
        costOfInterruption: DEFAULT_COST_OF_INTERRUPTION,
        reviewerTimeCost: DEFAULT_REVIEWER_TIME_COST,
        errorProbability: 1 - accRate,
        severity,
        caughtLaterProbability: 0.1,
      };
    }

    // L4 Auto: only escalate on maximum severity
    if (autonomyLevel === 4) {
      const escalate = severity >= 1.0;
      return {
        escalate,
        reason: escalate
          ? 'L4 Auto: maximum severity effect requires human review'
          : 'L4 Auto: within trust bounds, auto-apply and report',
        evi: escalate ? 1500 : 0,
        costOfInterruption: DEFAULT_COST_OF_INTERRUPTION,
        reviewerTimeCost: DEFAULT_REVIEWER_TIME_COST,
        errorProbability: 0.05,
        severity,
        caughtLaterProbability: 0.05,
      };
    }

    return {
      escalate: true,
      reason: 'Unknown autonomy level: default to human review',
      evi: 1000,
      costOfInterruption: DEFAULT_COST_OF_INTERRUPTION,
      reviewerTimeCost: DEFAULT_REVIEWER_TIME_COST,
      errorProbability: 0.5,
      severity,
      caughtLaterProbability: 0,
    };
  }

  /** Get the review queue, sorted by priority. */
  public getReviewQueue(): ReviewQueueItem[] {
    return Array.from(this.reviewQueue.values())
      .filter((item) => item.status === 'pending')
      .sort((a, b) => b.priority - a.priority);
  }

  /** Mark a review queue item as reviewed. */
  public markReviewed(queueId: string, decision: 'approve' | 'reject'): boolean {
    const item = this.reviewQueue.get(queueId);
    if (!item) return false;
    item.status = 'reviewed';
    this.reviewQueue.set(queueId, item);
    return true;
  }

  /** Sample-audit auto-approved work (Section 10.2). */
  public sampleAutoApproved(items: ReviewQueueItem[]): ReviewQueueItem[] {
    const sample: ReviewQueueItem[] = [];
    for (const item of items) {
      if (Math.random() < this.autoAuditSampleRate) {
        sample.push({ ...item, status: 'auto_audited' });
      }
    }
    return sample;
  }

  /** Stats for observability (Section 17). */
  public stats() {
    const queue = this.getReviewQueue();
    return {
      review_queue_pending: queue.length,
      review_queue_high_priority: queue.filter((i) => i.priority > 70).length,
      auto_audit_sample_rate: this.autoAuditSampleRate,
    };
  }
}

function cryptoRandomUUID(): string {
  return crypto.randomUUID();
}

export const AttentionEconomics = new AttentionEconomicsImpl();
