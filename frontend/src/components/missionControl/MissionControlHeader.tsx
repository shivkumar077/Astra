import React, { useState, useEffect } from 'react';
import { SimulationStatus, StompConnectionStatus } from '../../types/missionControl';
import { advanceSimulation, pauseSimulation, resumeSimulation } from '../../api/missionControlApi';
import { ArrowLeft, Play, Pause, FastForward } from 'lucide-react';

interface MissionControlHeaderProps {
  onReturnHome: () => void;
  simulationStatus: SimulationStatus | null;
  connectionStatus: StompConnectionStatus;
  onSimulationUpdated: () => void;
}

export const MissionControlHeader: React.FC<MissionControlHeaderProps> = ({
  onReturnHome,
  simulationStatus,
  connectionStatus,
  onSimulationUpdated,
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
      {/* 1. Left Return Action & Brand Badge */}
      <div className="astra-mc-header-left">
        <button
          onClick={onReturnHome}
          className="astra-mc-return-btn"
          aria-label="Return to ASTRA landing portal"
          data-testid="return-to-landing"
          title="Return to ASTRA [Esc]"
        >
          <ArrowLeft size={14} />
          <span>RETURN TO ASTRA</span>
        </button>

        <div className="astra-mc-title-group">
          <div className="astra-mc-brand-row">
            <span className="astra-mc-brand-name">ASTRA</span>
            <span className="astra-mc-badge">MISSION CONTROL</span>
          </div>
          <span className="astra-mc-subtitle">FLIGHT DYNAMICS &amp; ORBITAL OPERATIONS CONSOLE</span>
        </div>
      </div>

      {/* 2. Center: Authoritative Simulation Clock & Wall Clock */}
      <div className="astra-mc-header-center">
        <div className="astra-mc-clock-item">
          <span className="astra-mc-clock-label">STATION WALL-CLOCK</span>
          <span className="astra-mc-clock-val" data-telemetry="utc-wallclock">{wallClockUtc}</span>
        </div>

        <div className="astra-mc-clock-item">
          <span className="astra-mc-clock-label">SIMULATION EPOCH [UTC]</span>
          <span className="astra-mc-clock-val" data-telemetry="sim-epoch">
            {simulationStatus ? simulationStatus.currentEpoch.replace('T', ' ').substring(0, 19) : 'SYNCHRONIZING...'}
          </span>
        </div>

        <div className="astra-mc-clock-item">
          <span className="astra-mc-clock-label">ELAPSED SIM TIME</span>
          <span className="astra-mc-clock-val" data-telemetry="elapsed-time">
            {simulationStatus ? `T+ ${simulationStatus.elapsedSeconds.toFixed(1)}s` : 'T+ 0.0s'}
          </span>
        </div>
      </div>

      {/* 3. Right: Simulation Controls & Connection Status */}
      <div className="astra-mc-header-right">
        {/* Simulation Clock Controls */}
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
                <Pause size={11} />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play size={11} />
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
            <FastForward size={11} />
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
          <span>STREAM: {connectionStatus.toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
};
