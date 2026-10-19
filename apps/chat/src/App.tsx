import React, { useEffect } from 'react';
import { useChatStore } from './lib/store.ts';
import { applyTheme, getStoredTheme, Aura } from '@noevix/design-system';
import { SideRail } from './components/editorial/SideRail.tsx';
import { TopBar } from './components/editorial/TopBar.tsx';
import { Stage } from './components/editorial/Stage.tsx';
import { Dock } from './components/editorial/Dock.tsx';
import { TimelineRail } from './components/editorial/TimelineRail.tsx';
import { IndexOverlay } from './components/editorial/IndexOverlay.tsx';
import { ArtifactSheet } from './components/editorial/ArtifactSheet.tsx';
import { OnboardingModal } from './components/editorial/OnboardingModal.tsx';
import { AuthModal } from './components/editorial/AuthModal.tsx';
import { SpacesMenu } from './components/editorial/SpacesMenu.tsx';
import { SettingsModal } from './components/editorial/SettingsModal.tsx';
import { AuraLab } from './components/lab/AuraLab.tsx';
import MissionControl from './components/mission/MissionControl.tsx';

export default function App() {
  const {
    currentView,
    setIndexOpen,
    isIndexOpen,
    isSpacesMenuOpen,
    setSpacesMenuOpen,
    isSettingsOpen,
    setSettingsOpen,
    isArtifactSheetOpen,
    setArtifactSheetOpen,
    isLensMenuOpen,
    setLensMenuOpen,
    isAuthModalOpen,
    setAuthModalOpen,
    isStreaming,
    stopStreaming,
    activeExchangeIndex,
    setActiveExchangeIndex,
    activeId,
    messages,
    reduceEffects,
    isThinking,
    streamingError,
    isTyping,
    typingRate,
  } = useChatStore();

  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea';

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIndexOpen(!isIndexOpen);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setLensMenuOpen(!isLensMenuOpen);
        return;
      }

      if (e.key === 'Escape') {
        if (isStreaming) return stopStreaming();
        if (isSpacesMenuOpen) return setSpacesMenuOpen(false);
        if (isSettingsOpen) return setSettingsOpen(false);
        if (isIndexOpen) return setIndexOpen(false);
        if (isArtifactSheetOpen) return setArtifactSheetOpen(false);
        if (isLensMenuOpen) return setLensMenuOpen(false);
        if (isAuthModalOpen) return setAuthModalOpen(false);
      }

      if (!isInput && !isIndexOpen && !isArtifactSheetOpen) {
        const convo = (activeId && messages[activeId]) || [];
        const userCount = convo.filter((m) => m.role === 'user').length;

        if (e.key.toLowerCase() === 'j') {
          e.preventDefault();
          const next = Math.min(activeExchangeIndex + 1, Math.max(0, userCount - 1));
          setActiveExchangeIndex(next);
          document.getElementById(`exchange-${next}`)?.scrollIntoView({ behavior: 'smooth' });
        } else if (e.key.toLowerCase() === 'k' && !(e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          const prev = Math.max(0, activeExchangeIndex - 1);
          setActiveExchangeIndex(prev);
          document.getElementById(`exchange-${prev}`)?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    isIndexOpen,
    isSpacesMenuOpen,
    isSettingsOpen,
    isArtifactSheetOpen,
    isLensMenuOpen,
    isAuthModalOpen,
    isStreaming,
    activeExchangeIndex,
    activeId,
    messages,
    setIndexOpen,
    setSpacesMenuOpen,
    setSettingsOpen,
    setArtifactSheetOpen,
    setLensMenuOpen,
    setAuthModalOpen,
    stopStreaming,
    setActiveExchangeIndex,
  ]);

  if (currentView === 'lab') return <AuraLab />;
  if (currentView === 'missions') return <MissionControl />;

  const auraState = streamingError
    ? 'error'
    : isThinking
    ? 'thinking'
    : isStreaming
    ? 'streaming'
    : isTyping
    ? 'typing'
    : 'idle';

  return (
    <div
      className="relative flex h-[100dvh] w-screen overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Reactive background layers */}
      <Aura state={auraState} typingRate={typingRate} reduceEffects={reduceEffects} />
      <div className="nv-grid" aria-hidden />

      <SideRail />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <Stage />
            {/* Content fades into the instrument below rather than being cut */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14"
              style={{ background: 'linear-gradient(180deg, transparent, var(--bg) 82%)' }}
            />
          </div>
          <Dock />
        </main>
      </div>

      <TimelineRail />

      {/* Overlays */}
      <IndexOverlay />
      <SpacesMenu />
      <SettingsModal />
      <ArtifactSheet />
      <OnboardingModal />
      <AuthModal />
    </div>
  );
}
