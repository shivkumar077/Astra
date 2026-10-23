import React, { useState, useEffect } from 'react';
import { Header } from './components/ui/Header';
import { HeroSection } from './components/ui/HeroSection';
import { Footer } from './components/ui/Footer';
import { EarthCanvas } from './components/earth/EarthCanvas';
import { EntryModal, DestinationType } from './components/ui/EntryModal';

export const App: React.FC = () => {
  const [selectedDestination, setSelectedDestination] = useState<DestinationType | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    // Detect system reduced motion preference
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

  const handleToggleReducedMotion = () => {
    setReducedMotion((prev) => !prev);
  };

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
      <Header
        reducedMotion={reducedMotion}
        onToggleReducedMotion={handleToggleReducedMotion}
      />

      <HeroSection
        scrollProgress={scrollProgress}
        reducedMotion={reducedMotion}
        onSelectDestination={setSelectedDestination}
      />

      <Footer />

      {/* Destination Preview Briefing Modal */}
      <EntryModal
        destination={selectedDestination}
        onClose={() => setSelectedDestination(null)}
      />
    </div>
  );
};

export default App;

