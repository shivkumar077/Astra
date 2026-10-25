import React from 'react';
import { SimulationEvent } from '../../types/missionControl';
import { Activity, AlertOctagon, CheckCircle2, Camera, ShieldAlert, Radio } from 'lucide-react';

interface EventLogFeedProps {
  events: SimulationEvent[];
  selectedSpacecraftId?: string;
  loading?: boolean;
}

export const EventLogFeed: React.FC<EventLogFeedProps> = ({
  events,
  selectedSpacecraftId,
  loading = false,
}) => {
  const displayEvents = selectedSpacecraftId
    ? events.filter((e) => !e.spacecraftId || e.spacecraftId === selectedSpacecraftId)
    : events;

  const getEventSeverity = (type: string): 'critical' | 'advisory' | 'nominal' | 'info' => {
    switch (type) {
      case 'COMMAND_REJECTED':
      case 'COMMAND_FAILED':
      case 'FAULT_INJECTED':
      case 'SYSTEM_FAILURE':
        return 'critical';
      case 'SIMULATION_PAUSED':
      case 'ATTITUDE_DEVIATION':
      case 'THERMAL_WARNING':
        return 'advisory';
      case 'COMMAND_EXECUTED':
      case 'FAULT_RECOVERED':
      case 'SIMULATION_RESUMED':
        return 'nominal';
      default:
        return 'info';
    }
  };

  const getEventIcon = (type: string, severity: 'critical' | 'advisory' | 'nominal' | 'info') => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon size={13} className="astra-mc-event-status-icon critical" aria-hidden="true" />;
      case 'advisory':
        return <ShieldAlert size={13} className="astra-mc-event-status-icon advisory" aria-hidden="true" />;
      case 'nominal':
        return <CheckCircle2 size={13} className="astra-mc-event-status-icon nominal" aria-hidden="true" />;
      default:
        if (type === 'IMAGING_CAPTURE_COMPLETED') return <Camera size={13} className="astra-mc-event-status-icon info" aria-hidden="true" />;
        if (type.includes('COMM')) return <Radio size={13} className="astra-mc-event-status-icon info" aria-hidden="true" />;
        return <Activity size={13} className="astra-mc-event-status-icon info" aria-hidden="true" />;
    }
  };

  const formatEpoch = (epochStr?: string) => {
    if (!epochStr) return '';
    try {
      const d = new Date(epochStr);
      if (isNaN(d.getTime())) return epochStr.replace('T', ' ').substring(0, 19);
      const yr = d.getUTCFullYear();
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
      const da = String(d.getUTCDate()).padStart(2, '0');
      const hr = String(d.getUTCHours()).padStart(2, '0');
      const mi = String(d.getUTCMinutes()).padStart(2, '0');
      const sc = String(d.getUTCSeconds()).padStart(2, '0');
      return `${yr}.${mo}.${da} ${hr}:${mi}:${sc} UTC`;
    } catch {
      return epochStr.replace('T', ' ').substring(0, 19);
    }
  };

  return (
    <div className="astra-mc-event-feed" data-testid="event-log-feed">
      <div className="astra-mc-section-legend">
        <Activity size={12} color="var(--color-earth-cyan)" aria-hidden="true" />
        <span>AUTHORITATIVE SIMULATION EVENT LOG [{displayEvents.length} EVENTS]</span>
      </div>

      {loading && displayEvents.length === 0 && (
        <div className="astra-mc-feed-loading">
          <Activity size={14} className="astra-mc-pulse-dot" />
          <span>SYNCHRONIZING EVENT TIMELINE...</span>
        </div>
      )}

      {displayEvents.length === 0 && !loading && (
        <div className="astra-mc-feed-empty">
          <span>NO TELEMETRY EVENTS RECORDED YET. TRANSMIT COMMANDS OR ADVANCE CLOCK TO RECORD EVENTS.</span>
        </div>
      )}

      <div className="astra-mc-event-list">
        {displayEvents.map((evt) => {
          const severity = getEventSeverity(evt.type);
          const hasParams = evt.parameters && Object.keys(evt.parameters).length > 0;

          return (
            <article
              key={evt.eventId || `${evt.sequenceNumber}-${evt.simulationEpoch}`}
              className={`astra-mc-event-item severity-${severity}`}
              data-testid={`event-item-${evt.sequenceNumber}`}
            >
              <div className="astra-mc-event-header">
                <div className="astra-mc-event-meta-left">
                  {getEventIcon(evt.type, severity)}
                  <span className={`astra-mc-event-badge severity-${severity}`}>
                    #{evt.sequenceNumber} // {evt.type}
                  </span>
                  {evt.spacecraftId && (
                    <span className="astra-mc-event-craft-tag">
                      {evt.spacecraftId}
                    </span>
                  )}
                </div>
                <time className="astra-mc-event-time" dateTime={evt.simulationEpoch}>
                  {formatEpoch(evt.simulationEpoch)}
                </time>
              </div>

              <div className="astra-mc-event-summary">
                <p>{evt.summary}</p>
              </div>

              {hasParams && (
                <div className="astra-mc-event-params">
                  {Object.entries(evt.parameters!).map(([key, val]) => (
                    <span key={key} className="astra-mc-event-param-chip">
                      <span className="param-k">{key}:</span>
                      <span className="param-v">{String(val)}</span>
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
