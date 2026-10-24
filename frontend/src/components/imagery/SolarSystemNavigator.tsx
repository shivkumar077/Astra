import React from 'react';
import { PlanetaryDestination } from '../../types/imagery';

interface SolarSystemNavigatorProps {
  destinations: PlanetaryDestination[];
  activeDestinationId: string;
  onSelectDestination: (destinationId: string) => void;
}

const CELESTIAL_SYMBOLS: Record<string, string> = {
  sun: '☉',
  mercury: '☿',
  venus: '♀',
  earth: '♁',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
};

export const SolarSystemNavigator: React.FC<SolarSystemNavigatorProps> = ({
  destinations,
  activeDestinationId,
  onSelectDestination,
}) => {
  return (
    <nav
      className="astra-solar-navigator"
      role="navigation"
      aria-label="Solar System celestial destination navigator"
      data-testid="solar-system-navigator"
    >
      <div className="astra-nav-track">
        {destinations.map((dest) => {
          const isActive = dest.id.toLowerCase() === activeDestinationId.toLowerCase();
          const symbol = CELESTIAL_SYMBOLS[dest.id.toLowerCase()] || '○';

          return (
            <button
              key={dest.id}
              onClick={() => onSelectDestination(dest.id)}
              className={`astra-nav-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`Jump to ${dest.name}`}
              data-testid={`nav-item-${dest.id}`}
            >
              <span className="astra-nav-item-symbol" aria-hidden="true">
                {symbol}
              </span>
              <span>
                {dest.orbitalOrder === 0 ? 'SOL' : `[${dest.orbitalOrder}]`} {dest.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
