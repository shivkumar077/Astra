import React from 'react';
import { SpacecraftDetail, SpacecraftStatus } from '../../types/missionControl';
import { Spacecraft as SpacecraftIcon } from '../common/CelestialIcons';

interface FleetSelectorBarProps {
  spacecraftList: SpacecraftDetail[];
  selectedSpacecraftId: string;
  onSelectSpacecraft: (id: string) => void;
  loading?: boolean;
}

export const FleetSelectorBar: React.FC<FleetSelectorBarProps> = ({
  spacecraftList,
  selectedSpacecraftId,
  onSelectSpacecraft,
  loading = false,
}) => {
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

      <div className="astra-mc-craft-list">
        {loading && spacecraftList.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-ghost)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            SCANNING FLEET TELEMETRY CHANNELS...
          </div>
        )}

        {spacecraftList.map((craft) => {
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
