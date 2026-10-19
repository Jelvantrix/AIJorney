import { Router, Request, Response } from 'express';
import {
  ChatRequestSchema,
  FeedbackRequestSchema,
  SPECIALIST_TO_LENS,
  MissionSpecSchema,
} from '@noevix/contracts';
import type { Plan } from '@noevix/contracts/mission.ts';
import { executeChatTurn } from '../orchestrator/specialist_runner.ts';
import { Store } from '../storage/store.ts';
import { EventStore } from '../storage/event_store.ts';
import { ArtifactStore } from '../storage/artifact_store.ts';
import { MissionRunner } from '../orchestrator/mission_runner.ts';
import { compileMission, recordCompileReport } from '../compiler/compiler.ts';
import { GlobalRateLimiter } from '../security/rate_limiter.ts';
import { logAudit } from '../security/audit.ts';
import { indexDocument, getIndexedDocuments } from '../tools/retrieval.ts';
import { Telemetry } from '../telemetry/telemetry.ts';
import { getPreRouterStats } from '../orchestrator/pre_router.ts';
import {
  getBackendStatus,
  switchBackend,
  setMockScenario,
  getMockScenario,
} from '../inference/index.ts';
import { EffectGateway } from '../reality/effect_gateway.ts';
import { ActionCache } from '../compute/action_cache.ts';
import { PolicyEngine } from '../governance/policy.ts';
import { AttentionEconomics } from '../governance/attention.ts';
import { SkillStore } from '../learning/skills.ts';
import { ClaimStore } from '../truth/claims.ts';
import crypto from 'node:crypto';

export const apiRouter = Router();

// Rate limiting middleware
apiRouter.use((req: Request, res: Response, next) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const status = GlobalRateLimiter.check(clientIp);

  res.setHeader('X-RateLimit-Remaining', status.remaining);
  if (!status.allowed) {
    res.setHeader('Retry-After', status.retryAfterSeconds);
    logAudit({
      action: 'RATE_LIMIT_EXCEEDED',
      ip: clientIp,
      status: 'blocked',
      details: { retryAfterSeconds: status.retryAfterSeconds },
    });
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests. Please wait ${status.retryAfterSeconds} seconds before retrying.`,
      retry_after_seconds: status.retryAfterSeconds,
    });
  }
  next();
});

// POST /v1/chat (SSE stream)
apiRouter.post('/chat', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  try {
    const validated = ChatRequestSchema.parse(req.body);

    const abortController = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    await executeChatTurn(validated, res, clientIp, abortController.signal);
  } catch (err: any) {
    console.error('[API /v1/chat] Validation or handling error:', err);
    if (!res.headersSent) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: err.message });
    }
  }
});

// GET /v1/conversations (and /spaces)
apiRouter.get(['/conversations', '/spaces'], (_req: Request, res: Response) => {
  const convs = Store.getConversations();
  res.json({ conversations: convs, spaces: convs });
});

// GET /v1/conversations/:id (and /spaces/:id)
apiRouter.get(['/conversations/:id', '/spaces/:id'], (req: Request, res: Response) => {
  const conv = Store.getConversation(req.params.id);
  if (!conv) {
    return res.status(404).json({ error: 'SPACE_NOT_FOUND' });
  }
  const messages = Store.getMessagesByConversation(req.params.id);
  res.json({ space: conv, conversation: conv, messages });
});

// DELETE /v1/conversations/:id (and /spaces/:id)
apiRouter.delete(['/conversations/:id', '/spaces/:id'], (req: Request, res: Response) => {
  const ok = Store.deleteConversation(req.params.id);
  res.json({ success: ok });
});

// GET /v1/export/:id (Markdown export)
apiRouter.get('/export/:id', (req: Request, res: Response) => {
  const conv = Store.getConversation(req.params.id);
  if (!conv) {
    return res.status(404).json({ error: 'SPACE_NOT_FOUND' });
  }
  const messages = Store.getMessagesByConversation(req.params.id);
  let md = `# ${conv.title}\n*Exported from Noevix on ${new Date().toISOString()}*\n\n---\n\n`;
  for (const m of messages) {
    if (m.role === 'user') {
      md += `## ${m.content}\n\n`;
    } else {
      md += `${m.content}\n\n*Lens: ${m.lens || 'Reasoning'}*\n\n---\n\n`;
    }
  }
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="noevix-space-${conv.id}.md"`);
  res.send(md);
});

// POST /v1/messages/:id/regenerate
apiRouter.post('/messages/:id/regenerate', async (req: Request, res: Response) => {
  const targetMsg = Store.getMessage(req.params.id);
  if (!targetMsg) {
    return res.status(404).json({ error: 'MESSAGE_NOT_FOUND' });
  }

  // Find user prompt that preceded this message
  let userMsg = targetMsg.role === 'user' ? targetMsg : undefined;
  if (!userMsg && targetMsg.parent_id) {
    userMsg = Store.getMessage(targetMsg.parent_id);
  }

  if (!userMsg) {
    return res.status(400).json({ error: 'CANNOT_FIND_PARENT_USER_MESSAGE' });
  }

  const lensOverride = req.body?.lens_override;
  const chatReq = {
    conversation_id: targetMsg.conversation_id,
    parent_message_id: userMsg.parent_id,
    message: userMsg.content,
    attachments: userMsg.attachments || [],
    lens_override: lensOverride,
  };

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  await executeChatTurn(chatReq, res, clientIp, abortController.signal);
});

// POST /v1/feedback
apiRouter.post('/feedback', (req: Request, res: Response) => {
  try {
    const validated = FeedbackRequestSchema.parse(req.body);
    const ok = Store.recordFeedback(validated);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(400).json({ error: 'INVALID_FEEDBACK_PAYLOAD', message: err.message });
  }
});

// POST /v1/uploads (File upload validation, chunking, and indexing)
apiRouter.post('/uploads', (req: Request, res: Response) => {
  const { name, content, type } = req.body || {};
  if (!name || typeof content !== 'string') {
    return res.status(400).json({ error: 'MISSING_FILE_NAME_OR_CONTENT' });
  }

  // Cap uploaded text size to 2MB
  if (content.length > 2 * 1024 * 1024) {
    return res.status(413).json({ error: 'FILE_TOO_LARGE', message: 'Uploaded file exceeds 2MB limit.' });
  }

  const id = `doc_${crypto.randomUUID().slice(0, 8)}`;
  const chunks = indexDocument(id, name, content);

  res.json({
    id,
    name,
    size: content.length,
    type: type || 'text/plain',
    chunks_created: chunks.length,
  });
});

// GET /v1/uploads
apiRouter.get('/uploads', (_req: Request, res: Response) => {
  res.json({ documents: getIndexedDocuments() });
});

// GET /v1/preferences and PUT /v1/preferences
apiRouter.get('/preferences', (_req: Request, res: Response) => {
  res.json(Store.getPreferences());
});

apiRouter.put('/preferences', (req: Request, res: Response) => {
  const updated = Store.setPreferences(req.body);
  res.json(updated);
});

// Backend status & Scenario control
apiRouter.get('/backend/status', (_req: Request, res: Response) => {
  res.json({
    ...getBackendStatus(),
    preRouterStats: getPreRouterStats(),
    telemetry: Telemetry.getSummary(),
  });
});

apiRouter.post('/backend/switch', (req: Request, res: Response) => {
  const { backend } = req.body;
  if (!['nim', 'openai', 'gemini', 'mock'].includes(backend)) {
    return res.status(400).json({ error: 'INVALID_BACKEND_NAME' });
  }
  const inst = switchBackend(backend);
  res.json({ success: true, backend: inst.name });
});

apiRouter.post('/backend/scenario', (req: Request, res: Response) => {
  const { scenario } = req.body;
  const valid = ['default', 'fast', 'slow', 'tool_use', 'artifact', 'error', 'rate_limit', 'mid_stream_disconnect'];
  if (!valid.includes(scenario)) {
    return res.status(400).json({ error: 'INVALID_SCENARIO' });
  }
  setMockScenario(scenario);
  res.json({ success: true, activeScenario: getMockScenario() });
});

// Telemetry & Health probes
apiRouter.get('/metrics', (_req: Request, res: Response) => {
  res.json({
    telemetry: Telemetry.getSummary(),
    preRouter: getPreRouterStats(),
    recentTurns: Store.getRecentLogs(20),
  });
});

// Evaluation Harness endpoints
apiRouter.get('/evals/report', async (_req: Request, res: Response) => {
  const { getSavedEvalReport, runEvaluationHarness } = await import('@/packages/evals/eval_harness.ts');
  let report = getSavedEvalReport();
  if (!report) {
    report = await runEvaluationHarness();
  }
  res.json(report);
});

apiRouter.post('/evals/run', async (_req: Request, res: Response) => {
  const { runEvaluationHarness } = await import('@/packages/evals/eval_harness.ts');
  const report = await runEvaluationHarness();
  res.json(report);
});

// ============================================================================
// MISSION ARCHITECTURE REST & SSE ENDPOINTS (Section 17)
// ============================================================================

// POST /v1/missions
apiRouter.post('/missions', async (req: Request, res: Response) => {
  try {
    const validated = MissionSpecSchema.parse(req.body);
    const missionId = await MissionRunner.startMission(validated);
    const mission = EventStore.getMission(missionId);
    res.status(201).json({ mission_id: missionId, mission });
  } catch (err: any) {
    res.status(400).json({ error: 'INVALID_MISSION_SPEC', message: err.message });
  }
});

// GET /v1/missions
apiRouter.get('/missions', (_req: Request, res: Response) => {
  res.json({ missions: EventStore.listMissions() });
});

// GET /v1/missions/:id
apiRouter.get('/missions/:id', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }
  res.json({ mission });
});

// GET /v1/missions/:id/stream (SSE)
apiRouter.get('/missions/:id/stream', (req: Request, res: Response) => {
  const missionId = req.params.id;
  const mission = EventStore.getMission(missionId);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send initial snapshot
  res.write(`event: snapshot\ndata: ${JSON.stringify(mission)}\n\n`);

  // Stream new events
  const unsubscribe = EventStore.subscribe(missionId, (event) => {
    if (!res.writableEnded) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\nid: ${event.seq}\n\n`);
    }
  });

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 15000);

  res.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// POST /v1/missions/:id/cancel
apiRouter.post('/missions/:id/cancel', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }
  EventStore.appendEvent(req.params.id, 'MissionCancelled', { reason: req.body?.reason || 'User cancelled' }, 'user:client');
  res.json({ success: true, state: 'cancelled' });
});

// POST /v1/missions/:id/resume
apiRouter.post('/missions/:id/resume', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }
  EventStore.appendEvent(req.params.id, 'MissionResumed', { reason: 'User resumed' }, 'user:client');
  MissionRunner.executeMissionDAG(req.params.id).catch((err) => {
    console.error('[MissionRunner] Resume error:', err);
  });
  res.json({ success: true, state: 'running' });
});

// GET /v1/missions/:id/plan
apiRouter.get('/missions/:id/plan', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission || !mission.plan) {
    return res.status(404).json({ error: 'PLAN_NOT_FOUND' });
  }
  res.json({ plan: mission.plan });
});

// PUT /v1/missions/:id/plan (Human Edit)
apiRouter.put('/missions/:id/plan', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }

  // Accept plan as req.body.plan or as the body itself
  const rawPlan = req.body?.plan ?? req.body;
  if (!rawPlan || !Array.isArray(rawPlan.steps)) {
    return res.status(400).json({ error: 'INVALID_PLAN', message: 'Plan must contain a steps array' });
  }
  const plan = rawPlan as Plan;

  EventStore.appendEvent(req.params.id, 'PlanEdited', { plan, reason: req.body?.reason }, 'user:editor');

  // Re-compile the edited plan (Section 5: compile before execute)
  const report = compileMission({ missionId: req.params.id, spec: mission.spec, plan });
  recordCompileReport(req.params.id, report, 'user:editor');

  if (!report.ok) {
    return res.json({
      success: true,
      compile_ok: false,
      errors: report.passes.filter((p: any) => !p.ok).flatMap((p: any) => p.errors),
    });
  }

  // Compilation succeeded: if no plan approval required, auto-approve and execute
  if (!mission.spec.approvals?.plan) {
    EventStore.appendEvent(req.params.id, 'PlanApproved', { plan_id: plan.id }, 'system');
    MissionRunner.executeMissionDAG(req.params.id).catch((err) => {
      console.error('[MissionRunner] Execution after plan edit error:', err);
    });
    return res.json({ success: true, compile_ok: true });
  }

  // Approval still required: mission awaits human plan approval
  res.json({ success: true, compile_ok: true, awaiting_approval: true });
});

// GET /v1/missions/:id/compile (Plane A compile report, Section 15)
apiRouter.get('/missions/:id/compile', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }
  // Find the latest CompileReport event
  const events = EventStore.getEvents(req.params.id);
  const compileEvents = events.filter((e) => e.type === 'CompileReport');
  if (compileEvents.length === 0) {
    return res.status(404).json({ error: 'COMPILE_REPORT_NOT_FOUND' });
  }
  const latest = compileEvents[compileEvents.length - 1];
  res.json({ compile_report: latest.payload });
});

// POST /v1/missions/:id/approvals/:approval_id
apiRouter.post('/missions/:id/approvals/:approval_id', (req: Request, res: Response) => {
  const { decision, note } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'INVALID_DECISION' });
  }

  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }

  // Find the approval to determine its type
  const approval = mission.approvals.find((a: any) => a.id === req.params.approval_id);

  EventStore.appendEvent(req.params.id, 'ApprovalDecided', {
    approval_id: req.params.approval_id,
    decision,
    note,
    user: 'client',
  }, 'user:client');

  if (decision === 'approved') {
    // If this was a plan approval, emit PlanApproved so the DAG executor can start
    if (approval?.type === 'plan' && mission.plan) {
      EventStore.appendEvent(req.params.id, 'PlanApproved', { plan_id: mission.plan.id }, 'system');
    }
    MissionRunner.executeMissionDAG(req.params.id).catch((err) => {
      console.error('[MissionRunner] Execution after approval error:', err);
    });
  }

  res.json({ success: true });
});

// GET /v1/missions/:id/events
apiRouter.get('/missions/:id/events', (req: Request, res: Response) => {
  const afterSeq = Number(req.query.after_seq || '0');
  const events = EventStore.getEvents(req.params.id, afterSeq);
  res.json({ events });
});

// GET /v1/missions/:id/artifacts
apiRouter.get('/missions/:id/artifacts', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }
  res.json({ artifacts: mission.artifacts });
});

// GET /v1/artifacts/:hash
apiRouter.get('/artifacts/:hash', (req: Request, res: Response) => {
  const artifact = ArtifactStore.get(req.params.hash);
  if (!artifact) {
    return res.status(404).json({ error: 'ARTIFACT_NOT_FOUND' });
  }
  res.setHeader('Content-Type', artifact.mime || 'text/plain');
  res.send(artifact.content);
});

// GET /v1/missions/:id/claims
apiRouter.get('/missions/:id/claims', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }
  res.json({ claims: mission.claims });
});

// GET /v1/missions/:id/audit
apiRouter.get('/missions/:id/audit', (req: Request, res: Response) => {
  const audit = EventStore.generateAuditReport(req.params.id);
  if (!audit) {
    return res.status(404).json({ error: 'AUDIT_NOT_FOUND' });
  }
  if (req.query.format === 'markdown') {
    let md = `# Audit Report: Mission ${audit.mission_id}\n\n`;
    md += `**Goal:** ${audit.goal}\n`;
    md += `**Status:** ${audit.status}\n`;
    md += `**Hash Chain Head:** \`${audit.chain_head_hash}\`\n`;
    md += `**Tamper-Evidence Verified:** ${audit.tamper_evident_valid ? 'YES' : 'FAILED'}\n`;
    md += `**Steps Executed:** ${audit.steps_executed} | **Verifications Run:** ${audit.verifications_run} (${Math.round(audit.verification_pass_rate * 100)}% pass rate)\n\n`;
    md += `### Claims Verification\n`;
    for (const c of audit.claims) {
      md += `- [${c.status.toUpperCase()}] "${c.text}" — *${c.detail || ''}*\n`;
    }
    md += `\n### Artifacts Produced\n`;
    for (const a of audit.artifacts) {
      md += `- \`${a.hash.slice(0, 12)}...\` : ${a.name} (${a.mime})\n`;
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.send(md);
  }
  res.json({ audit });
});

// ============================================================================
// PLANE D: REALITY INTERFACE ENDPOINTS (Section 8)
// ============================================================================

// GET /v1/missions/:id/effects
apiRouter.get('/missions/:id/effects', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }
  res.json({ effects: EffectGateway.listEffects(req.params.id) });
});

// GET /v1/missions/:id/changesets
apiRouter.get('/missions/:id/changesets', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }
  res.json({ changesets: EffectGateway.listChangesets(req.params.id) });
});

// POST /v1/missions/:id/effects (stage a new effect)
apiRouter.post('/missions/:id/effects', (req: Request, res: Response) => {
  const mission = EventStore.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }
  const { nodeId, effectClass, target, op, params, reversible, actionKey } = req.body || {};
  if (!nodeId || !effectClass || !target || !op) {
    return res.status(400).json({ error: 'MISSING_EFFECT_FIELDS' });
  }
  const staged = EffectGateway.stageEffect({
    missionId: req.params.id,
    nodeId,
    effectClass,
    target,
    op,
    params: params || {},
    reversible: reversible ?? false,
    actionKey: actionKey || `${req.params.id}:${nodeId}`,
    tenantId: mission.project_id || 'default',
  });
  res.json({ success: true, ...staged });
});

// POST /v1/changesets/:id/decision (approve/reject a changeset)
apiRouter.post('/changesets/:id/decision', (req: Request, res: Response) => {
  const { decision, note } = req.body || {};
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'INVALID_DECISION' });
  }
  try {
    const result = EffectGateway.decideChangeset(
      req.params.id,
      decision === 'approve' ? 'approve' : 'reject',
      req.body?.actor || 'user:client',
      note
    );
    res.json({ success: true, applied: result.applied, effect: result.effect });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /v1/effects/:id/apply
apiRouter.post('/effects/:id/apply', (req: Request, res: Response) => {
  try {
    const result = EffectGateway.applyEffect(req.params.id);
    res.json({ success: true, applied: result.applied, compensationScheduled: result.compensationScheduled });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /v1/compensations/:id/run
apiRouter.post('/compensations/:id/run', (req: Request, res: Response) => {
  const result = EffectGateway.runCompensation(req.params.id);
  if (!result.ok) {
    return res.status(400).json({ error: result.reason });
  }
  res.json({ success: true });
});

// GET /v1/autonomy
apiRouter.get('/autonomy', (req: Request, res: Response) => {
  const tenantId = req.query.tenant_id as string || undefined;
  const actionClass = req.query.action_class as string;
  if (actionClass) {
    res.json({ autonomy: EffectGateway.getAutonomyState(tenantId || 'default', actionClass as any) });
  } else {
    res.json({ autonomy: EffectGateway.listAutonomyStates(tenantId) });
  }
});

// PUT /v1/autonomy/:action_class
apiRouter.put('/autonomy/:action_class', (req: Request, res: Response) => {
  const { tenantId, level } = req.body || {};
  const actionClass = req.params.action_class;
  if (!tenantId || level === undefined) {
    return res.status(400).json({ error: 'MISSING_TENANT_OR_LEVEL' });
  }
  const state = EffectGateway.setAutonomyLevel(tenantId, actionClass as any, level);
  res.json({ success: true, autonomy: state });
});

// ============================================================================
// PLANE E: LEARNING ENDPOINTS (Section 9)
// ============================================================================

// GET /v1/skills
apiRouter.get('/skills', (req: Request, res: Response) => {
  const status = req.query.status as any;
  res.json({ skills: SkillStore.listSkills(status) });
});

// POST /v1/skills/extract (extract candidate skill from completed mission)
apiRouter.post('/skills/extract', (req: Request, res: Response) => {
  const { missionId, nodeIds, skillName } = req.body || {};
  if (!missionId || !nodeIds || !skillName) {
    return res.status(400).json({ error: 'MISSING_EXTRACT_FIELDS' });
  }
  const candidate = SkillStore.extractSkillFromMission(missionId, nodeIds, skillName);
  if (!candidate) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND_OR_NO_NODES' });
  }
  res.json({ success: true, candidate });
});

// POST /v1/skills/:id/promote
apiRouter.post('/skills/:id/promote', (req: Request, res: Response) => {
  const { reviewer } = req.body || {};
  const result = SkillStore.promoteSkill(req.params.id, reviewer ?? 'human:reviewer');
  if (!result.ok) {
    return res.status(400).json({ error: result.reason });
  }
  res.json({ success: true });
});

// POST /v1/skills/:id/demote
apiRouter.post('/skills/:id/demote', (req: Request, res: Response) => {
  const { reason } = req.body || {};
  SkillStore.demoteSkill(req.params.id, reason ?? 'Manual demotion');
  res.json({ success: true });
});

// GET /v1/skills/:id/runs
apiRouter.get('/skills/:id/runs', (req: Request, res: Response) => {
  res.json({ runs: SkillStore.getSkillRuns(req.params.id) });
});

// POST /v1/skills/:id/runs (record a skill run)
apiRouter.post('/skills/:id/runs', (req: Request, res: Response) => {
  const { missionId, outcome, cost, humanEditDistance } = req.body || {};
  if (!missionId || !outcome || cost === undefined) {
    return res.status(400).json({ error: 'MISSING_RUN_FIELDS' });
  }
  SkillStore.recordSkillRun({
    skillId: req.params.id,
    missionId,
    outcome: outcome as any,
    cost: Number(cost),
    humanEditDistance: Number(humanEditDistance || 0),
  });
  res.json({ success: true });
});

// POST /v1/verifiers/synthesize (synthesize a verifier from human correction)
apiRouter.post('/verifiers/synthesize', (req: Request, res: Response) => {
  const { missionId, stepId, originalOutput, humanEdit, reason, verifierId } = req.body || {};
  if (!missionId || !stepId || !reason) {
    return res.status(400).json({ error: 'MISSING_SYNTHESIZE_FIELDS' });
  }
  const synthesized = SkillStore.synthesizeVerifierFromCorrection({
    missionId,
    stepId,
    originalOutput,
    humanEdit,
    reason,
    verifierId,
  });
  res.json({ success: true, synthesized });
});

// POST /v1/verifiers/:id/mutation-test
apiRouter.post('/verifiers/:id/mutation-test', (req: Request, res: Response) => {
  const { seededFaults, knownGoodOutputs } = req.body || {};
  if (!seededFaults || !knownGoodOutputs) {
    return res.status(400).json({ error: 'MISSING_TEST_DATA' });
  }
  const result = SkillStore.mutationTestVerifier(
    req.params.id,
    seededFaults,
    knownGoodOutputs
  );
  res.json({ success: true, ...result });
});

// GET /v1/calibration
apiRouter.get('/calibration', (req: Request, res: Response) => {
  const verifierId = req.query.verifier_id as string;
  const tier = req.query.tier as string;
  const actionClass = req.query.action_class as string;
  res.json({ calibration: SkillStore.getCalibration(verifierId, tier, actionClass) });
});

// POST /v1/calibration (record calibration evidence)
apiRouter.post('/calibration', (req: Request, res: Response) => {
  const { verifierId, tier, actionClass, verifierOutcome, humanAccepted } = req.body || {};
  if (!verifierId || !tier || !actionClass || !verifierOutcome || humanAccepted === undefined) {
    return res.status(400).json({ error: 'MISSING_CALIBRATION_FIELDS' });
  }
  SkillStore.recordCalibration({
    verifierId,
    tier,
    actionClass,
    verifierOutcome: verifierOutcome as any,
    humanAccepted: Boolean(humanAccepted),
  });
  res.json({ success: true });
});

// ============================================================================
// PLANE F: GOVERNANCE ENDPOINTS (Section 10)
// ============================================================================

// GET /v1/policy/:tenantId
apiRouter.get('/policy/:tenantId', (req: Request, res: Response) => {
  res.json({ policy: PolicyEngine.getPolicy(req.params.tenantId) });
});

// PUT /v1/policy/:tenantId
apiRouter.put('/policy/:tenantId', (req: Request, res: Response) => {
  const updated = PolicyEngine.setPolicy(req.params.tenantId, req.body || {});
  res.json({ success: true, policy: updated });
});

// POST /v1/policy/evaluate (evaluate a policy decision)
apiRouter.post('/policy/evaluate', (req: Request, res: Response) => {
  const { actor, actorRole, missionId, nodeId, effect, labels, tenantId } = req.body || {};
  if (!missionId || !effect || !tenantId) {
    return res.status(400).json({ error: 'MISSING_EVALUATE_FIELDS' });
  }
  const mission = EventStore.getMission(missionId);
  if (!mission) {
    return res.status(404).json({ error: 'MISSION_NOT_FOUND' });
  }
  const decision = PolicyEngine.evaluate({
    actor: actor || 'system',
    actorRole: actorRole || 'member',
    missionId,
    mission,
    nodeId: nodeId || 'unknown',
    effect,
    labels: labels || { inputTrust: 'trusted', outputTrust: 'derived' },
    tenantId,
  });
  res.json({ decision });
});

// GET /v1/autonomy/escalation (review queue)
apiRouter.get('/autonomy/escalation', (req: Request, res: Response) => {
  res.json({ queue: AttentionEconomics.getReviewQueue() });
});

// POST /v1/autonomy/escalation/:id/review
apiRouter.post('/autonomy/escalation/:id/review', (req: Request, res: Response) => {
  const { decision } = req.body || {};
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'INVALID_DECISION' });
  }
  const ok = AttentionEconomics.markReviewed(
    req.params.id,
    decision === 'approve' ? 'approve' : 'reject'
  );
  if (!ok) {
    return res.status(404).json({ error: 'QUEUE_ITEM_NOT_FOUND' });
  }
  res.json({ success: true });
});

// GET /v1/should-escalate (attention economics check)
apiRouter.post('/should-escalate', (req: Request, res: Response) => {
  const { verifierOutcome, verifierId, tier, actionClass, effectClass, severity, caughtLaterProbability, missionId, stepId } = req.body || {};
  if (!verifierOutcome || !verifierId || !tier || !actionClass || !missionId || !stepId) {
    return res.status(400).json({ error: 'MISSING_ESCALATE_FIELDS' });
  }
  const decision = AttentionEconomics.shouldEscalate({
    verifierOutcome: verifierOutcome as any,
    verifierId,
    tier,
    actionClass,
    effectClass,
    severity,
    caughtLaterProbability,
    missionId,
    stepId,
  });
  res.json(decision);
});

// ============================================================================
// V2 OBSERVABILITY ENDPOINTS (Section 17)
// ============================================================================

// GET /v1/v2/stats
apiRouter.get('/v2/stats', (_req: Request, res: Response) => {
  res.json({
    action_cache: ActionCache.stats(),
    claim_store: ClaimStore.stats(),
    effect_gateway: EffectGateway.stats(),
    skill_store: SkillStore.stats(),
    attention: AttentionEconomics.stats(),
  });
});
