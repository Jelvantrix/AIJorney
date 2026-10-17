export const MARKETING_COPY = {
  hero: {
    headline: "One intelligence. Every discipline.",
    subhead: "A unified reasoning instrument powered by an adaptive routing architecture behind a single calm voice.",
    ctaPrimary: "Start for free",
    ctaSecondary: "See how it works",
  },
  demo: {
    samplePrompt: "Synthesize a zero-copy lock-free ring buffer for low-latency streaming telemetry in TypeScript.",
    sampleResponse: `A zero-copy ring buffer bypasses memory allocation overhead by pre-allocating a contiguous slot array and indexing with power-of-two bitwise masking:

\`\`\`typescript
export class FastRingBuffer<T> {
  private readonly buffer: (T | undefined)[];
  private readonly mask: number;
  private head = 0;
  private tail = 0;

  constructor(capacity = 1024) {
    this.buffer = new Array(capacity);
    this.mask = capacity - 1;
  }

  push(item: T): boolean {
    if (this.head - this.tail >= this.buffer.length) return false;
    this.buffer[this.head++ & this.mask] = item;
    return true;
  }

  pop(): T | undefined {
    if (this.tail === this.head) return undefined;
    return this.buffer[this.tail++ & this.mask];
  }
}
\`\`\`

By ensuring capacity is a power of two, index wrapping incurs a single \`AND\` instruction rather than costly division.`,
  },
  capabilities: [
    {
      id: 'engineering',
      title: 'Engineering',
      colSpan: 'col-span-12 md:col-span-7',
      desc: 'High-concurrency systems design, zero-allocation algorithms, and verifiable distributed architectures.',
      badge: 'TECHNE',
    },
    {
      id: 'speed',
      title: 'Sub-300ms First Token',
      colSpan: 'col-span-12 md:col-span-5',
      desc: 'Speculative dispatch and prefix-cached prompt assembly deliver instant streaming response.',
      badge: 'LATENCY',
    },
    {
      id: 'design',
      title: 'Design Systems',
      colSpan: 'col-span-12 md:col-span-4',
      desc: 'Precision layout constitution, accessibility invariants, and cohesive token architectures.',
      badge: 'MORPHE',
    },
    {
      id: 'reasoning',
      title: 'Deep Reasoning',
      colSpan: 'col-span-12 md:col-span-4',
      desc: 'Rigorous chain-of-thought verification, trade-off matrix evaluation, and formal proofs.',
      badge: 'LOGOS',
    },
    {
      id: 'research',
      title: 'Synthesis & Research',
      colSpan: 'col-span-12 md:col-span-4',
      desc: 'Causal analysis across technical literature, distributed consensus papers, and empirical benchmarks.',
      badge: 'GNOSIS',
    },
    {
      id: 'writing',
      title: 'Editorial Clarity',
      colSpan: 'col-span-12 md:col-span-12',
      desc: 'Distilled executive memos, technical RFCs, and crisp documentation with zero rhetorical fluff.',
      badge: 'RHETOR',
    },
  ],
  howItWorks: [
    {
      step: '01',
      title: 'Single Entry Point',
      desc: 'Express your problem naturally. No model switching, prompt wrangling, or mode selectors required.',
    },
    {
      step: '02',
      title: 'Adaptive Specialization',
      desc: 'A lightweight router analyzes intent in under 15ms and dynamically engages domain-optimized protocols.',
    },
    {
      step: '03',
      title: 'Instant Synthesis',
      desc: 'Speculative execution streams authoritative answers within one frame of computation arrival.',
    },
  ],
  principles: [
    {
      statement: "Light in a dark room. Illumination is our only ornament.",
      detail: "Zero decorative color. Hierarchy is established purely through typography, hairline structure, and atmospheric energy.",
    },
    {
      statement: "One unified mind. Never a committee of chatbots.",
      detail: "Behind the interface, rigorous specialization coordinates seamlessly so you converse with a single, calm, authoritative intelligence.",
    },
    {
      statement: "Speed is an architectural virtue.",
      detail: "Sub-millisecond routing, speculative token generation, and immutable prefix caching render hesitation obsolete.",
    },
  ],
  pricing: [
    {
      tier: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Essential access for individual builders and researchers exploring Noevix intelligence.',
      features: [
        'Adaptive single-voice intelligence',
        'Standard streaming latency',
        'Up to 50 spaces with tree history',
        'Community discussion access',
      ],
      cta: 'Start Free',
      popular: false,
    },
    {
      tier: 'Pro',
      price: '$30',
      period: 'per month',
      desc: 'Unbounded speed and deep reasoning capacity for engineers, designers, and architects.',
      features: [
        'Priority speculative inference dispatch',
        'Unlimited spaces & branch versions',
        'Deep reasoning & execution sandbox',
        'Full sheet artifact viewer & export',
        'Early access to new lenses',
      ],
      cta: 'Upgrade to Pro',
      popular: true,
    },
    {
      tier: 'Team',
      price: '$80',
      period: 'per member / month',
      desc: 'Collaborative workspaces, shared prompt constitutions, and dedicated capacity.',
      features: [
        'Shared organization spaces & trees',
        'Custom constitution & role guidelines',
        'Dedicated low-latency compute allocation',
        'SOC2 compliance logs & audit export',
        '99.9% uptime SLA guarantee',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ],
  faq: [
    {
      q: 'Why is Noevix strictly monochrome?',
      a: 'Visual clutter impairs deep cognitive work. By eliminating color saturation completely, we direct 100% of your visual focus to the structure of thought, code, and language.',
    },
    {
      q: 'How does routing work if there is only one voice?',
      a: 'A high-speed non-conversational router evaluates your prompt against specialized domain contracts. The active lens guides execution while maintaining an identical calm, authoritative tone.',
    },
    {
      q: 'Can I override the automatically selected lens?',
      a: 'Yes. At the bottom of the composer dock, simply tap the lens label or press ⌘/ to lock into Engineering, Design, Research, Reasoning, or Writing explicitly.',
    },
    {
      q: 'How does branching work when editing previous prompts?',
      a: 'Spaces are structured as acyclic trees. When you edit a previous prompt or regenerate an answer, a new branch is created. Use the 1 / 2 version switcher in the left margin to toggle between branches at any time without losing history.',
    },
  ],
};
