import React, { useEffect, useState, useRef } from 'react';
import { PlanetaryDestination, SpaceImageryItem, SpaceImagerySearchResult } from '../../types/imagery';
import { getPlanetaryDestinations, searchImagery } from '../../api/imageryApi';
import { SolarSystemNavigator } from './SolarSystemNavigator';
import { PlanetarySection } from './PlanetarySection';
import { ImageDetailModal } from './ImageDetailModal';
import { SignatureStar } from '../common/CelestialIcons';
import { ArrowLeft, Search, RefreshCw, AlertCircle, Eye } from 'lucide-react';

interface SpaceImageryViewProps {
  onReturnHome: () => void;
  reducedMotion?: boolean;
}

export const SpaceImageryView: React.FC<SpaceImageryViewProps> = ({
  onReturnHome,
  reducedMotion = false,
}) => {
  const [destinations, setDestinations] = useState<PlanetaryDestination[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeDestinationId, setActiveDestinationId] = useState<string>('sun');
  const [selectedImage, setSelectedImage] = useState<SpaceImageryItem | null>(null);

  // Free-form global search across NASA archives
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SpaceImagerySearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  // Handle global Escape key to return home when no modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !selectedImage) {
        onReturnHome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, onReturnHome]);

  // Destination Jump Scrolling
  const handleSelectDestination = (destId: string) => {
    setActiveDestinationId(destId);
    const element = document.getElementById(`destination-${destId.toLowerCase()}`);
    if (element) {
      element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  // Global NASA Archive Search
  const handleExecuteSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
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
  };

  return (
    <div
      className="astra-imagery-root"
      data-testid="space-imagery-view"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'var(--color-void)',
      }}
    >
      {/* 1. APEX HEADER & RETURN BUTTON */}
      <header className="astra-imagery-topbar">
        <div className="astra-imagery-nav-brand">
          <button
            onClick={onReturnHome}
            className="astra-return-btn"
            aria-label="Return to ASTRA landing interface"
            data-testid="return-to-landing"
          >
            <ArrowLeft size={14} />
            <span>RETURN TO ASTRA</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
            <SignatureStar size={13} color="var(--color-star-warm)" />
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'var(--color-text-display)',
                textTransform: 'uppercase',
              }}
            >
              SPACE IMAGERY & MISSION ARCHIVE
            </span>
          </div>
        </div>

        {/* Telemetry Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="astra-gateway-pill" data-testid="gateway-status">
            <span className="astra-gateway-pill-dot" />
            <span>GATEWAY: NASA IMAGES API [CONNECTED]</span>
          </div>
        </div>
      </header>

      {/* 2. SOLAR SYSTEM ORBITAL NAVIGATOR */}
      {destinations.length > 0 && (
        <SolarSystemNavigator
          destinations={destinations}
          activeDestinationId={activeDestinationId}
          onSelectDestination={handleSelectDestination}
        />
      )}

      {/* 3. HEROIC INTRODUCTORY STAGE */}
      <section className="astra-imagery-hero">
        <div className="astra-hero-lead-tag">
          <SignatureStar size={12} color="var(--color-earth-cyan)" />
          <span>ASTRA OBSERVATIONAL TELEMETRY // MULTI-SPECTRAL ARCHIVE</span>
        </div>

        <h1 className="astra-imagery-title">The Solar System Exploration Journey</h1>

        <p className="astra-imagery-subtitle">
          Interrogate real, high-resolution scientific photography from NASA’s deep-space archives.
          Traverse our celestial neighborhood from the Sun through the outer ice giants, discovering historical
          orbiters, surface exploration rovers, and multi-spectral imaging datasets.
        </p>

        {/* Free-form archive search container */}
        <form onSubmit={handleExecuteSearch} className="astra-search-container" role="search">
          <Search size={16} color="var(--color-text-ghost)" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all NASA archives (e.g. 'Curiosity selfie', 'Jupiter Great Red Spot', 'James Webb NIRCam')..."
            className="astra-search-input"
            aria-label="Search NASA multimedia archive"
            data-testid="search-archive-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="astra-return-btn"
              style={{ padding: '2px 8px', fontSize: '10px' }}
            >
              CLEAR
            </button>
          )}
          <button type="submit" className="astra-search-btn" data-testid="search-archive-button">
            <span>DISPATCH QUERY</span>
          </button>
        </form>

        {/* Ad-Hoc Global Search Results Drawer */}
        {searching && (
          <div style={{ marginTop: '24px' }} data-testid="search-loading">
            <div className="astra-skeleton" style={{ width: '100%', height: '140px' }} />
          </div>
        )}

        {searchError && (
          <div className="astra-error-banner" style={{ marginTop: '24px' }}>
            <AlertCircle size={16} color="var(--color-critical)" />
            <span>{searchError}</span>
          </div>
        )}

        {searchResults && (
          <div
            style={{
              marginTop: '32px',
              padding: '24px',
              backgroundColor: 'rgba(13, 16, 22, 0.9)',
              border: '1px solid var(--color-border-active)',
              borderRadius: 'var(--radius-sm)',
            }}
            data-testid="search-results-panel"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                borderBottom: '1px solid var(--color-border-subtle)',
                paddingBottom: '10px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-earth-cyan)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Archive Query Results: "{searchResults.query}" ({searchResults.totalHits.toLocaleString()} matches)
              </span>
              <button
                onClick={handleClearSearch}
                className="astra-return-btn"
                style={{ padding: '3px 8px', fontSize: '10px' }}
              >
                CLOSE RESULTS
              </button>
            </div>

            {searchResults.items.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                No records matched your search query in NASA's repository.
              </p>
            ) : (
              <div className="astra-imagery-grid">
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
        )}
      </section>

      {/* 4. DESTINATION LOAD FAILURE / RETRY */}
      {error && (
        <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
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

      {/* 5. DESTINATIONS SKELETON LOADING */}
      {loading && (
        <div style={{ maxWidth: '1380px', margin: '40px auto', padding: '0 44px' }} data-testid="destinations-loading">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="astra-skeleton"
              style={{ width: '100%', height: '420px', marginBottom: '32px' }}
            />
          ))}
        </div>
      )}

      {/* 6. SEQUENTIAL PLANETARY JOURNEY */}
      {!loading && !error && destinations.length > 0 && (
        <div className="astra-planetary-journey" data-testid="planetary-journey">
          {destinations.map((dest) => (
            <PlanetarySection
              key={dest.id}
              destination={dest}
              onSelectImage={(item) => setSelectedImage(item)}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      )}

      {/* 7. IMAGE DETAIL MODAL OVERLAY */}
      <ImageDetailModal
        item={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
};
