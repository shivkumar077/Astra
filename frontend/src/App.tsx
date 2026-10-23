import React, { useState, useEffect } from 'react';
import { Header } from './components/ui/Header';
import { HeroSection } from './components/ui/HeroSection';
import { Footer } from './components/ui/Footer';
import { EarthCanvas } from './components/earth/EarthCanvas';
import { EntryModal, DestinationType } from './components/ui/EntryModal';

export const App: React.FC = () => {
  const [selectedDestination, setSelectedDestination] = useState<DestinationType | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

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
        overflow: 'hidden',
      }}
      data-testid="astra-app"
    >
      {/* Real-Time Rendered 3D Earth Scene (Right-Anchored Canvas) */}
      <EarthCanvas reducedMotion={reducedMotion} />

      {/* Primary Structural Layout */}
      <Header
        reducedMotion={reducedMotion}
        onToggleReducedMotion={handleToggleReducedMotion}
      />

      <HeroSection onSelectDestination={setSelectedDestination} />

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
