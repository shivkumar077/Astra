import React, { useState } from 'react';
import { SpacecraftDetail, CommandRecord, OperationalMode } from '../../types/missionControl';
import { submitCommand } from '../../api/missionControlApi';
import { Send, AlertTriangle, Clock, Terminal } from 'lucide-react';

interface CommandConsoleProps {
  selectedSpacecraft: SpacecraftDetail | null;
  commandHistory: CommandRecord[];
  onCommandDispatched: () => void;
}

export const CommandConsole: React.FC<CommandConsoleProps> = ({
  selectedSpacecraft,
  commandHistory,
  onCommandDispatched,
}) => {
  const [commandType, setCommandType] = useState<string>('SET_OPERATIONAL_MODE');
  const [targetMode, setTargetMode] = useState<OperationalMode>('SCIENCE_OPERATION');
  const [opticalTarget, setOpticalTarget] = useState<string>('Sahara Impact Crater Cal-Target');
  const [advanceSeconds, setAdvanceSeconds] = useState<number>(60);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const opticalSensor = 'HIGH_RES_MULTISPECTRAL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpacecraft && commandType !== 'ADVANCE_TIME' && commandType !== 'PAUSE_SIMULATION' && commandType !== 'RESUME_SIMULATION') {
      setFeedbackMessage({ text: 'Please select a target spacecraft from the fleet roster.', type: 'warning' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    const clientCommandId = `CMD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const parameters: Record<string, string> = {};

    if (commandType === 'SET_OPERATIONAL_MODE') {
      parameters.mode = targetMode;
    } else if (commandType === 'REQUEST_OPTICAL_CAPTURE') {
      parameters.target = opticalTarget;
      parameters.sensor = opticalSensor;
    } else if (commandType === 'ADVANCE_TIME') {
      parameters.durationSeconds = String(advanceSeconds);
    }

    try {
      const craftId = commandType === 'ADVANCE_TIME' || commandType === 'PAUSE_SIMULATION' || commandType === 'RESUME_SIMULATION'
        ? null
        : selectedSpacecraft?.id || null;

      const res = await submitCommand(craftId, {
        type: commandType,
        spacecraftId: craftId || undefined,
        clientCommandId,
        parameters,
      });

      if (res.status === 'EXECUTED') {
        setFeedbackMessage({
          text: `[${res.commandId}] ${res.message}${res.idempotentReplay ? ' (IDEMPOTENT REPLAY)' : ''}`,
          type: 'success',
        });
      } else if (res.status === 'REJECTED') {
        setFeedbackMessage({
          text: `REJECTED: ${res.message}`,
          type: 'warning',
        });
      } else {
        setFeedbackMessage({
          text: `FAILED: ${res.message}`,
          type: 'error',
        });
      }

      onCommandDispatched();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMessage({
        text: `Transmission Error: ${msg}`,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="astra-mc-command-console" data-testid="command-console">
      <div className="astra-mc-section-legend">
        <Terminal size={12} color="var(--color-earth-cyan)" />
        <span>TELECOMMAND DISPATCH TERMINAL [SECURE STAGING]</span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(12, 16, 26, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-xs)', padding: '16px' }}>
        <div className="astra-mc-form-group">
          <label className="astra-mc-form-label">TARGET SPACECRAFT</label>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-earth-cyan)', fontWeight: 500 }}>
            {selectedSpacecraft ? `${selectedSpacecraft.callSign} (${selectedSpacecraft.name})` : 'GLOBAL FLEET / SIMULATION'}
          </div>
        </div>

        <div className="astra-mc-form-group">
          <label htmlFor="command-type-select" className="astra-mc-form-label">COMMAND TYPE</label>
          <select
            id="command-type-select"
            value={commandType}
            onChange={(e) => setCommandType(e.target.value)}
            className="astra-mc-select"
            disabled={isSubmitting}
            data-testid="command-type-select"
          >
            <option value="SET_OPERATIONAL_MODE">SET_OPERATIONAL_MODE // Transition Vehicle Mode</option>
            <option value="TRIGGER_SAFE_MODE">TRIGGER_SAFE_MODE // Emergency Attitude Safing</option>
            <option value="REQUEST_OPTICAL_CAPTURE">REQUEST_OPTICAL_CAPTURE // High-Res Optical Imaging</option>
            <option value="ADVANCE_TIME">ADVANCE_TIME // Step Keplerian Clock (Δt)</option>
            <option value="PAUSE_SIMULATION">PAUSE_SIMULATION // Suspend Simulation</option>
            <option value="RESUME_SIMULATION">RESUME_SIMULATION // Resume Propagation</option>
          </select>
        </div>

        {commandType === 'SET_OPERATIONAL_MODE' && (
          <div className="astra-mc-form-group">
            <label htmlFor="target-mode-select" className="astra-mc-form-label">TARGET MODE PARAMETER</label>
            <select
              id="target-mode-select"
              value={targetMode}
              onChange={(e) => setTargetMode(e.target.value as OperationalMode)}
              className="astra-mc-select"
              disabled={isSubmitting}
            >
              <option value="NOMINAL">NOMINAL // Standard Earth Observation</option>
              <option value="SCIENCE_OPERATION">SCIENCE_OPERATION // Full Payload Duty Cycle</option>
              <option value="COMMUNICATION">COMMUNICATION // High-Gain Downlink Tracking</option>
              <option value="ORBIT_CORRECTION">ORBIT_CORRECTION // Thruster Alignment Mode</option>
              <option value="LOW_POWER">LOW_POWER // Minimum Heat &amp; Comm</option>
              <option value="SAFE_MODE">SAFE_MODE // Sun-Acquisition Safe Hold</option>
            </select>
          </div>
        )}

        {commandType === 'REQUEST_OPTICAL_CAPTURE' && (
          <>
            <div className="astra-mc-form-group">
              <label htmlFor="optical-target-input" className="astra-mc-form-label">CALIBRATION / OBSERVATIONAL TARGET</label>
              <input
                id="optical-target-input"
                type="text"
                value={opticalTarget}
                onChange={(e) => setOpticalTarget(e.target.value)}
                className="astra-mc-input"
                disabled={isSubmitting}
              />
            </div>
            {selectedSpacecraft?.inEclipse && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-advisory)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                <AlertTriangle size={13} />
                <span>WARNING: Spacecraft is currently in Earth shadow/eclipse. Optical capture may be rejected by flight computer.</span>
              </div>
            )}
          </>
        )}

        {commandType === 'ADVANCE_TIME' && (
          <div className="astra-mc-form-group">
            <label htmlFor="advance-seconds-input" className="astra-mc-form-label">STEP DURATION (SECONDS)</label>
            <input
              id="advance-seconds-input"
              type="number"
              min="1"
              max="86400"
              value={advanceSeconds}
              onChange={(e) => setAdvanceSeconds(Number(e.target.value))}
              className="astra-mc-input"
              disabled={isSubmitting}
            />
          </div>
        )}

        <button
          type="submit"
          className="astra-mc-btn-dispatch"
          disabled={isSubmitting}
          data-testid="dispatch-command-btn"
        >
          <Send size={13} />
          <span>{isSubmitting ? 'UPLINKING TELECOMMAND...' : 'TRANSMIT TELECOMMAND'}</span>
        </button>

        {feedbackMessage && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.45,
              background:
                feedbackMessage.type === 'success'
                  ? 'rgba(16, 185, 129, 0.1)'
                  : feedbackMessage.type === 'warning'
                  ? 'rgba(245, 158, 11, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${
                feedbackMessage.type === 'success'
                  ? 'rgba(16, 185, 129, 0.35)'
                  : feedbackMessage.type === 'warning'
                  ? 'rgba(245, 158, 11, 0.35)'
                  : 'rgba(239, 68, 68, 0.35)'
              }`,
              color:
                feedbackMessage.type === 'success'
                  ? '#34d399'
                  : feedbackMessage.type === 'warning'
                  ? '#fbbf24'
                  : '#f87171',
            }}
            data-testid="command-feedback"
          >
            {feedbackMessage.text}
          </div>
        )}
      </form>

      {/* Historical Command Ledger */}
      <div className="astra-mc-section-legend" style={{ marginTop: '10px' }}>
        <Clock size={12} color="var(--color-earth-cyan)" />
        <span>TRANSMISSION &amp; EXECUTION AUDIT HISTORY</span>
      </div>

      <div className="astra-mc-command-history-list" data-testid="command-history-list">
        {commandHistory.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-ghost)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            NO COMMANDS DISPATCHED IN CURRENT SIMULATION SESSION
          </div>
        )}

        {commandHistory.map((cmd) => (
          <div key={cmd.commandId} className="astra-mc-history-row" data-testid={`history-item-${cmd.commandId}`}>
            <div className="astra-mc-history-top">
              <span className="astra-mc-history-cmd">
                [{cmd.spacecraftId || 'GLOBAL'}] {cmd.type}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  fontWeight: 600,
                  color:
                    cmd.status === 'EXECUTED'
                      ? 'var(--color-nominal)'
                      : cmd.status === 'REJECTED'
                      ? 'var(--color-advisory)'
                      : 'var(--color-critical)',
                }}
              >
                {cmd.status}
              </span>
            </div>
            {cmd.resultMessage && <span className="astra-mc-history-msg">{cmd.resultMessage}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
