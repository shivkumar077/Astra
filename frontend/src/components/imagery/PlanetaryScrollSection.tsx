import React from 'react';
import { PlanetaryDestination } from '../../types/imagery';
import { PlanetVisual } from './PlanetVisual';
import { SignatureStar } from '../common/CelestialIcons';
import { Sparkles, ChevronRight, Compass, CheckCircle2 } from 'lucide-react';

interface PlanetaryScrollSectionProps {
  destination: PlanetaryDestination;
  scaleProgress: number; // 0.0 to 1.0 driving scale-and-fade
  onOpenDossier: (destination: PlanetaryDestination) => void;
  reducedMotion?: boolean;
}

export const PlanetaryScrollSection: React.FC<PlanetaryScrollSectionProps> = React.memo(({
  destination,
  scaleProgress,
  onOpenDossier,
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
        {/* LEFT COLUMN: Briefing, Editorial Overview & Concise Explore CTA */}
        <div className="astra-stage-briefing">
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

          <h2 className="astra-stage-title">{destination.name}</h2>

          <p className="astra-stage-summary">{destination.summary}</p>

          <div className="astra-imagery-action-zone">
            <button
              onClick={() => onOpenDossier(destination)}
              className="astra-hero-expand-btn"
              data-testid={`expand-world-${destination.id.toLowerCase()}`}
              aria-label={`Explore ${destination.name} mission dossier`}
            >
              <Sparkles size={14} />
              <span>EXPLORE {destination.name.toUpperCase()} DOSSIER</span>
              <ChevronRight size={14} />
            </button>

            {/* Concise Telemetry Metrics */}
            <div className="astra-hero-metrics-strip" style={{ justifyContent: 'flex-start' }}>
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
                <span>NASA ARCHIVE GATEWAY</span>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive 3D Model with Continuous Scroll Scale-and-Fade */}
        <div className="astra-stage-visual-container">
          <PlanetVisual
            destinationId={destination.id}
            name={destination.name}
            type={destination.type}
            scaleProgress={scaleProgress}
            reducedMotion={reducedMotion}
            onToggleExpand={() => onOpenDossier(destination)}
          />
        </div>
      </div>
    </section>
  );
});
