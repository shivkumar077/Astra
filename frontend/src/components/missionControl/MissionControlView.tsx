import React, { useEffect, useState, useCallback } from 'react';
import {
  SpacecraftDetail,
  SimulationStatus,
  CommandRecord,
  SimulationEvent,
  SubsystemsHealth,
  FleetTelemetryFrame,
  SimulationSnapshotMessage,
  StompConnectionStatus,
} from '../../types/missionControl';
import {
  listSpacecraft,
  getSpacecraftDetail,
  getSimulationStatus,
  getCommandHistory,
  getEvents,
  getSubsystemsHealth,
} from '../../api/missionControlApi';
import { getMissionControlStompClient } from '../../api/stompClient';
import { MissionControlHeader, OperationalModeView } from './MissionControlHeader';
import { FleetSelectorBar } from './FleetSelectorBar';
import { OrbitalStage3D } from './OrbitalStage3D';
import { TelemetryWorkspace } from './TelemetryWorkspace';
import { CommandConsole } from './CommandConsole';
import { FailureLabDrawer } from './FailureLabDrawer';
import { EventLogFeed } from './EventLogFeed';
import { MissionUniverseHub } from './MissionUniverseHub';
import { FailureLabSuite } from './FailureLabSuite';
import { Activity, Terminal, ShieldAlert, Layers } from 'lucide-react';
import '../../styles/missionControl.css';

interface MissionControlViewProps {
  onReturnHome: () => void;
  reducedMotion?: boolean;
}

type ActiveTab = 'telemetry' | 'commands' | 'failure-lab' | 'events';

export const MissionControlView: React.FC<MissionControlViewProps> = ({
  onReturnHome,
  reducedMotion = false,
}) => {
  const [spacecraftList, setSpacecraftList] = useState<SpacecraftDetail[]>([]);
  const [selectedSpacecraftId, setSelectedSpacecraftId] = useState<string>('AURA-1');
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [subsystemsHealth, setSubsystemsHealth] = useState<SubsystemsHealth | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandRecord[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('telemetry');
  const [activeModeView, setActiveModeView] = useState<OperationalModeView>('cockpit');
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<StompConnectionStatus>('connecting');

  const selectedCraft =
    spacecraftList.find((s) => s.id === selectedSpacecraftId) || spacecraftList[0] || null;

  // 1. Initial Authoritative REST Bootstrapping
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [crafts, simStatus, history, evts] = await Promise.all([
        listSpacecraft(),
        getSimulationStatus().catch(() => null),
        getCommandHistory().catch(() => []),
        getEvents().catch(() => []),
      ]);

      if (crafts && crafts.length > 0) {
        // Fetch detail for all crafts to ensure elements and mass metrics are present
        const detailedCrafts = await Promise.all(
          crafts.map((c) => getSpacecraftDetail(c.id).catch(() => c as SpacecraftDetail))
        );
        setSpacecraftList(detailedCrafts);
        setSelectedSpacecraftId((prev) => (prev && detailedCrafts.some((c) => c.id === prev) ? prev : detailedCrafts[0].id));
      }

      if (simStatus) {
        setSimulationStatus(simStatus);
      }
      setCommandHistory(history);
      setEvents(evts);
    } catch (e) {
      console.warn('Mission Control REST initialization fallback', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Fetch Subsystems Health for Selected Craft
  const loadSubsystems = useCallback(async () => {
    if (!selectedSpacecraftId) return;
    try {
      const health = await getSubsystemsHealth(selectedSpacecraftId);
      setSubsystemsHealth(health);
    } catch (e) {
      console.warn(`Failed loading subsystems for ${selectedSpacecraftId}`, e);
    }
  }, [selectedSpacecraftId]);

  useEffect(() => {
    loadSubsystems();
  }, [loadSubsystems]);

  // 3. Connect Real-Time WebSocket & STOMP Protocol Stream
  useEffect(() => {
    const stomp = getMissionControlStompClient();

    const unsubStatus = stomp.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    stomp.connect();

    // Subscribe to Fleet Telemetry Stream
    const unsubTelemetry = stomp.subscribe<FleetTelemetryFrame>('/topic/telemetry', (frame) => {
      if (frame && frame.fleet) {
        setSpacecraftList((prev) =>
          prev.map((existing) => {
            const update = frame.fleet.find((f) => f.spacecraftId === existing.id);
            if (!update) return existing;
            return {
              ...existing,
              positionKm: update.positionKm,
              velocityKmS: update.velocityKmS,
              altitudeKm: update.altitudeKm,
              speedKmS: update.speedKmS,
              inEclipse: update.inEclipse,
              operationalMode: update.operationalMode,
              operationalStatus: update.operationalStatus,
              batterySocPercent: update.batterySocPercent,
              solarArrayWatts: update.solarArrayWatts,
              elements: update.elements || existing.elements,
            };
          })
        );
      }
    });

    // Subscribe to Simulation Lifecycle Snapshot
    const unsubSim = stomp.subscribe<SimulationSnapshotMessage>('/topic/simulation', (snapshot) => {
      if (snapshot) {
        setSimulationStatus({
          lifecycle: snapshot.lifecycle,
          currentEpoch: snapshot.currentEpoch,
          baseEpoch: snapshot.baseEpoch,
          elapsedSeconds: snapshot.elapsedSeconds,
          spacecraftCount: snapshot.fleet?.length || 0,
        });
      }
    });

    // Subscribe to Simulation Domain Events
    const unsubEvents = stomp.subscribe<SimulationEvent>('/topic/events', (newEvent) => {
      if (newEvent) {
        setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
      }
    });

    return () => {
      unsubStatus();
      unsubTelemetry();
      unsubSim();
      unsubEvents();
      stomp.disconnect();
    };
  }, []);

  // Global Escape key returns home
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onReturnHome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReturnHome]);

  const handleRefreshCommands = async () => {
    try {
      const history = await getCommandHistory();
      setCommandHistory(history);
      const evts = await getEvents();
      setEvents(evts);
    } catch {
      // safe ignore
    }
  };

  return (
    <div className="astra-mc-root" data-testid="mission-control-view">
      {/* 1. Tactical Command Header & Live Timekeeper */}
      <MissionControlHeader
        onReturnHome={onReturnHome}
        simulationStatus={simulationStatus}
        connectionStatus={connectionStatus}
        onSimulationUpdated={loadInitialData}
        activeModeView={activeModeView}
        onSelectModeView={setActiveModeView}
      />

      {/* 2. Operational Views */}
      {activeModeView === 'cockpit' && (
        <main className="astra-mc-main-workspace">
          {/* Left: Multi-Craft Fleet Selector & Live Roster */}
          <FleetSelectorBar
            spacecraftList={spacecraftList}
            selectedSpacecraftId={selectedSpacecraftId}
            onSelectSpacecraft={(id) => {
              setSelectedSpacecraftId(id);
            }}
            loading={loading}
          />

          {/* Center: Interactive 3D Orbital Visualization Stage */}
          <OrbitalStage3D
            spacecraftList={spacecraftList}
            selectedSpacecraftId={selectedSpacecraftId}
            onSelectSpacecraft={(id) => setSelectedSpacecraftId(id)}
            reducedMotion={reducedMotion}
          />

          {/* Right: Operations & Subsystems Console */}
          <section className="astra-mc-ops-panel" data-testid="operations-console-panel">
            {/* Navigation Tabs */}
            <div className="astra-mc-nav-tabs" role="tablist">
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`astra-mc-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'telemetry'}
                data-testid="tab-telemetry"
              >
                <Layers size={12} />
                <span>TELEMETRY</span>
              </button>

              <button
                onClick={() => setActiveTab('commands')}
                className={`astra-mc-tab-btn ${activeTab === 'commands' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'commands'}
                data-testid="tab-commands"
              >
                <Terminal size={12} />
                <span>COMMANDS</span>
              </button>

              <button
                onClick={() => setActiveTab('failure-lab')}
                className={`astra-mc-tab-btn ${activeTab === 'failure-lab' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'failure-lab'}
                data-testid="tab-failure-lab"
              >
                <ShieldAlert size={12} />
                <span>FAILURE LAB</span>
              </button>

              <button
                onClick={() => setActiveTab('events')}
                className={`astra-mc-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'events'}
                data-testid="tab-events"
              >
                <Activity size={12} />
                <span>EVENTS</span>
              </button>
            </div>

            {/* Active Tab Chamber */}
            <div className="astra-mc-tab-content-area">
              {activeTab === 'telemetry' && (
                <TelemetryWorkspace
                  spacecraft={selectedCraft}
                  subsystemsHealth={subsystemsHealth}
                  loading={loading}
                />
              )}

              {activeTab === 'commands' && (
                <CommandConsole
                  selectedSpacecraft={selectedCraft}
                  commandHistory={commandHistory}
                  onCommandDispatched={handleRefreshCommands}
                />
              )}

              {activeTab === 'failure-lab' && (
                <FailureLabDrawer
                  selectedSpacecraft={selectedCraft}
                  onFaultsChanged={async () => {
                    loadSubsystems();
                    handleRefreshCommands();
                  }}
                />
              )}

              {activeTab === 'events' && (
                <EventLogFeed
                  events={events}
                  selectedSpacecraftId={selectedSpacecraftId}
                  loading={loading}
                />
              )}
            </div>
          </section>
        </main>
      )}

      {activeModeView === 'universe' && (
        <main className="astra-mc-fullscreen-workspace">
          <MissionUniverseHub
            spacecraftList={spacecraftList}
            onSelectSpacecraft={(id) => {
              setSelectedSpacecraftId(id);
              setActiveModeView('cockpit');
            }}
            onNavigateToConsole={() => setActiveModeView('cockpit')}
          />
        </main>
      )}

      {activeModeView === 'diagnostics' && (
        <main className="astra-mc-fullscreen-workspace">
          <FailureLabSuite
            spacecraftList={spacecraftList}
            selectedSpacecraftId={selectedSpacecraftId}
            onSelectSpacecraft={(id) => setSelectedSpacecraftId(id)}
            onFaultsChanged={async () => {
              loadSubsystems();
              handleRefreshCommands();
            }}
          />
        </main>
      )}
    </div>
  );
};
