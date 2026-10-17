import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Code2,
  Brain,
  Feather,
  FileSpreadsheet,
  Palette,
  Volume2,
  VolumeX,
  PanelRight,
  Menu,
  Sun,
  Moon,
  ChevronDown,
  Check,
  Flame,
  Globe,
  Sliders,
} from 'lucide-react';
import { useChatStore } from '../lib/store.ts';
import { toggleTheme, getStoredTheme } from '../lib/theme.ts';

const LENSES = [
  { id: 'neural', label: 'Neural Core', icon: Zap, desc: 'Balanced, adaptive real-time intelligence' },
  { id: 'reason', label: 'Deep Reason', icon: Brain, desc: 'Chain-of-thought verification & architecture' },
  { id: 'code', label: 'Techne Code', icon: Code2, desc: 'High-performance algorithms, systems & refactoring' },
  { id: 'creative', label: 'Creative Studio', icon: Feather, desc: 'Design language, narrative & brand strategy' },
  { id: 'executive', label: 'Executive Brief', icon: FileSpreadsheet, desc: 'High-density decision frameworks & trade-offs' },
] as const;

const AURA_THEMES = [
  { id: 'cosmic', label: 'Cosmic Magenta', color: 'from-[#FF2E8A] to-[#8B5CF6]', dot: '#FF2E8A' },
  { id: 'cyber', label: 'Cyber Cyan', color: 'from-[#06B6D4] to-[#3B82F6]', dot: '#06B6D4' },
  { id: 'emerald', label: 'Emerald Aurora', color: 'from-[#10B981] to-[#14B8A6]', dot: '#10B981' },
  { id: 'solar', label: 'Solar Flare', color: 'from-[#F59E0B] to-[#EF4444]', dot: '#F59E0B' },
  { id: 'minimal', label: 'Minimal Monochrome', color: 'from-[#E5E7EB] to-[#9CA3AF]', dot: '#A855F7' },
] as const;

export const ModernHeader: React.FC = () => {
  const {
    activeId,
    conversations,
    selectedLens,
    setLens,
    auraTheme,
    setAuraTheme,
    auraIntensity,
    setAuraIntensity,
    isArtifactsOpen,
    toggleArtifacts,
    isVoiceMode,
    setVoiceMode,
    toggleSidebar,
    messages,
  } = useChatStore();

  const [lensMenuOpen, setLensMenuOpen] = useState(false);
  const [auraMenuOpen, setAuraMenuOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const lensRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (lensRef.current && !lensRef.current.contains(e.target as Node)) {
        setLensMenuOpen(false);
      }
      if (auraRef.current && !auraRef.current.contains(e.target as Node)) {
        setAuraMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleTheme = () => {
    toggleTheme();
    setCurrentTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  };

  const activeConv = conversations.find((c) => c.id === activeId);
  const currentLensObj = LENSES.find((l) => l.id === selectedLens) || LENSES[0];
  const LensIcon = currentLensObj.icon;

  // Count code artifacts in current conversation
  const convMsgs = (activeId && messages[activeId]) || [];
  const artifactCount = convMsgs.reduce((acc, m) => {
    const matches = m.content.match(/```[a-z0-9]+/gi);
    return acc + (matches ? matches.length : 0);
  }, 0);

  return (
    <header className="relative z-30 h-[58px] px-3 md:px-6 flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--bg)]/80 backdrop-blur-xl shrink-0 transition-all select-none">
      {/* Left: Mobile Toggle & Brand & Active Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Luminous Brand Mark */}
        <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-[var(--border)]">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-[var(--accent)] to-[var(--aura-2)] shadow-[0_0_15px_var(--aura-1)]">
            <span className="text-white text-xs font-black tracking-widest">N</span>
            <div className="absolute inset-0 rounded-lg bg-white/20 animate-pulse pointer-events-none" />
          </div>
          <span className="font-semibold tracking-tight text-[15px] bg-clip-text text-transparent bg-gradient-to-r from-[var(--text)] via-[var(--text)] to-[var(--muted)]">
            NOEVIX
          </span>
        </div>

        {/* Current Conversation Title */}
        <div className="flex items-center gap-2 truncate max-w-[200px] sm:max-w-[260px] md:max-w-[340px]">
          <span className="text-[13px] font-medium text-[var(--text)] truncate">
            {activeConv?.title || 'New Session'}
          </span>
        </div>
      </div>

      {/* Center: Intelligence Lens Selector Pill */}
      <div className="relative" ref={lensRef}>
        <button
          onClick={() => setLensMenuOpen(!lensMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] shadow-xs transition-all duration-150 text-[13px] font-medium text-[var(--text)] group"
          title="Select Intelligence Lens"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse" />
          <LensIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="hidden sm:inline">{currentLensObj.label}</span>
          <ChevronDown className="w-3 h-3 text-[var(--muted)] group-hover:text-[var(--text)] transition-transform duration-200" />
        </button>

        {/* Lens Popover Menu */}
        {lensMenuOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 p-1.5 rounded-2xl glass-panel shadow-2xl border border-[var(--border)] animate-in fade-in-0 zoom-in-95 duration-150 z-50">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Intelligence Lenses
            </div>
            <div className="space-y-1">
              {LENSES.map((lens) => {
                const Icon = lens.icon;
                const isSelected = selectedLens === lens.id;
                return (
                  <button
                    key={lens.id}
                    onClick={() => {
                      setLens(lens.id);
                      setLensMenuOpen(false);
                    }}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-[var(--surface-active)] text-[var(--text)] shadow-xs'
                        : 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg mt-0.5 ${
                        isSelected
                          ? 'bg-[var(--accent)] text-white shadow-[0_0_10px_var(--aura-1)]'
                          : 'bg-[var(--surface)] text-[var(--muted)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-[var(--text)]">{lens.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                      </div>
                      <p className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">{lens.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Aura lighting, Artifacts, Voice, Theme */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Aura Lighting Selector Menu */}
        <div className="relative" ref={auraRef}>
          <button
            onClick={() => setAuraMenuOpen(!auraMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] transition-all duration-150 text-[12px]"
            title="Aura Lighting Theme"
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--aura-2)] shadow-[0_0_8px_var(--accent)]" />
            <span className="hidden lg:inline text-[12px] font-medium">Aura</span>
          </button>

          {auraMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 p-2 rounded-2xl glass-panel shadow-2xl border border-[var(--border)] animate-in fade-in-0 zoom-in-95 duration-150 z-50">
              <div className="px-2 py-1 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
                <span>Aura Lighting</span>
                <span className="text-[10px] text-[var(--accent)] font-medium">Atmospheric</span>
              </div>
              <div className="space-y-1 mt-1">
                {AURA_THEMES.map((theme) => {
                  const isSelected = auraTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setAuraTheme(theme.id as any);
                        setAuraMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-[12.5px] transition-all ${
                        isSelected
                          ? 'bg-[var(--surface-active)] font-medium text-[var(--text)]'
                          : 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${theme.color} shadow-xs`}
                        />
                        <span>{theme.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>

              {/* Intensity Switcher */}
              <div className="mt-2 pt-2 border-t border-[var(--border)]/60 px-1">
                <div className="text-[11px] text-[var(--muted)] mb-1.5 flex items-center justify-between">
                  <span>Intensity</span>
                  <span className="capitalize text-[var(--text)] font-medium">{auraIntensity}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-[var(--surface)] p-1 rounded-xl">
                  {(['subtle', 'radiant', 'hyper'] as const).map((intensity) => (
                    <button
                      key={intensity}
                      onClick={() => setAuraIntensity(intensity)}
                      className={`py-1 text-[11px] rounded-lg capitalize transition-colors ${
                        auraIntensity === intensity
                          ? 'bg-[var(--surface-active)] font-semibold text-[var(--text)] shadow-xs'
                          : 'text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      {intensity}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Artifacts Studio Deck Toggle Button */}
        <button
          onClick={toggleArtifacts}
          className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all duration-150 text-[12px] font-medium ${
            isArtifactsOpen
              ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_0_12px_var(--aura-1)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border-[var(--border)]'
          }`}
          title="Toggle Artifacts Studio Deck"
        >
          <PanelRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Studio</span>
          {artifactCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isArtifactsOpen ? 'bg-white/20 text-white' : 'bg-[var(--surface-active)] text-[var(--accent)]'
              }`}
            >
              {artifactCount}
            </span>
          )}
        </button>

        {/* Ambient Voice Readout Toggle */}
        <button
          onClick={() => setVoiceMode(!isVoiceMode)}
          className={`p-2 rounded-xl border transition-all duration-150 ${
            isVoiceMode
              ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40 shadow-[0_0_10px_var(--aura-1)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border-transparent hover:border-[var(--border)]'
          }`}
          title={isVoiceMode ? 'Voice Mode Active' : 'Enable Voice Mode'}
        >
          {isVoiceMode ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={handleToggleTheme}
          className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] transition-colors duration-150"
          title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {currentTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
