import React, { useEffect, useState, useRef } from 'react';
import { PlanetaryDestination, SpaceImageryItem, SpaceImagerySearchResult } from '../../types/imagery';
import { getPlanetaryDestinations, searchImagery } from '../../api/imageryApi';
import { SolarSystemNavigator } from './SolarSystemNavigator';
import { PlanetaryScrollSection } from './PlanetaryScrollSection';
import { PlanetaryDossierDrawer } from './PlanetaryDossierDrawer';
import { DedicatedImageryDrawer } from './DedicatedImageryDrawer';
import { ImageDetailModal } from './ImageDetailModal';
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
  const [scrollScales, setScrollScales] = useState<Record<string, number>>({});

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
  // CONTINUOUS SCROLL MONITORING & SCALE-AND-FADE INTERPOLATION
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

        let closestId = activeDestinationId;
        let minDistance = Infinity;
        const newScales: Record<string, number> = {};

        destinations.forEach((dest) => {
          const el = document.getElementById(`destination-${dest.id.toLowerCase()}`);
          if (!el) {
            newScales[dest.id.toLowerCase()] = 1.0;
            return;
          }
          const rect = el.getBoundingClientRect();
          const elCenter = rect.top + rect.height * 0.5;
          const dist = Math.abs(elCenter - vCenter);

          if (dist < minDistance) {
            minDistance = dist;
            closestId = dest.id.toLowerCase();
          }

          // Continuous normalized progress: 1.0 at center, smoothly drops to 0.0 at vh away
          const progress = Math.max(0.0, Math.min(1.0, 1.0 - dist / (vh * 0.85)));
          newScales[dest.id.toLowerCase()] = progress;
        });

        setScrollScales(newScales);
        if (closestId && closestId !== activeDestinationId) {
          setActiveDestinationId(closestId);
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [destinations, activeDestinationId]);

  // Jump to Celestial Destination via smooth scrolling
  const handleSelectDestination = (destId: string) => {
    setActiveDestinationId(destId.toLowerCase());
    const element = document.getElementById(`destination-${destId.toLowerCase()}`);
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  // Open Expanded Exploration Dossier for a Destination
  const handleOpenDossier = (dest: PlanetaryDestination) => {
    setDossierDestination(dest);
    setDossierOpen(true);
  };

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

  const currentGradient =
    ATMOSPHERIC_GRADIENTS[activeDestinationId.toLowerCase()] || ATMOSPHERIC_GRADIENTS.sun;

  return (
    <div
      className="astra-solar-journey-root"
      data-testid="space-imagery-view"
      style={{
        background: currentGradient,
        transition: reducedMotion ? 'none' : 'background 700ms ease',
      }}
    >
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
              scaleProgress={scrollScales[dest.id.toLowerCase()] ?? 1.0}
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
