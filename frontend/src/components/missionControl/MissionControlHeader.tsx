import React, { useState, useEffect, useRef } from 'react';
import { SimulationStatus, StompConnectionStatus, MissionResponse } from '../../types/missionControl';
import { advanceSimulation, pauseSimulation, resumeSimulation } from '../../api/missionControlApi';
import { ArrowLeft, Play, Pause, FastForward, Layers, Compass, ShieldAlert } from 'lucide-react';
import { formatStationClockIST } from '../../utils/timeFormatters';

export type OperationalModeView = 'cockpit' | 'universe' | 'diagnostics';

interface MissionControlHeaderProps {
  onReturnHome: () => void;
  simulationStatus: SimulationStatus | null;
  connectionStatus: StompConnectionStatus;
  onSimulationUpdated: () => void;
  activeModeView?: OperationalModeView;
  onSelectModeView?: (mode: OperationalModeView) => void;
  activeMission?: MissionResponse | null;
  onAdvanceSimulation?: (seconds: number) => Promise<boolean | void>;
}

export const MissionControlHeader: React.FC<MissionControlHeaderProps> = ({
  onReturnHome,
  simulationStatus,
  connectionStatus,
  onSimulationUpdated,
  activeModeView = 'cockpit',
  onSelectModeView,
  activeMission = null,
  onAdvanceSimulation,
}) => {
  const [stationClockIst, setStationClockIst] = useState<string>('');
  const [isUpdatingSim, setIsUpdatingSim] = useState<boolean>(false);
  const [isAdvancingSim, setIsAdvancingSim] = useState<boolean>(false);
  const [showTimeJumpToast, setShowTimeJumpToast] = useState<boolean>(false);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const updateTime = () => {
      setStationClockIst(formatStationClockIST(new Date()));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
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
    if (isAdvancingSim || !simulationStatus) return;
    setIsAdvancingSim(true);
    try {
      if (onAdvanceSimulation) {
        await onAdvanceSimulation(seconds);
      } else {
        await advanceSimulation(seconds);
        onSimulationUpdated();
      }
      // Show polished floating animation only after confirmed authoritative acceptance
      setShowTimeJumpToast(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = window.setTimeout(() => {
        setShowTimeJumpToast(false);
      }, 1400);
    } catch (e) {
      console.warn('Failed advancing simulation clock', e);
    } finally {
      setIsAdvancingSim(false);
    }
  };

  return (
    <header className="astra-mc-header" data-testid="mission-control-header">
      {/* 1. Left Group: [←] [COCKPIT] [MISSIONS] [FAILURE LAB] */}
      <div className="astra-mc-header-left">
        <button
          onClick={onReturnHome}
          className="astra-mc-return-btn"
          aria-label="Go back"
          data-testid="return-to-landing"
          title="Go back [Esc]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>

        <nav
          className="astra-mc-header-nav astra-mc-viewmode-switcher"
          aria-label="Operations Navigation"
          role="tablist"
        >
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

        {activeMission && (
          <div
            className="astra-mc-header-active-mission"
            data-testid="header-active-mission-badge"
            title={`Active Mission: ${activeMission.title} (${activeMission.id} // ${activeMission.destinationGroup})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              borderRadius: '2px',
              maxWidth: '300px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="astra-mc-active-mission-dot" />
            <span
              className="astra-mc-active-mission-label"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 700,
                color: 'var(--color-earth-cyan)',
                flexShrink: 0,
              }}
            >
              SCENARIO:
            </span>
            <span
              className="astra-mc-active-mission-title"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-display)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeMission.title}
            </span>
            <span
              className="astra-mc-active-mission-dest"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--color-text-ghost)',
                flexShrink: 0,
              }}
            >
              // {activeMission.destinationGroup.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* 2. Right Group: Station Master Clock (IST), Sim Controls, +60s Jump, and Stream Status */}
      <div className="astra-mc-header-right">
        {/* Station Wall Clock in Indian Standard Time (Asia/Kolkata, DD/MM/YYYY) */}
        <div
          className="astra-mc-clock-item astra-mc-station-clock"
          title="Station Master Clock (IST — Asia/Kolkata, UTC+05:30)"
          data-testid="station-clock-wrapper"
        >
          <span className="astra-mc-clock-label">STATION CLOCK</span>
          <span
            className="astra-mc-clock-val"
            data-telemetry="utc-wallclock"
            data-testid="station-clock"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
          >
            {stationClockIst}
          </span>
        </div>

        {/* Authoritative Simulation Controls */}
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

          <div className="astra-mc-time-advance-box">
            <button
              onClick={() => handleStepClock(60)}
              className={`astra-mc-sim-btn ${isAdvancingSim ? 'pending' : ''}`}
              disabled={isAdvancingSim || isUpdatingSim || !simulationStatus}
              data-testid="advance-sim-btn"
              title="Step Authoritative Simulation Forward 60 Seconds"
            >
              <FastForward size={11} aria-hidden="true" />
              <span>+60s</span>
            </button>
            {showTimeJumpToast && (
              <span
                className="astra-mc-time-jump-toast"
                role="status"
                aria-live="polite"
                data-testid="time-advance-indicator"
              >
                +60 SECONDS
              </span>
            )}
          </div>
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
