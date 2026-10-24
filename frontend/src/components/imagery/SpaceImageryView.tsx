import React, { useEffect, useState, useRef } from 'react';
import { PlanetaryDestination, SpaceImageryItem } from '../../types/imagery';
import { getPlanetaryDestinations } from '../../api/imageryApi';
import { SolarSystemNavigator } from './SolarSystemNavigator';
import { PlanetaryScrollSection } from './PlanetaryScrollSection';
import { PlanetaryDossierDrawer } from './PlanetaryDossierDrawer';
import { DedicatedImageryDrawer } from './DedicatedImageryDrawer';
import { ImageDetailModal } from './ImageDetailModal';
import { preloadPlanetaryTexture } from './PlanetTextureGenerator';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

interface SpaceImageryViewProps {
  onReturnHome: () => void;
  reducedMotion?: boolean;
}

// Environmental atmospheric gradient palettes for each celestial body
const ATMOSPHERIC_GRADIENTS: Record<string, string> = {
  sun: 'radial-gradient(ellipse 90% 80% at 65% 50%, rgba(251, 191, 36, 0.35) 0%, rgba(245, 158, 11, 0.20) 35%, rgba(217, 119, 6, 0.12) 60%, rgba(20, 12, 4, 0.96) 92%)',
  mercury: 'radial-gradient(ellipse 85% 75% at 65% 50%, rgba(168, 162, 158, 0.20) 0%, rgba(120, 113, 108, 0.10) 40%, rgba(41, 37, 36, 0.06) 65%, rgba(10, 9, 8, 0.96) 90%)',
  venus: 'radial-gradient(ellipse 85% 75% at 65% 50%, rgba(253, 230, 138, 0.28) 0%, rgba(245, 158, 11, 0.15) 40%, rgba(180, 83, 9, 0.08) 65%, rgba(16, 12, 5, 0.96) 90%)',
  earth: 'radial-gradient(ellipse 85% 75% at 65% 50%, rgba(56, 189, 248, 0.26) 0%, rgba(37, 99, 235, 0.15) 40%, rgba(30, 58, 138, 0.08) 65%, rgba(4, 8, 22, 0.96) 90%)',
  mars: 'radial-gradient(ellipse 85% 75% at 65% 50%, rgba(234, 88, 12, 0.30) 0%, rgba(194, 65, 12, 0.16) 40%, rgba(127, 29, 29, 0.08) 65%, rgba(16, 7, 5, 0.96) 90%)',
  jupiter: 'radial-gradient(ellipse 85% 75% at 65% 50%, rgba(245, 158, 11, 0.26) 0%, rgba(217, 119, 6, 0.14) 40%, rgba(146, 64, 14, 0.07) 65%, rgba(16, 10, 5, 0.96) 90%)',
  saturn: 'radial-gradient(ellipse 85% 75% at 65% 50%, rgba(254, 240, 138, 0.24) 0%, rgba(217, 119, 6, 0.13) 40%, rgba(161, 98, 7, 0.07) 65%, rgba(16, 13, 7, 0.96) 90%)',
  uranus: 'radial-gradient(ellipse 85% 75% at 65% 50%, rgba(125, 211, 252, 0.26) 0%, rgba(56, 189, 248, 0.13) 40%, rgba(3, 105, 161, 0.07) 65%, rgba(4, 14, 24, 0.96) 90%)',
  neptune: 'radial-gradient(ellipse 85% 75% at 65% 50%, rgba(59, 130, 246, 0.30) 0%, rgba(29, 78, 216, 0.16) 40%, rgba(30, 27, 75, 0.10) 65%, rgba(3, 6, 24, 0.96) 90%)',
};

export const SpaceImageryView: React.FC<SpaceImageryViewProps> = ({
  onReturnHome,
  reducedMotion = false,
}) => {
  const [destinations, setDestinations] = useState<PlanetaryDestination[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronized destination tracking with continuous scroll
  const [activeDestinationId, setActiveDestinationId] = useState<string>('sun');
  const activeDestinationIdRef = useRef<string>('sun');
  const passageOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeDestinationIdRef.current = activeDestinationId;
  }, [activeDestinationId]);

  // Bounded preloading: pre-generate/cache textures for adjacent destinations
  // Prevents any runtime delay when scrolling forward or backward
  useEffect(() => {
    if (destinations.length === 0) return;
    const currentIndex = destinations.findIndex(
      (d) => d.id.toLowerCase() === activeDestinationId.toLowerCase()
    );
    if (currentIndex === -1) return;

    // Preload window: current, next, next+1, and previous
    const indicesToPreload = [
      currentIndex,
      currentIndex + 1,
      currentIndex - 1,
      currentIndex + 2,
    ].filter((idx) => idx >= 0 && idx < destinations.length);

    const timer = setTimeout(() => {
      indicesToPreload.forEach((idx) => {
        preloadPlanetaryTexture(destinations[idx].id);
      });
    }, 25);

    return () => clearTimeout(timer);
  }, [activeDestinationId, destinations]);

  // Active Exploration Dossier Drawer (Triggered by clicking 3D model or explore button)
  const [dossierDestination, setDossierDestination] = useState<PlanetaryDestination | null>(null);
  const [dossierOpen, setDossierOpen] = useState<boolean>(false);

  // Single Image Inspection Modal
  const [selectedImage, setSelectedImage] = useState<SpaceImageryItem | null>(null);

  // Dedicated Archive Drawer (For multi-item search & pagination)
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerDestination, setDrawerDestination] = useState<PlanetaryDestination | null>(null);
  const [drawerQuery, setDrawerQuery] = useState<string | undefined>(undefined);

  const loadDestinations = () => {
    setLoading(true);
    setError(null);
    getPlanetaryDestinations()
      .then((data) => {
        setDestinations(data);
        if (data.length > 0) {
          setActiveDestinationId(data[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load planetary catalog from ASTRA gateway.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDestinations();
  }, []);

  // Global Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedImage) {
          setSelectedImage(null);
        } else if (drawerOpen) {
          setDrawerOpen(false);
        } else if (dossierOpen) {
          setDossierOpen(false);
        } else {
          onReturnHome();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, drawerOpen, dossierOpen, onReturnHome]);

  // Jump to Celestial Destination via direct smooth scrolling
  const handleSelectDestination = React.useCallback((destId: string) => {
    const targetKey = destId.toLowerCase();
    activeDestinationIdRef.current = targetKey;
    setActiveDestinationId(targetKey);

    const element = document.getElementById(`destination-${targetKey}`);
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }, [reducedMotion]);

  // -------------------------------------------------------------
  // CONTINUOUS SCROLL MONITORING & DIRECT VISIBILITY SYNCHRONIZATION
  // (Zero delay, always visible 3D models, smooth crossfades)
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || destinations.length === 0) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const vh = window.innerHeight;
        const vCenter = vh * 0.5;

        let closestId = activeDestinationIdRef.current;
        let minDistance = Infinity;

        destinations.forEach((dest) => {
          const normKey = dest.id.toLowerCase();
          const el = document.getElementById(`destination-${normKey}`);
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const elCenter = rect.top + rect.height * 0.5;
          const centerOffset = elCenter - vCenter;
          const dist = Math.abs(centerOffset);

          if (dist < minDistance) {
            minDistance = dist;
            closestId = normKey;
          }

          // 1. Direct GPU-composited backdrop crossfade per destination
          const bgEl = document.getElementById(`backdrop-${normKey}`);
          if (bgEl) {
            const bgProgress = Math.max(0.0, Math.min(1.0, 1.0 - dist / vh));
            bgEl.style.opacity = `${bgProgress.toFixed(3)}`;
          }

          // 2. Keep 3D visual models ALWAYS visible, never vanish or collapse
          const visualEl = el.querySelector<HTMLElement>('.astra-planet-visual-root');
          if (visualEl) {
            visualEl.style.opacity = '1.0';
            visualEl.style.transform = 'none';
          }

          // 3. Editorial briefing text always clean & legible
          const briefingEl = el.querySelector<HTMLElement>('.astra-stage-briefing');
          if (briefingEl) {
            briefingEl.style.opacity = '1.0';
            briefingEl.style.transform = 'none';
          }
        });

        // Only trigger React state update when active destination actually changes
        if (closestId && closestId !== activeDestinationIdRef.current) {
          activeDestinationIdRef.current = closestId;
          setActiveDestinationId(closestId);
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [destinations, reducedMotion]);

  // -------------------------------------------------------------
  // DIRECT DESTINATION SNAPPING CONTROLLER
  // (Instant, discrete single-step destination hopping with no runaway inertia)
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || destinations.length === 0) return;

    let isSnapping = false;
    let minLockActive = false;
    let minLockTimer: NodeJS.Timeout | null = null;
    let inertiaSettleTimer: NodeJS.Timeout | null = null;
    let touchStartY = 0;

    const snapToNext = () => {
      const currentIdx = destinations.findIndex(
        (d) => d.id.toLowerCase() === activeDestinationIdRef.current.toLowerCase()
      );
      if (currentIdx !== -1 && currentIdx < destinations.length - 1) {
        handleSelectDestination(destinations[currentIdx + 1].id);
      }
    };

    const snapToPrev = () => {
      const currentIdx = destinations.findIndex(
        (d) => d.id.toLowerCase() === activeDestinationIdRef.current.toLowerCase()
      );
      if (currentIdx > 0) {
        handleSelectDestination(destinations[currentIdx - 1].id);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Allow natural scroll inside drawers and modal overlays
      if (dossierOpen || drawerOpen || selectedImage) return;

      // Always prevent page from freely drifting or scrolling past Neptune
      e.preventDefault();

      // Extend inertia settle timer on every wheel event
      if (inertiaSettleTimer) clearTimeout(inertiaSettleTimer);
      inertiaSettleTimer = setTimeout(() => {
        if (!minLockActive) {
          isSnapping = false;
        }
      }, 220);

      // If already mid-step or within minimum lock window, ignore further step triggers
      if (isSnapping) return;

      // Filter micro-jitter
      if (Math.abs(e.deltaY) < 14) return;

      const currentIdx = destinations.findIndex(
        (d) => d.id.toLowerCase() === activeDestinationIdRef.current.toLowerCase()
      );

      if (e.deltaY > 0) {
        // Scrolling down -> jump exactly ONE planet forward (e.g. Jupiter to Saturn)
        if (currentIdx !== -1 && currentIdx < destinations.length - 1) {
          isSnapping = true;
          minLockActive = true;
          if (minLockTimer) clearTimeout(minLockTimer);
          minLockTimer = setTimeout(() => {
            minLockActive = false;
          }, 600);
          snapToNext();
        }
      } else if (e.deltaY < 0) {
        // Scrolling up -> jump exactly ONE planet backward (e.g. Saturn to Jupiter)
        if (currentIdx > 0) {
          isSnapping = true;
          minLockActive = true;
          if (minLockTimer) clearTimeout(minLockTimer);
          minLockTimer = setTimeout(() => {
            minLockActive = false;
          }, 600);
          snapToPrev();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (dossierOpen || drawerOpen || selectedImage) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        snapToNext();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        snapToPrev();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (dossierOpen || drawerOpen || selectedImage) return;
      if (e.changedTouches.length === 0) return;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;

      if (Math.abs(deltaY) < 40) return;

      if (isSnapping) return;

      if (deltaY > 0) {
        // Swiped up -> snap down to next world
        isSnapping = true;
        minLockActive = true;
        if (minLockTimer) clearTimeout(minLockTimer);
        minLockTimer = setTimeout(() => {
          minLockActive = false;
          isSnapping = false;
        }, 550);
        snapToNext();
      } else {
        // Swiped down -> snap up to previous world
        isSnapping = true;
        minLockActive = true;
        if (minLockTimer) clearTimeout(minLockTimer);
        minLockTimer = setTimeout(() => {
          minLockActive = false;
          isSnapping = false;
        }, 550);
        snapToPrev();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      if (minLockTimer) clearTimeout(minLockTimer);
      if (inertiaSettleTimer) clearTimeout(inertiaSettleTimer);
    };
  }, [destinations, dossierOpen, drawerOpen, selectedImage, handleSelectDestination]);

  // Open Expanded Exploration Dossier for a Destination
  const handleOpenDossier = React.useCallback((dest: PlanetaryDestination) => {
    setDossierDestination(dest);
    setDossierOpen(true);
  }, []);

  // Open Dedicated Imagery Archive Drawer
  const handleOpenArchive = (dest: PlanetaryDestination, query?: string) => {
    setDrawerDestination(dest);
    setDrawerQuery(query);
    setDrawerOpen(true);
  };

  return (
    <div
      className="astra-solar-journey-root"
      data-testid="space-imagery-view"
    >
      {/* 0. FIXED CELESTIAL BACKDROP STAGE (Continuous GPU-composited atmospheric interpolation) */}
      <div className="astra-celestial-backdrop-stage" aria-hidden="true">
        {destinations.map((dest) => (
          <div
            key={`backdrop-${dest.id}`}
            id={`backdrop-${dest.id.toLowerCase()}`}
            className="astra-destination-backdrop-layer"
            style={{
              background: ATMOSPHERIC_GRADIENTS[dest.id.toLowerCase()] || ATMOSPHERIC_GRADIENTS.sun,
              opacity: dest.id.toLowerCase() === activeDestinationId ? 1 : 0,
            }}
          />
        ))}
        {/* Cinematic Celestial Passage Shimmer & Ripple Overlay */}
        <div ref={passageOverlayRef} className="astra-celestial-passage-overlay" />
      </div>

      {/* 1. DISCREET CORNER RETURN ARROW */}
      <button
        onClick={onReturnHome}
        className="astra-minimal-return-btn"
        aria-label="Return to ASTRA"
        data-testid="return-to-landing"
        title="Return to ASTRA [Esc]"
      >
        <ArrowLeft size={16} />
      </button>

      {/* 2. DISCREET NASA GATEWAY TELEMETRY BADGE */}
      <div className="astra-floating-telemetry" data-testid="gateway-status">
        <span className="astra-telemetry-dot" />
        <span className="astra-telemetry-text">GATEWAY: NASA IMAGES API [CONNECTED]</span>
      </div>

      {/* 3. COMPACT PLANETARY SIDEBAR (Synchronized with active scroll destination) */}
      {destinations.length > 0 && (
        <SolarSystemNavigator
          destinations={destinations}
          activeDestinationId={activeDestinationId}
          onSelectDestination={handleSelectDestination}
        />
      )}

      {/* 5. DESTINATIONS SKELETON LOADING */}
      {loading && (
        <div style={{ maxWidth: '1200px', margin: '140px auto 40px', padding: '0 40px' }} data-testid="destinations-loading">
          <div className="astra-skeleton" style={{ width: '100%', height: '480px', marginBottom: '32px' }} />
        </div>
      )}

      {/* 6. CONNECTION ERROR BANNER */}
      {error && (
        <div style={{ maxWidth: '1000px', margin: '140px auto 40px', padding: '0 24px' }}>
          <div className="astra-error-banner" data-testid="destinations-error">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-critical)' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={loadDestinations} className="astra-return-btn">
              <RefreshCw size={13} />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. CONTINUOUS SOLAR SYSTEM SCROLL JOURNEY (Sun through Neptune) */}
      {!loading && !error && destinations.length > 0 && (
        <main className="astra-celestial-journey" data-testid="planetary-journey">
          {destinations.map((dest) => (
            <PlanetaryScrollSection
              key={dest.id}
              destination={dest}
              scaleProgress={1.0}
              onOpenDossier={handleOpenDossier}
              reducedMotion={reducedMotion}
            />
          ))}
        </main>
      )}

      {/* 8. EXPANDED PLANETARY EXPLORATION DOSSIER OVERLAY */}
      <PlanetaryDossierDrawer
        destination={dossierDestination}
        isOpen={dossierOpen}
        onClose={() => setDossierOpen(false)}
        onOpenArchive={handleOpenArchive}
        onSelectImage={(item) => setSelectedImage(item)}
      />

      {/* 9. DEDICATED NASA IMAGERY ARCHIVE DRAWER */}
      <DedicatedImageryDrawer
        destination={drawerDestination}
        activeQuery={drawerQuery}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectQuery={(q) => setDrawerQuery(q)}
        onSelectImage={(item) => setSelectedImage(item)}
      />

      {/* 10. IMAGE DETAIL MODAL OVERLAY */}
      <ImageDetailModal
        item={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
};
