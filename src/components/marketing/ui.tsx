import React from 'react';

/* ══════════════════════════════════════════════════════════════════════════
   Marketing surface kit — the narrative primitives.
   Every band on the landing page is composed from these, so spacing,
   rhythm and hierarchy stay identical from hero to footer.
   ══════════════════════════════════════════════════════════════════════════ */

type Width = 'sm' | 'md' | 'lg' | 'xl';

const WIDTH: Record<Width, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-[1100px]',
  xl: 'max-w-[1240px]',
};

export const Section: React.FC<{
  id?: string;
  children: React.ReactNode;
  width?: Width;
  className?: string;
}> = ({ id, children, width = 'xl', className = '' }) => (
  <section id={id} className={`relative z-10 ${className}`}>
    {/* Vertical rhythm tightens on a phone so the page does not become a
        nine-thousand-pixel scroll, then opens back up on a desk. */}
    <div
      className={`mx-auto w-full px-[var(--gutter)] py-16 sm:py-20 lg:py-24 ${WIDTH[width]}`}
    >
      {children}
    </div>
  </section>
);

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="nv-label inline-flex items-center gap-3">{children}</span>
);

/*
 * SectionHead — the editorial opener. Aligned left by default so the page
 * reads as a document rather than a slide deck; `align="center"` is reserved
 * for the genuinely symmetrical bands (pricing, closing CTA).
 */
export const SectionHead: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  align?: 'left' | 'center';
  aside?: React.ReactNode;
}> = ({ eyebrow, title, sub, align = 'left', aside }) => (
  <div
    className={`mb-10 flex flex-col gap-5 sm:mb-14 ${
      align === 'center'
        ? 'items-center text-center'
        : 'items-start sm:flex-row sm:items-end sm:justify-between'
    }`}
  >
    <div className={align === 'center' ? 'flex max-w-2xl flex-col items-center gap-4' : 'max-w-2xl'}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        className="nv-display mt-1 text-balance text-[clamp(28px,4vw,46px)]"
        style={{ marginTop: 0 }}
      >
        {title}
      </h2>
      {sub && (
        <p
          className="mt-3 text-pretty text-[14.5px] leading-relaxed"
          style={{ color: 'var(--text-2)' }}
        >
          {sub}
        </p>
      )}
    </div>
    {aside}
  </div>
);

/* Deterministic sparkline — 24 hairline columns, no randomness. */
export const Spark: React.FC<{ seed?: number; hot?: number; className?: string }> = ({
  seed = 3,
  hot = -1,
  className = '',
}) => (
  <div className={`nv-spark ${className}`} aria-hidden>
    {Array.from({ length: 24 }).map((_, i) => {
      const h = 18 + ((Math.sin((i + seed) * 1.7) + Math.cos((i + seed) * 0.6) + 2) / 4) * 82;
      return <i key={i} data-hot={i === hot} style={{ height: `${h.toFixed(1)}%` }} />;
    })}
  </div>
);

export const Tile: React.FC<{
  children: React.ReactNode;
  size?: 'md' | 'lg';
  ghost?: boolean;
  className?: string;
}> = ({ children, size = 'md', ghost = false, className = '' }) => (
  <span
    className={`nv-tile ${size === 'lg' ? 'nv-tile--lg' : ''} ${ghost ? 'nv-tile--ghost' : ''} ${className}`}
  >
    {children}
  </span>
);
