import React, { useEffect, useState, useRef } from 'react';
import { PlanetaryDestination, SpaceImageryItem, SpaceImagerySearchResult } from '../../types/imagery';
import { getPlanetaryDestinations, searchImagery } from '../../api/imageryApi';
import { SolarSystemNavigator } from './SolarSystemNavigator';
import { PlanetaryScrollSection } from './PlanetaryScrollSection';
import { PlanetaryDossierDrawer } from './PlanetaryDossierDrawer';
import { DedicatedImageryDrawer } from './DedicatedImageryDrawer';
import { ImageDetailModal } from './ImageDetailModal';
import { preloadPlanetaryTexture } from './PlanetTextureGenerator';
import { ArrowLeft, Search, RefreshCw, AlertCircle, Eye, X } from 'lucide-react';

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

  // Compact Scientific Instrument Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SpaceImagerySearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPanelOpen, setSearchPanelOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

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
        } else if (searchPanelOpen) {
          setSearchPanelOpen(false);
        } else if (dossierOpen) {
          setDossierOpen(false);
        } else {
          onReturnHome();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, drawerOpen, searchPanelOpen, dossierOpen, onReturnHome]);

  // -------------------------------------------------------------
  // CONTINUOUS SCROLL MONITORING & CINEMATIC 3-PHASE INTERPOLATION
  // (Direct GPU-composited DOM updates: zero React re-render lag)
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
            const bgProgress = Math.max(0.0, Math.min(1.0, 1.0 - dist / (vh * 0.75)));
            bgEl.style.opacity = `${bgProgress.toFixed(3)}`;
          }

          // 2. Direct GPU transform/opacity updates for 3D visual model & Celestial Disintegration
          const visualEl = el.querySelector<HTMLElement>('.astra-planet-visual-root');
          if (visualEl) {
            if (reducedMotion) {
              visualEl.style.transform = 'none';
              visualEl.style.opacity = dist < vh * 0.7 ? '1.0' : '0.2';
              if (typeof (visualEl as any).__setDisintegration === 'function') {
                (visualEl as any).__setDisintegration(0.0);
              }
            } else {
              // 3-Phase Cinematic Choreography: Departure, Celestial Passage, Arrival
              const normDist = Math.min(1.0, dist / (vh * 0.75));
              const progress = Math.max(0.0, 1.0 - normDist);

              const isDeparting = centerOffset < 0; // scrolled past, moving upwards

              // Extravagant Celestial Disintegration ("poof, like disintegrate like that")
              if (typeof (visualEl as any).__setDisintegration === 'function') {
                const disProg = isDeparting ? Math.min(1.0, Math.max(0.0, (normDist - 0.08) / 0.58)) : 0.0;
                (visualEl as any).__setDisintegration(disProg);
              }

              const yOffset = isDeparting ? -28 * normDist : 28 * normDist;
              const zOffset = -140 * Math.pow(normDist, 1.3); // Authentic 3D depth recession/emergence
              const scale = 0.52 + 0.48 * Math.pow(progress, 1.4);
              const opacity = Math.min(1.0, progress * 1.35);

              visualEl.style.transform = `translate3d(0, ${yOffset.toFixed(1)}px, ${zOffset.toFixed(1)}px) scale(${scale.toFixed(3)})`;
              visualEl.style.opacity = `${opacity.toFixed(3)}`;
            }
          }

          // 3. Editorial briefing text subtle depth parallax
          const briefingEl = el.querySelector<HTMLElement>('.astra-stage-briefing');
          if (briefingEl) {
            if (reducedMotion) {
              briefingEl.style.opacity = dist < vh * 0.6 ? '1.0' : '0.4';
              briefingEl.style.transform = 'none';
            } else {
              const briefProgress = Math.max(0.0, 1.0 - Math.min(1.0, dist / (vh * 0.65)));
              const yShift = (centerOffset < 0 ? -18 : 18) * (1.0 - briefProgress);
              briefingEl.style.opacity = `${briefProgress.toFixed(3)}`;
              briefingEl.style.transform = `translate3d(0, ${yShift.toFixed(1)}px, 0)`;
            }
          }
        });

        // 4. Interstellar passage shimmer/ripple (peaks between destinations)
        if (passageOverlayRef.current) {
          if (reducedMotion) {
            passageOverlayRef.current.style.opacity = '0';
          } else {
            const passageThreshold = vh * 0.5;
            const passageRatio = Math.min(1.0, minDistance / passageThreshold);
            // Peak celestial passage shimmer midway between destinations
            const passageFactor = Math.sin(passageRatio * Math.PI) * 0.45;
            passageOverlayRef.current.style.opacity = `${passageFactor.toFixed(3)}`;
          }
        }

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

  // Jump to Celestial Destination via smooth scrolling with instant disintegration burst
  const handleSelectDestination = (destId: string) => {
    const targetKey = destId.toLowerCase();
    if (targetKey === activeDestinationIdRef.current) return;

    // Trigger instant disintegration burst on currently departing world ("poof!")
    const currentEl = document.getElementById(`destination-${activeDestinationIdRef.current}`);
    const currentVisual = currentEl?.querySelector<HTMLElement>('.astra-planet-visual-root');
    if (currentVisual && typeof (currentVisual as any).__triggerDisintegrationBurst === 'function') {
      (currentVisual as any).__triggerDisintegrationBurst();
    }

    activeDestinationIdRef.current = targetKey;
    setActiveDestinationId(targetKey);

    const element = document.getElementById(`destination-${targetKey}`);
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

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

  // Execute Compact Scientific Archive Search
  const handleExecuteSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    setSearchPanelOpen(true);

    searchImagery({ query: searchQuery.trim(), pageSize: 12 })
      .then((data) => {
        setSearchResults(data);
        setSearching(false);
      })
      .catch((err) => {
        setSearchError(err.message || 'Search request failed.');
        setSearching(false);
      });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchError(null);
    setSearchPanelOpen(false);
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

      {/* 2. CENTERED SCIENTIFIC SEARCH INSTRUMENT */}
      <header className="astra-floating-instrument-bar" role="banner">
        <form onSubmit={handleExecuteSearch} className="astra-compact-search-instrument" role="search">
          <Search size={14} className="astra-search-icon" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search NASA scientific archive (e.g. 'Curiosity selfie', 'Jupiter Red Spot')..."
            className="astra-compact-search-input"
            aria-label="Search NASA multimedia archive"
            data-testid="search-archive-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="astra-compact-clear-btn"
              aria-label="Clear query"
            >
              <X size={12} />
            </button>
          )}
          <button
            type="submit"
            className="astra-compact-submit-btn"
            data-testid="search-archive-button"
            aria-label="Dispatch NASA archive query"
          >
            DISPATCH
          </button>
        </form>

        {/* Discreet Gateway Telemetry Indicator */}
        <div className="astra-telemetry-badge" data-testid="gateway-status">
          <span className="astra-telemetry-dot" />
          <span>GATEWAY: NASA IMAGES API [CONNECTED]</span>
        </div>
      </header>

      {/* 3. COMPACT PLANETARY SIDEBAR (Synchronized with active scroll destination) */}
      {destinations.length > 0 && (
        <SolarSystemNavigator
          destinations={destinations}
          activeDestinationId={activeDestinationId}
          onSelectDestination={handleSelectDestination}
        />
      )}

      {/* 4. SEARCH RESULTS OVERLAY PANEL */}
      {searchPanelOpen && (
        <div
          className="astra-search-overlay-backdrop"
          data-testid="search-results-panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchPanelOpen(false);
          }}
        >
          <div className="astra-search-overlay-content">
            <div className="astra-search-overlay-header">
              <div>
                <span className="astra-search-tag">[ NASA ARCHIVAL QUERY RESULTS ]</span>
                <h3 className="astra-search-heading">
                  Query: "{searchResults?.query || searchQuery}"
                  {searchResults && ` (${searchResults.totalHits.toLocaleString()} records)`}
                </h3>
              </div>
              <button
                onClick={() => setSearchPanelOpen(false)}
                className="astra-drawer-close-btn"
                aria-label="Close search overlay"
              >
                <X size={16} />
                <span>CLOSE</span>
              </button>
            </div>

            {searching && (
              <div style={{ padding: '32px' }} data-testid="search-loading">
                <div className="astra-skeleton" style={{ width: '100%', height: '220px' }} />
              </div>
            )}

            {searchError && (
              <div className="astra-error-banner" style={{ margin: '24px 0' }}>
                <AlertCircle size={16} color="var(--color-critical)" />
                <span>{searchError}</span>
              </div>
            )}

            {!searching && searchResults && searchResults.items.length === 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)', padding: '24px' }}>
                No records matched your query in NASA's public media library.
              </p>
            )}

            {!searching && searchResults && searchResults.items.length > 0 && (
              <div className="astra-imagery-grid" style={{ padding: '24px 0' }}>
                {searchResults.items.map((item) => (
                  <button
                    key={item.nasaId}
                    onClick={() => setSelectedImage(item)}
                    className="astra-imagery-card"
                    aria-label={`Inspect ${item.title}`}
                  >
                    <div className="astra-card-image-wrap">
                      <img src={item.thumbnailUrl || ''} alt={item.title} className="astra-card-img" />
                      <span className="astra-card-badge">{item.nasaId}</span>
                    </div>
                    <div className="astra-card-content">
                      <span className="astra-card-title">{item.title}</span>
                      <div className="astra-card-meta">
                        <span>{item.center || 'NASA'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Eye size={11} /> Inspect
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
