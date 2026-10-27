import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle, Shuffle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { SignatureStar } from '../common/CelestialIcons';
import { NasaArchiveItem, NasaArchiveCategory, NasaCategoryFilter } from '../../types/nasaArchive';
import { fetchNasaArchiveItems } from '../../api/nasaArchiveApi';
import { NasaArchiveModal } from './NasaArchiveModal';
import '../../styles/nasaArchive.css';

interface NasaArchiveViewProps {
  onReturnHome: () => void;
  reducedMotion?: boolean;
}

const CATEGORY_TERMS: Record<NasaArchiveCategory, string[]> = {
  all: ['deep space', 'nebula', 'galaxy', 'hubble', 'webb', 'supernova'],
  nebula: ['nebula', 'carina nebula', 'crab nebula', 'orion nebula'],
  galaxy: ['galaxy', 'andromeda', 'spiral galaxy'],
  planetary: ['jupiter', 'saturn', 'mars', 'earth', 'europa'],
  spacecraft: ['spacecraft', 'voyager', 'curiosity rover', 'apollo'],
};

const CATEGORIES: NasaCategoryFilter[] = [
  { id: 'all', label: 'All Observations', query: 'deep space' },
  { id: 'nebula', label: 'Nebulae & Stars', query: 'nebula' },
  { id: 'galaxy', label: 'Deep Galaxies', query: 'galaxy' },
  { id: 'planetary', label: 'Planets & Moons', query: 'jupiter' },
  { id: 'spacecraft', label: 'Spacecraft & Probes', query: 'spacecraft' },
];

export const NasaArchiveView: React.FC<NasaArchiveViewProps> = ({
  onReturnHome,
  reducedMotion: _reducedMotion = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<NasaArchiveCategory>('all');
  const [items, setItems] = useState<NasaArchiveItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<NasaArchiveItem | null>(null);
  const [utcTime, setUtcTime] = useState<string>('');

  // Always reset scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Real-time UTC telemetry clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yr = now.getUTCFullYear();
      const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
      const da = String(now.getUTCDate()).padStart(2, '0');
      const hr = String(now.getUTCHours()).padStart(2, '0');
      const mi = String(now.getUTCMinutes()).padStart(2, '0');
      const sc = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${yr}.${mo}.${da} — ${hr}:${mi}:${sc} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedItem) {
          setSelectedItem(null);
        } else {
          onReturnHome();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, onReturnHome]);

  const loadArchive = useCallback(
    async (category: NasaArchiveCategory, forceRandomize = false) => {
      setLoading(true);
      setError(null);
      const terms = CATEGORY_TERMS[category] || ['deep space'];
      const query = forceRandomize
        ? terms[Math.floor(Math.random() * terms.length)]
        : (CATEGORIES.find((c) => c.id === category)?.query || terms[0]);

      try {
        const results = await fetchNasaArchiveItems(query, forceRandomize);
        setItems(results);
      } catch (err: any) {
        console.warn('NASA archive sync notice:', err);
        setError(
          err.message || 'Unable to establish connection with NASA Image and Video Library gateway.'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load initial collection on mount or category change
  useEffect(() => {
    loadArchive(selectedCategory, false);
  }, [selectedCategory, loadArchive]);

  const handleRandomize = () => {
    loadArchive(selectedCategory, true);
  };

  return (
    <div className="astra-nasa-root" data-testid="nasa-archive-view">
      {/* 1. STICKY COMMAND HEADER */}
      <header className="astra-nasa-header" data-testid="nasa-header">
        <div className="astra-nasa-header-left">
          <button
            onClick={onReturnHome}
            className="astra-minimal-return-btn"
            style={{ position: 'static' }}
            aria-label="Return to ASTRA Command Console"
            data-testid="nasa-return-home-btn"
            title="Return to ASTRA [Esc]"
          >
            <ArrowLeft size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SignatureStar size={11} color="var(--color-star-warm)" strokeWidth={1.5} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
              }}
            >
              [ NASA OBSERVATIONAL IMAGE ARCHIVE // PUBLIC GATEWAY ]
            </span>
          </div>
        </div>

        <div className="astra-nasa-header-right">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            {utcTime || 'SYNCHRONIZING UTC...'}
          </span>
        </div>
      </header>

      {/* 2. MAIN GALLERY WORKSPACE */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '24px 32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Editorial Heading Section */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--color-earth-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={12} color="var(--color-earth-cyan)" />
            <span>DYNAMIC DEEP SPACE IMAGERY</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 600,
              letterSpacing: '0.03em',
              color: 'var(--color-text-display)',
              margin: 0,
              lineHeight: 1.15,
            }}
            data-testid="nasa-archive-title"
          >
            NASA IMAGE ARCHIVE
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '13.5px',
              lineHeight: 1.6,
              color: 'var(--color-text-muted)',
              maxWidth: '720px',
              margin: 0,
            }}
          >
            A curated, dynamically randomized collection of astronomical photography sourced directly
            from the NASA Image and Video Library. Explore authentic nebulae, galaxies, planetary encounters,
            and space exploration missions.
          </p>
        </section>

        {/* Category Controls & Randomize Trigger */}
        <section className="astra-nasa-controls-bar" aria-label="Archive filters and controls">
          <div className="astra-nasa-categories" role="tablist" aria-label="Archive Categories">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`astra-nasa-cat-btn ${isActive ? 'active' : ''}`}
                  role="tab"
                  aria-selected={isActive}
                  data-testid={`category-tab-${cat.id}`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleRandomize}
            disabled={loading}
            className="astra-nasa-randomize-btn"
            data-testid="nasa-randomize-btn"
            aria-label="Randomize and refresh archive selection"
          >
            <Shuffle size={14} />
            <span>RANDOMIZE ARCHIVE</span>
          </button>
        </section>

        {/* Loading State: Skeletons */}
        {loading && (
          <div className="astra-nasa-grid" data-testid="nasa-loading-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="astra-nasa-skeleton-card">
                <div className="astra-nasa-skeleton-media" />
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ width: '40%', height: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '2px' }} />
                  <div style={{ width: '80%', height: '16px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px' }} />
                  <div style={{ width: '100%', height: '12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State with Retry Button (Never black screen) */}
        {!loading && error && (
          <div className="astra-nasa-error-banner" data-testid="nasa-error-banner">
            <AlertCircle size={32} color="#f87171" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h3
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  letterSpacing: '0.1em',
                  color: '#f87171',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                GATEWAY CONNECTION ANOMALY
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  margin: 0,
                  maxWidth: '480px',
                }}
              >
                {error}
              </p>
            </div>

            <button
              onClick={() => loadArchive(selectedCategory, true)}
              className="astra-nasa-randomize-btn"
              style={{ marginTop: '8px' }}
              data-testid="nasa-retry-btn"
            >
              <RefreshCw size={14} />
              <span>RETRY ARCHIVE SYNC</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="astra-nasa-error-banner" data-testid="nasa-empty-state">
            <ImageIcon size={32} color="var(--color-text-muted)" />
            <h3
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                letterSpacing: '0.1em',
                color: 'var(--color-text-muted)',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              NO ARCHIVE IMAGERY RECORDS RETURNED
            </h3>
            <button
              onClick={() => loadArchive(selectedCategory, true)}
              className="astra-nasa-randomize-btn"
              data-testid="nasa-empty-retry-btn"
            >
              <RefreshCw size={14} />
              <span>RELOAD ARCHIVE</span>
            </button>
          </div>
        )}

        {/* Populated Real NASA Archive Gallery */}
        {!loading && !error && items.length > 0 && (
          <div className="astra-nasa-grid" data-testid="nasa-image-grid">
            {items.map((item) => (
              <button
                key={item.nasaId}
                onClick={() => setSelectedItem(item)}
                className="astra-nasa-card"
                data-testid={`nasa-card-${item.nasaId}`}
                aria-label={`Inspect ${item.title}`}
              >
                <div className="astra-nasa-card-media">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="astra-nasa-card-img"
                    loading="lazy"
                    onError={(e) => {
                      // Prevent broken image display
                      (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                    }}
                  />
                </div>

                <div className="astra-nasa-card-content">
                  <div className="astra-nasa-card-meta">
                    <span>{item.center || 'NASA'}</span>
                    <span>{item.dateCreated ? item.dateCreated.substring(0, 10).replace(/-/g, '.') : ''}</span>
                  </div>

                  <h3 className="astra-nasa-card-title">{item.title}</h3>
                  <p className="astra-nasa-card-desc">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* 3. IMAGE INSPECTION MODAL */}
      <NasaArchiveModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
};
