import React, { useEffect } from 'react';
import { useChatStore } from '../../lib/store.ts';

export const AuraEngine: React.FC = () => {
  const { auraTheme, auraIntensity, isStreaming, isThinking } = useChatStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-aura', auraTheme);
  }, [auraTheme]);

  const intensityMultiplier =
    auraIntensity === 'subtle' ? 0.45 : auraIntensity === 'hyper' ? 1.0 : 0.75;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700 select-none"
      style={{ opacity: intensityMultiplier }}
      aria-hidden="true"
    >
      {/* Dynamic ambient luminous orbs */}
      <div
        className={`aura-glow-orb-1 transition-all duration-1000 ${
          isStreaming || isThinking ? 'scale-110 !opacity-90' : 'opacity-70'
        }`}
      />
      <div
        className={`aura-glow-orb-2 transition-all duration-1000 ${
          isStreaming || isThinking ? 'scale-115 !opacity-85' : 'opacity-60'
        }`}
      />
      <div
        className={`aura-glow-orb-3 transition-all duration-700 ${
          isThinking ? 'animate-pulse !opacity-100' : 'opacity-50'
        }`}
      />

      {/* Subtle modern noise grain overlay for high-end cinematic texture */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};
