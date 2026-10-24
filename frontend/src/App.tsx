import React, { useState, useEffect } from 'react';
import { Header } from './components/ui/Header';
import { HeroSection } from './components/ui/HeroSection';
import { Footer } from './components/ui/Footer';
import { EarthCanvas } from './components/earth/EarthCanvas';
import { EntryModal, DestinationType } from './components/ui/EntryModal';
import { SpaceImageryView } from './components/imagery/SpaceImageryView';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'landing' | 'space-imagery'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#space-imagery') {
      return 'space-imagery';
    }
    return 'landing';
  });
  const [missionControlModalOpen, setMissionControlModalOpen] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    // Detect operating-system reduced motion preference silently for accessibility
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setReducedMotion(e.matches);
      };

      mediaQuery.addEventListener?.('change', handleChange);
      return () => mediaQuery.removeEventListener?.('change', handleChange);
    }
  }, []);

  useEffect(() => {
    // Synchronize browser history and hash changes for deep linking
    const handleHashChange = () => {
      if (typeof window !== 'undefined') {
        if (window.location.hash === '#space-imagery') {
          setViewMode('space-imagery');
        } else {
          setViewMode('landing');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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
      setViewMode('space-imagery');
      if (typeof window !== 'undefined') {
        window.location.hash = 'space-imagery';
      }
    } else {
      setMissionControlModalOpen(true);
    }
  };

  const handleReturnHome = () => {
    setViewMode('landing');
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  if (viewMode === 'space-imagery') {
    return (
      <SpaceImageryView
        onReturnHome={handleReturnHome}
        reducedMotion={reducedMotion}
      />
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
      <Header />

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


