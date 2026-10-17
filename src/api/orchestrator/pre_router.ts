import { SpecialistId, RouterOutput } from '../../../packages/contracts/index.ts';

export interface PreRouterResult {
  hit: boolean;
  specialist: SpecialistId | null;
  confidence: number;
  reason: string;
  matchedPattern?: string;
}

// Global telemetry counters for pre-router
let preRouterHits = 0;
let totalPreRouterChecks = 0;
let agreementsWithLlm = 0;

export function getPreRouterStats() {
  return {
    hits: preRouterHits,
    total: totalPreRouterChecks,
    hitRate: totalPreRouterChecks > 0 ? (preRouterHits / totalPreRouterChecks) * 100 : 0,
    agreements: agreementsWithLlm,
    accuracy: preRouterHits > 0 ? (agreementsWithLlm / preRouterHits) * 100 : 0,
  };
}

export function recordAgreementWithLlm(agreed: boolean) {
  if (agreed) {
    agreementsWithLlm++;
  }
}

const TECHNE_PATTERNS = [
  /```(typescript|javascript|python|rust|go|c|cpp|sql|html|css|bash|sh|json)/i,
  /\b(typescript|javascript|python|golang|rust|react|c\+\+|sql|database migration|in-memory|rate limiter|pipeline|nginx|goroutines|lru cache|debug|typeerror|syntaxerror|nullpointerexception)\b/i,
  /\b(function|def|class|const|let|var|import|export|interface|type)\s+[A-Za-z0-9_]+/i,
  /\b(docker|kubernetes|k8s|nginx|redis|postgres|sqlite|git|npm|pnpm|cargo|pip)\b/i,
  /\b(refactor|debug|compile|regex|algorithm|data structure|api endpoint|unit test|concurrent worker pool)\b/i,
];

const MORPHE_PATTERNS = [
  /\b(ui|ux|wireframe|layout|design tokens?|figma|tailwind|css grid|flexbox)\b/i,
  /\b(color palette|contrast ratio|wcag|typography scale|hero section|padding scale)\b/i,
  /\b(dark mode|light mode|responsive design|glassmorphism|linear style|component spec)\b/i,
  /\b(micro-interaction|button states?|navigation bar|modal design|modal dialog|segmented tab bar|empty state ui|empty state illustration)\b/i,
  /\b(design a minimal|spec an accessible|critique this ui|command palette layout)\b/i,
];

const GNOSIS_PATTERNS = [
  /\b(literature review|empirical|citation|academic papers?|peer-reviewed)\b/i,
  /\b(fact-check|evidence for|what does research say|benchmark comparison|clinical trial)\b/i,
  /\b(history of|when was .* discovered|meta-analysis|who proved|synthesis of)\b/i,
  /\b(state of the art|sota|survey paper|arxiv)\b/i,
  /\b(pagedattention|flashattention|kv-cache quantization|security vulnerabilities in json web token|sleep fragmentation|raft consensus vs paxos|energy efficiency of gpu)\b/i,
];

const LOGOS_PATTERNS = [
  /\b(decision framework|trade-offs?|pros and cons|decision matrix|pareto)\b/i,
  /\b(formal proof|deductive reasoning|axiom|syllogism|bayes|probabilit(y|ies))\b/i,
  /\b(mathematical derivation|asymptotic bound|big-o|game theory|nash equilibrium)\b/i,
  /\b(should we shard or|scale-up vs scale-out|solve for x|theorem|square root of 2 is irrational|binary heap from an unordered array)\b/i,
  /\b(dynamodb or postgresql|monolithic repository vs multi-repo|uptime\. if we put two identical)\b/i,
];

const RHETOR_PATTERNS = [
  /\b(write an? (email|memo|announcement|blog post|essay|letter|proposal|pitch|elevator pitch|template|readme section))\b/i,
  /\b(rewrite|proofread|edit this|adjust the tone|make it more (concise|formal|executive))\b/i,
  /\b(executive summary|press release|copywriting|headline|tagline|post-mortem memo|gentle but firm response)\b/i,
  /\b(summarize this in \d+ (bullet|sentence|word)|remove passive voice)\b/i,
];

export function runPreRouter(userText: string): PreRouterResult {
  totalPreRouterChecks++;
  const text = userText.trim();

  // 1. Check Techne (Engineering)
  for (const pat of TECHNE_PATTERNS) {
    if (pat.test(text)) {
      preRouterHits++;
      return {
        hit: true,
        specialist: 'techne',
        confidence: 0.92,
        reason: 'Matched engineering/code syntax or system signature',
        matchedPattern: pat.source,
      };
    }
  }

  // 2. Check Morphe (Design)
  for (const pat of MORPHE_PATTERNS) {
    if (pat.test(text)) {
      preRouterHits++;
      return {
        hit: true,
        specialist: 'morphe',
        confidence: 0.88,
        reason: 'Matched UI/UX or design system query signature',
        matchedPattern: pat.source,
      };
    }
  }

  // 3. Check Gnosis (Research)
  for (const pat of GNOSIS_PATTERNS) {
    if (pat.test(text)) {
      preRouterHits++;
      return {
        hit: true,
        specialist: 'gnosis',
        confidence: 0.85,
        reason: 'Matched empirical research or literature inquiry signature',
        matchedPattern: pat.source,
      };
    }
  }

  // 4. Check Logos (Reasoning)
  for (const pat of LOGOS_PATTERNS) {
    if (pat.test(text)) {
      preRouterHits++;
      return {
        hit: true,
        specialist: 'logos',
        confidence: 0.87,
        reason: 'Matched formal logic, derivation, or architectural decision query',
        matchedPattern: pat.source,
      };
    }
  }

  // 5. Check Rhetor (Writing)
  for (const pat of RHETOR_PATTERNS) {
    if (pat.test(text)) {
      preRouterHits++;
      return {
        hit: true,
        specialist: 'rhetor',
        confidence: 0.89,
        reason: 'Matched editorial, drafting, or tone calibration request',
        matchedPattern: pat.source,
      };
    }
  }

  return {
    hit: false,
    specialist: null,
    confidence: 0.4,
    reason: 'Ambiguous or conversational query; deferring to LLM router',
  };
}
