import React, { useEffect } from 'react';
import { PlanetaryDestination, SpaceImageryItem } from '../../types/imagery';
import { DestinationImageryGrid } from './DestinationImageryGrid';
import { SignatureStar } from '../common/CelestialIcons';
import { X, Search, ShieldCheck } from 'lucide-react';

interface DedicatedImageryDrawerProps {
  destination: PlanetaryDestination | null;
  activeQuery?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
  onSelectImage: (item: SpaceImageryItem) => void;
}

export const DedicatedImageryDrawer: React.FC<DedicatedImageryDrawerProps> = ({
  destination,
  activeQuery,
  isOpen,
  onClose,
  onSelectQuery,
  onSelectImage,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !destination) return null;

  const currentQuery = activeQuery || (destination.presetQueries?.[0] ?? `${destination.name} planet`);

  return (
    <div
      className="astra-imagery-drawer-backdrop"
      data-testid="imagery-drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="astra-imagery-drawer-content" role="dialog" aria-modal="true" aria-label={`NASA Imagery Archive for ${destination.name}`}>
        {/* Drawer Header */}
        <div className="astra-drawer-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SignatureStar size={12} color="var(--color-earth-cyan)" />
              <span className="astra-drawer-tag">
                [ NASA IMAGERY ARCHIVE // {destination.name.toUpperCase()} EXPLORATION ]
              </span>
            </div>
            <h3 className="astra-drawer-title">{destination.name} Scientific Imagery Collection</h3>
          </div>

          <button
            onClick={onClose}
            className="astra-drawer-close-btn"
            aria-label="Close imagery archive"
            data-testid="close-imagery-drawer"
          >
            <X size={16} />
            <span>CLOSE ARCHIVE</span>
          </button>
        </div>

        {/* Scientific Preset Filter Pills */}
        {destination.presetQueries && destination.presetQueries.length > 0 && (
          <div className="astra-drawer-presets">
            <span className="astra-drawer-presets-label">CURATED ARCHIVE QUERIES:</span>
            <div className="astra-drawer-pills">
              {destination.presetQueries.map((query) => {
                const isActive = query === currentQuery;
                return (
                  <button
                    key={query}
                    onClick={() => onSelectQuery(query)}
                    className={`astra-drawer-pill ${isActive ? 'active' : ''}`}
                    aria-pressed={isActive}
                  >
                    <Search size={11} />
                    <span>{query}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="astra-drawer-gallery-scroll">
          <DestinationImageryGrid
            destinationId={destination.id}
            destinationName={destination.name}
            activeQuery={currentQuery}
            onSelectImage={onSelectImage}
          />
        </div>

        {/* Scientific Integrity Footer */}
        <div className="astra-drawer-footer">
          <ShieldCheck size={13} color="var(--color-nominal)" />
          <span>
            Telemetry Source: {destination.sourceAttribution} // {destination.verificationNote}
          </span>
        </div>
      </div>
    </div>
  );
};
