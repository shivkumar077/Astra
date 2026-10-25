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
import {
  DestinationFilter,
  getSpacecraftDestinationGroup,
  getMissionDestinationGroup,
  isSpacecraftCompatibleWithDestination,
} from '../../utils/destinationModel';
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
  // Authoritative: Default to EARTH ORBIT unless explicitly specified by navigation
  const [destinationFilter, setDestinationFilter] = useState<DestinationFilter>(
    navLocation?.destinationFilter || 'EARTH'
  );
  const userSelectedDestinationRef = useRef<boolean>(!!navLocation?.destinationFilter);

  // Authoritative: Default to AURA-1 (Earth-assigned)
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
  const [fleetError, setFleetError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<StompConnectionStatus>('connecting');
  const [timeAdvanceNotice, setTimeAdvanceNotice] = useState<TimeAdvanceNotice | null>(null);
  const timeAdvanceTimeoutRef = useRef<number | null>(null);

  // Scoped fleet list matching the active destination filter
  const scopedSpacecraftList = destinationFilter === 'ALL'
    ? spacecraftList
    : spacecraftList.filter((craft) => getSpacecraftDestinationGroup(craft) === destinationFilter);

  const selectedCraft =
    scopedSpacecraftList.find((s) => s.id === selectedSpacecraftId) ||
    scopedSpacecraftList[0] ||
    null;

  // Authoritative Destination Switch Handler
  const handleDestinationChange = useCallback((newDest: DestinationFilter) => {
    userSelectedDestinationRef.current = true;
    setDestinationFilter(newDest);

    // Filter spacecraft for the new destination
    const matching = newDest === 'ALL'
      ? spacecraftList
      : spacecraftList.filter((craft) => getSpacecraftDestinationGroup(craft) === newDest);

    let nextCraftId = '';
    if (matching.length > 0) {
      const alreadyMatching = matching.some((c) => c.id === selectedSpacecraftId);
      if (alreadyMatching) {
        nextCraftId = selectedSpacecraftId;
      } else if (newDest === 'EARTH' && matching.some((c) => c.id === 'AURA-1')) {
        nextCraftId = 'AURA-1';
      } else {
        nextCraftId = matching[0].id;
      }
    }
    setSelectedSpacecraftId(nextCraftId);

    const currentLoc = navigationHistory.getCurrent();
    if (currentLoc.viewMode === 'mission-control') {
      navigationHistory.replace({
        ...currentLoc,
        destinationFilter: newDest,
        selectedSpacecraftId: nextCraftId || undefined,
      });
    }
  }, [spacecraftList, selectedSpacecraftId]);

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
        listSpacecraft()
          .then((res) => {
            setFleetError(null);
            return res;
          })
          .catch((err) => {
            console.warn('Failed to load fleet from server, using fallback catalog', err);
            setFleetError('Unable to reach telemetry server. Showing offline cached catalog.');
            return DEFAULT_SOLAR_SYSTEM_FLEET;
          }),
        getSimulationStatus().catch(() => null),
        getCommandHistory().catch(() => []),
        getEvents().catch(() => []),
        listMissions().catch(() => []),
        getActiveMission().catch(() => null),
      ]);

      // The API can briefly serve only its legacy seed while a local backend starts.
      // Merge server records over the complete client catalog so the roster never collapses.
      const mergedCrafts = new Map(DEFAULT_SOLAR_SYSTEM_FLEET.map((craft) => [craft.id, craft]));
      (crafts || []).forEach((craft) => mergedCrafts.set(craft.id, craft as SpacecraftDetail));
      const allCrafts = Array.from(mergedCrafts.values());
      const detailedCrafts = await Promise.all(
        allCrafts.map((craft) => getSpacecraftDetail(craft.id).catch(() => craft as SpacecraftDetail))
      );
      setSpacecraftList(detailedCrafts);

      // Handle active mission and initial spacecraft / destination selection
      if (!userSelectedDestinationRef.current && !userSelectedMissionRef.current) {
        const currentActive =
          activeMsn ||
          (missions ? missions.find((m) => m.status === 'ACTIVE' || m.activeRun != null) : null);
        if (currentActive) {
          setActiveMission(currentActive);
          const mDest = getMissionDestinationGroup(currentActive);
          setDestinationFilter(mDest);
          const assignedCraftId = currentActive.activeRun?.spacecraftId || currentActive.spacecraftId;
          if (assignedCraftId && isSpacecraftCompatibleWithDestination(assignedCraftId, mDest)) {
            setSelectedSpacecraftId(assignedCraftId);
          } else {
            const matching = detailedCrafts.filter((c) => getSpacecraftDestinationGroup(c) === mDest);
            if (matching.length > 0) setSelectedSpacecraftId(matching[0].id);
          }
        } else {
          // No active mission: default to EARTH and select AURA-1
          setDestinationFilter('EARTH');
          const earthCrafts = detailedCrafts.filter((c) => getSpacecraftDestinationGroup(c) === 'EARTH');
          if (earthCrafts.some((c) => c.id === 'AURA-1')) {
            setSelectedSpacecraftId('AURA-1');
          } else if (earthCrafts.length > 0) {
            setSelectedSpacecraftId(earthCrafts[0].id);
          }
        }
      } else {
        // User already selected destination or mission: preserve destination and ensure craft consistency
        const matching = destinationFilter === 'ALL'
          ? detailedCrafts
          : detailedCrafts.filter((c) => getSpacecraftDestinationGroup(c) === destinationFilter);
        if (matching.length === 0) {
          setSelectedSpacecraftId('');
        } else if (!matching.some((c) => c.id === selectedSpacecraftId)) {
          setSelectedSpacecraftId(matching[0].id);
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
  }, [destinationFilter, selectedSpacecraftId]);

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
        if (loc.destinationFilter && loc.destinationFilter !== destinationFilter) {
          setDestinationFilter(loc.destinationFilter);
        }
      }
    });
    return unsub;
  }, [activeModeView, universeTab, selectedSpacecraftId, destinationFilter]);

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
            destinationFilter,
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
            destinationFilter={destinationFilter}
            onSelectDestination={handleDestinationChange}
            loading={loading}
            error={fleetError}
          />

          {/* Center: Interactive 3D Orbital Visualization Stage */}
          <OrbitalStage3D
            spacecraftList={scopedSpacecraftList}
            selectedSpacecraftId={selectedSpacecraftId}
            onSelectSpacecraft={(id) => setSelectedSpacecraftId(id)}
            reducedMotion={reducedMotion}
            activeMission={activeMission}
            timeAdvanceNotice={timeAdvanceNotice}
            destinationFilter={destinationFilter}
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
                destinationFilter,
                selectedMissionId: activeMission?.id || null,
              });
            }}
            onStartMissionSuccess={(mission, run) => {
              userSelectedMissionRef.current = true;
              setActiveMission(mission);
              const mDest = getMissionDestinationGroup(mission);
              setDestinationFilter(mDest);
              if (run.spacecraftId) {
                setSelectedSpacecraftId(run.spacecraftId);
              }
              setActiveModeView('cockpit');
              navigationHistory.push({
                viewMode: 'mission-control',
                mcModeView: 'cockpit',
                destinationFilter: mDest,
                selectedSpacecraftId: run.spacecraftId || selectedSpacecraftId,
                selectedMissionId: mission.id,
              });
            }}
            onMissionStatusChanged={loadInitialData}
            onNavigateToConsole={(mission) => {
              if (mission) {
                userSelectedMissionRef.current = true;
                setActiveMission(mission);
                const mDest = getMissionDestinationGroup(mission);
                setDestinationFilter(mDest);
                if (mission.spacecraftId) {
                  setSelectedSpacecraftId(mission.spacecraftId);
                }
              }
              setActiveModeView('cockpit');
              navigationHistory.push({
                viewMode: 'mission-control',
                mcModeView: 'cockpit',
                destinationFilter: mission ? getMissionDestinationGroup(mission) : destinationFilter,
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
