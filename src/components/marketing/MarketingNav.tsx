import React, { useEffect, useState } from 'react';
import { MARKETING_COPY } from '../../content/marketing.ts';
import { toggleTheme } from '../../lib/theme.ts';
import {
  Activity,
  BookOpen,
  ChevronDown,
  Code2,
  CreditCard,
  Gauge,
  GraduationCap,
  GitBranch,
  Layout,
  Layers,
  Menu,
  Moon,
  PenLine,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react';

const GROUP_ICONS: Record<string, LucideIcon[]> = {
  Product: [Sparkles, Layers, ShieldCheck, GitBranch, GraduationCap],
  Solutions: [Code2, Layout, BookOpen, PenLine, Activity],
  Resources: [Workflow, Gauge, Scale, Layers, CreditCard],
};

interface Props {
  theme: 'dark' | 'light';
  onLaunch: () => void;
  onSignIn: () => void;
  onLab: () => void;
}

export const MarketingNav: React.FC<Props> = ({ theme, onLaunch, onSignIn, onLab }) => {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(null);
        setMobile(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = mobile ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [mobile]);

  const groups = MARKETING_COPY.nav as Array<{
    label: string;
    items: Array<{ label: string; desc: string; href: string }>;
  }>;

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-50"
        onMouseLeave={() => setOpen(null)}
        style={{
          background: scrolled
            ? 'color-mix(in srgb, var(--bg) 76%, transparent)'
            : 'linear-gradient(180deg, color-mix(in srgb, var(--bg) 88%, transparent), transparent)',
          backdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
          transition: 'background 260ms var(--ease)',
        }}
      >
        <div className="mx-auto flex h-[64px] max-w-[1240px] items-center justify-between gap-3 px-[var(--gutter)] md:gap-4">
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-4 md:gap-6">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group flex min-h-[40px] items-center gap-2.5 py-1"
            >
              <span className="nv-display text-[21px] leading-none">Noevix</span>
              <span
                className="nv-chip hidden whitespace-nowrap !text-[10px] xl:inline-flex"
              >
                <Sparkles className="h-2.5 w-2.5" />
                Orchestrated intelligence
              </span>
            </button>

            {/* Group menus — present from tablet up, where there is room. */}
            <div className="hidden items-center gap-0.5 md:flex">
              {groups.map((g) => (
                <div key={g.label} className="relative">
                  <button
                    className="nv-navlink"
                    data-open={open === g.label}
                    onMouseEnter={() => setOpen(g.label)}
                    onClick={() => setOpen(open === g.label ? null : g.label)}
                  >
                    {g.label}
                    <ChevronDown
                      className="h-3 w-3"
                      style={{
                        color: 'var(--text-4)',
                        transition: 'transform 200ms var(--ease)',
                        transform: open === g.label ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  </button>

                  {open === g.label && (
                    <div className="nv-navpop" onMouseEnter={() => setOpen(g.label)}>
                      <div className="px-3 pb-1 pt-2.5">
                        <span className="nv-label !text-[9px]">{g.label}</span>
                      </div>
                      {g.items.map((item, i) => {
                        const Icon = (GROUP_ICONS[g.label] ?? [Sparkles])[i] ?? Sparkles;
                        return (
                          <a
                            key={item.label}
                            href={item.href}
                            onClick={() => setOpen(null)}
                            className="nv-navpop__item"
                          >
                            <span className="nv-tile !h-8 !w-8">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                              <span
                                className="flex items-center gap-1.5 text-[13.5px] font-medium"
                                style={{ color: 'var(--text)' }}
                              >
                                {item.label}
                              </span>
                              <span
                                className="mt-0.5 block text-[12px] leading-snug"
                                style={{ color: 'var(--text-3)' }}
                              >
                                {item.desc}
                              </span>
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              <a
                href="#capabilities"
                className="nv-navlink hidden lg:inline-flex"
                onMouseEnter={() => setOpen(null)}
              >
                Capabilities
              </a>
              <a
                href="#pricing"
                className="nv-navlink hidden lg:inline-flex"
                onMouseEnter={() => setOpen(null)}
              >
                Pricing
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button onClick={onLab} className="nv-btn nv-btn--ghost nv-btn--sm hidden lg:inline-flex">
              Aura lab
            </button>
            <button
              onClick={onSignIn}
              className="nv-btn nv-btn--ghost nv-btn--sm hidden md:inline-flex"
            >
              Sign in
            </button>
            <button
              onClick={toggleTheme}
              className="nv-iconbtn nv-iconbtn--sm"
              title="Invert canvas"
              aria-label="Invert canvas"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onLaunch}
              className="nv-btn nv-btn--primary nv-btn--sm ml-0.5 hidden sm:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              <span className="hidden lg:inline">Launch space</span>
              <span className="lg:hidden">Launch</span>
            </button>
            <button
              onClick={() => setMobile(true)}
              className="nv-iconbtn nv-iconbtn--sm md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile sheet */}
      {mobile && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div className="nv-scrim" onClick={() => setMobile(false)} />
          <div
            className="nv-scroll absolute inset-x-0 top-0 max-h-[92dvh] overflow-y-auto px-5 pb-8"
            style={{
              background: 'var(--elev-2)',
              animation: 'nv-modal-in 220ms var(--ease-out) both',
            }}
          >
            {/* Sticky so the only way out of the sheet is always reachable,
                no matter how far the link list has been scrolled. */}
            <div
              className="sticky top-0 z-10 -mx-5 mb-5 flex items-center justify-between px-5 pb-3 pt-4"
              style={{ background: 'var(--elev-2)' }}
            >
              <span className="nv-display text-[21px]">Noevix</span>
              <button
                onClick={() => setMobile(false)}
                className="nv-iconbtn nv-iconbtn--sm"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.label}>
                  <span className="nv-label !text-[10px]">{g.label}</span>
                  <div className="mt-2 space-y-0.5">
                    {g.items.map((item, i) => {
                      const Icon = (GROUP_ICONS[g.label] ?? [Sparkles])[i] ?? Sparkles;
                      return (
                        <a
                          key={item.label}
                          href={item.href}
                          onClick={() => setMobile(false)}
                          className="flex items-center gap-3 rounded-[10px] px-2 py-2.5"
                          style={{ background: 'var(--glass-1)' }}
                        >
                          <span className="nv-tile !h-8 !w-8">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-[13.5px]" style={{ color: 'var(--text-1)' }}>
                            {item.label}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { label: 'Capabilities', href: '#capabilities' },
                { label: 'Comparison', href: '#compare' },
                { label: 'Pricing', href: '#pricing' },
              ].map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMobile(false)}
                  className="nv-pill justify-center !px-2"
                >
                  {l.label}
                </a>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button onClick={onLaunch} className="nv-btn nv-btn--primary">
                <Plus className="h-4 w-4" strokeWidth={2.4} />
                Launch a space
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobile(false);
                    onSignIn();
                  }}
                  className="nv-btn"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    setMobile(false);
                    onLab();
                  }}
                  className="nv-btn"
                >
                  Aura lab
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
