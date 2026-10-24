import React from 'react';
import { SimulationEvent } from '../../types/missionControl';
import { Activity, AlertOctagon, CheckCircle2, Camera, PlayCircle, PauseCircle } from 'lucide-react';

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

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'COMMAND_EXECUTED':
        return <CheckCircle2 size={13} color="var(--color-nominal)" />;
      case 'COMMAND_REJECTED':
      case 'COMMAND_FAILED':
        return <AlertOctagon size={13} color="var(--color-critical)" />;
      case 'FAULT_INJECTED':
        return <AlertOctagon size={13} color="var(--color-critical)" />;
      case 'FAULT_RECOVERED':
        return <CheckCircle2 size={13} color="var(--color-nominal)" />;
      case 'IMAGING_CAPTURE_COMPLETED':
        return <Camera size={13} color="var(--color-earth-cyan)" />;
      case 'SIMULATION_PAUSED':
        return <PauseCircle size={13} color="var(--color-advisory)" />;
      case 'SIMULATION_RESUMED':
        return <PlayCircle size={13} color="var(--color-nominal)" />;
      default:
        return <Activity size={13} color="var(--color-earth-cyan)" />;
    }
  };

  return (
    <div className="astra-mc-event-feed" data-testid="event-log-feed">
      <div className="astra-mc-section-legend">
        <Activity size={12} color="var(--color-earth-cyan)" />
        <span>AUTHORITATIVE SIMULATION EVENT LOG [{displayEvents.length} EVENTS]</span>
      </div>

      {loading && displayEvents.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-ghost)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          SYNCHRONIZING EVENT TIMELINE...
        </div>
      )}

      {displayEvents.length === 0 && !loading && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-ghost)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          NO TELEMETRY EVENTS RECORDED YET. TRANSMIT COMMANDS OR ADVANCE CLOCK TO RECORD EVENTS.
        </div>
      )}

      {displayEvents.map((evt) => (
        <div key={evt.eventId || `${evt.sequenceNumber}-${evt.simulationEpoch}`} className="astra-mc-event-item" data-testid={`event-item-${evt.sequenceNumber}`}>
          <div className="astra-mc-event-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {getEventIcon(evt.type)}
              <span className="astra-mc-event-type">
                #{evt.sequenceNumber} // {evt.type}
              </span>
            </div>
            <span className="astra-mc-event-time">
              {evt.simulationEpoch ? evt.simulationEpoch.replace('T', ' ').substring(0, 19) : ''}
            </span>
          </div>
          <div className="astra-mc-event-summary">
            {evt.spacecraftId && (
              <strong style={{ color: 'var(--color-earth-cyan)', marginRight: '6px' }}>
                [{evt.spacecraftId}]
              </strong>
            )}
            {evt.summary}
          </div>
        </div>
      ))}
    </div>
  );
};
