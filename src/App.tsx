import React, { useEffect } from 'react';
import { useChatStore } from './lib/store.ts';
import { applyTheme, getStoredTheme } from './lib/theme.ts';
import { Aura } from './components/aura/Aura.tsx';
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
import { MarketingPage } from './components/marketing/MarketingPage.tsx';
import { AuraLab } from './components/lab/AuraLab.tsx';

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
  } = useChatStore();

  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea';

      // ⌘K or Ctrl+K: Index Overlay
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIndexOpen(!isIndexOpen);
        return;
      }

      // ⌘/ or Ctrl+/: Lens Menu
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setLensMenuOpen(!isLensMenuOpen);
        return;
      }

      // Escape key behavior
      if (e.key === 'Escape') {
        if (isStreaming) {
          stopStreaming();
          return;
        }
        if (isSpacesMenuOpen) {
          setSpacesMenuOpen(false);
          return;
        }
        if (isSettingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (isIndexOpen) {
          setIndexOpen(false);
          return;
        }
        if (isArtifactSheetOpen) {
          setArtifactSheetOpen(false);
          return;
        }
        if (isLensMenuOpen) {
          setLensMenuOpen(false);
          return;
        }
        if (isAuthModalOpen) {
          setAuthModalOpen(false);
          return;
        }
      }

      // J / K keyboard navigation between exchanges when not focused in input
      if (!isInput && !isIndexOpen && !isArtifactSheetOpen) {
        const activeMessages = (activeId && messages[activeId]) || [];
        const userCount = activeMessages.filter((m) => m.role === 'user').length;

        if (e.key.toLowerCase() === 'j') {
          // Down / next exchange
          e.preventDefault();
          const next = Math.min(activeExchangeIndex + 1, Math.max(0, userCount - 1));
          setActiveExchangeIndex(next);
          document.getElementById(`exchange-${next}`)?.scrollIntoView({ behavior: 'smooth' });
        } else if (e.key.toLowerCase() === 'k' && !(e.metaKey || e.ctrlKey)) {
          // Up / prev exchange
          e.preventDefault();
          const prev = Math.max(0, activeExchangeIndex - 1);
          setActiveExchangeIndex(prev);
          document.getElementById(`exchange-${prev}`)?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
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
  ]);

  // Route to Marketing Page
  if (currentView === 'marketing') {
    return <MarketingPage />;
  }

  // Route to Aura Lab
  if (currentView === 'lab') {
    return <AuraLab />;
  }

  // Core App Shell: Four elements, no sidebar
  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans select-none">
      {/* 0) Reactive Monochrome Aura */}
      <Aura />

      {/* 1) Top Bar (48px, transparent, fades in on hover) */}
      <TopBar />

      {/* 2) The Stage (Editorial document conversation) */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
        <Stage />
      </main>

      {/* 3) The Dock (Composer floating at bottom center) */}
      <Dock />

      {/* 4) The Timeline Rail (24px right strip with ticks) */}
      <TimelineRail />

      {/* Index Overlay (⌘K) */}
      <IndexOverlay />

      {/* Spaces & Chats Drawer Menu */}
      <SpacesMenu />

      {/* Settings & Preferences Modal (Lists, Paragraphs, Code theme) */}
      <SettingsModal />

      {/* Artifacts Sheet */}
      <ArtifactSheet />

      {/* Onboarding Modal */}
      <OnboardingModal />

      {/* Auth Modal */}
      <AuthModal />
    </div>
  );
}
