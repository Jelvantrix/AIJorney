import React from 'react';
import { getProduct, type Product } from '@noevix/products';
import { Section, SectionHead, Eyebrow } from '../components/ui.tsx';
import { ArrowUpRight, ArrowLeft, Sparkles, Check, ShieldCheck, Code2, Cpu, Terminal, FileText, ChevronRight } from 'lucide-react';

interface ProductDetailPageProps {
  slug: string;
  onBack?: () => void;
  onLaunch?: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  slug,
  onBack,
  onLaunch,
}) => {
  const product = getProduct(slug) || getProduct('chat');
  if (!product) return null;

  return (
    <div className="relative min-h-screen pt-20 sm:pt-24 pb-20 sm:pb-24">
      {/* ── Breadcrumb & Back ─────────────────────────── */}
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8 pt-4 pb-6 sm:pb-8">
        <div className="flex items-center gap-2 text-[12px] font-mono" style={{ color: 'var(--text-3)' }}>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 transition-colors hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-3 w-3" />
            Products
          </button>
          <span>/</span>
          <span style={{ color: 'var(--text)' }}>{product.name}</span>
        </div>
      </div>

      {/* ── Product Hero ─────────────────────────────── */}
      <Section width="xl">
        <div className="grid grid-cols-1 items-start gap-8 lg:gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="nv-chip !text-[10px]">
              <Sparkles className="h-2.5 w-2.5" />
              {product.category || 'Specialized Intelligence'}
            </span>

            <h1 className="nv-display mt-4 sm:mt-5 text-[32px] sm:text-[44px] lg:text-[56px] leading-[1.08] tracking-tight">
              {product.name}
            </h1>

            <p className="mt-3 sm:mt-4 text-[17px] sm:text-[19px] leading-relaxed font-serif" style={{ color: 'var(--text-2)' }}>
              {product.tagline}
            </p>

            <p className="mt-4 sm:mt-6 text-[14px] sm:text-[15px] leading-relaxed max-w-xl" style={{ color: 'var(--text-3)' }}>
              {product.description}
            </p>

            <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <a
                href={product.url}
                onClick={(e) => {
                  if (onLaunch) {
                    e.preventDefault();
                    onLaunch();
                  }
                }}
                className="nv-btn nv-btn--primary !h-11 sm:!h-12 !px-5 sm:!px-6 text-[13.5px] sm:text-[14px] justify-center"
              >
                Launch {product.name}
                <ArrowUpRight className="h-4 w-4" />
              </a>

              <button
                onClick={onBack}
                className="nv-btn nv-btn--ghost !h-11 sm:!h-12 !px-4 sm:!px-5 text-[13.5px] sm:text-[14px] justify-center cursor-pointer"
              >
                Back to Directory
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div
              className="nv-card p-5 sm:p-7"
              style={{
                background: 'linear-gradient(180deg, var(--glass-3), var(--glass-1))',
                border: '1px solid var(--line-strong)',
              }}
            >
              <span className="nv-label !text-[10px]">SYSTEM SPECIFICATION</span>
              <dl className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4 text-[12.5px] sm:text-[13px]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-1 sm:gap-0" style={{ borderColor: 'var(--line)' }}>
                  <dt style={{ color: 'var(--text-3)' }}>Deployment Unit</dt>
                  <dd className="font-mono text-xs sm:text-[13px]" style={{ color: 'var(--text)' }}>Standalone App (`/apps/{product.slug}`)</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-1 sm:gap-0" style={{ borderColor: 'var(--line)' }}>
                  <dt style={{ color: 'var(--text-3)' }}>Primary Route</dt>
                  <dd className="font-mono text-xs sm:text-[13px]" style={{ color: 'var(--text)' }}>{product.url}</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-1 sm:gap-0" style={{ borderColor: 'var(--line)' }}>
                  <dt style={{ color: 'var(--text-3)' }}>Inference Architecture</dt>
                  <dd className="font-mono text-xs sm:text-[13px]" style={{ color: 'var(--text)' }}>Adaptive Router / NIM / Gemini</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-1 sm:gap-0" style={{ borderColor: 'var(--line)' }}>
                  <dt style={{ color: 'var(--text-3)' }}>First Token Latency</dt>
                  <dd className="font-mono text-xs sm:text-[13px]" style={{ color: 'var(--text)' }}>&lt; 300ms (Speculative)</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                  <dt style={{ color: 'var(--text-3)' }}>Auditing & Storage</dt>
                  <dd className="font-mono text-xs sm:text-[13px]" style={{ color: 'var(--text)' }}>Hash-Linked Event Store</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Cognitive Lenses Section ────────────────── */}
      <Section width="xl">
        <SectionHead
          eyebrow="COGNITIVE LENSES"
          title="Modular reasoning disciplines."
          sub="Rather than generic persona switching, Noevix routes through rigorous domain prompt assemblies."
        />

        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'Engineering (Techne)',
              desc: 'High-concurrency systems design, zero-allocation data structures, and verified distributed architectures.',
              icon: Code2,
            },
            {
              title: 'Design Systems (Morphe)',
              desc: 'Spatial grid geometry, strict token disciplines, accessibility invariants, and typographic scale.',
              icon: Cpu,
            },
            {
              title: 'Synthesis & Research (Gnosis)',
              desc: 'Cross-paper causal synthesis, empirical benchmark auditing, and distributed consensus validation.',
              icon: Terminal,
            },
            {
              title: 'Deep Reasoning (Logos)',
              desc: 'Deterministic chain-of-thought analysis, counter-factual testing, and trade-off matrices.',
              icon: ShieldCheck,
            },
            {
              title: 'Editorial Clarity (Rhetor)',
              desc: 'Uncompromising precision prose, executive distillation memos, and RFC documentation.',
              icon: FileText,
            },
          ].map((lens) => {
            const Icon = lens.icon;
            return (
              <div
                key={lens.title}
                className="nv-card p-5 sm:p-6"
                style={{
                  background: 'var(--glass-1)',
                  border: '1px solid var(--line)',
                }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: 'var(--glass-2)' }}>
                  <Icon className="h-4 w-4" style={{ color: 'var(--text)' }} />
                </div>
                <h4 className="nv-display mt-4 text-[19px] sm:text-[20px]">{lens.title}</h4>
                <p className="mt-2 text-[12.5px] sm:text-[13px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                  {lens.desc}
                </p>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
};
