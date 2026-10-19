import React, { useEffect, useState } from 'react';
import { MARKETING_COPY } from '../content/marketing.ts';
import { toggleTheme } from '@noevix/design-system';
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
  onProducts?: () => void;
}

export const MarketingNav: React.FC<Props> = ({ theme, onLaunch, onSignIn, onLab, onProducts }) => {
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

  const handleGroupClick = (label: string) => {
    if (label.toLowerCase() === 'product') {
      setOpen(null);
      if (onProducts) onProducts();
    } else {
      setOpen(open === label ? null : label);
    }
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-50 transition-colors"
        onMouseLeave={() => setOpen(null)}
        style={{
          background: scrolled
            ? 'color-mix(in srgb, var(--bg) 92%, transparent)'
            : 'color-mix(in srgb, var(--bg) 70%, transparent)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--line)',
          transition: 'background 240ms var(--ease), border-color 240ms var(--ease)',
        }}
      >
        <div className="mx-auto flex h-[60px] sm:h-[64px] max-w-[1240px] items-center justify-between gap-2.5 px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-3 md:gap-6">
            <button
              onClick={() => {
                if (window.location.pathname !== '/') {
                  window.location.href = '/';
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="group flex min-h-[40px] items-center gap-2 py-1"
            >
              <span className="nv-display text-[20px] sm:text-[22px] leading-none tracking-tight">Noevix</span>
              <span
                className="nv-chip hidden whitespace-nowrap !text-[10px] xl:inline-flex"
              >
                <Sparkles className="h-2.5 w-2.5" />
                Orchestrated intelligence
              </span>
            </button>

            {/* Desktop Navigation Menus (Product, Solutions, Resources, Capabilities, Pricing) */}
            <div className="hidden items-center gap-1 md:flex">
              {groups.map((g) => (
                <div key={g.label} className="relative">
                  <button
                    className="nv-navlink cursor-pointer"
                    data-open={open === g.label}
                    onMouseEnter={() => setOpen(g.label)}
                    onClick={() => handleGroupClick(g.label)}
                    aria-label={`Open ${g.label}`}
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
                      <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
                        <span className="nv-label !text-[9px]">{g.label}</span>
                        {g.label.toLowerCase() === 'product' && (
                          <button
                            onClick={() => {
                              setOpen(null);
                              if (onProducts) onProducts();
                            }}
                            className="text-[10.5px] font-mono hover:underline hover:text-white"
                            style={{ color: 'var(--text-3)' }}
                          >
                            All Products →
                          </button>
                        )}
                      </div>
                      {g.items.map((item, i) => {
                        const Icon = (GROUP_ICONS[g.label] ?? [Sparkles])[i] ?? Sparkles;
                        return (
                          <a
                            key={item.label}
                            href={g.label.toLowerCase() === 'product' ? '#products' : item.href}
                            onClick={() => {
                              setOpen(null);
                              if (g.label.toLowerCase() === 'product' && onProducts) {
                                onProducts();
                              }
                            }}
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

          {/* Right Actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              onClick={onLab}
              className="nv-btn nv-btn--ghost !h-9 !px-3 text-[12.5px] hidden lg:inline-flex"
            >
              Xylvanthrex Labs
            </button>
            <button
              onClick={onSignIn}
              className="nv-btn nv-btn--ghost !h-9 !px-3 text-[12.5px] hidden md:inline-flex"
            >
              Sign in
            </button>
            <button
              onClick={toggleTheme}
              className="nv-iconbtn nv-iconbtn--sm shrink-0"
              title="Invert canvas"
              aria-label="Invert canvas"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onLaunch}
              className="nv-btn nv-btn--primary !h-9 !px-3.5 text-[12.5px] hidden sm:inline-flex shrink-0"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              Launch space
            </button>
            <button
              onClick={() => setMobile(!mobile)}
              className="nv-iconbtn nv-iconbtn--sm md:hidden shrink-0"
              aria-label={mobile ? 'Close navigation' : 'Open navigation'}
            >
              {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Sheet */}
      {mobile && (
        <div
          className="fixed inset-0 z-40 flex flex-col pt-[60px] sm:pt-[64px] md:hidden animate-fade-in"
          style={{ background: 'var(--bg)' }}
        >
          <div className="nv-scroll flex-1 overflow-y-auto px-5 py-6">
            <div className="space-y-6">
              {groups.map((g) => (
                <div key={g.label} className="border-b pb-5" style={{ borderColor: 'var(--line-faint)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => {
                        setMobile(false);
                        if (g.label.toLowerCase() === 'product' && onProducts) {
                          onProducts();
                        }
                      }}
                      className="nv-label !text-[11px] font-semibold text-left tracking-wider hover:text-white transition-colors"
                    >
                      {g.label}
                      {g.label.toLowerCase() === 'product' && (
                        <span className="ml-2 font-mono text-[9px] font-normal text-emerald-400">
                          (tap to open page)
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {g.items.map((item, i) => {
                      const Icon = (GROUP_ICONS[g.label] ?? [Sparkles])[i] ?? Sparkles;
                      return (
                        <a
                          key={item.label}
                          href={g.label.toLowerCase() === 'product' ? '#products' : item.href}
                          onClick={() => {
                            setMobile(false);
                            if (g.label.toLowerCase() === 'product' && onProducts) {
                              onProducts();
                            }
                          }}
                          className="flex items-center gap-3 rounded-[12px] p-2.5 active:scale-[0.98] transition-transform"
                          style={{ background: 'var(--glass-1)' }}
                        >
                          <span className="nv-tile !h-8 !w-8 shrink-0">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium" style={{ color: 'var(--text-1)' }}>
                              {item.label}
                            </span>
                            <span className="block text-[11.5px] truncate" style={{ color: 'var(--text-3)' }}>
                              {item.desc}
                            </span>
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
                  className="nv-pill justify-center !px-2 text-center text-[12px] !h-9 flex items-center"
                >
                  {l.label}
                </a>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2.5 pb-8">
              <button onClick={() => { setMobile(false); onLaunch(); }} className="nv-btn nv-btn--primary !h-11 w-full justify-center text-[14px]">
                <Plus className="h-4 w-4" strokeWidth={2.4} />
                Launch space
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobile(false);
                    onSignIn();
                  }}
                  className="nv-btn nv-btn--ghost !h-10 justify-center text-[13px]"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    setMobile(false);
                    onLab();
                  }}
                  className="nv-btn nv-btn--ghost !h-10 justify-center text-[13px]"
                >
                  Xylvanthrex Labs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
