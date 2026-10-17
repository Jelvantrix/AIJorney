import React, { useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import { Aura, AuraState } from '../aura/Aura.tsx';
import { applyTheme, getStoredTheme, setStoredTheme } from '../../lib/theme.ts';
import { ArrowLeft, Play, RefreshCw, AlertCircle, Sun, Moon, Sparkles, Sliders } from 'lucide-react';

export const AuraLab: React.FC = () => {
  const { setCurrentView, reduceEffects, setReduceEffects, sendMessage } = useChatStore();
  const [selectedState, setSelectedState] = useState<AuraState>('idle');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  });

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    setStoredTheme(newTheme);
    applyTheme(newTheme);
  };

  const states: AuraState[] = ['idle', 'typing', 'thinking', 'streaming', 'error', 'done'];

  return (
    <div className="relative min-h-screen w-full bg-[var(--bg)] text-[var(--text)] flex flex-col overflow-hidden">
      {/* Isolated Aura Background with forced state */}
      <Aura forcedState={selectedState} />

      {/* Top Header */}
      <header className="relative z-10 h-14 px-6 border-b border-[var(--line)] flex items-center justify-between backdrop-blur-md bg-[var(--bg)]/70">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentView('app')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9999px] border border-[var(--line)] text-[13px] hover:bg-[var(--elev-1)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to App</span>
          </button>
          <span className="font-serif-display text-2xl tracking-tight">Noevix Aura Laboratory</span>
          <span className="font-mono-label px-2 py-0.5 rounded-[4px] bg-[var(--elev-2)]">Isolated Testbed</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <button
            onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9999px] border border-[var(--line)] text-[12px] hover:bg-[var(--elev-1)] transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="capitalize">{theme} Theme</span>
          </button>
        </div>
      </header>

      {/* Main Lab Controls Grid */}
      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full p-8 flex flex-col justify-center gap-8">
        {/* State Selector */}
        <div className="p-6 rounded-[16px] bg-[var(--elev-1)] border border-[var(--line)] backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium">Aura State Machine</h2>
              <p className="text-[13px] text-[var(--text-2)] mt-0.5">
                Inspect how the GPU-accelerated monochrome blooms and dock highlights respond to system states.
              </p>
            </div>
            <span className="font-mono-label px-2.5 py-1 rounded-[6px] border border-[var(--line-strong)]">
              STATE: {selectedState.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {states.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`py-3 px-2 rounded-[10px] text-[13px] font-mono capitalize transition-all border ${
                  selectedState === st
                    ? 'bg-[var(--text)] text-[var(--bg)] border-[var(--text)] font-semibold shadow-sm'
                    : 'bg-[var(--elev-2)] text-[var(--text-2)] border-[var(--line)] hover:text-[var(--text)] hover:border-[var(--line-strong)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Live Simulation Dock Replica */}
        <div className="p-8 rounded-[24px] bg-[var(--elev-1)] border border-[var(--line)] flex flex-col items-center justify-center min-h-[220px]">
          <span className="font-mono-label mb-4">Edge Light Conic Rotating Border Simulation</span>
          
          <div className="relative w-full max-w-lg p-5 rounded-[16px] bg-[var(--elev-2)] dock-aura-border dock-outer-glow flex items-center justify-between">
            <span className="text-[14px] text-[var(--text-2)]">
              Simulated composer dock in &ldquo;{selectedState}&rdquo; mode
            </span>
            <div className="w-7 h-7 rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center text-xs font-semibold">
              ↑
            </div>
          </div>
        </div>

        {/* Settings & Accessibility Toggles */}
        <div className="p-6 rounded-[16px] bg-[var(--elev-1)] border border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[14px] font-medium block">Reduce Effects</span>
            <span className="text-[12px] text-[var(--text-2)]">
              Disables SVG grain overlay and rotating conic sweep for low-power devices.
            </span>
          </div>
          <button
            onClick={() => setReduceEffects(!reduceEffects)}
            className={`px-4 py-2 rounded-[9999px] text-[13px] border transition-colors ${
              reduceEffects
                ? 'bg-[var(--text)] text-[var(--bg)] border-[var(--text)]'
                : 'border-[var(--line)] hover:bg-[var(--elev-2)] text-[var(--text)]'
            }`}
          >
            {reduceEffects ? 'Effects Reduced (Active)' : 'Full Cinematic Effects'}
          </button>
        </div>

        {/* Scripted Scenarios Quick Test */}
        <div className="p-6 rounded-[16px] bg-[var(--elev-1)] border border-[var(--line)]">
          <h3 className="text-[14px] font-medium mb-3">Trigger SSE Backend Mock Scenarios</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Fast Inference (5ms/token)', prompt: 'Write quick algorithm', scenario: 'fast' },
              { label: 'Deep Reasoning (Slow)', prompt: 'Prove mathematical theorem', scenario: 'slow' },
              { label: 'Tool Status (Search/Read/Exec)', prompt: 'Search distributed consensus papers', scenario: 'tool_use' },
              { label: 'Mid-Stream Disconnect', prompt: 'Simulate stream interruption', scenario: 'mid_stream_disconnect' },
              { label: 'Upstream Error (500)', prompt: 'Trigger error scenario', scenario: 'error' },
              { label: 'Rate Limited (429)', prompt: 'Trigger rate limit scenario', scenario: 'rate_limit' },
            ].map((sc) => (
              <button
                key={sc.scenario}
                onClick={() => {
                  setCurrentView('app');
                  sendMessage(sc.prompt, [], sc.scenario);
                }}
                className="px-3 py-2 rounded-[8px] bg-[var(--elev-2)] border border-[var(--line)] text-[12px] font-mono text-[var(--text-2)] hover:text-[var(--text)] hover:border-[var(--line-strong)] transition-all"
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
