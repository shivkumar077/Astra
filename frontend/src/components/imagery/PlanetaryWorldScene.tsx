import React, { useState, useEffect } from 'react';
import {
  PlanetaryDestination,
  MissionMetadata,
  SpaceImageryItem,
} from '../../types/imagery';
import { getFeaturedImagery, searchImagery } from '../../api/imageryApi';
import { PlanetVisual } from './PlanetVisual';
import { RoverShowcase } from './RoverShowcase';
import { SignatureStar } from '../common/CelestialIcons';
import {
  Sparkles,
  ChevronRight,
  Minimize2,
  ArrowRight,
  Eye,
  RefreshCw,
  AlertCircle,
  Filter,
  CheckCircle2,
  Compass,
} from 'lucide-react';

interface PlanetaryWorldSceneProps {
  destination: PlanetaryDestination;
  onOpenArchive: (destination: PlanetaryDestination, query?: string) => void;
  onSelectImage: (item: SpaceImageryItem) => void;
  reducedMotion?: boolean;
}

export const PlanetaryWorldScene: React.FC<PlanetaryWorldSceneProps> = ({
  destination,
  onOpenArchive,
  onSelectImage,
  reducedMotion = false,
}) => {
  const isSun = destination.id.toLowerCase() === 'sun';

  // Expansion State: Collapsed (Focused Planet) <-> Expanded (Mission Dossiers & Curated Gallery)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Active mission filter for curated imagery
  const [selectedMission, setSelectedMission] = useState<MissionMetadata | null>(null);

  // Curated imagery items (3-4 items)
  const [curatedItems, setCuratedItems] = useState<SpaceImageryItem[]>([]);
  const [curatedLoading, setCuratedLoading] = useState<boolean>(false);
  const [curatedError, setCuratedError] = useState<string | null>(null);

  // When destination changes, reset expansion and load initial curated images
  useEffect(() => {
    setIsExpanded(false);
    setSelectedMission(null);
    loadCuratedImages(destination.id);
  }, [destination.id]);

  // When a mission is selected, fetch mission-specific imagery
  useEffect(() => {
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
        // Keep 4 highest-quality curated images
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

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleSelectMissionCard = (mission: MissionMetadata) => {
    if (selectedMission?.missionCode === mission.missionCode) {
      // Toggle off filter
      setSelectedMission(null);
    } else {
      setSelectedMission(mission);
    }
  };

  return (
    <section
      id={`destination-${destination.id.toLowerCase()}`}
      className={`astra-world-scene ${isSun ? 'world-sun' : ''} ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
      data-testid={`section-${destination.id.toLowerCase()}`}
    >
      {/* -------------------------------------------------------------
          1. SCENE HEADER (Always Visible with Astronomical Taxonomy)
          ------------------------------------------------------------- */}
      <header className="astra-world-header">
        <div className="astra-classification-row">
          <SignatureStar
            size={12}
            color={isSun ? 'var(--color-star-warm)' : 'var(--color-earth-cyan)'}
          />
          <span className="astra-classification-text">
            {destination.orbitalOrder === 0
              ? '[ 00 // CENTRAL STAR // SOLAR SYSTEM CORONA ]'
              : `[ 0${destination.orbitalOrder} // ${destination.type.replace('_', ' ')} // ${destination.name.toUpperCase()} SYSTEM ]`}
          </span>
        </div>

        <div className="astra-world-title-wrap">
          <h1 className="astra-world-title">{destination.name}</h1>

          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="astra-collapse-pill-btn"
              data-testid={`collapse-world-${destination.id.toLowerCase()}`}
              aria-label="Collapse to focused planet view"
            >
              <Minimize2 size={13} />
              <span>COLLAPSE VIEW</span>
            </button>
          )}
        </div>

        <p className="astra-world-summary">{destination.summary}</p>
      </header>

      {/* -------------------------------------------------------------
          2. COLLAPSED VIEW: Hero 3D Celestial Body + Interactive Cue
          ------------------------------------------------------------- */}
      {!isExpanded && (
        <div className="astra-world-hero-stage">
          <div className="astra-hero-visual-wrapper">
            <PlanetVisual
              destinationId={destination.id}
              name={destination.name}
              type={destination.type}
              isExpanded={false}
              onToggleExpand={handleToggleExpand}
              reducedMotion={reducedMotion}
            />
          </div>

          <div className="astra-hero-cta-zone">
            <button
              onClick={() => setIsExpanded(true)}
              className="astra-hero-expand-btn"
              data-testid={`expand-world-${destination.id.toLowerCase()}`}
              aria-label={`Expand ${destination.name} exploration interface`}
            >
              <Sparkles size={15} />
              <span>CLICK PLANET OR TAP HERE TO EXPAND EXPLORATION</span>
              <ChevronRight size={15} />
            </button>

            {/* Quick Stats Badges */}
            <div className="astra-hero-metrics-strip">
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
                <span>GATEWAY: NASA IMAGERY ARCHIVE</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          3. EXPANDED VIEW: Split Composition (Model + Dossiers + Gallery)
          ------------------------------------------------------------- */}
      {isExpanded && (
        <div className="astra-world-expanded-layout">
          {/* LEFT ANCHOR: Interactive 3D Model & Quick Archive Action */}
          <aside className="astra-world-anchor-column">
            <div className="astra-anchor-visual-box">
              <PlanetVisual
                destinationId={destination.id}
                name={destination.name}
                type={destination.type}
                isExpanded={true}
                onToggleExpand={handleToggleExpand}
                reducedMotion={reducedMotion}
              />
            </div>

            <div className="astra-anchor-actions">
              <button
                onClick={() => onOpenArchive(destination)}
                className="astra-stage-imagery-btn full-width"
                data-testid={`explore-imagery-${destination.id.toLowerCase()}`}
              >
                <Sparkles size={14} />
                <span>EXPLORE FULL {destination.name.toUpperCase()} ARCHIVE</span>
              </button>

              {/* Preset Scientific Queries */}
              {destination.presetQueries && destination.presetQueries.length > 0 && (
                <div className="astra-anchor-presets">
                  <span className="astra-presets-label">SCIENTIFIC QUERY SHORTCUTS:</span>
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

              {/* Attribution */}
              <div className="astra-integrity-footnote">
                <span>Source: {destination.sourceAttribution}</span>
              </div>
            </div>
          </aside>

          {/* RIGHT DOSSIER: Boxed Missions, Rovers & Curated Gallery */}
          <main className="astra-world-dossier-column">
            {/* A. BOXED MISSION DOSSIER CARDS */}
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

            {/* B. ACTIVE SURFACE ROVERS (Mars Specialization) */}
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

            {/* C. CURATED OBSERVATIONAL IMAGERY STRIP */}
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
                  <div className="astra-skeleton" style={{ height: '180px', borderRadius: '4px' }} />
                  <div className="astra-skeleton" style={{ height: '180px', borderRadius: '4px' }} />
                  <div className="astra-skeleton" style={{ height: '180px', borderRadius: '4px' }} />
                  <div className="astra-skeleton" style={{ height: '180px', borderRadius: '4px' }} />
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
          </main>
        </div>
      )}
    </section>
  );
};
