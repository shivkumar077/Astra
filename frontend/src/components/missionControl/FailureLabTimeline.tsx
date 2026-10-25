import React, { useState, useMemo } from 'react';
import { SimulationEvent } from '../../types/missionControl';
import { formatEventTimestampIST } from '../../utils/timeFormatters';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Activity,
  RotateCcw,
  Radio,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Search,
} from 'lucide-react';

interface FailureLabTimelineProps {
  events: SimulationEvent[];
  loading?: boolean;
  error?: string | null;
  targetSpacecraftId?: string;
}

type TimelineFilter = 'ALL' | 'ANOMALIES' | 'COMMANDS' | 'MISSION';
type SortOrder = 'DESC' | 'ASC';

export const FailureLabTimeline: React.FC<FailureLabTimelineProps> = ({
  events,
  loading = false,
  error = null,
  targetSpacecraftId,
}) => {
  const [filterType, setFilterType] = useState<TimelineFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEventIds, setExpandedEventIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (eventId: string) => {
    setExpandedEventIds((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  // 1. Deduplicate & Sort Events Chronologically
  const processedEvents = useMemo(() => {
    const seen = new Set<string>();
    const unique: SimulationEvent[] = [];

    for (const evt of events) {
      const key = evt.eventId || `${evt.type}-${evt.simulationEpoch}-${evt.sequenceNumber || 0}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(evt);
      }
    }

    return unique.sort((a, b) => {
      const timeA = new Date(a.simulationEpoch || a.wallClockTimestamp || 0).getTime() || 0;
      const timeB = new Date(b.simulationEpoch || b.wallClockTimestamp || 0).getTime() || 0;
      if (timeA !== timeB) {
        return sortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
      }
      return sortOrder === 'DESC'
        ? (b.sequenceNumber || 0) - (a.sequenceNumber || 0)
        : (a.sequenceNumber || 0) - (b.sequenceNumber || 0);
    });
  }, [events, sortOrder]);

  // 2. Filter & Search
  const filteredEvents = useMemo(() => {
    return processedEvents.filter((evt) => {
      const type = (evt.type || '').toUpperCase();
      const summary = (evt.summary || '').toLowerCase();
      const scId = (evt.spacecraftId || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      // Search match
      if (q && !summary.includes(q) && !type.includes(q) && !scId.includes(q)) {
        return false;
      }

      // Filter match
      if (filterType === 'ANOMALIES') {
        return (
          type.includes('ANOMALY') ||
          type.includes('FAULT') ||
          type.includes('ALERT') ||
          type.includes('BREACH') ||
          type.includes('SAFE_MODE')
        );
      }
      if (filterType === 'COMMANDS') {
        return type.includes('COMMAND') || type.includes('TELECOMMAND');
      }
      if (filterType === 'MISSION') {
        return type.includes('MISSION') || type.includes('STAGE') || type.includes('SIMULATION');
      }

      return true;
    });
  }, [processedEvents, filterType, searchQuery]);

  const getEventVisuals = (evt: SimulationEvent) => {
    const type = (evt.type || '').toUpperCase();
    const severity = String(
      evt.details?.severity || evt.parameters?.severity || ''
    ).toUpperCase();

    if (
      type.includes('CRITICAL') ||
      type.includes('ANOMALY_DETECTED') ||
      type.includes('FAULT_INJECTED') ||
      severity === 'CRITICAL'
    ) {
      return {
        badgeClass: 'status-critical',
        label: 'CRITICAL',
        color: '#f87171',
        icon: <ShieldAlert size={13} color="#f87171" />,
        borderColor: 'rgba(239, 68, 68, 0.4)',
        bgColor: 'rgba(239, 68, 68, 0.08)',
      };
    }

    if (
      type.includes('MAJOR') ||
      type.includes('WARNING') ||
      type.includes('ALERT') ||
      type.includes('SAFE_MODE') ||
      severity === 'MAJOR' ||
      severity === 'WARNING'
    ) {
      return {
        badgeClass: 'status-degraded',
        label: severity || 'WARNING',
        color: '#fbbf24',
        icon: <AlertTriangle size={13} color="#fbbf24" />,
        borderColor: 'rgba(251, 191, 36, 0.4)',
        bgColor: 'rgba(251, 191, 36, 0.08)',
      };
    }

    if (
      type.includes('RECOVERED') ||
      type.includes('CLEARED') ||
      type.includes('COMPLETED') ||
      type.includes('SUCCESS')
    ) {
      return {
        badgeClass: 'status-nominal',
        label: 'RESOLVED',
        color: '#34d399',
        icon: <CheckCircle2 size={13} color="#34d399" />,
        borderColor: 'rgba(52, 211, 153, 0.4)',
        bgColor: 'rgba(52, 211, 153, 0.08)',
      };
    }

    if (type.includes('COMMAND')) {
      return {
        badgeClass: 'status-nominal',
        label: 'COMMAND',
        color: 'var(--color-earth-cyan)',
        icon: <RotateCcw size={13} color="var(--color-earth-cyan)" />,
        borderColor: 'rgba(0, 229, 255, 0.3)',
        bgColor: 'rgba(0, 229, 255, 0.06)',
      };
    }

    return {
      badgeClass: 'status-nominal',
      label: 'INFO',
      color: '#94a3b8',
      icon: <Activity size={13} color="#94a3b8" />,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      bgColor: 'rgba(255, 255, 255, 0.03)',
    };
  };

  return (
    <div
      className="astra-mc-timeline-container"
      data-testid="failure-lab-timeline"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '280px',
        background: 'rgba(8, 12, 20, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-xs)',
        overflow: 'hidden',
      }}
    >
      {/* Timeline Controls Header */}
      <div
        className="astra-mc-timeline-header"
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(12, 17, 28, 0.9)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={13} color="var(--color-earth-cyan)" />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: 'var(--color-text-display)',
            }}
          >
            CHRONOLOGICAL EVENT TIMELINE [{filteredEvents.length}]
          </span>
          {targetSpacecraftId && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-earth-cyan)',
                background: 'rgba(0, 229, 255, 0.1)',
                padding: '2px 6px',
                borderRadius: '2px',
              }}
            >
              VEHICLE: {targetSpacecraftId}
            </span>
          )}
        </div>

        {/* Filter Pills & Sort Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setSortOrder((s) => (s === 'DESC' ? 'ASC' : 'DESC'))}
            className="astra-mc-hud-btn"
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title={sortOrder === 'DESC' ? 'Newest first (click for oldest first)' : 'Oldest first (click for newest first)'}
            data-testid="timeline-sort-toggle"
          >
            <ArrowUpDown size={11} />
            <span>{sortOrder === 'DESC' ? 'NEWEST' : 'OLDEST'}</span>
          </button>

          {(['ALL', 'ANOMALIES', 'COMMANDS', 'MISSION'] as TimelineFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterType(f)}
              style={{
                padding: '3px 7px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                borderRadius: '2px',
                border: filterType === f ? '1px solid var(--color-earth-cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: filterType === f ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                color: filterType === f ? 'var(--color-earth-cyan)' : 'var(--color-text-dim)',
                cursor: 'pointer',
              }}
              data-testid={`timeline-filter-${f.toLowerCase()}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(6, 10, 18, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Search size={11} color="var(--color-text-dim)" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter event timeline by keyword, type, or subsystem..."
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text-display)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}
          data-testid="timeline-search-input"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-dim)',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Main Timeline Scroll Feed */}
      <div
        className="astra-mc-timeline-feed"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
        data-testid="timeline-events-feed"
      >
        {loading && events.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-dim)',
            }}
          >
            AWAITING TELEMETRY EVENT STREAM...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '2px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#f87171',
            }}
          >
            TIMELINE FEED DISCONNECTED: {error}
          </div>
        )}

        {!loading && !error && filteredEvents.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-dim)',
            }}
          >
            NO TELEMETRY EVENTS RECORDED IN ACTIVE BUFFER
          </div>
        )}

        {filteredEvents.map((evt, idx) => {
          const visuals = getEventVisuals(evt);
          const timestampIST = formatEventTimestampIST(evt.simulationEpoch || evt.wallClockTimestamp);
          const isExpanded = !!expandedEventIds[evt.eventId];
          const hasDetails = (evt.details && Object.keys(evt.details).length > 0) ||
                             (evt.parameters && Object.keys(evt.parameters).length > 0);
          const sub = String(evt.details?.subsystem || evt.details?.domain || evt.parameters?.subsystem || '');
          const craft = evt.spacecraftId || '';

          return (
            <div
              key={evt.eventId || `evt-${idx}`}
              className="astra-mc-timeline-event-card"
              style={{
                display: 'flex',
                gap: '12px',
                position: 'relative',
                padding: '10px 12px',
                background: visuals.bgColor,
                border: `1px solid ${visuals.borderColor}`,
                borderRadius: 'var(--radius-xs)',
                transition: 'all 0.15s ease-in-out',
              }}
              data-testid={`timeline-event-${evt.eventId || idx}`}
            >
              {/* Left Column: Visual Icon & Vertical Connector */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: '2px',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${visuals.borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {visuals.icon}
                </div>
              </div>

              {/* Right Column: Event Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Top Row: Type Pill, Tags, and IST Timestamp */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '6px',
                    marginBottom: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span
                      className={`astra-mc-status-pill ${visuals.badgeClass}`}
                      style={{ fontSize: '9px', padding: '2px 6px', fontWeight: 700 }}
                    >
                      {evt.type}
                    </span>

                    {(craft || sub) && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--color-earth-cyan)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        [{craft}{craft && sub ? ' // ' : ''}{sub}]
                      </span>
                    )}

                    {evt.sequenceNumber != null && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          color: 'var(--color-text-ghost)',
                        }}
                      >
                        #{evt.sequenceNumber}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--color-text-dim)',
                      whiteSpace: 'nowrap',
                    }}
                    title="Indian Standard Time (Asia/Kolkata)"
                  >
                    {timestampIST}
                  </span>
                </div>

                {/* Event Summary */}
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '12px',
                    lineHeight: '1.45',
                    color: 'var(--color-text-display)',
                    margin: '0 0 4px 0',
                    wordBreak: 'break-word',
                  }}
                >
                  {evt.summary || 'Unspecified telemetry transition event.'}
                </p>

                {/* Optional Expandable Details Section */}
                {hasDetails && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleExpand(evt.eventId)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-earth-cyan)',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '2px 0',
                      }}
                      data-testid={`timeline-expand-${evt.eventId || idx}`}
                    >
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      <span>{isExpanded ? 'HIDE RAW TELEMETRY' : 'VIEW TELEMETRY PAYLOAD'}</span>
                    </button>

                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '8px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '2px',
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-text-dim)',
                          overflowX: 'auto',
                          maxHeight: '180px',
                        }}
                      >
                        {evt.details && Object.keys(evt.details).length > 0 && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: 'var(--color-earth-cyan)' }}>DETAILS:</span>
                            <pre style={{ margin: '2px 0 0 0', whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(evt.details, null, 2)}
                            </pre>
                          </div>
                        )}
                        {evt.parameters && Object.keys(evt.parameters).length > 0 && (
                          <div>
                            <span style={{ color: 'var(--color-advisory)' }}>PARAMETERS:</span>
                            <pre style={{ margin: '2px 0 0 0', whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(evt.parameters, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
