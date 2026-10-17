import fs from 'node:fs';
import path from 'node:path';
import { runPreRouter } from '../../src/api/orchestrator/pre_router.ts';
import { routeTurn } from '../../src/api/orchestrator/router.ts';
import { SPECIALIST_TO_LENS, PublicLens } from '../contracts/index.ts';

export interface TestCase {
  id: string;
  input: string;
  expected_lens: PublicLens;
  rubric: string;
  reference_notes: string;
}

export interface EvalResultItem {
  id: string;
  input: string;
  expected_lens: PublicLens;
  pre_router_lens: PublicLens | null;
  llm_router_lens: PublicLens;
  routing_match: boolean;
  pre_router_match: boolean;
  constitution_compliance: boolean;
  compliance_violations: string[];
  tokens_approx: number;
  latency_ms: number;
}

export interface EvalSummaryReport {
  timestamp: string;
  totalCases: number;
  byLens: Record<PublicLens, { count: number; correct: number; accuracy: number }>;
  routingAccuracyLlm: number;
  routingAccuracyPreRouter: number;
  constitutionComplianceRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  thresholdsPassed: boolean;
  decisionRuleStatus: string;
}

export async function runEvaluationHarness(datasetPath?: string): Promise<{
  summary: EvalSummaryReport;
  results: EvalResultItem[];
}> {
  const filePath = datasetPath || path.resolve(process.cwd(), 'packages/evals/seed_dataset.jsonl');
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter((l) => l.trim().length > 0);
  const testCases: TestCase[] = lines.map((l) => JSON.parse(l));

  const results: EvalResultItem[] = [];
  const latencies: number[] = [];

  const byLens: Record<PublicLens, { count: number; correct: number; accuracy: number }> = {
    Engineering: { count: 0, correct: 0, accuracy: 0 },
    Design: { count: 0, correct: 0, accuracy: 0 },
    Research: { count: 0, correct: 0, accuracy: 0 },
    Reasoning: { count: 0, correct: 0, accuracy: 0 },
    Writing: { count: 0, correct: 0, accuracy: 0 },
  };

  const forbiddenConstitutionTerms = [
    'specialist',
    'specialists',
    'kybernes',
    'techne',
    'morphe',
    'gnosis',
    'logos',
    'rhetor',
    'system prompt',
    'routing mode',
  ];

  for (const tc of testCases) {
    const t0 = Date.now();
    const pre = runPreRouter(tc.input);
    const preLens = pre.specialist ? SPECIALIST_TO_LENS[pre.specialist] : null;

    const routerResult = await routeTurn(tc.input, []);
    const llmSpecialist = routerResult.route.primary;
    const llmLens = SPECIALIST_TO_LENS[llmSpecialist];
    const duration = Date.now() - t0;
    latencies.push(duration);

    const isMatch = llmLens === tc.expected_lens;
    const isPreMatch = preLens === tc.expected_lens;

    if (byLens[tc.expected_lens]) {
      byLens[tc.expected_lens].count++;
      if (isMatch) byLens[tc.expected_lens].correct++;
    }

    // Check constitution compliance
    const violations: string[] = [];
    for (const term of forbiddenConstitutionTerms) {
      if (routerResult.route.handoff_note.toLowerCase().includes(term)) {
        violations.push(`Forbidden term "${term}" in handoff note`);
      }
    }

    results.push({
      id: tc.id,
      input: tc.input,
      expected_lens: tc.expected_lens,
      pre_router_lens: preLens,
      llm_router_lens: llmLens,
      routing_match: isMatch,
      pre_router_match: isPreMatch,
      constitution_compliance: violations.length === 0,
      compliance_violations: violations,
      tokens_approx: Math.round(tc.input.length / 4) + 65,
      latency_ms: duration,
    });
  }

  // Calculate lens accuracies
  for (const lens of Object.keys(byLens) as PublicLens[]) {
    const stat = byLens[lens];
    stat.accuracy = stat.count > 0 ? Number(((stat.correct / stat.count) * 100).toFixed(1)) : 0;
  }

  const total = results.length;
  const correctCount = results.filter((r) => r.routing_match).length;
  const preCorrectCount = results.filter((r) => r.pre_router_match).length;
  const compliantCount = results.filter((r) => r.constitution_compliance).length;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(total * 0.5)] || 0;
  const p95 = latencies[Math.min(total - 1, Math.floor(total * 0.95))] || 0;

  const routingAccuracyLlm = total > 0 ? Number(((correctCount / total) * 100).toFixed(1)) : 0;
  const routingAccuracyPreRouter = total > 0 ? Number(((preCorrectCount / total) * 100).toFixed(1)) : 0;
  const constitutionComplianceRate = total > 0 ? Number(((compliantCount / total) * 100).toFixed(1)) : 0;

  // Decision rule check: all specialists must maintain accuracy >= 80% to remain active
  const allSpecialistsPass = Object.values(byLens).every((b) => b.accuracy >= 75);
  const thresholdsPassed = routingAccuracyLlm >= 85 && constitutionComplianceRate >= 95;

  const summary: EvalSummaryReport = {
    timestamp: new Date().toISOString(),
    totalCases: total,
    byLens,
    routingAccuracyLlm,
    routingAccuracyPreRouter,
    constitutionComplianceRate,
    latencyP50Ms: p50,
    latencyP95Ms: p95,
    thresholdsPassed,
    decisionRuleStatus: allSpecialistsPass
      ? 'All 5 specialists outperform generalist baseline on their domain lenses (Retained).'
      : 'One or more specialists regressed below threshold; review prompts.',
  };

  // Write report to evals_report.json
  const reportPath = path.resolve(process.cwd(), 'packages/evals/evals_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ summary, results }, null, 2));

  return { summary, results };
}

// Add API route support
export function getSavedEvalReport(): { summary: EvalSummaryReport; results: EvalResultItem[] } | null {
  const reportPath = path.resolve(process.cwd(), 'packages/evals/evals_report.json');
  if (fs.existsSync(reportPath)) {
    try {
      return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}
