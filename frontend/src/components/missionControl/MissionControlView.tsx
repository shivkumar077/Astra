import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  SpacecraftDetail,
  SimulationStatus,
  CommandRecord,
  SimulationEvent,
  SubsystemsHealth,
  FleetTelemetryFrame,
  SimulationSnapshotMessage,
  StompConnectionStatus,
  MissionResponse,
} from '../../types/missionControl';
import {
  listSpacecraft,
  getSpacecraftDetail,
  getSimulationStatus,
  getCommandHistory,
  getEvents,
  getSubsystemsHealth,
  listMissions,
  getActiveMission,
  advanceSimulation,
} from '../../api/missionControlApi';
import { getMissionControlStompClient } from '../../api/stompClient';
import { MissionControlHeader, OperationalModeView } from './MissionControlHeader';
import { FleetSelectorBar } from './FleetSelectorBar';
import { OrbitalStage3D, TimeAdvanceNotice } from './OrbitalStage3D';
import { TelemetryWorkspace } from './TelemetryWorkspace';
import { CommandConsole } from './CommandConsole';
import { FailureLabDrawer } from './FailureLabDrawer';
import { EventLogFeed } from './EventLogFeed';
import { MissionUniverseHub } from './MissionUniverseHub';
import { FailureLabSuite } from './FailureLabSuite';
import { navigationHistory, NavigationLocation } from '../../utils/navigationHistory';
import { DEFAULT_SOLAR_SYSTEM_FLEET } from '../../utils/fleetCatalog';
import { Activity, Terminal, ShieldAlert, Layers } from 'lucide-react';
import '../../styles/missionControl.css';

interface MissionControlViewProps {
  onReturnHome: () => void;
  reducedMotion?: boolean;
  navLocation?: NavigationLocation;
}

type ActiveTab = 'telemetry' | 'commands' | 'failure-lab' | 'events';

export const MissionControlView: React.FC<MissionControlViewProps> = ({
  onReturnHome,
  reducedMotion = false,
  navLocation,
}) => {
  const [spacecraftList, setSpacecraftList] = useState<SpacecraftDetail[]>(
    DEFAULT_SOLAR_SYSTEM_FLEET
  );
  const [selectedSpacecraftId, setSelectedSpacecraftId] = useState<string>(
    navLocation?.selectedSpacecraftId || 'AURA-1'
  );
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [subsystemsHealth, setSubsystemsHealth] = useState<SubsystemsHealth | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandRecord[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('telemetry');
  const [activeModeView, setActiveModeView] = useState<OperationalModeView>(
    navLocation?.mcModeView || 'cockpit'
  );
  const [universeTab, setUniverseTab] = useState<'catalogue' | 'briefing' | 'history'>(
    navLocation?.universeTab || 'catalogue'
  );
  const [universeBackSignal, setUniverseBackSignal] = useState<number>(0);
  const [activeMission, setActiveMission] = useState<MissionResponse | null>(null);
  const userSelectedMissionRef = useRef<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<StompConnectionStatus>('connecting');
  const [timeAdvanceNotice, setTimeAdvanceNotice] = useState<TimeAdvanceNotice | null>(null);
  const timeAdvanceTimeoutRef = useRef<number | null>(null);

  const selectedCraft =
    spacecraftList.find((s) => s.id === selectedSpacecraftId) || spacecraftList[0] || null;

  // Handle +60s advance with viewport-anchored notification
  const handleAdvanceSimulation = async (seconds: number): Promise<boolean> => {
    try {
      await advanceSimulation(seconds);
      loadInitialData();
      setTimeAdvanceNotice({
        id: Date.now(),
        type: 'SUCCESS',
        seconds,
      });
      if (timeAdvanceTimeoutRef.current) window.clearTimeout(timeAdvanceTimeoutRef.current);
      timeAdvanceTimeoutRef.current = window.setTimeout(() => {
        setTimeAdvanceNotice(null);
      }, 2200);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation clock advance rejected by engine';
      setTimeAdvanceNotice({
        id: Date.now(),
        type: 'ERROR',
        seconds,
        message: msg,
      });
      if (timeAdvanceTimeoutRef.current) window.clearTimeout(timeAdvanceTimeoutRef.current);
      timeAdvanceTimeoutRef.current = window.setTimeout(() => {
        setTimeAdvanceNotice(null);
      }, 3000);
      return false;
    }
  };

  // 1. Initial Authoritative REST Bootstrapping
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [crafts, simStatus, history, evts, missions, activeMsn] = await Promise.all([
        listSpacecraft().catch(() => DEFAULT_SOLAR_SYSTEM_FLEET),
        getSimulationStatus().catch(() => null),
        getCommandHistory().catch(() => []),
        getEvents().catch(() => []),
        listMissions().catch(() => []),
        getActiveMission().catch(() => null),
      ]);

      if (crafts && crafts.length > 0) {
        // Fetch detail for all crafts to ensure elements and mass metrics are present
        const detailedCrafts = await Promise.all(
          crafts.map((c) => getSpacecraftDetail(c.id).catch(() => c as SpacecraftDetail))
        );
        setSpacecraftList(detailedCrafts);
        setSelectedSpacecraftId((prev) => (prev && detailedCrafts.some((c) => c.id === prev) ? prev : detailedCrafts[0].id));
      }

      // Check for active mission run from authoritative active endpoint or catalogue
      // Do not overwrite an explicit user-selected mission
      if (!userSelectedMissionRef.current) {
        const currentActive = activeMsn || (missions ? missions.find((m) => m.status === 'ACTIVE' || m.activeRun != null) : null);
        if (currentActive) {
          setActiveMission(currentActive);
          if (currentActive.activeRun?.spacecraftId) {
            setSelectedSpacecraftId(currentActive.activeRun.spacecraftId);
          }
        }
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

  // Universal Back Navigation Handler
  const handleHeaderBack = useCallback(() => {
    if (activeModeView === 'universe') {
      if (universeTab !== 'catalogue') {
        // Step back logically from briefing/history to catalogue view
        setUniverseBackSignal((s) => s + 1);
        return;
      }
      navigationHistory.goBack();
      return;
    }
    if (activeModeView === 'diagnostics') {
      navigationHistory.goBack();
      return;
    }
    // In cockpit mode:
    const prev = navigationHistory.goBack();
    if (prev.viewMode === 'landing') {
      onReturnHome();
    }
  }, [activeModeView, universeTab, onReturnHome]);

  // Synchronize state with universal navigation history
  useEffect(() => {
    const unsub = navigationHistory.subscribe((loc) => {
      if (loc.viewMode === 'mission-control') {
        if (loc.mcModeView && loc.mcModeView !== activeModeView) {
          setActiveModeView(loc.mcModeView);
        }
        if (loc.universeTab && loc.universeTab !== universeTab) {
          setUniverseTab(loc.universeTab);
        }
        if (loc.selectedSpacecraftId && loc.selectedSpacecraftId !== selectedSpacecraftId) {
          setSelectedSpacecraftId(loc.selectedSpacecraftId);
        }
      }
    });
    return unsub;
  }, [activeModeView, universeTab, selectedSpacecraftId]);

  // Global Escape key invokes universal back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleHeaderBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHeaderBack]);

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
        onReturnHome={handleHeaderBack}
        simulationStatus={simulationStatus}
        connectionStatus={connectionStatus}
        onSimulationUpdated={loadInitialData}
        activeModeView={activeModeView}
        onSelectModeView={(mode) => {
          if (mode === activeModeView) return;
          setActiveModeView(mode);
          navigationHistory.push({
            viewMode: 'mission-control',
            mcModeView: mode,
            selectedSpacecraftId,
            selectedMissionId: activeMission?.id || null,
          });
        }}
        activeMission={activeMission}
        onAdvanceSimulation={handleAdvanceSimulation}
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
            activeMission={activeMission}
            timeAdvanceNotice={timeAdvanceNotice}
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
            activeMission={activeMission}
            onSelectSpacecraft={(id) => {
              setSelectedSpacecraftId(id);
              setActiveModeView('cockpit');
              navigationHistory.push({
                viewMode: 'mission-control',
                mcModeView: 'cockpit',
                selectedSpacecraftId: id,
                selectedMissionId: activeMission?.id || null,
              });
            }}
            onStartMissionSuccess={(mission, run) => {
              setActiveMission(mission);
              if (run.spacecraftId) {
                setSelectedSpacecraftId(run.spacecraftId);
              }
              setActiveModeView('cockpit');
              navigationHistory.push({
                viewMode: 'mission-control',
                mcModeView: 'cockpit',
                selectedSpacecraftId: run.spacecraftId || selectedSpacecraftId,
                selectedMissionId: mission.id,
              });
            }}
            onMissionStatusChanged={loadInitialData}
            onNavigateToConsole={(mission) => {
              if (mission) {
                setActiveMission(mission);
                if (mission.spacecraftId) {
                  setSelectedSpacecraftId(mission.spacecraftId);
                }
              }
              setActiveModeView('cockpit');
              navigationHistory.push({
                viewMode: 'mission-control',
                mcModeView: 'cockpit',
                selectedSpacecraftId: mission?.spacecraftId || selectedSpacecraftId,
                selectedMissionId: mission?.id || activeMission?.id || null,
              });
            }}
            backSignal={universeBackSignal}
            onTabChanged={(tab) => {
              setUniverseTab(tab);
              navigationHistory.push({
                viewMode: 'mission-control',
                mcModeView: 'universe',
                universeTab: tab,
                selectedSpacecraftId,
                selectedMissionId: activeMission?.id || null,
              });
            }}
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
