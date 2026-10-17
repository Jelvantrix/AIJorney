import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../../lib/store.ts';

export type AuraState = 'idle' | 'typing' | 'thinking' | 'streaming' | 'error' | 'done';

interface AuraProps {
  forcedState?: AuraState;
  showDockBloom?: boolean;
}

export const Aura: React.FC<AuraProps> = ({ forcedState }) => {
  const { isStreaming, isThinking, streamingError, isTyping, typingRate, reduceEffects } = useChatStore();

  const currentEnergyRef = useRef(0.25);
  const targetEnergyRef = useRef(0.25);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const errorFlickerTimeoutRef = useRef<any>(null);
  const errorTriggeredRef = useRef(false);

  // Compute state
  const state: AuraState = forcedState || (
    streamingError ? 'error' :
    isThinking ? 'thinking' :
    isStreaming ? 'streaming' :
    isTyping ? 'typing' :
    'idle'
  );

  useEffect(() => {
    // Set html attribute for reduced effects
    if (reduceEffects) {
      document.documentElement.setAttribute('data-reduce-effects', 'true');
    } else {
      document.documentElement.removeAttribute('data-reduce-effects');
    }
  }, [reduceEffects]);

  useEffect(() => {
    switch (state) {
      case 'idle':
        targetEnergyRef.current = 0.25;
        errorTriggeredRef.current = false;
        break;
      case 'typing':
        const bonus = Math.min((typingRate || 1) * 0.05, 0.25);
        targetEnergyRef.current = 0.45 + bonus;
        break;
      case 'thinking':
        targetEnergyRef.current = 0.70;
        break;
      case 'streaming':
        targetEnergyRef.current = 0.85;
        break;
      case 'error':
        if (!errorTriggeredRef.current) {
          errorTriggeredRef.current = true;
          targetEnergyRef.current = 0.95;
          currentEnergyRef.current = 0.95;
          errorFlickerTimeoutRef.current = setTimeout(() => {
            targetEnergyRef.current = 0.25;
          }, 180);
        }
        break;
      case 'done':
        targetEnergyRef.current = 0.25;
        break;
    }

    return () => {
      if (errorFlickerTimeoutRef.current) clearTimeout(errorFlickerTimeoutRef.current);
    };
  }, [state, typingRate]);

  // Main animation loop: exponential smoothing of --energy
  useEffect(() => {
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReducedMotion) {
      document.documentElement.style.setProperty('--energy', '0.25');
      return;
    }

    let isVisible = document.visibilityState === 'visible';

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const updateLoop = (now: number) => {
      if (isVisible) {
        const delta = Math.min((now - lastTimeRef.current) / 1000, 0.1);
        lastTimeRef.current = now;

        let effectiveTarget = targetEnergyRef.current;
        if (state === 'idle') {
          effectiveTarget = 0.25 + 0.04 * Math.sin((now / 6000) * Math.PI * 2);
        } else if (state === 'thinking') {
          effectiveTarget = 0.70 + 0.06 * Math.sin((now / 1500) * Math.PI * 2);
        }

        const smoothingFactor = 1 - Math.exp(-5.5 * delta);
        currentEnergyRef.current += (effectiveTarget - currentEnergyRef.current) * smoothingFactor;

        document.documentElement.style.setProperty(
          '--energy',
          currentEnergyRef.current.toFixed(4)
        );
      } else {
        lastTimeRef.current = now;
      }

      animFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state]);

  // Strictly NO background white gradient light - pure dark atmosphere
  return (
    <>
      {/* Subtle corner vignette (pure black gradient at corners, never white) */}
      <div className="aura-vignette pointer-events-none" aria-hidden="true" />

      {/* Subtle monochrome noise texture */}
      <div className="aura-grain pointer-events-none" aria-hidden="true" />
    </>
  );
};
