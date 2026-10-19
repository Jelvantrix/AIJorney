import React from 'react';
import { PRODUCTS, type Product } from '@noevix/products';
import { Section, SectionHead, Eyebrow } from '../components/ui.tsx';
import { ArrowUpRight, ArrowRight, Sparkles, Check, ShieldCheck, Cpu } from 'lucide-react';

interface ProductsPageProps {
  onLaunchProduct?: (slug: string) => void;
  onNavigateDetail?: (slug: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ onLaunchProduct, onNavigateDetail }) => {
  return (
    <div className="relative min-h-screen pt-20 sm:pt-24 pb-16 sm:pb-24">
      <Section width="xl">
        <SectionHead
          eyebrow="DIRECTORY"
          title="The Noevix Product Suite"
          sub="Calm, high-rigor instruments designed for long-running, verifiable work. Each application runs as a dedicated workspace."
        />

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((prod: Product) => (
            <div
              key={prod.slug}
              className="nv-card relative flex flex-col justify-between p-5 sm:p-7 md:p-8"
              style={{
                background: 'linear-gradient(180deg, var(--glass-2), var(--glass-1))',
                border: '1px solid var(--line)',
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="nv-chip !text-[10px]">
                    <Sparkles className="h-2.5 w-2.5" />
                    {prod.category || 'Product'}
                  </span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider"
                    style={{
                      background: prod.status === 'live' ? 'var(--text)' : 'var(--glass-2)',
                      color: prod.status === 'live' ? 'var(--bg)' : 'var(--text-3)',
                    }}
                  >
                    {prod.status}
                  </span>
                </div>

                <h3 className="nv-display mt-4 sm:mt-5 text-[24px] sm:text-[28px] leading-snug">{prod.name}</h3>
                <p className="mt-2 text-[14px] sm:text-[14.5px] font-medium" style={{ color: 'var(--text-2)' }}>
                  {prod.tagline}
                </p>

                <p className="mt-3.5 text-[12.5px] sm:text-[13px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                  {prod.description}
                </p>
              </div>

              <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
                <a
                  href={prod.url}
                  onClick={(e) => {
                    if (onLaunchProduct) {
                      e.preventDefault();
                      onLaunchProduct(prod.slug);
                    }
                  }}
                  className="nv-btn nv-btn--primary !h-10 !px-4 text-[13px] justify-center"
                >
                  Launch App
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>

                <a
                  href={`/products/${prod.slug}`}
                  onClick={(e) => {
                    if (onNavigateDetail) {
                      e.preventDefault();
                      onNavigateDetail(prod.slug);
                    }
                  }}
                  className="nv-btn nv-btn--ghost !h-10 !px-3.5 text-[13px] justify-center"
                >
                  Specifications
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};
