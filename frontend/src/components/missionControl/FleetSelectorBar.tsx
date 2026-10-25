import React, { useState, useRef, useEffect } from 'react';
import { SpacecraftDetail, SpacecraftStatus } from '../../types/missionControl';
import { Spacecraft as SpacecraftIcon } from '../common/CelestialIcons';
import { ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { resolveDestinationBody } from '../../utils/destinationModel';

export interface FleetSelectorBarProps {
  spacecraftList: SpacecraftDetail[];
  selectedSpacecraftId: string;
  onSelectSpacecraft: (id: string) => void;
  loading?: boolean;
  error?: string | null;
}

export type DestinationFilter = 'ALL' | 'EARTH' | 'LUNAR' | 'MARS' | 'OUTER' | 'SOLAR' | 'DEEP_SPACE';

export interface DestinationOption {
  id: DestinationFilter;
  label: string;
  shortLabel: string;
  description: string;
}

export const DESTINATION_OPTIONS: DestinationOption[] = [
  { id: 'ALL', label: 'ALL DESTINATIONS', shortLabel: 'ALL', description: 'Complete solar system operational fleet' },
  { id: 'EARTH', label: 'EARTH ORBIT', shortLabel: 'EARTH', description: 'LEO, SSO, HEO, and GEO constellation' },
  { id: 'LUNAR', label: 'LUNAR', shortLabel: 'LUNAR', description: 'Lunar mapping, landers, and polar survey' },
  { id: 'MARS', label: 'MARS', shortLabel: 'MARS', description: 'Areocentric orbiters and rover relays' },
  { id: 'OUTER', label: 'OUTER PLANETS', shortLabel: 'OUTER', description: 'Jovian, Saturnian ring, and ice giants' },
  { id: 'SOLAR', label: 'SOLAR', shortLabel: 'SOLAR', description: 'Coronal observatories and space-weather sentinels' },
  { id: 'DEEP_SPACE', label: 'DEEP SPACE', shortLabel: 'DEEP SPACE', description: 'Interplanetary navigators and interstellar probes' },
];

export const FleetSelectorBar: React.FC<FleetSelectorBarProps> = ({
  spacecraftList,
  selectedSpacecraftId,
  onSelectSpacecraft,
  loading = false,
  error = null,
}) => {
  const [destFilter, setDestFilter] = useState<DestinationFilter>('ALL');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const getCraftCategory = (craft: SpacecraftDetail): DestinationFilter => {
    if (craft.destinationGroup) {
      const g = craft.destinationGroup.toUpperCase();
      if (g.includes('EARTH')) return 'EARTH';
      if (g.includes('LUNAR') || g.includes('MOON')) return 'LUNAR';
      if (g.includes('MARS')) return 'MARS';
      if (g.includes('OUTER') || g.includes('JUPITER') || g.includes('SATURN') || g.includes('URANUS') || g.includes('NEPTUNE')) return 'OUTER';
      if (g.includes('DEEP') || g.includes('INTERSTELLAR') || g.includes('ASTEROID')) return 'DEEP_SPACE';
      if (g.includes('SOLAR') || g.includes('SUN')) return 'SOLAR';
    }
    const dest = resolveDestinationBody(null, craft);
    switch (dest) {
      case 'mars':
        return 'MARS';
      case 'lunar':
        return 'LUNAR';
      case 'saturn':
      case 'jupiter':
      case 'ice_giant':
        return 'OUTER';
      case 'solar':
        return 'SOLAR';
      case 'deep_space':
        return 'DEEP_SPACE';
      case 'earth':
      default:
        return 'EARTH';
    }
  };

  const filteredCrafts = spacecraftList.filter((craft) => {
    if (destFilter === 'ALL') return true;
    return getCraftCategory(craft) === destFilter;
  });

  const selectedOption = DESTINATION_OPTIONS.find((opt) => opt.id === destFilter) || DESTINATION_OPTIONS[0];

  // Outside click & escape listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
      const currentIndex = DESTINATION_OPTIONS.findIndex((opt) => opt.id === destFilter);
      optionRefs.current[currentIndex >= 0 ? currentIndex : 0]?.focus();
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % DESTINATION_OPTIONS.length;
      optionRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + DESTINATION_OPTIONS.length) % DESTINATION_OPTIONS.length;
      optionRefs.current[prevIndex]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setDestFilter(DESTINATION_OPTIONS[index].id);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const getStatusClass = (status: SpacecraftStatus) => {
    switch (status) {
      case 'NOMINAL':
        return 'status-nominal';
      case 'DEGRADED':
        return 'status-degraded';
      case 'CRITICAL':
      case 'OFFLINE':
        return 'status-critical';
      default:
        return 'status-nominal';
    }
  };

  const getPropagationLabel = (cat: DestinationFilter) => {
    if (cat === 'EARTH') return 'KEPLERIAN TWO-BODY (ECI)';
    return 'REGISTERED TELEMETRY NODE';
  };

  return (
    <aside className="astra-mc-fleet-panel" data-testid="fleet-selector-bar">
      {/* Clean Header: No count numbers displayed */}
      <div className="astra-mc-panel-header">
        <div className="astra-mc-panel-title">
          <SpacecraftIcon size={14} color="var(--color-earth-cyan)" />
          <span data-testid="fleet-roster-title">ORBITAL FLEET ROSTER</span>
        </div>
      </div>

      {/* Top-Down Compact Destination Selector with Vertical Menu */}
      <div className="astra-mc-destination-selector-container">
        <div className="astra-mc-destination-label-row">
          <label className="astra-mc-destination-label" id="fleet-destination-label">
            DESTINATION
          </label>
        </div>

        <div className="astra-mc-destination-dropdown-wrap" ref={dropdownRef}>
          <button
            type="button"
            id="destination-selector-trigger"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby="fleet-destination-label"
            onClick={() => setIsOpen((prev) => !prev)}
            onKeyDown={handleTriggerKeyDown}
            className={`astra-mc-destination-trigger ${isOpen ? 'open' : ''}`}
            data-testid="destination-selector-trigger"
          >
            <div className="astra-mc-destination-trigger-content">
              <span className="astra-mc-destination-trigger-dot" />
              <span className="astra-mc-destination-trigger-text">{selectedOption.label}</span>
            </div>
            <ChevronDown
              size={13}
              className={`astra-mc-destination-chevron ${isOpen ? 'rotated' : ''}`}
            />
          </button>

          {/* Vertically Arranged Destination Options List */}
          <div
            className={`astra-mc-destination-menu ${isOpen ? 'open' : ''}`}
            role="listbox"
            aria-labelledby="fleet-destination-label"
            style={{ display: isOpen ? 'flex' : 'none' }}
            data-testid="destination-dropdown-menu"
          >
            {DESTINATION_OPTIONS.map((opt, index) => {
              const isSelected = destFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  ref={(el) => { optionRefs.current[index] = el; }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setDestFilter(opt.id);
                    setIsOpen(false);
                  }}
                  onKeyDown={(e) => handleOptionKeyDown(e, index)}
                  className={`astra-mc-destination-menu-item ${isSelected ? 'selected' : ''}`}
                  data-testid={`fleet-filter-${opt.id.toLowerCase()}`}
                >
                  <div className="astra-mc-destination-item-main">
                    <span className={`astra-mc-destination-bullet ${isSelected ? 'active' : ''}`} />
                    <span className="astra-mc-destination-item-text">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <span className="astra-mc-destination-item-check" aria-hidden="true">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fleet Craft List */}
      <div className="astra-mc-craft-list" data-testid="fleet-roster-list">
        {/* Loading State */}
        {loading && spacecraftList.length === 0 && (
          <div className="astra-mc-fleet-state astra-mc-fleet-loading" data-testid="fleet-roster-loading">
            <RefreshCw size={14} className="astra-mc-spin" style={{ marginBottom: '8px' }} />
            <div>SCANNING FLEET TELEMETRY CHANNELS...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="astra-mc-fleet-state astra-mc-fleet-error" data-testid="fleet-roster-error">
            <AlertCircle size={16} color="var(--color-critical)" style={{ marginBottom: '8px' }} />
            <div style={{ color: 'var(--color-critical)', fontWeight: 600 }}>FLEET TELEMETRY OFFLINE</div>
            <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--color-text-dim)' }}>{error}</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredCrafts.length === 0 && (
          <div className="astra-mc-fleet-state astra-mc-fleet-empty" data-testid="fleet-roster-empty">
            <div>NO SPACECRAFT REGISTERED FOR THIS DESTINATION</div>
          </div>
        )}

        {/* Spacecraft Cards */}
        {filteredCrafts.map((craft) => {
          const isSelected = craft.id === selectedSpacecraftId;
          const statusClass = getStatusClass(craft.operationalStatus);
          const craftCat = getCraftCategory(craft);
          const propagationNote = getPropagationLabel(craftCat);

          return (
            <button
              key={craft.id}
              onClick={() => onSelectSpacecraft(craft.id)}
              className={`astra-mc-craft-card ${isSelected ? 'active' : ''}`}
              data-testid={`fleet-card-${craft.id}`}
              aria-label={`Select ${craft.callSign} ${craft.name}`}
            >
              <div className="astra-mc-craft-header">
                <div>
                  <div className="astra-mc-craft-callsign">{craft.callSign}</div>
                  <div className="astra-mc-craft-name">{craft.name}</div>
                </div>

                <span className={`astra-mc-status-pill ${statusClass}`}>
                  <span className="astra-mc-pulse-dot" />
                  {craft.operationalStatus}
                </span>
              </div>

              <div className="astra-mc-craft-metrics-grid">
                <div className="astra-mc-craft-metric">
                  <span className="astra-mc-metric-k">REGIME / MODE</span>
                  <span className="astra-mc-metric-v" style={{ fontSize: '10px', color: 'var(--color-earth-cyan)' }}>
                    {craft.operationalMode}
                  </span>
                </div>

                <div className="astra-mc-craft-metric">
                  <span className="astra-mc-metric-k">PROPAGATION</span>
                  <span className="astra-mc-metric-v" style={{ fontSize: '9px', color: craftCat === 'EARTH' ? 'var(--color-nominal)' : 'var(--color-text-dim)' }}>
                    {propagationNote}
                  </span>
                </div>

                <div className="astra-mc-craft-metric">
                  <span className="astra-mc-metric-k">ALTITUDE</span>
                  <span className="astra-mc-metric-v">
                    {(craft.altitudeKm ?? 0) >= 1000000
                      ? `${((craft.altitudeKm ?? 0) / 1000000).toFixed(1)}M km`
                      : `${(craft.altitudeKm ?? 0).toFixed(1)} km`}
                  </span>
                </div>

                <div className="astra-mc-craft-metric">
                  <span className="astra-mc-metric-k">BATTERY SOC</span>
                  <span className="astra-mc-metric-v">
                    {(craft.batterySocPercent ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
