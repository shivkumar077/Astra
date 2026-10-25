import React, { useState } from 'react';
import { SpacecraftDetail, SpacecraftStatus } from '../../types/missionControl';
import { Spacecraft as SpacecraftIcon } from '../common/CelestialIcons';

interface FleetSelectorBarProps {
  spacecraftList: SpacecraftDetail[];
  selectedSpacecraftId: string;
  onSelectSpacecraft: (id: string) => void;
  loading?: boolean;
}

type DestinationFilter = 'ALL' | 'EARTH' | 'LUNAR' | 'MARS' | 'OUTER' | 'SOLAR';

export const FleetSelectorBar: React.FC<FleetSelectorBarProps> = ({
  spacecraftList,
  selectedSpacecraftId,
  onSelectSpacecraft,
  loading = false,
}) => {
  const [destFilter, setDestFilter] = useState<DestinationFilter>('ALL');

  const getCraftCategory = (craft: SpacecraftDetail): 'EARTH' | 'LUNAR' | 'MARS' | 'OUTER' | 'SOLAR' => {
    const id = craft.id.toUpperCase();
    const role = (craft.modelType || '').toLowerCase();
    if (id.startsWith('ARES') || id.startsWith('MARS') || id.startsWith('PHOBOS') || id.startsWith('DEIMOS') || id.startsWith('AERO') || role.includes('mars')) return 'MARS';
    if (id.startsWith('CHANDRA') || id.startsWith('LUNAR') || id.startsWith('SELENA') || id.startsWith('ARTEMIS') || id.startsWith('MOON') || role.includes('lunar')) return 'LUNAR';
    if (id.startsWith('JOVIAN') || id.startsWith('EUROPA') || id.startsWith('CALLISTO') || id.startsWith('CHRONOS') || id.startsWith('TITAN') || role.includes('jupiter') || role.includes('saturn')) return 'OUTER';
    if (id.startsWith('HELIOS') || id.startsWith('SOLAR') || id.startsWith('ASTEROID') || id.startsWith('DEEP') || id.startsWith('VOYAGER') || role.includes('solar') || role.includes('deep-space') || role.includes('asteroid')) return 'SOLAR';
    return 'EARTH';
  };

  const filteredCrafts = spacecraftList.filter((craft) => {
    if (destFilter === 'ALL') return true;
    return getCraftCategory(craft) === destFilter;
  });

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

  return (
    <aside className="astra-mc-fleet-panel" data-testid="fleet-selector-bar">
      <div className="astra-mc-panel-header">
        <div className="astra-mc-panel-title">
          <SpacecraftIcon size={14} color="var(--color-earth-cyan)" />
          <span>ORBITAL FLEET ROSTER</span>
        </div>
        <span className="astra-mc-fleet-count" data-testid="fleet-count">
          [{spacecraftList.length} VEHICLES ACTIVE]
        </span>
      </div>

      {/* Destination Filter Tabs for 28-craft Solar System Fleet */}
      <div
        className="astra-mc-fleet-filters"
        style={{
          display: 'flex',
          gap: '4px',
          padding: '6px 12px',
          overflowX: 'auto',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(5, 10, 20, 0.6)',
        }}
      >
        {(['ALL', 'EARTH', 'LUNAR', 'MARS', 'OUTER', 'SOLAR'] as DestinationFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setDestFilter(filter)}
            className={`astra-mc-filter-btn ${destFilter === filter ? 'active' : ''}`}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              border: destFilter === filter ? '1px solid var(--color-earth-cyan)' : '1px solid rgba(255,255,255,0.1)',
              background: destFilter === filter ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
              color: destFilter === filter ? 'var(--color-earth-cyan)' : 'var(--color-text-dim)',
              borderRadius: '2px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            data-testid={`fleet-filter-${filter.toLowerCase()}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="astra-mc-craft-list">
        {loading && spacecraftList.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-ghost)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            SCANNING FLEET TELEMETRY CHANNELS...
          </div>
        )}

        {filteredCrafts.map((craft) => {
          const isSelected = craft.id === selectedSpacecraftId;
          const statusClass = getStatusClass(craft.operationalStatus);

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
                  <span className="astra-mc-metric-k">ALTITUDE</span>
                  <span className="astra-mc-metric-v">
                    {(craft.altitudeKm ?? 0).toFixed(1)} km
                  </span>
                </div>

                <div className="astra-mc-craft-metric">
                  <span className="astra-mc-metric-k">BATTERY SOC</span>
                  <span className="astra-mc-metric-v">
                    {(craft.batterySocPercent ?? 0).toFixed(1)}%
                  </span>
                </div>

                <div className="astra-mc-craft-metric">
                  <span className="astra-mc-metric-k">SUN EXPOSURE</span>
                  <span
                    className="astra-mc-metric-v"
                    style={{ color: craft.inEclipse ? 'var(--color-advisory)' : 'var(--color-nominal)' }}
                  >
                    {craft.inEclipse ? 'ECLIPSE' : 'SOLAR LOCKED'}
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
