import React, { useState, useEffect } from 'react';
import { SimulationStatus, StompConnectionStatus } from '../../types/missionControl';
import { advanceSimulation, pauseSimulation, resumeSimulation } from '../../api/missionControlApi';
import { ArrowLeft, Play, Pause, FastForward, Layers, Compass, ShieldAlert } from 'lucide-react';

export type OperationalModeView = 'cockpit' | 'universe' | 'diagnostics';

interface MissionControlHeaderProps {
  onReturnHome: () => void;
  simulationStatus: SimulationStatus | null;
  connectionStatus: StompConnectionStatus;
  onSimulationUpdated: () => void;
  activeModeView?: OperationalModeView;
  onSelectModeView?: (mode: OperationalModeView) => void;
}

export const MissionControlHeader: React.FC<MissionControlHeaderProps> = ({
  onReturnHome,
  simulationStatus,
  connectionStatus,
  onSimulationUpdated,
  activeModeView = 'cockpit',
  onSelectModeView,
}) => {
  const [wallClockUtc, setWallClockUtc] = useState<string>('');
  const [isUpdatingSim, setIsUpdatingSim] = useState<boolean>(false);

  useEffect(() => {
    const updateUtc = () => {
      const now = new Date();
      const yr = now.getUTCFullYear();
      const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
      const da = String(now.getUTCDate()).padStart(2, '0');
      const hr = String(now.getUTCHours()).padStart(2, '0');
      const mi = String(now.getUTCMinutes()).padStart(2, '0');
      const sc = String(now.getUTCSeconds()).padStart(2, '0');
      setWallClockUtc(`${yr}.${mo}.${da} — ${hr}:${mi}:${sc} UTC`);
    };
    updateUtc();
    const timer = setInterval(updateUtc, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleLifecycle = async () => {
    if (!simulationStatus) return;
    setIsUpdatingSim(true);
    try {
      if (simulationStatus.lifecycle === 'RUNNING') {
        await pauseSimulation();
      } else {
        await resumeSimulation();
      }
      onSimulationUpdated();
    } catch (e) {
      console.warn('Failed toggling simulation status', e);
    } finally {
      setIsUpdatingSim(false);
    }
  };

  const handleStepClock = async (seconds: number) => {
    setIsUpdatingSim(true);
    try {
      await advanceSimulation(seconds);
      onSimulationUpdated();
    } catch (e) {
      console.warn('Failed advancing simulation clock', e);
    } finally {
      setIsUpdatingSim(false);
    }
  };

  return (
    <header className="astra-mc-header" data-testid="mission-control-header">
      {/* 1. Left: Single Arrow-Only Return Button */}
      <div className="astra-mc-header-left">
        <button
          onClick={onReturnHome}
          className="astra-mc-return-btn"
          aria-label="Return to landing page"
          data-testid="return-to-landing"
          title="Return to landing page [Esc]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
      </div>

      {/* 2. Main Operations Navigation: Cockpit, Missions, Failure Lab */}
      <nav className="astra-mc-header-nav astra-mc-viewmode-switcher" aria-label="Operations Navigation" role="tablist">
        <button
          onClick={() => onSelectModeView?.('cockpit')}
          className={`astra-mc-nav-btn astra-mc-mode-btn ${activeModeView === 'cockpit' ? 'active' : ''}`}
          data-testid="mode-cockpit-btn"
          title="Orbital Cockpit & 3D Stage"
          role="tab"
          aria-selected={activeModeView === 'cockpit'}
        >
          <Layers size={13} className="astra-mc-nav-icon" aria-hidden="true" />
          <span>COCKPIT</span>
        </button>
        <button
          onClick={() => onSelectModeView?.('universe')}
          className={`astra-mc-nav-btn astra-mc-mode-btn ${activeModeView === 'universe' ? 'active' : ''}`}
          data-testid="mode-universe-btn"
          title="Mission Universe Discovery Hub"
          role="tab"
          aria-selected={activeModeView === 'universe'}
        >
          <Compass size={13} className="astra-mc-nav-icon" aria-hidden="true" />
          <span>MISSIONS</span>
        </button>
        <button
          onClick={() => onSelectModeView?.('diagnostics')}
          className={`astra-mc-nav-btn astra-mc-mode-btn ${activeModeView === 'diagnostics' ? 'active' : ''}`}
          data-testid="mode-diagnostics-btn"
          title="Failure Investigation Lab"
          role="tab"
          aria-selected={activeModeView === 'diagnostics'}
        >
          <ShieldAlert size={13} className="astra-mc-nav-icon" aria-hidden="true" />
          <span>FAILURE LAB</span>
        </button>
      </nav>

      {/* 3. Right: Station Wall Clock & Status Indicators */}
      <div className="astra-mc-header-right">
        {/* Station Wall Clock */}
        <div className="astra-mc-clock-item astra-mc-station-clock" title="Station Master Time">
          <span className="astra-mc-clock-label">STATION CLOCK</span>
          <span className="astra-mc-clock-val" data-telemetry="utc-wallclock">{wallClockUtc}</span>
        </div>

        {/* Simulation Controls */}
        <div className="astra-mc-sim-controls">
          <button
            onClick={handleToggleLifecycle}
            className={`astra-mc-sim-btn ${simulationStatus?.lifecycle === 'RUNNING' ? 'active' : ''}`}
            disabled={isUpdatingSim || !simulationStatus}
            data-testid="toggle-sim-lifecycle-btn"
            title={simulationStatus?.lifecycle === 'RUNNING' ? 'Pause Simulation' : 'Resume Simulation'}
          >
            {simulationStatus?.lifecycle === 'RUNNING' ? (
              <>
                <Pause size={11} aria-hidden="true" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play size={11} aria-hidden="true" />
                <span>RESUME</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleStepClock(60)}
            className="astra-mc-sim-btn"
            disabled={isUpdatingSim || !simulationStatus}
            data-testid="advance-sim-btn"
            title="Step Simulation Forward 60 Seconds"
          >
            <FastForward size={11} aria-hidden="true" />
            <span>+60s</span>
          </button>
        </div>

        {/* Real-Time WebSocket / STOMP Telemetry Indicator */}
        <div
          className={`astra-mc-gateway-chip status-${connectionStatus}`}
          data-testid="gateway-status"
          title={`WebSocket Telemetry Stream: ${connectionStatus.toUpperCase()}`}
        >
          <span className="astra-mc-pulse-dot" />
          <span className="astra-mc-stream-label">STREAM: {connectionStatus.toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
};
