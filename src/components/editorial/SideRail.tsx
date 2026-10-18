import React, { useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import { toggleTheme } from '../../lib/theme.ts';
import {
  Plus,
  Layers,
  Command,
  FlaskConical,
  Settings2,
  Sun,
  Moon,
  UserRound,
  Compass,
  type LucideIcon,
} from 'lucide-react';

interface RailButtonProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  accent?: boolean;
}

const RailButton: React.FC<RailButtonProps> = ({
  icon: Icon,
  label,
  shortcut,
  active,
  onClick,
  accent,
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    className="group/rail relative flex h-10 w-10 items-center justify-center rounded-[11px] transition-all duration-200"
    style={{
      color: active ? 'var(--text)' : 'var(--icon)',
      background: active ? 'var(--glass-3)' : 'transparent',
      border: `1px solid ${active ? 'var(--line)' : 'transparent'}`,
      boxShadow: active ? 'var(--shadow-1), var(--shadow-inset)' : 'none',
    }}
  >
    {/* active marker */}
    <span
      className="absolute -left-[9px] h-4 w-[2px] rounded-full transition-all duration-300"
      style={{
        background: 'var(--text)',
        opacity: active ? 1 : 0,
        transform: active ? 'scaleY(1)' : 'scaleY(0.3)',
      }}
    />
    <Icon
      className={`h-[17px] w-[17px] transition-transform duration-200 ${
        active ? '' : 'group-hover/rail:scale-110'
      }`}
      strokeWidth={active ? 2 : 1.75}
    />
    {accent && (
      <span
        className="absolute inset-0 rounded-[11px] transition-opacity duration-200 group-hover/rail:opacity-100"
        style={{ boxShadow: '0 0 0 1px var(--line-strong)', opacity: 0 }}
      />
    )}

    {/* tooltip */}
    <span
      className="pointer-events-none absolute left-[calc(100%+12px)] z-50 hidden items-center gap-2 whitespace-nowrap rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-medium opacity-0 transition-all duration-200 group-hover/rail:flex group-hover/rail:opacity-100 md:flex"
      style={{
        color: 'var(--text)',
        background: 'var(--surface-3)',
        border: '1px solid var(--line-strong)',
        boxShadow: 'var(--shadow-3)',
        transform: 'translateX(-4px)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateX(0)')}
    >
      {label}
      {shortcut && <span className="nv-kbd h-[17px] text-[9px]">{shortcut}</span>}
    </span>
  </button>
);

export const SideRail: React.FC = () => {
  const {
    newChat,
    setActiveConversation,
    setSpacesMenuOpen,
    setCurrentView,
    setSettingsOpen,
    setAuthModalOpen,
    setIndexOpen,
    isSpacesMenuOpen,
  } = useChatStore();

  const [isLight, setIsLight] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
  );

  const handleTheme = () => {
    toggleTheme();
    setIsLight(document.documentElement.classList.contains('light'));
  };

  const handleNew = () => {
    const id = newChat('Untitled Space');
    setActiveConversation(id);
  };

  return (
    <nav
      aria-label="Primary"
      className="relative z-30 flex h-full w-[56px] shrink-0 flex-col items-center justify-between py-3.5 sm:w-[68px]"
      style={{ borderRight: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      {/* ── Top ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2.5">
        <button
          onClick={() => setCurrentView('marketing')}
          aria-label="Noevix home"
          className="group relative mb-1 flex h-10 w-10 items-center justify-center rounded-[12px] transition-transform duration-300 hover:scale-[1.04] active:scale-95"
          style={{
            background: 'linear-gradient(180deg, var(--glass-3), var(--glass-1))',
            border: '1px solid var(--line-strong)',
            boxShadow: 'var(--shadow-2), var(--shadow-inset)',
          }}
        >
          <span
            className="nv-display text-[19px] leading-none"
            style={{ transform: 'translateY(-1px)' }}
          >
            N
          </span>
          <span
            className="absolute -bottom-px left-1/2 h-px w-5 -translate-x-1/2"
            style={{ background: 'linear-gradient(90deg, transparent, var(--line-bright), transparent)' }}
          />
        </button>

        <span className="my-1 h-px w-6" style={{ background: 'var(--line)' }} />

        <RailButton icon={Plus} label="New space" shortcut="⌘⇧O" onClick={handleNew} accent />
        <RailButton
          icon={Layers}
          label="All spaces"
          shortcut="⌘⇧S"
          active={isSpacesMenuOpen}
          onClick={() => setSpacesMenuOpen(true)}
        />
        <RailButton
          icon={Command}
          label="Command index"
          shortcut="⌘K"
          onClick={() => setIndexOpen(true)}
        />
        <RailButton
          icon={Compass}
          label="Mission control"
          onClick={() => setCurrentView('missions')}
        />
        <RailButton
          icon={FlaskConical}
          label="Aura lab"
          onClick={() => setCurrentView('lab')}
        />
      </div>

      {/* ── Bottom ──────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2">
        <span className="mb-1 h-px w-6" style={{ background: 'var(--line)' }} />
        <RailButton
          icon={isLight ? Moon : Sun}
          label={isLight ? 'Dark canvas' : 'Light canvas'}
          onClick={handleTheme}
        />
        <RailButton
          icon={Settings2}
          label="Preferences"
          onClick={() => setSettingsOpen(true)}
        />
        <RailButton
          icon={UserRound}
          label="Account"
          onClick={() => setAuthModalOpen(true, 'login')}
        />
      </div>
    </nav>
  );
};
