import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  ActionDescriptor,
  ActionRecord,
  ActionDep,
  Artifact,
} from '../../../packages/contracts/mission.ts';
import { config } from '../config.ts';
import { ArtifactStore } from '../storage/artifact_store.ts';

const ACTIONS_FILE = 'actions.json';
const DEPS_FILE = 'action_deps.json';

/**
 * Plane B: Content-addressed action cache (Section 6.1).
 *
 * Every unit of work is an action keyed by a hash of every input that can
 * affect its result:
 *
 *   action_key = H(op_id, op_version, input_artifact_hashes[],
 *                   prompt_block_hashes[], model_id, model_version,
 *                   decoding_params, tool_versions[], sandbox_image_digest,
 *                   determinism_class, seed_policy)
 *
 * Cache lookup happens before any model or tool call. A hit returns the
 * recorded outputs and provenance with zero recomputation and zero spend.
 * Invalidity is automatic and structural: changing any input hash, prompt
 * block hash, model version, or tool version changes the key.
 *
 * Determinism classes (Section 5.4):
 *   D0 - pure deterministic code: cache hit is exact
 *   D1 - deterministic given pinned model/seed/params: hit reused by policy
 *   D2 - inherently nondeterministic: hit returns a pinned recorded outcome
 *        with an explicit "recorded on" attribute
 */
export interface CacheLookupResult {
  hit: boolean;
  record?: ActionRecord;
  reason?: string; // why a hit was not used (e.g. D1 re-validation due)
}

export interface ActionExecutionContext {
  missionId: string;
  stepId: string;
  descriptor: ActionDescriptor;
  tenantId: string;
}

/**
 * Compute the content-addressed action key from a descriptor.
 */
export function computeActionKey(descriptor: ActionDescriptor): string {
  const serialized = JSON.stringify(descriptor);
  return crypto.createHash('sha256').update(serialized, 'utf-8').digest('hex');
}

export class ActionCacheImpl {
  private dataDir: string;
  private actionsFile: string;
  private depsFile: string;
  private actions: Map<string, ActionRecord> = new Map();
  private deps: Map<string, string[]> = new Map(); // child_key -> parent_keys

  constructor() {
    this.dataDir = path.resolve(process.cwd(), config.STORAGE_DIR);
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.actionsFile = path.join(this.dataDir, ACTIONS_FILE);
    this.depsFile = path.join(this.dataDir, DEPS_FILE);
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(this.actionsFile)) {
        const records = JSON.parse(fs.readFileSync(this.actionsFile, 'utf-8'));
        for (const r of records) this.actions.set(r.action_key, r);
      }
      if (fs.existsSync(this.depsFile)) {
        const edges = JSON.parse(fs.readFileSync(this.depsFile, 'utf-8'));
        for (const e of edges) {
          const parents = this.deps.get(e.child_key) || [];
          if (!parents.includes(e.parent_key)) parents.push(e.parent_key);
          this.deps.set(e.child_key, parents);
        }
      }
    } catch (err) {
      console.warn('[ActionCache] Could not load cache state, starting fresh:', err);
    }
  }

  private persist() {
    try {
      fs.writeFileSync(
        this.actionsFile,
        JSON.stringify(Array.from(this.actions.values()), null, 2),
      );
      const edges: ActionDep[] = [];
      for (const [child, parents] of this.deps.entries()) {
        for (const p of parents) edges.push({ parent_key: p, child_key: child });
      }
      fs.writeFileSync(this.depsFile, JSON.stringify(edges, null, 2));
    } catch (err) {
      console.error('[ActionCache] Error persisting cache:', err);
    }
  }

  /**
   * Look up an action in the cache. Returns { hit: true, record } on hit.
   * Callers should treat D1/D2 hits per policy (see Section 6.1).
   */
  public lookup(descriptor: ActionDescriptor): CacheLookupResult {
    const key = computeActionKey(descriptor);
    const record = this.actions.get(key);
    if (!record) {
      return { hit: false, reason: 'No cached action for this key' };
    }
    // Record a hit
    record.hit_count = (record.hit_count || 0) + 1;
    record.last_hit_at = Date.now();
    this.actions.set(key, record);
    this.persist();
    return { hit: true, record };
  }

  /**
   * Record an executed action's outputs into the cache.
   * Idempotent: re-recording the same key overwrites with the same content.
   */
  public record(
    descriptor: ActionDescriptor,
    outputs: any,
    outputArtifactHashes: string[] = [],
    verifications: any[] = [],
    status: 'executed' | 'failed' | 'skipped' = 'executed',
  ): ActionRecord {
    const key = computeActionKey(descriptor);
    const now = Date.now();
    const existing = this.actions.get(key);
    const record: ActionRecord = {
      action_key: key,
      descriptor,
      op_id: descriptor.op_id,
      op_version: descriptor.op_version,
      status,
      inputs_hash: crypto
        .createHash('sha256')
        .update(JSON.stringify(descriptor.input_artifact_hashes), 'utf-8')
        .digest('hex'),
      outputs,
      output_artifact_hashes: outputArtifactHashes,
      verifications,
      created_at: existing ? existing.created_at : now,
      last_hit_at: existing?.last_hit_at,
      hit_count: existing?.hit_count || 0,
      tenant_id: descriptor.tenant_id ?? 'default',
    };
    this.actions.set(key, record);
    this.persist();
    return record;
  }

  /** Register a dependency edge (child depends on parent). */
  public addDep(parentKey: string, childKey: string) {
    const parents = this.deps.get(childKey) || [];
    if (!parents.includes(parentKey)) {
      parents.push(parentKey);
      this.deps.set(childKey, parents);
      this.persist();
    }
  }

  /** Get all parent (upstream) action keys for a child. */
  public parentsOf(childKey: string): string[] {
    return this.deps.get(childKey) || [];
  }

  /** Get all children (downstream) of a parent key. */
  public childrenOf(parentKey: string): string[] {
    const result: string[] = [];
    for (const [child, parents] of this.deps.entries()) {
      if (parents.includes(parentKey)) result.push(child);
    }
    return result;
  }

  public get(key: string): ActionRecord | undefined {
    return this.actions.get(key);
  }

  public list(): ActionRecord[] {
    return Array.from(this.actions.values()).sort(
      (a, b) => (b.created_at || 0) - (a.created_at || 0),
    );
  }

  /** Stats for observability (Section 17). */
  public stats() {
    const records = Array.from(this.actions.values());
    const hits = records.reduce((sum, r) => sum + (r.hit_count || 0), 0);
    return {
      total_actions: records.length,
      total_hits: hits,
      hit_rate: records.length > 0 ? hits / Math.max(1, records.length + hits) : 0,
      by_op: records.reduce(
        (acc, r) => {
          acc[r.op_id] = (acc[r.op_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}

export const ActionCache = new ActionCacheImpl();
