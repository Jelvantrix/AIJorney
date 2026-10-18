import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../../lib/store.ts';

export type AuraState = 'idle' | 'typing' | 'thinking' | 'streaming' | 'error' | 'done';

interface AuraProps {
  forcedState?: AuraState;
}

/**
 * The room's light source. A single scalar (--energy) is eased every frame and
 * consumed by CSS to drive a faint ambient bloom behind the interface.
 */
export const Aura: React.FC<AuraProps> = ({ forcedState }) => {
  const { isStreaming, isThinking, streamingError, isTyping, typingRate, reduceEffects } =
    useChatStore();

  const current = useRef(0.25);
  const target = useRef(0.25);
  const frame = useRef<number | null>(null);
  const last = useRef<number>(0);
  const errorArmed = useRef(false);

  const state: AuraState =
    forcedState ||
    (streamingError ? 'error' : isThinking ? 'thinking' : isStreaming ? 'streaming' : isTyping ? 'typing' : 'idle');

  useEffect(() => {
    document.documentElement.toggleAttribute('data-reduce-effects', reduceEffects);
  }, [reduceEffects]);

  useEffect(() => {
    switch (state) {
      case 'typing':
        target.current = 0.46 + Math.min((typingRate || 1) * 0.045, 0.22);
        break;
      case 'thinking':
        target.current = 0.72;
        break;
      case 'streaming':
        target.current = 0.88;
        break;
      case 'error':
        if (!errorArmed.current) {
          errorArmed.current = true;
          target.current = 1;
          current.current = 1;
          window.setTimeout(() => (target.current = 0.25), 190);
        }
        break;
      default:
        target.current = 0.25;
        errorArmed.current = false;
    }
  }, [state, typingRate]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--energy', '0.25');
      return;
    }

    let visible = document.visibilityState === 'visible';
    const onVis = () => (visible = document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);

    last.current = performance.now();

    const tick = (now: number) => {
      if (visible) {
        const dt = Math.min((now - last.current) / 1000, 0.1);
        last.current = now;

        let goal = target.current;
        if (state === 'idle') goal = 0.25 + 0.045 * Math.sin((now / 6200) * Math.PI * 2);
        else if (state === 'thinking') goal = 0.72 + 0.06 * Math.sin((now / 1500) * Math.PI * 2);

        current.current += (goal - current.current) * (1 - Math.exp(-5.5 * dt));
        document.documentElement.style.setProperty('--energy', current.current.toFixed(4));
      } else {
        last.current = now;
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [state]);

  return (
    <>
      <div className="nv-vignette" aria-hidden />
      <div className="nv-grain" aria-hidden />
    </>
  );
};
