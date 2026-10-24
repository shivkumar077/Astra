import React from 'react';
import { PlanetaryDestination } from '../../types/imagery';
import { PlanetVisual } from './PlanetVisual';
import { RoverShowcase } from './RoverShowcase';
import { SignatureStar } from '../common/CelestialIcons';
import { Sparkles, ArrowRight, ShieldCheck, Search } from 'lucide-react';

interface PlanetarySectionProps {
  destination: PlanetaryDestination;
  onOpenImagery: (destination: PlanetaryDestination, query?: string) => void;
  reducedMotion?: boolean;
}

export const PlanetarySection: React.FC<PlanetarySectionProps> = ({
  destination,
  onOpenImagery,
  reducedMotion = false,
}) => {
  const isSun = destination.id.toLowerCase() === 'sun';

  return (
    <section
      id={`destination-${destination.id.toLowerCase()}`}
      className={`astra-cinematic-planet-stage ${isSun ? 'stage-sun' : ''}`}
      data-testid={`section-${destination.id.toLowerCase()}`}
    >
      <div className="astra-stage-inner">
        {/* LEFT COLUMN: Editorial Narrative, Verified Missions & Exploration Actions */}
        <div className="astra-stage-briefing">
          {/* Celestial Classification Tag */}
          <div className="astra-classification-row">
            <SignatureStar
              size={12}
              color={isSun ? 'var(--color-star-warm)' : 'var(--color-earth-cyan)'}
            />
            <span className="astra-classification-text">
              {destination.orbitalOrder === 0
                ? '[ 00 // CENTRAL STAR // SOLAR SYSTEM CORONA ]'
                : `[ 0${destination.orbitalOrder} // ${destination.type.replace('_', ' ')} // ${destination.name.toUpperCase()} ]`}
            </span>
          </div>

          {/* Monumental Destination Title */}
          <h2 className="astra-stage-title">{destination.name}</h2>

          {/* Scientific Context Summary */}
          <p className="astra-stage-summary">{destination.summary}</p>

          {/* Editorial Missions Sequence (Unboxed, Hairline Separators) */}
          {destination.historicalMissions && destination.historicalMissions.length > 0 && (
            <div className="astra-stage-missions">
              <span className="astra-missions-eyebrow">
                {isSun ? 'HELIOPHYSICS OBSERVATIONAL FLEET' : 'VERIFIED EXPLORATION MISSIONS'}
              </span>

              <div className="astra-missions-editorial-list">
                {destination.historicalMissions.map((m) => {
                  const isOp = m.operationalStatus === 'OPERATIONAL';

                  return (
                    <div key={m.missionCode} className="astra-mission-editorial-item">
                      <div className="astra-mission-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="astra-mission-title">{m.missionName}</span>
                          <span className="astra-mission-metadata">
                            {m.operatorAgency} &middot; {m.launchYear}
                          </span>
                        </div>

                        <span
                          className={`astra-editorial-status ${
                            isOp ? 'status-active' : 'status-complete'
                          }`}
                        >
                          <span className="astra-status-dot" />
                          <span>{isOp ? 'ACTIVE' : 'COMPLETED'}</span>
                        </span>
                      </div>

                      <p className="astra-mission-narrative">{m.description}</p>

                      {m.primarySearchQuery && (
                        <button
                          type="button"
                          onClick={() => onOpenImagery(destination, m.primarySearchQuery)}
                          className="astra-mission-archive-link"
                          aria-label={`View ${m.missionName} imagery`}
                        >
                          <span>Inspect {m.missionName} Data Archive</span>
                          <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Surface Rovers (Mars Specialization) */}
          {destination.activeRovers && destination.activeRovers.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <RoverShowcase
                rovers={destination.activeRovers}
                onSearchRover={(query) => onOpenImagery(destination, query)}
              />
            </div>
          )}

          {/* Dedicated Imagery Action & Preset Scientific Queries */}
          <div className="astra-imagery-action-zone">
            <button
              onClick={() => onOpenImagery(destination)}
              className="astra-stage-imagery-btn"
              data-testid={`explore-imagery-${destination.id.toLowerCase()}`}
            >
              <Sparkles size={14} />
              <span>EXPLORE {destination.name.toUpperCase()} IMAGERY ARCHIVE</span>
            </button>

            {destination.presetQueries && destination.presetQueries.length > 0 && (
              <div className="astra-stage-presets">
                <span className="astra-presets-label">OR DISPATCH PRESET QUERY:</span>
                <div className="astra-presets-pills">
                  {destination.presetQueries.map((q) => (
                    <button
                      key={q}
                      onClick={() => onOpenImagery(destination, q)}
                      className="astra-stage-preset-pill"
                    >
                      <Search size={10} />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scientific Integrity Annotation */}
          <div className="astra-stage-attribution">
            <ShieldCheck size={12} color="var(--color-text-ghost)" />
            <span>
              Source: {destination.sourceAttribution} &middot; {destination.verificationNote}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Unboxed Celestial Visual */}
        <div className="astra-stage-visual">
          <PlanetVisual
            destinationId={destination.id}
            name={destination.name}
            type={destination.type}
            reducedMotion={reducedMotion}
          />
        </div>
      </div>
    </section>
  );
};
