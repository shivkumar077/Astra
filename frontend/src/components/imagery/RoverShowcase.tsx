import React from 'react';
import { RoverMetadata } from '../../types/imagery';
import { Search } from 'lucide-react';

interface RoverShowcaseProps {
  rovers: RoverMetadata[];
  onSearchRover?: (query: string) => void;
}

export const RoverShowcase: React.FC<RoverShowcaseProps> = ({ rovers, onSearchRover }) => {
  if (!rovers || rovers.length === 0) return null;

  return (
    <div className="astra-rover-showcase" data-testid="rover-showcase">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-solar-flare)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Active & Historical Mars Surface Units
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-ghost)',
          }}
        >
          NASA JPL Mars Exploration Program
        </span>
      </div>

      <div className="astra-rover-grid">
        {rovers.map((rover) => {
          const isActive = rover.operationalStatus === 'ACTIVE';

          return (
            <div key={rover.roverName} className="astra-rover-item" data-testid={`rover-card-${rover.roverName}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--color-text-display)',
                  }}
                >
                  {rover.roverName}
                </span>

                <span className={`astra-status-badge ${isActive ? 'status-active' : 'status-completed'}`}>
                  {isActive ? 'ACTIVE' : 'COMPLETED'}
                </span>
              </div>

              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-text-muted)',
                }}
              >
                Landing: {rover.landingSite} ({rover.landingYear})
              </span>

              {rover.instruments && rover.instruments.length > 0 && (
                <div className="astra-instruments-list">
                  {rover.instruments.map((inst) => (
                    <span key={inst} className="instrument-tag">
                      {inst}
                    </span>
                  ))}
                </div>
              )}

              {onSearchRover && rover.primarySearchQuery && (
                <button
                  onClick={() => onSearchRover(rover.primarySearchQuery)}
                  className="preset-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '4px',
                    alignSelf: 'flex-start',
                  }}
                  aria-label={`Search imagery from ${rover.roverName}`}
                >
                  <Search size={11} />
                  <span>Search Rover Photography</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
