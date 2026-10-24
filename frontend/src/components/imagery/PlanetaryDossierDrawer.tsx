import React, { useState, useEffect } from 'react';
import {
  PlanetaryDestination,
  MissionMetadata,
  SpaceImageryItem,
} from '../../types/imagery';
import { getFeaturedImagery, searchImagery } from '../../api/imageryApi';
import { RoverShowcase } from './RoverShowcase';
import { PlanetVisual } from './PlanetVisual';
import { SignatureStar } from '../common/CelestialIcons';
import {
  Sparkles,
  ArrowRight,
  Eye,
  RefreshCw,
  AlertCircle,
  Filter,
  X,
  Compass,
  CheckCircle2,
} from 'lucide-react';

interface PlanetaryDossierDrawerProps {
  destination: PlanetaryDestination | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenArchive: (destination: PlanetaryDestination, query?: string) => void;
  onSelectImage: (item: SpaceImageryItem) => void;
}

// Environmental visual color palette & atmospheric glow matching each celestial body
const DESTINATION_THEMES: Record<string, {
  accentColor: string;
  glowColor: string;
  bgGradient: string;
  cardBorder: string;
}> = {
  sun: {
    accentColor: 'var(--color-star-warm)',
    glowColor: 'rgba(245, 158, 11, 0.40)',
    bgGradient: 'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.28) 0%, rgba(245, 158, 11, 0.12) 45%, rgba(20, 12, 4, 0.6) 80%, rgba(10, 14, 22, 0.95) 100%)',
    cardBorder: 'rgba(245, 158, 11, 0.35)',
  },
  mercury: {
    accentColor: '#a8a29e',
    glowColor: 'rgba(168, 162, 158, 0.25)',
    bgGradient: 'radial-gradient(circle at 50% 50%, rgba(168, 162, 158, 0.22) 0%, rgba(120, 113, 108, 0.10) 45%, rgba(10, 9, 8, 0.6) 80%, rgba(10, 14, 22, 0.95) 100%)',
    cardBorder: 'rgba(168, 162, 158, 0.25)',
  },
  venus: {
    accentColor: '#fde68a',
    glowColor: 'rgba(227, 187, 123, 0.35)',
    bgGradient: 'radial-gradient(circle at 50% 50%, rgba(253, 230, 138, 0.26) 0%, rgba(227, 187, 123, 0.12) 45%, rgba(16, 12, 5, 0.6) 80%, rgba(10, 14, 22, 0.95) 100%)',
    cardBorder: 'rgba(227, 187, 123, 0.30)',
  },
  earth: {
    accentColor: 'var(--color-earth-cyan)',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    bgGradient: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.26) 0%, rgba(37, 99, 235, 0.14) 45%, rgba(4, 8, 22, 0.6) 80%, rgba(10, 14, 22, 0.95) 100%)',
    cardBorder: 'rgba(56, 189, 248, 0.30)',
  },
  mars: {
    accentColor: '#f97316',
    glowColor: 'rgba(234, 88, 12, 0.35)',
    bgGradient: 'radial-gradient(circle at 50% 50%, rgba(234, 88, 12, 0.28) 0%, rgba(194, 65, 12, 0.14) 45%, rgba(16, 7, 5, 0.6) 80%, rgba(10, 14, 22, 0.95) 100%)',
    cardBorder: 'rgba(234, 88, 12, 0.32)',
  },
  jupiter: {
    accentColor: '#fbbf24',
    glowColor: 'rgba(201, 144, 57, 0.35)',
    bgGradient: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.26) 0%, rgba(201, 144, 57, 0.12) 45%, rgba(16, 10, 5, 0.6) 80%, rgba(10, 14, 22, 0.95) 100%)',
    cardBorder: 'rgba(201, 144, 57, 0.30)',
  },
  saturn: {
    accentColor: '#fde047',
    glowColor: 'rgba(226, 191, 125, 0.35)',
    bgGradient: 'radial-gradient(circle at 50% 50%, rgba(254, 240, 138, 0.25) 0%, rgba(217, 119, 6, 0.12) 45%, rgba(16, 13, 7, 0.6) 80%, rgba(10, 14, 22, 0.95) 100%)',
    cardBorder: 'rgba(226, 191, 125, 0.30)',
  },
  uranus: {
    accentColor: '#38bdf8',
    glowColor: 'rgba(112, 214, 255, 0.35)',
    bgGradient: 'radial-gradient(circle at 50% 50%, rgba(125, 211, 252, 0.26) 0%, rgba(56, 189, 248, 0.12) 45%, rgba(4, 14, 24, 0.6) 80%, rgba(10, 14, 22, 0.95) 100%)',
    cardBorder: 'rgba(112, 214, 255, 0.30)',
  },
  neptune: {
    accentColor: '#60a5fa',
    glowColor: 'rgba(59, 130, 246, 0.38)',
    bgGradient: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.28) 0%, rgba(29, 78, 216, 0.14) 45%, rgba(3, 6, 24, 0.6) 80%, rgba(10, 14, 22, 0.95) 100%)',
    cardBorder: 'rgba(59, 130, 246, 0.32)',
  },
};

export const PlanetaryDossierDrawer: React.FC<PlanetaryDossierDrawerProps> = ({
  destination,
  isOpen,
  onClose,
  onOpenArchive,
  onSelectImage,
}) => {
  const [selectedMission, setSelectedMission] = useState<MissionMetadata | null>(null);
  const [curatedItems, setCuratedItems] = useState<SpaceImageryItem[]>([]);
  const [curatedLoading, setCuratedLoading] = useState<boolean>(false);
  const [curatedError, setCuratedError] = useState<string | null>(null);

  useEffect(() => {
    if (!destination || !isOpen) return;
    setSelectedMission(null);
    loadCuratedImages(destination.id);
  }, [destination?.id, isOpen]);

  useEffect(() => {
    if (!destination || !isOpen) return;
    if (selectedMission && selectedMission.primarySearchQuery) {
      loadMissionImages(selectedMission.primarySearchQuery);
    } else {
      loadCuratedImages(destination.id);
    }
  }, [selectedMission]);

  const loadCuratedImages = (destId: string) => {
    setCuratedLoading(true);
    setCuratedError(null);
    getFeaturedImagery(destId)
      .then((res) => {
        setCuratedItems(res.items.slice(0, 4));
        setCuratedLoading(false);
      })
      .catch((err) => {
        setCuratedError(err.message || 'Unable to retrieve curated imagery.');
        setCuratedLoading(false);
      });
  };

  const loadMissionImages = (query: string) => {
    setCuratedLoading(true);
    setCuratedError(null);
    searchImagery({ query, pageSize: 4 })
      .then((res) => {
        setCuratedItems(res.items.slice(0, 4));
        setCuratedLoading(false);
      })
      .catch((err) => {
        setCuratedError(err.message || 'Unable to retrieve mission imagery.');
        setCuratedLoading(false);
      });
  };

  const handleSelectMissionCard = (mission: MissionMetadata) => {
    if (selectedMission?.missionCode === mission.missionCode) {
      setSelectedMission(null);
    } else {
      setSelectedMission(mission);
    }
  };

  if (!destination || !isOpen) return null;

  const destKey = destination.id.toLowerCase();
  const isSun = destKey === 'sun';
  const theme = DESTINATION_THEMES[destKey] || DESTINATION_THEMES.sun;

  return (
    <div
      className="astra-dossier-overlay-backdrop"
      data-testid={`dossier-overlay-${destKey}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 1. LEFT-STAGE: INTERACTIVE 3D CELESTIAL WORLD (Fills generous left-side screen space) */}
      <div
        className="astra-dossier-left-stage"
        data-testid={`dossier-stage-${destKey}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="astra-dossier-stage-glow-backdrop"
          style={{ background: theme.bgGradient }}
        />
        <div
          className="astra-dossier-stage-visual-box"
          data-testid={`dossier-miniature-${destKey}`}
        >
          <PlanetVisual
            destinationId={destination.id}
            name={destination.name}
            type={destination.type}
            isExpanded={true}
          />
        </div>
        <div className="astra-dossier-stage-hud">
          <div className="astra-dossier-stage-tag" style={{ borderColor: theme.cardBorder }}>
            <span
              className="astra-hud-pulse"
              style={{ background: theme.accentColor, boxShadow: `0 0 10px ${theme.accentColor}` }}
            />
            <span style={{ color: theme.accentColor, fontWeight: 600 }}>
              {destination.name.toUpperCase()}
            </span>
            <span style={{ color: 'var(--color-text-ghost)' }}>// INTERACTIVE 3D VIEW</span>
          </div>
          <span className="astra-dossier-stage-hint">
            DRAG TO ROTATE & FIDDLE WITH CELESTIAL BODY
          </span>
        </div>
      </div>

      {/* 2. RIGHT-SIDE: VERIFIED EXPLORATION DOSSIER PANEL */}
      <div className="astra-dossier-overlay-panel" role="dialog" aria-modal="true" aria-label={`${destination.name} Exploration Dossier`}>
        {/* TOP BAR WITH CLOSE ACTION */}
        <div className="astra-dossier-panel-header">
          <div className="astra-classification-row">
            <SignatureStar
              size={12}
              color={theme.accentColor}
            />
            <span className="astra-classification-text" style={{ color: theme.accentColor }}>
              {destination.orbitalOrder === 0
                ? '[ 00 // CENTRAL STAR // SOLAR SYSTEM CORONA ]'
                : `[ 0${destination.orbitalOrder} // ${destination.type.replace('_', ' ')} // ${destination.name.toUpperCase()} SYSTEM ]`}
            </span>
          </div>

          <button
            onClick={onClose}
            className="astra-collapse-pill-btn"
            data-testid={`collapse-world-${destKey}`}
            aria-label="Close dossier and return to planetary journey"
          >
            <X size={14} />
            <span>CLOSE DOSSIER [ESC]</span>
          </button>
        </div>

        {/* HERO BRIEFING: EDITORIAL INFO & VERIFIED METRICS (Picture moved to generous left stage) */}
        <div
          className="astra-dossier-hero-briefing"
          style={{
            borderColor: theme.cardBorder,
          }}
        >
          <h2 className="astra-dossier-panel-title">{destination.name} Exploration Dossier</h2>
          <p className="astra-world-summary">
            {destination.summary}
          </p>

          <div className="astra-dossier-telemetry-strip">
            <span className="astra-metric-pill">
              <Compass size={11} />
              <span>{destination.historicalMissions?.length || 0} VERIFIED MISSIONS</span>
            </span>
            {destination.activeRovers && destination.activeRovers.length > 0 && (
              <span className="astra-metric-pill">
                <CheckCircle2 size={11} color="var(--color-nominal)" />
                <span>{destination.activeRovers.length} SURFACE ROVERS</span>
              </span>
            )}
            <span className="astra-metric-pill">
              <span>CLASSIFICATION: {destination.type.replace('_', ' ')}</span>
            </span>
            {destination.sourceAttribution && (
              <span className="astra-metric-pill">
                <span style={{ color: theme.accentColor }}>SOURCE: {destination.sourceAttribution}</span>
              </span>
            )}
          </div>
        </div>

        {/* 1. BOXED MISSION DOSSIER CARDS */}
        {destination.historicalMissions && destination.historicalMissions.length > 0 && (
          <section className="astra-dossier-section">
            <div className="astra-dossier-section-header">
              <h3 className="astra-dossier-heading">
                {isSun ? 'HELIOPHYSICS OBSERVATIONAL FLEET' : 'VERIFIED EXPLORATION MISSIONS'}
              </h3>
              <span className="astra-dossier-subheading">
                Select a mission card to filter curated imagery
              </span>
            </div>

            <div className="astra-mission-cards-grid">
              {destination.historicalMissions.map((m) => {
                const isOp = m.operationalStatus === 'OPERATIONAL';
                const isSelected = selectedMission?.missionCode === m.missionCode;

                return (
                  <div
                    key={m.missionCode}
                    className={`astra-boxed-mission-card ${isOp ? 'is-operational' : 'is-completed'} ${
                      isSelected ? 'is-selected' : ''
                    }`}
                    onClick={() => handleSelectMissionCard(m)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Mission: ${m.missionName}, ${isOp ? 'Active' : 'Completed'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectMissionCard(m);
                      }
                    }}
                  >
                    <div className="astra-card-top-row">
                      <span className="astra-mission-code-badge">{m.missionCode}</span>
                      <span
                        className={`astra-status-badge ${
                          isOp ? 'status-active' : 'status-completed'
                        }`}
                      >
                        <span className="astra-status-pulse-dot" />
                        <span>{isOp ? 'ACTIVE' : 'COMPLETED'}</span>
                      </span>
                    </div>

                    <h4 className="astra-mission-card-title">{m.missionName}</h4>

                    <div className="astra-mission-agency-meta">
                      <span>{m.operatorAgency}</span>
                      <span>&middot;</span>
                      <span>Launch {m.launchYear}</span>
                    </div>

                    <p className="astra-mission-card-description">{m.description}</p>

                    <div className="astra-mission-card-footer">
                      <span className="astra-filter-indicator">
                        {isSelected ? (
                          <span style={{ color: 'var(--color-star-warm)' }}>
                            &bull; FILTER ACTIVE
                          </span>
                        ) : (
                          <span>Click to filter imagery</span>
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenArchive(destination, m.primarySearchQuery);
                        }}
                        className="astra-inspect-archive-chip"
                        aria-label={`Open ${m.missionName} archive`}
                      >
                        <span>Archive</span>
                        <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 2. ACTIVE SURFACE ROVERS (Mars) */}
        {destination.activeRovers && destination.activeRovers.length > 0 && (
          <section className="astra-dossier-section">
            <div className="astra-dossier-section-header">
              <h3 className="astra-dossier-heading">SURFACE EXPLORATION ROVERS</h3>
              <span className="astra-dossier-subheading">Active and legacy surface robotics</span>
            </div>
            <RoverShowcase
              rovers={destination.activeRovers}
              onSearchRover={(query) => onOpenArchive(destination, query)}
            />
          </section>
        )}

        {/* 3. CURATED NASA SCIENTIFIC IMAGERY STRIP */}
        <section className="astra-dossier-section">
          <div className="astra-dossier-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 className="astra-dossier-heading">CURATED NASA SCIENTIFIC IMAGERY</h3>
              {selectedMission && (
                <span className="astra-active-filter-badge">
                  <Filter size={10} />
                  <span>Filtered: {selectedMission.missionName}</span>
                  <button
                    onClick={() => setSelectedMission(null)}
                    className="astra-clear-filter-btn"
                    aria-label="Clear mission filter"
                  >
                    &times;
                  </button>
                </span>
              )}
            </div>
            <span className="astra-dossier-subheading">
              High-resolution verified imagery from NASA Media Gateway
            </span>
          </div>

          {curatedLoading && (
            <div className="astra-curated-skeleton-row">
              <div className="astra-skeleton" style={{ height: '160px', borderRadius: '4px' }} />
              <div className="astra-skeleton" style={{ height: '160px', borderRadius: '4px' }} />
              <div className="astra-skeleton" style={{ height: '160px', borderRadius: '4px' }} />
              <div className="astra-skeleton" style={{ height: '160px', borderRadius: '4px' }} />
            </div>
          )}

          {curatedError && (
            <div className="astra-error-banner" style={{ margin: '16px 0' }}>
              <AlertCircle size={15} color="var(--color-critical)" />
              <span>{curatedError}</span>
              <button
                onClick={() =>
                  selectedMission
                    ? loadMissionImages(selectedMission.primarySearchQuery)
                    : loadCuratedImages(destination.id)
                }
                className="astra-retry-btn"
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {!curatedLoading && !curatedError && curatedItems.length === 0 && (
            <p className="astra-empty-curated-msg">
              No curated images returned for this filter.
            </p>
          )}

          {!curatedLoading && curatedItems.length > 0 && (
            <div className="astra-curated-images-row">
              {curatedItems.map((item) => (
                <div
                  key={item.nasaId}
                  className="astra-curated-image-card"
                  onClick={() => onSelectImage(item)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${item.title}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectImage(item);
                    }
                  }}
                >
                  <div className="astra-curated-img-wrap">
                    <img
                      src={item.thumbnailUrl || ''}
                      alt={item.title}
                      className="astra-curated-img"
                      loading="lazy"
                    />
                    <span className="astra-curated-badge">{item.nasaId}</span>
                    <div className="astra-curated-hover-overlay">
                      <Eye size={14} />
                      <span>INSPECT</span>
                    </div>
                  </div>
                  <div className="astra-curated-meta">
                    <span className="astra-curated-title" title={item.title}>
                      {item.title}
                    </span>
                    <span className="astra-curated-center">{item.center || 'NASA'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. FULL REPOSITORY ARCHIVE CTA & PRESETS */}
        <div className="astra-dossier-footer-zone">
          <button
            onClick={() => onOpenArchive(destination)}
            className="astra-stage-imagery-btn"
            data-testid={`explore-imagery-${destination.id.toLowerCase()}`}
          >
            <Sparkles size={14} />
            <span>EXPLORE FULL {destination.name.toUpperCase()} ARCHIVE</span>
          </button>

          {destination.presetQueries && destination.presetQueries.length > 0 && (
            <div className="astra-anchor-presets">
              <span className="astra-presets-label">SCIENTIFIC PRESETS:</span>
              <div className="astra-presets-pills">
                {destination.presetQueries.map((q) => (
                  <button
                    key={q}
                    onClick={() => onOpenArchive(destination, q)}
                    className="astra-stage-preset-pill"
                  >
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
