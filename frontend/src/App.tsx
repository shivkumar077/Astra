import React, { useState, useEffect } from 'react';
import { Header } from './components/ui/Header';
import { HeroSection } from './components/ui/HeroSection';
import { Footer } from './components/ui/Footer';
import { EarthCanvas } from './components/earth/EarthCanvas';
import { EntryModal, DestinationType } from './components/ui/EntryModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SpaceImageryView } from './components/imagery/SpaceImageryView';
import { MissionControlView } from './components/missionControl/MissionControlView';
import { NasaArchiveView } from './components/nasaArchive/NasaArchiveView';
import { AboutMeView } from './components/about/AboutMeView';
import { NotFoundView } from './components/common/NotFoundView';
import { navigationHistory, NavigationLocation } from './utils/navigationHistory';

export const App: React.FC = () => {
  const [navLocation, setNavLocation] = useState<NavigationLocation>(() => {
    return navigationHistory.parseUrlHash();
  });
  const [missionControlModalOpen, setMissionControlModalOpen] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    navigationHistory.init(navigationHistory.parseUrlHash());
    const unsubscribe = navigationHistory.subscribe((loc) => {
      setNavLocation(loc);
    });
    return () => unsubscribe();
  }, []);

  // Guarantee that switching view modes always starts at the top of the new view
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [navLocation.viewMode]);

  useEffect(() => {
    // Detect operating-system reduced motion preference silently for accessibility
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery) {
        setReducedMotion(Boolean(mediaQuery.matches));

        const handleChange = (e: MediaQueryListEvent) => {
          setReducedMotion(Boolean(e?.matches));
        };

        mediaQuery.addEventListener?.('change', handleChange);
        return () => mediaQuery.removeEventListener?.('change', handleChange);
      }
    }
  }, []);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = docHeight > 0 ? Math.min(Math.max(window.scrollY / docHeight, 0), 1) : 0;
          setScrollProgress(progress);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSelectDestination = (dest: DestinationType) => {
    if (dest === 'space-imagery') {
      navigationHistory.push({ viewMode: 'space-imagery' });
    } else if (dest === 'mission-control') {
      navigationHistory.push({ viewMode: 'mission-control', mcModeView: 'cockpit' });
    } else if (dest === 'nasa-archive') {
      navigationHistory.push({ viewMode: 'nasa-archive' });
    } else if (dest === 'about') {
      navigationHistory.push({ viewMode: 'about' });
    } else {
      setMissionControlModalOpen(true);
    }
  };

  const handleReturnHome = () => {
    navigationHistory.push({ viewMode: 'landing' });
  };

  const handleEnterMissionControl = () => {
    navigationHistory.push({ viewMode: 'mission-control', mcModeView: 'cockpit' });
  };

  if (navLocation.viewMode === 'space-imagery') {
    return (
      <ErrorBoundary fallbackTitle="SPACE IMAGERY ARCHIVE ENCOUNTERED AN UNEXPECTED FAULT" onReset={handleReturnHome}>
        <SpaceImageryView
          onReturnHome={handleReturnHome}
          reducedMotion={reducedMotion}
        />
      </ErrorBoundary>
    );
  }

  if (navLocation.viewMode === 'mission-control') {
    return (
      <ErrorBoundary fallbackTitle="MISSION CONTROL CONSOLE ENCOUNTERED AN UNEXPECTED FAULT" onReset={handleReturnHome}>
        <MissionControlView
          onReturnHome={handleReturnHome}
          reducedMotion={reducedMotion}
          navLocation={navLocation}
        />
      </ErrorBoundary>
    );
  }

  if (navLocation.viewMode === 'nasa-archive') {
    return (
      <ErrorBoundary fallbackTitle="NASA IMAGE ARCHIVE ENCOUNTERED AN UNEXPECTED FAULT" onReset={handleReturnHome}>
        <NasaArchiveView
          onReturnHome={handleReturnHome}
          reducedMotion={reducedMotion}
        />
      </ErrorBoundary>
    );
  }

  if (navLocation.viewMode === 'about') {
    return (
      <ErrorBoundary fallbackTitle="SYSTEMS ARCHITECT DOSSIER ENCOUNTERED AN UNEXPECTED FAULT" onReset={handleReturnHome}>
        <AboutMeView
          onReturnHome={handleReturnHome}
          onEnterMissionControl={handleEnterMissionControl}
          reducedMotion={reducedMotion}
        />
      </ErrorBoundary>
    );
  }

  if (navLocation.viewMode === 'not-found') {
    return (
      <ErrorBoundary fallbackTitle="NAVIGATION SUBSYSTEM ENCOUNTERED AN UNEXPECTED FAULT" onReset={handleReturnHome}>
        <NotFoundView
          onReturnHome={handleReturnHome}
          onEnterMissionControl={handleEnterMissionControl}
          reducedMotion={reducedMotion}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div
      className="astra-app-root"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-void)',
        overflowX: 'hidden',
      }}
      data-testid="astra-app"
    >
      {/* Real-Time Rendered 3D Earth Scene (Coordinated Scroll Camera) */}
      <EarthCanvas scrollProgress={scrollProgress} reducedMotion={reducedMotion} />

      {/* Primary Structural Layout */}
      <Header onSelectDestination={handleSelectDestination} />

      <HeroSection
        scrollProgress={scrollProgress}
        reducedMotion={reducedMotion}
        onSelectDestination={handleSelectDestination}
      />

      <Footer />

      {/* Mission Control Flight Readiness Modal */}
      <EntryModal
        destination={missionControlModalOpen ? 'mission-control' : null}
        onClose={() => setMissionControlModalOpen(false)}
      />
    </div>
  );
};

export default App;


