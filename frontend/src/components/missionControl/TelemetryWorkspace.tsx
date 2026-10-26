import React from 'react';
import {
  SpacecraftDetail,
  SubsystemsHealth,
  StompConnectionStatus,
  SimulationStatus,
  TelemetryFreshness,
} from '../../types/missionControl';
import { Compass, Layers } from 'lucide-react';

interface TelemetryWorkspaceProps {
  spacecraft: SpacecraftDetail | null;
  subsystemsHealth: SubsystemsHealth | null;
  connectionStatus?: StompConnectionStatus;
  simulationStatus?: SimulationStatus | null;
  loading?: boolean;
}

export const TelemetryWorkspace: React.FC<TelemetryWorkspaceProps> = ({
  spacecraft,
  subsystemsHealth,
  connectionStatus = 'connected',
  simulationStatus = null,
  loading = false,
}) => {
  if (!spacecraft) {
    return (
      <div className="astra-mc-telemetry-section" data-testid="telemetry-workspace" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-ghost)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
        SELECT A SPACECRAFT FROM FLEET ROSTER TO STREAM TELEMETRY
      </div>
    );
  }

  const subs = subsystemsHealth?.subsystems || spacecraft.subsystems;
  const elem = spacecraft.elements;

  // Determine authoritative telemetry freshness
  const isTransportConnected = connectionStatus === 'connected';
  let freshness: TelemetryFreshness = 'LIVE';
  if (!isTransportConnected) {
    freshness = 'DISCONNECTED';
  } else if (!spacecraft.epoch && !spacecraft.positionKm) {
    freshness = 'MISSING';
  } else if (simulationStatus?.currentEpoch && spacecraft.epoch) {
    const simMs = new Date(simulationStatus.currentEpoch).getTime();
    const craftMs = new Date(spacecraft.epoch).getTime();
    if (!isNaN(simMs) && !isNaN(craftMs) && Math.abs(simMs - craftMs) > 120000) {
      freshness = 'STALE';
    }
  }

  return (
    <div className="astra-mc-telemetry-section" data-testid="telemetry-workspace">
      {/* Authoritative Telemetry Quality & Freshness Monitor */}
      <div
        className="astra-mc-telemetry-freshness-bar"
        data-testid="telemetry-freshness-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          marginBottom: '10px',
          borderRadius: 'var(--radius-xs)',
          background: freshness === 'LIVE'
            ? 'rgba(0, 229, 255, 0.08)'
            : freshness === 'STALE'
            ? 'rgba(234, 179, 8, 0.10)'
            : freshness === 'DISCONNECTED'
            ? 'rgba(239, 68, 68, 0.12)'
            : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${
            freshness === 'LIVE'
              ? 'rgba(0, 229, 255, 0.35)'
              : freshness === 'STALE'
              ? 'rgba(234, 179, 8, 0.40)'
              : freshness === 'DISCONNECTED'
              ? 'rgba(239, 68, 68, 0.45)'
              : 'rgba(255, 255, 255, 0.12)'
          }`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: freshness === 'LIVE'
                ? 'var(--color-nominal)'
                : freshness === 'STALE'
                ? 'var(--color-advisory)'
                : 'var(--color-critical)',
              display: 'inline-block',
              boxShadow: freshness === 'LIVE' ? '0 0 8px var(--color-nominal)' : 'none',
            }}
          />
          <span
            data-testid="telemetry-freshness-badge"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: freshness === 'LIVE'
                ? 'var(--color-earth-cyan)'
                : freshness === 'STALE'
                ? 'var(--color-advisory)'
                : 'var(--color-critical)',
            }}
          >
            {freshness === 'LIVE' && 'LIVE TELEMETRY // SYNCHRONIZED'}
            {freshness === 'STALE' && 'STALE TELEMETRY // PENDING REFRESH'}
            {freshness === 'DISCONNECTED' && 'STREAM DISCONNECTED // LAST KNOWN STATE'}
            {freshness === 'MISSING' && 'NO TELEMETRY // OFFLINE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            data-testid="spacecraft-operational-status"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '2px',
              background: spacecraft.operationalStatus === 'NOMINAL'
                ? 'rgba(16, 185, 129, 0.15)'
                : spacecraft.operationalStatus === 'DEGRADED'
                ? 'rgba(245, 158, 11, 0.18)'
                : 'rgba(239, 68, 68, 0.20)',
              color: spacecraft.operationalStatus === 'NOMINAL'
                ? 'var(--color-nominal)'
                : spacecraft.operationalStatus === 'DEGRADED'
                ? 'var(--color-advisory)'
                : 'var(--color-critical)',
              border: `1px solid ${
                spacecraft.operationalStatus === 'NOMINAL'
                  ? 'rgba(16, 185, 129, 0.4)'
                  : spacecraft.operationalStatus === 'DEGRADED'
                  ? 'rgba(245, 158, 11, 0.4)'
                  : 'rgba(239, 68, 68, 0.5)'
              }`,
            }}
          >
            BUS: {spacecraft.operationalStatus}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-text-ghost)',
            }}
          >
            {spacecraft.epoch ? `EPOCH: ${spacecraft.epoch.replace('T', ' ').substring(0, 19)}Z` : 'EPOCH: BASELINE'}
          </span>
        </div>
      </div>

      {/* 1. Kinematics & Real-Time Orbital Vectors */}
      <div className="astra-mc-section-legend">
        <Compass size={12} color="var(--color-earth-cyan)" />
        <span>KINEMATICS &amp; ORBITAL PROPAGATION [ECI J2000] {loading ? '(STREAMING)' : ''}</span>
      </div>

      <div style={{ background: 'rgba(12, 16, 26, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-xs)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div>
            <span className="astra-mc-hud-metric-k">POSITION X</span>
            <span className="astra-mc-hud-metric-v" style={{ display: 'block', fontSize: '12px' }}>
              {spacecraft.positionKm ? `${spacecraft.positionKm.x.toFixed(1)} km` : '—'}
            </span>
          </div>
          <div>
            <span className="astra-mc-hud-metric-k">POSITION Y</span>
            <span className="astra-mc-hud-metric-v" style={{ display: 'block', fontSize: '12px' }}>
              {spacecraft.positionKm ? `${spacecraft.positionKm.y.toFixed(1)} km` : '—'}
            </span>
          </div>
          <div>
            <span className="astra-mc-hud-metric-k">POSITION Z</span>
            <span className="astra-mc-hud-metric-v" style={{ display: 'block', fontSize: '12px' }}>
              {spacecraft.positionKm ? `${spacecraft.positionKm.z.toFixed(1)} km` : '—'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div>
            <span className="astra-mc-hud-metric-k">VELOCITY VX</span>
            <span className="astra-mc-hud-metric-v" style={{ display: 'block', fontSize: '12px' }}>
              {spacecraft.velocityKmS ? `${spacecraft.velocityKmS.x.toFixed(2)} km/s` : '—'}
            </span>
          </div>
          <div>
            <span className="astra-mc-hud-metric-k">VELOCITY VY</span>
            <span className="astra-mc-hud-metric-v" style={{ display: 'block', fontSize: '12px' }}>
              {spacecraft.velocityKmS ? `${spacecraft.velocityKmS.y.toFixed(2)} km/s` : '—'}
            </span>
          </div>
          <div>
            <span className="astra-mc-hud-metric-k">VELOCITY VZ</span>
            <span className="astra-mc-hud-metric-v" style={{ display: 'block', fontSize: '12px' }}>
              {spacecraft.velocityKmS ? `${spacecraft.velocityKmS.z.toFixed(2)} km/s` : '—'}
            </span>
          </div>
        </div>

        {elem && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div>
              <span className="astra-mc-hud-metric-k">SEMI-MAJOR (a)</span>
              <span className="astra-mc-hud-metric-v" style={{ display: 'block', fontSize: '12px' }}>
                {elem.semiMajorAxisKm.toFixed(1)} km
              </span>
            </div>
            <div>
              <span className="astra-mc-hud-metric-k">ECCENTRICITY (e)</span>
              <span className="astra-mc-hud-metric-v" style={{ display: 'block', fontSize: '12px' }}>
                {elem.eccentricity.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="astra-mc-hud-metric-k">TRUE ANOMALY (ν)</span>
              <span className="astra-mc-hud-metric-v" style={{ display: 'block', fontSize: '12px' }}>
                {elem.trueAnomalyDeg.toFixed(1)}°
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Subsystem Diagnostics Matrix across 6 Domains */}
      <div className="astra-mc-section-legend" style={{ marginTop: '10px' }}>
        <Layers size={12} color="var(--color-earth-cyan)" />
        <span>AUTHORITATIVE 6-SUBSYSTEM HEALTH MATRIX</span>
      </div>

      <div className="astra-mc-subsystems-matrix">
        {/* EPS */}
        <div className="astra-mc-subsystem-box" data-testid="subsystem-cell-eps">
          <div className="astra-mc-subsystem-title-row">
            <span className="astra-mc-subsystem-name">EPS // POWER</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: subs?.eps.loadSheddingActive ? 'var(--color-critical)' : 'var(--color-nominal)',
              }}
            >
              {subs?.eps.loadSheddingActive ? 'LOAD SHED' : 'NOMINAL'}
            </span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">BATTERY SOC</span>
            <span className="astra-mc-subsystem-metric-value">{spacecraft.batterySocPercent.toFixed(1)}%</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">SOLAR ARRAY</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.eps.solarArrayWatts.toFixed(0)} W` : `${spacecraft.solarArrayWatts.toFixed(0)} W`}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">BUS VOLTAGE</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.eps.batteryVoltageVolts.toFixed(1)} V` : '28.0 V'}</span>
          </div>
        </div>

        {/* TCS */}
        <div className="astra-mc-subsystem-box" data-testid="subsystem-cell-tcs">
          <div className="astra-mc-subsystem-title-row">
            <span className="astra-mc-subsystem-name">TCS // THERMAL</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: subs?.tcs.thermalSafingActive ? 'var(--color-critical)' : 'var(--color-nominal)',
              }}
            >
              {subs?.tcs.thermalSafingActive ? 'SAFING' : 'LOCKED'}
            </span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">CORE TEMP</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.tcs.temperatureCelsius.toFixed(1)}°C` : '18.5°C'}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">RADIATOR EFF</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${(subs.tcs.radiatorEfficiency * 100).toFixed(0)}%` : '100%'}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">HEATER LOOP</span>
            <span className="astra-mc-subsystem-metric-value">{subs?.tcs.heaterActive ? 'ACTIVE' : 'STANDBY'}</span>
          </div>
        </div>

        {/* ADCS */}
        <div className="astra-mc-subsystem-box" data-testid="subsystem-cell-adcs">
          <div className="astra-mc-subsystem-title-row">
            <span className="astra-mc-subsystem-name">ADCS // ATTITUDE</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: subs?.adcs.wheelFrictionActive ? 'var(--color-critical)' : 'var(--color-nominal)',
              }}
            >
              {subs ? subs.adcs.attitudeLockStatus : 'LOCKED'}
            </span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">POINTING ERR</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.adcs.pointingErrorDegrees.toFixed(3)}°` : '0.040°'}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">WHEEL SPEED</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.adcs.reactionWheelSpeedRpm.toFixed(0)} RPM` : '2450 RPM'}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">STAR TRACKER</span>
            <span className="astra-mc-subsystem-metric-value">{subs?.adcs.starTrackerLocked !== false ? 'LOCKED' : 'BLINDED'}</span>
          </div>
        </div>

        {/* COMMS */}
        <div className="astra-mc-subsystem-box" data-testid="subsystem-cell-comms">
          <div className="astra-mc-subsystem-title-row">
            <span className="astra-mc-subsystem-name">COMMS // LINK</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: subs?.comms.blackoutActive ? 'var(--color-critical)' : 'var(--color-nominal)',
              }}
            >
              {subs?.comms.blackoutActive ? 'BLACKOUT' : 'ONLINE'}
            </span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">LINK MARGIN</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.comms.linkMarginDb.toFixed(1)} dB` : '12.4 dB'}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">PACKET LOSS</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.comms.packetLossPercent.toFixed(1)}%` : '0.0%'}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">CARRIER</span>
            <span className="astra-mc-subsystem-metric-value">{subs?.comms.carrierLocked !== false ? 'LOCK' : 'LOSS'}</span>
          </div>
        </div>

        {/* PROP */}
        <div className="astra-mc-subsystem-box" data-testid="subsystem-cell-prop">
          <div className="astra-mc-subsystem-title-row">
            <span className="astra-mc-subsystem-name">PROP // THRUST</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: subs?.prop.leakActive ? 'var(--color-critical)' : 'var(--color-nominal)',
              }}
            >
              {subs?.prop.leakActive ? 'MICRO-LEAK' : 'NOMINAL'}
            </span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">PROPELLANT</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.prop.propellantMassKg.toFixed(1)} kg` : `${spacecraft.propellantMassKg.toFixed(1)} kg`}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">TANK PRESS</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.prop.tankPressureBar.toFixed(1)} bar` : '22.0 bar'}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">VALVE STATE</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? subs.prop.valveHealth : 'NOMINAL'}</span>
          </div>
        </div>

        {/* OBC */}
        <div className="astra-mc-subsystem-box" data-testid="subsystem-cell-obc">
          <div className="astra-mc-subsystem-title-row">
            <span className="astra-mc-subsystem-name">OBC // COMPUTING</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-nominal)' }}>
              {subs ? subs.obc.flightSoftwareState : 'NOMINAL'}
            </span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">CPU USAGE</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.obc.cpuUtilizationPercent.toFixed(1)}%` : '32.5%'}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">HEAP USAGE</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? `${subs.obc.memoryUtilizationPercent.toFixed(1)}%` : '44.0%'}</span>
          </div>
          <div className="astra-mc-subsystem-metric-row">
            <span className="astra-mc-subsystem-metric-label">REBOOTS</span>
            <span className="astra-mc-subsystem-metric-value">{subs ? subs.obc.rebootCount : 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
