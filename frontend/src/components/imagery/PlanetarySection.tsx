import React, { useState } from 'react';
import { PlanetaryDestination, SpaceImageryItem } from '../../types/imagery';
import { PlanetVisual } from './PlanetVisual';
import { DestinationImageryGrid } from './DestinationImageryGrid';
import { RoverShowcase } from './RoverShowcase';
import { Search, ShieldCheck } from 'lucide-react';

interface PlanetarySectionProps {
  destination: PlanetaryDestination;
  onSelectImage: (item: SpaceImageryItem) => void;
  reducedMotion?: boolean;
}

export const PlanetarySection: React.FC<PlanetarySectionProps> = ({
  destination,
  onSelectImage,
  reducedMotion = false,
}) => {
  const [activeQuery, setActiveQuery] = useState<string | undefined>(undefined);

  const isSun = destination.id.toLowerCase() === 'sun';
  const layoutClass = isSun
    ? 'layout-center-planet'
    : destination.layoutComposition === 'RIGHT_PLANET'
    ? 'layout-right-planet'
    : 'layout-left-planet';

  return (
    <section
      id={`destination-${destination.id.toLowerCase()}`}
      className={`astra-planetary-section ${layoutClass}`}
      data-testid={`section-${destination.id.toLowerCase()}`}
    >
      <div className="astra-section-container">
        {/* Visual Column */}
        <div className="astra-visual-column">
          <PlanetVisual
            destinationId={destination.id}
            name={destination.name}
            type={destination.type}
            reducedMotion={reducedMotion}
          />
        </div>

        {/* Content Column */}
        <div className="astra-content-column">
          {/* Destination Header & Hierarchy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="astra-destination-badge">
              [ {destination.orbitalOrder === 0 ? 'CENTRAL STAR' : `DESTINATION 0${destination.orbitalOrder}`} // SOLAR SYSTEM ]
            </span>
            <h2 className="astra-destination-name">{destination.name}</h2>
            <span className="astra-destination-type">
              {destination.type.replace('_', ' ')}
            </span>
          </div>

          <p className="astra-destination-summary">{destination.summary}</p>

          {/* Historical & Operational Exploration Missions */}
          {destination.historicalMissions && destination.historicalMissions.length > 0 && (
            <div className="astra-missions-container">
              <span className="astra-missions-header">
                Key Spacecraft & Archival Exploration Missions
              </span>
              <div className="astra-missions-list">
                {destination.historicalMissions.map((m) => {
                  const isOp = m.operationalStatus === 'OPERATIONAL';

                  return (
                    <div key={m.missionCode} className="astra-mission-card">
                      <div className="astra-mission-title-row">
                        <span className="astra-mission-name">{m.missionName}</span>
                        <span className={`astra-status-badge ${isOp ? 'status-operational' : 'status-completed'}`}>
                          {isOp ? 'ACTIVE' : 'COMPLETED'}
                        </span>
                      </div>
                      <span className="astra-mission-agency">
                        {m.operatorAgency} ({m.launchYear})
                      </span>
                      <p className="astra-mission-desc">{m.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Surface Rovers (Mars Specialization) */}
          {destination.activeRovers && destination.activeRovers.length > 0 && (
            <RoverShowcase
              rovers={destination.activeRovers}
              onSearchRover={(query) => setActiveQuery(query)}
            />
          )}

          {/* Preset Scientific Queries */}
          {destination.presetQueries && destination.presetQueries.length > 0 && (
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-text-ghost)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Curated Scientific Query Presets
              </span>
              <div className="astra-preset-pills">
                {destination.presetQueries.map((query) => (
                  <button
                    key={query}
                    onClick={() => setActiveQuery(query === activeQuery ? undefined : query)}
                    className="preset-pill"
                    style={{
                      borderColor: query === activeQuery ? 'var(--color-border-accent)' : undefined,
                      color: query === activeQuery ? 'var(--color-earth-cyan)' : undefined,
                    }}
                    aria-label={`Search for ${query}`}
                  >
                    <Search size={10} style={{ display: 'inline', marginRight: '4px' }} />
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Real NASA Imagery Gallery */}
          <DestinationImageryGrid
            destinationId={destination.id}
            destinationName={destination.name}
            activeQuery={activeQuery}
            onSelectImage={onSelectImage}
          />

          {/* Source Attribution & Data Integrity */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingTop: '16px',
              borderTop: '1px solid var(--color-border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-text-ghost)',
            }}
          >
            <ShieldCheck size={13} color="var(--color-text-ghost)" />
            <span>
              Source: {destination.sourceAttribution} // {destination.verificationNote}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
