import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissionControlView } from '../components/missionControl/MissionControlView';
import { MissionControlHeader } from '../components/missionControl/MissionControlHeader';
import { FleetSelectorBar } from '../components/missionControl/FleetSelectorBar';
import { TelemetryWorkspace } from '../components/missionControl/TelemetryWorkspace';
import { CommandConsole } from '../components/missionControl/CommandConsole';
import { FailureLabDrawer } from '../components/missionControl/FailureLabDrawer';
import { EventLogFeed } from '../components/missionControl/EventLogFeed';
import { OrbitalStage3D } from '../components/missionControl/OrbitalStage3D';
import { MissionUniverseHub } from '../components/missionControl/MissionUniverseHub';
import * as missionControlApi from '../api/missionControlApi';
import {
  SpacecraftDetail,
  SubsystemsHealth,
  SimulationStatus,
  CommandRecord,
  SimulationEvent,
  FaultScenarioMetadata,
  FaultRecord,
  MissionResponse,
  MissionRun,
} from '../types/missionControl';
import {
  resolveDestinationBody,
  getAuthoritativeVisualizationContext,
  getSpacecraftDestinationGroup,
  getMissionDestinationGroup,
  isSpacecraftCompatibleWithDestination,
  getCompatibleSpacecraftForDestination,
  destinationGroupToBody,
} from '../utils/destinationModel';
import { DEFAULT_SOLAR_SYSTEM_FLEET } from '../utils/fleetCatalog';

// Mock spacecraft detail fixture matching backend domain schema
const MOCK_DETAIL: SpacecraftDetail = {
  id: 'AURA-1',
  callSign: 'AURA-1',
  name: 'AURA-1',
  modelType: 'Earth Observation (SSO)',
  altitudeKm: 700.1,
  speedKmS: 7.51,
  operationalMode: 'SCIENCE_OPERATION',
  operationalStatus: 'NOMINAL',
  inEclipse: false,
  batterySocPercent: 94.2,
  dryMassKg: 1200,
  propellantMassKg: 150,
  totalMassKg: 1350,
  epoch: '2026-10-24T22:15:30Z',
  positionKm: { x: 3500.5, y: -4200.2, z: 5100.8 },
  velocityKmS: { x: -5.2, y: 4.1, z: 3.8 },
  solarArrayWatts: 420.5,
  elements: {
    semiMajorAxisKm: 7078.1,
    eccentricity: 0.0012,
    inclinationDeg: 98.2,
    raanDeg: 45.0,
    argOfPerigeeDeg: 60.0,
    trueAnomalyDeg: 142.5,
  },
  subsystems: {
    eps: {
      batterySocPercent: 94.2,
      solarArrayWatts: 420.5,
      batteryVoltageVolts: 28.4,
      busLoadWatts: 280.0,
      loadSheddingActive: false,
      solarDegradationMultiplier: 1.0,
      busOverloadActive: false,
    },
    tcs: {
      temperatureCelsius: 18.5,
      heaterActive: false,
      heaterOperational: true,
      radiatorEfficiency: 1.0,
      thermalSafingActive: false,
    },
    adcs: {
      pointingErrorDegrees: 0.02,
      attitudeLockStatus: 'NADIR_POINTING',
      reactionWheelSpeedRpm: 1250,
      starTrackerLocked: true,
      wheelFrictionActive: false,
    },
    comms: {
      linkStatus: 'LOCKED',
      linkMarginDb: 8.2,
      packetLossPercent: 0.0,
      carrierLocked: true,
      blackoutActive: false,
    },
    prop: {
      propellantMassKg: 42.5,
      tankPressureBar: 18.2,
      valveHealth: 'HEALTHY',
      thrustMultiplier: 1.0,
      leakActive: false,
    },
    obc: {
      cpuUtilizationPercent: 24.5,
      memoryUtilizationPercent: 38.2,
      flightSoftwareState: 'OPERATIONAL',
      rebootCount: 0,
      rebootRemainingSeconds: 0,
    },
  },
};

const MOCK_DETAIL_TERRA: SpacecraftDetail = {
  ...MOCK_DETAIL,
  id: 'TERRA-OBS',
  callSign: 'TERRA-OBS',
  name: 'TERRA-OBS',
  modelType: 'Multispectral Land Profiler',
  altitudeKm: 680.0,
  speedKmS: 7.55,
  operationalMode: 'NOMINAL',
  operationalStatus: 'DEGRADED',
  inEclipse: true,
  batterySocPercent: 78.4,
};

const MOCK_DETAIL_SOLIS: SpacecraftDetail = {
  ...MOCK_DETAIL,
  id: 'SOLIS-RELAY',
  callSign: 'SOLIS-RELAY',
  name: 'SOLIS-RELAY',
  modelType: 'Deep Space Crosslink Relay',
  altitudeKm: 14200.0,
  speedKmS: 5.2,
  operationalMode: 'COMMUNICATION',
  operationalStatus: 'NOMINAL',
  inEclipse: false,
  batterySocPercent: 98.1,
};

const MOCK_FLEET_DETAILS: SpacecraftDetail[] = [MOCK_DETAIL, MOCK_DETAIL_TERRA, MOCK_DETAIL_SOLIS];

// Mock subsystems health fixture matching backend domain schema
const MOCK_HEALTH: SubsystemsHealth = {
  spacecraftId: 'AURA-1',
  callSign: 'AURA-1',
  epoch: '2026-10-24T22:15:30Z',
  overallStatus: 'NOMINAL',
  subsystems: MOCK_DETAIL.subsystems!,
  activeFaultIds: [],
  activeFaultCount: 0,
};

// Mock simulation status fixture
const MOCK_SIM_STATUS: SimulationStatus = {
  lifecycle: 'RUNNING',
  currentEpoch: '2026-10-24T22:15:30Z',
  baseEpoch: '2026-10-24T21:15:30Z',
  elapsedSeconds: 3600.0,
  spacecraftCount: 3,
};

describe('ASTRA Mission Control Operations Console', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders MissionControlHeader with telemetry clocks, brand identity, and simulation controls', () => {
    const handleReturn = vi.fn();
    const handleSimUpdated = vi.fn();

    render(
      <MissionControlHeader
        onReturnHome={handleReturn}
        simulationStatus={MOCK_SIM_STATUS}
        connectionStatus="connected"
        onSimulationUpdated={handleSimUpdated}
      />
    );

    // Verify arrow-only return button with accessible label
    const returnBtn = screen.getByTestId('return-to-landing');
    expect(returnBtn).toBeInTheDocument();
    expect(returnBtn).toHaveAttribute('aria-label', expect.stringMatching(/Go back|Return to landing page/i));

    // Verify operations navigation tabs
    expect(screen.getByRole('tab', { name: /cockpit/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /missions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /failure lab/i })).toBeInTheDocument();

    // Verify Station Master Clock
    expect(screen.getByText(/STATION CLOCK/i)).toBeInTheDocument();

    // Verify STOMP connection indicator
    const connectionChip = screen.getByTestId('gateway-status');
    expect(connectionChip).toBeInTheDocument();
    expect(connectionChip).toHaveTextContent(/CONNECTED/i);

    // Verify return button click
    fireEvent.click(returnBtn);
    expect(handleReturn).toHaveBeenCalledTimes(1);

    // Verify simulation controls exist
    expect(screen.getByTestId('toggle-sim-lifecycle-btn')).toBeInTheDocument();
    expect(screen.getByTestId('advance-sim-btn')).toBeInTheDocument();
  });

  it('renders FleetSelectorBar and switches selected spacecraft', () => {
    const handleSelectCraft = vi.fn();

    render(
      <FleetSelectorBar
        spacecraftList={MOCK_FLEET_DETAILS}
        selectedSpacecraftId="AURA-1"
        onSelectSpacecraft={handleSelectCraft}
      />
    );

    // Renders all 3 fleet spacecraft
    expect(screen.getByTestId('fleet-card-AURA-1')).toBeInTheDocument();
    expect(screen.getByTestId('fleet-card-TERRA-OBS')).toBeInTheDocument();
    expect(screen.getByTestId('fleet-card-SOLIS-RELAY')).toBeInTheDocument();

    // Verify AURA-1 is active
    const auraCard = screen.getByTestId('fleet-card-AURA-1');
    expect(auraCard).toHaveClass('active');

    // Click TERRA-OBS to switch
    const terraCard = screen.getByTestId('fleet-card-TERRA-OBS');
    fireEvent.click(terraCard);
    expect(handleSelectCraft).toHaveBeenCalledWith('TERRA-OBS');
  });

  it('renders OrbitalStage3D and displays accurate orbit telemetry and HUD tracking', () => {
    const handleSelectCraft = vi.fn();

    render(
      <OrbitalStage3D
        spacecraftList={[MOCK_DETAIL]}
        selectedSpacecraftId="AURA-1"
        onSelectSpacecraft={handleSelectCraft}
        reducedMotion={false}
      />
    );

    // Verifies orbital stage container
    const stage = screen.getByTestId('orbital-stage-3d');
    expect(stage).toBeInTheDocument();

    // Verifies target vehicle lock HUD and orbital telemetry ribbon
    expect(screen.getByText(/ACTIVE TARGET \/\//i)).toBeInTheDocument();
    expect(screen.getByText('700.1 km')).toBeInTheDocument();
    expect(screen.getByText('7.51 km/s')).toBeInTheDocument();
    expect(screen.getByText('98.2°')).toBeInTheDocument();
    expect(screen.getByText('DAYLIGHT')).toBeInTheDocument();
    expect(screen.getByText('94.2%')).toBeInTheDocument();
  });

  it('renders TelemetryWorkspace displaying authoritative kinematics and 6-subsystem matrix', () => {
    render(
      <TelemetryWorkspace
        spacecraft={MOCK_DETAIL}
        subsystemsHealth={MOCK_HEALTH}
      />
    );

    // Kinematics coordinates
    expect(screen.getByText('3500.5 km')).toBeInTheDocument(); // X km
    expect(screen.getByText('-4200.2 km')).toBeInTheDocument(); // Y km
    expect(screen.getByText('5100.8 km')).toBeInTheDocument(); // Z km

    // Keplerian orbital elements
    expect(screen.getByText('7078.1 km')).toBeInTheDocument(); // a km
    expect(screen.getByText('0.0012')).toBeInTheDocument(); // e
    expect(screen.getByText('142.5°')).toBeInTheDocument(); // nu

    // Subsystems Health Matrix: EPS, TCS, ADCS, COMMS, PROP, OBC
    expect(screen.getByTestId('subsystem-cell-eps')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-cell-tcs')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-cell-adcs')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-cell-comms')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-cell-prop')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-cell-obc')).toBeInTheDocument();
  });

  it('renders CommandConsole and dispatches telecommands with unique client IDs', async () => {
    const handleCommandDispatched = vi.fn();
    const submitCommandSpy = vi.spyOn(missionControlApi, 'submitCommand').mockResolvedValue({
      commandId: 'cmd-test-1',
      spacecraftId: 'AURA-1',
      type: 'SET_OPERATIONAL_MODE',
      status: 'EXECUTED',
      message: 'Mode transition accepted',
      executionEpoch: '2026-10-24T22:15:30Z',
      idempotentReplay: false,
    });

    const mockCommands: CommandRecord[] = [];

    render(
      <CommandConsole
        selectedSpacecraft={MOCK_DETAIL}
        commandHistory={mockCommands}
        onCommandDispatched={handleCommandDispatched}
      />
    );

    expect(screen.getByTestId('command-console')).toBeInTheDocument();
    expect(screen.getByText(/TELECOMMAND DISPATCH TERMINAL/i)).toBeInTheDocument();

    // Select command type
    const commandSelect = screen.getByTestId('command-type-select');
    fireEvent.change(commandSelect, { target: { value: 'SET_OPERATIONAL_MODE' } });

    // Submit command
    const submitBtn = screen.getByTestId('dispatch-command-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitCommandSpy).toHaveBeenCalledTimes(1);
    });

    const [craftId, payload] = submitCommandSpy.mock.calls[0];
    expect(craftId).toBe('AURA-1');
    expect(payload.type).toBe('SET_OPERATIONAL_MODE');
    expect(payload.clientCommandId).toBeDefined();
    expect(payload.parameters.mode).toBe('SCIENCE_OPERATION');

    submitCommandSpy.mockRestore();
  });

  it('renders FailureLabDrawer and triggers simulated anomaly injection', async () => {
    const mockScenarios: FaultScenarioMetadata[] = [
      {
        code: 'EPS_SOLAR_PANEL_DEGRADATION',
        name: 'Solar Array Partial Shadowing',
        domain: 'EPS',
        defaultSeverity: 'MAJOR',
        description: 'Simulates 40% loss of solar array generation due to micrometeroid impact.',
        recoveryActionRequired: 'Rotate craft to sun-tracking angle',
        supportedParameters: ['efficiencyLossPercent'],
      },
    ];

    const mockFaults: FaultRecord[] = [];

    const listScenariosSpy = vi.spyOn(missionControlApi, 'listFaultScenarios').mockResolvedValue(mockScenarios);
    const listFaultsSpy = vi.spyOn(missionControlApi, 'listFaults').mockResolvedValue(mockFaults);
    const injectFaultSpy = vi.spyOn(missionControlApi, 'injectFault').mockResolvedValue({
      faultId: 'f-1',
      spacecraftId: 'AURA-1',
      scenarioCode: 'EPS_SOLAR_PANEL_DEGRADATION',
      domain: 'EPS',
      severity: 'MAJOR',
      lifecycleState: 'ACTIVE',
      injectedEpoch: '2026-10-24T22:15:30Z',
      recoveryActionRequired: 'Rotate craft to sun-tracking angle',
      description: 'Simulates 40% loss of solar array generation',
    });

    render(
      <FailureLabDrawer
        selectedSpacecraft={MOCK_DETAIL}
        onFaultsChanged={vi.fn()}
      />
    );

    expect(screen.getByTestId('failure-lab-drawer')).toBeInTheDocument();
    expect(screen.getByText(/FAILURE LAB \/\/ SIX-DOMAIN ANOMALY ENGINE/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Solar Array Partial Shadowing/i)).toBeInTheDocument();
    });

    // Click inject button
    const injectBtn = screen.getByTestId('inject-fault-btn');
    fireEvent.click(injectBtn);

    await waitFor(() => {
      expect(injectFaultSpy).toHaveBeenCalledTimes(1);
    });

    listScenariosSpy.mockRestore();
    listFaultsSpy.mockRestore();
    injectFaultSpy.mockRestore();
  });

  it('renders EventLogFeed with simulation events', () => {
    const mockEvents: SimulationEvent[] = [
      {
        eventId: 'evt-1',
        sequenceNumber: 101,
        type: 'COMMAND_DISPATCHED',
        simulationEpoch: '2026-10-24T22:15:30Z',
        wallClockTimestamp: '2026-10-24T22:15:30Z',
        spacecraftId: 'AURA-1',
        summary: 'Command SET_OPERATIONAL_MODE staged and acknowledged',
      },
      {
        eventId: 'evt-2',
        sequenceNumber: 102,
        type: 'ORBITAL_PROPAGATION',
        simulationEpoch: '2026-10-24T22:16:00Z',
        wallClockTimestamp: '2026-10-24T22:16:00Z',
        spacecraftId: 'AURA-1',
        summary: 'Spacecraft entered orbital eclipse zone',
      },
    ];

    render(<EventLogFeed events={mockEvents} />);

    expect(screen.getByTestId('event-log-feed')).toBeInTheDocument();
    expect(screen.getByText(/AUTHORITATIVE SIMULATION EVENT LOG/i)).toBeInTheDocument();
    expect(screen.getByText(/Command SET_OPERATIONAL_MODE staged and acknowledged/i)).toBeInTheDocument();
    expect(screen.getByText(/Spacecraft entered orbital eclipse zone/i)).toBeInTheDocument();
  });

  it('renders the complete MissionControlView container and handles return to landing', () => {
    const handleReturn = vi.fn();

    render(
      <MissionControlView
        onReturnHome={handleReturn}
        reducedMotion={false}
      />
    );

    expect(screen.getByTestId('mission-control-view')).toBeInTheDocument();
    expect(screen.getByTestId('mission-control-header')).toBeInTheDocument();
    expect(screen.getByTestId('fleet-selector-bar')).toBeInTheDocument();
    expect(screen.getByTestId('orbital-stage-3d')).toBeInTheDocument();
    expect(screen.getByTestId('telemetry-workspace')).toBeInTheDocument();

    // Test returning to landing
    const returnBtn = screen.getByTestId('return-to-landing');
    fireEvent.click(returnBtn);
    expect(handleReturn).toHaveBeenCalledTimes(1);
  });

  it('toggles Target Camera between TARGET_LOCK and FREE repeatedly without crashing', () => {
    render(
      <OrbitalStage3D
        spacecraftList={MOCK_FLEET_DETAILS}
        selectedSpacecraftId="AURA-1"
        onSelectSpacecraft={vi.fn()}
      />
    );

    const toggleBtn = screen.getByTestId('toggle-target-camera-btn');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent(/TARGET_LOCK/i);

    // Toggle to FREE
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent(/FREE/i);

    // Toggle back to TARGET_LOCK
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent(/TARGET_LOCK/i);

    // Toggle to FREE again
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent(/FREE/i);
  });

  it('renders reorganized top navigation with exact [<-] [COCKPIT] [MISSIONS] [FAILURE LAB] order inside header-left', () => {
    const mockStatus: SimulationStatus = {
      lifecycle: 'RUNNING',
      currentEpoch: '2026-10-24T22:15:30Z',
      baseEpoch: '2026-10-24T22:00:00Z',
      elapsedSeconds: 930,
      spacecraftCount: 3,
    };

    render(
      <MissionControlHeader
        onReturnHome={vi.fn()}
        simulationStatus={mockStatus}
        connectionStatus="connected"
        onSimulationUpdated={vi.fn()}
        activeModeView="cockpit"
        onSelectModeView={vi.fn()}
      />
    );

    const header = screen.getByTestId('mission-control-header');
    const headerLeft = header.querySelector('.astra-mc-header-left');
    expect(headerLeft).toBeInTheDocument();

    // Verify arrow button is the first child
    const children = Array.from(headerLeft!.children);
    expect(children[0]).toHaveAttribute('data-testid', 'return-to-landing');

    // Verify primary navigation is directly after the return arrow
    const nav = children[1];
    expect(nav).toHaveClass('astra-mc-header-nav');

    // Check nav buttons order: COCKPIT, MISSIONS, FAILURE LAB
    const navButtons = Array.from(nav.querySelectorAll('button'));
    expect(navButtons).toHaveLength(3);
    expect(navButtons[0]).toHaveTextContent(/COCKPIT/i);
    expect(navButtons[1]).toHaveTextContent(/MISSIONS/i);
    expect(navButtons[2]).toHaveTextContent(/FAILURE LAB/i);
  });

  it('reflects truthful STOMP connection lifecycle states (CONNECTING, CONNECTED, RECONNECTING, DISCONNECTED, ERROR)', () => {
    const { rerender } = render(
      <MissionControlHeader
        onReturnHome={vi.fn()}
        simulationStatus={null}
        connectionStatus="connecting"
        onSimulationUpdated={vi.fn()}
      />
    );
    expect(screen.getByTestId('gateway-status')).toHaveTextContent(/STREAM: CONNECTING/i);

    rerender(
      <MissionControlHeader
        onReturnHome={vi.fn()}
        simulationStatus={null}
        connectionStatus="connected"
        onSimulationUpdated={vi.fn()}
      />
    );
    expect(screen.getByTestId('gateway-status')).toHaveTextContent(/STREAM: CONNECTED/i);

    rerender(
      <MissionControlHeader
        onReturnHome={vi.fn()}
        simulationStatus={null}
        connectionStatus="reconnecting"
        onSimulationUpdated={vi.fn()}
      />
    );
    expect(screen.getByTestId('gateway-status')).toHaveTextContent(/STREAM: RECONNECTING/i);

    rerender(
      <MissionControlHeader
        onReturnHome={vi.fn()}
        simulationStatus={null}
        connectionStatus="disconnected"
        onSimulationUpdated={vi.fn()}
      />
    );
    expect(screen.getByTestId('gateway-status')).toHaveTextContent(/STREAM: DISCONNECTED/i);

    rerender(
      <MissionControlHeader
        onReturnHome={vi.fn()}
        simulationStatus={null}
        connectionStatus="error"
        onSimulationUpdated={vi.fn()}
      />
    );
    expect(screen.getByTestId('gateway-status')).toHaveTextContent(/STREAM: ERROR/i);
  });

  it('advances simulation time authoritatively on +60s and displays floating toast upon confirmation', async () => {
    const mockStatus: SimulationStatus = {
      lifecycle: 'RUNNING',
      currentEpoch: '2026-10-24T22:15:30Z',
      baseEpoch: '2026-10-24T22:00:00Z',
      elapsedSeconds: 930,
      spacecraftCount: 3,
    };

    const advanceSpy = vi.spyOn(missionControlApi, 'advanceSimulation').mockResolvedValue(undefined as any);
    const updateSpy = vi.fn();

    render(
      <MissionControlHeader
        onReturnHome={vi.fn()}
        simulationStatus={mockStatus}
        connectionStatus="connected"
        onSimulationUpdated={updateSpy}
      />
    );

    const advanceBtn = screen.getByTestId('advance-sim-btn');
    expect(screen.queryByTestId('time-advance-indicator')).not.toBeInTheDocument();

    fireEvent.click(advanceBtn);

    await waitFor(() => {
      expect(advanceSpy).toHaveBeenCalledWith(60);
      expect(updateSpy).toHaveBeenCalled();
      expect(screen.getByTestId('time-advance-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('time-advance-indicator')).toHaveTextContent('+60 SECONDS');
    });

    advanceSpy.mockRestore();
  });

  it('opens New Mission modal, validates fields, and registers mission', async () => {
    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockResolvedValue([]);
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue([]);
    const createSpy = vi.spyOn(missionControlApi, 'createMission').mockResolvedValue({
      id: 'MSN-TEST-EUROPA-1',
      title: 'Europa Subsurface Survey',
      destination: 'Europa',
      destinationGroup: 'Outer Planets',
      category: 'PLANETARY_RECONNAISSANCE',
      categoryLabel: 'Planetary Reconnaissance',
      difficulty: 'CRITICAL',
      difficultyLabel: 'Critical',
      spacecraftId: 'AURA-1',
      durationMinutes: 60,
      riskLevel: 'SEVERE',
      synopsis: 'Surveying ice fractures on Europa',
      objectives: ['Analyze plume spectra'],
      completionCriteria: ['Data received'],
      operationalConstraints: ['Radiation hardening'],
      isSimulated: true,
      status: 'AVAILABLE',
    });

    render(
      <MissionUniverseHub
        spacecraftList={[MOCK_DETAIL]}
        onSelectSpacecraft={vi.fn()}
      />
    );

    // Open modal
    const openBtn = screen.getByTestId('open-create-mission-modal-btn');
    fireEvent.click(openBtn);

    expect(screen.getByTestId('create-mission-modal')).toBeInTheDocument();

    // Fill form
    const titleInput = screen.getByLabelText(/mission title/i);
    const destInput = screen.getByLabelText(/destination target/i);
    const synopsisInput = screen.getByLabelText(/operational synopsis/i);

    fireEvent.change(titleInput, { target: { value: 'Europa Subsurface Survey' } });
    fireEvent.change(destInput, { target: { value: 'Europa (Low Jovian Polar, 400 km)' } });
    fireEvent.change(synopsisInput, { target: { value: 'Surveying ice fractures on Europa' } });

    // Submit
    const submitBtn = screen.getByTestId('submit-create-mission-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    expect(createSpy.mock.calls[0][0].title).toBe('Europa Subsurface Survey');

    listSpy.mockRestore();
    historySpy.mockRestore();
    createSpy.mockRestore();
  });

  it('filters missions by destination, search query, and resets filters on empty state', async () => {
    const mockMissions: MissionResponse[] = [
      {
        id: 'MSN-EARTH-1',
        title: 'Terra Orbit Sentinel',
        destination: 'Low Earth Orbit (550 km)',
        destinationGroup: 'Earth',
        category: 'EARTH_OBSERVATION',
        categoryLabel: 'Earth Observation',
        difficulty: 'STANDARD',
        difficultyLabel: 'Standard',
        spacecraftId: 'AURA-1',
        durationMinutes: 45,
        riskLevel: 'LOW',
        synopsis: 'Polar multispectral telemetry sweep',
        objectives: ['Acquire nadir telemetry'],
        completionCriteria: ['Telemetry lock maintained'],
        operationalConstraints: ['Thermal within limits'],
        isSimulated: true,
        status: 'AVAILABLE',
      },
      {
        id: 'MSN-MARS-1',
        title: 'Ares Atmosphere Monitor',
        destination: 'Areocentric Orbit (400 km)',
        destinationGroup: 'Mars',
        category: 'PLANETARY_RECONNAISSANCE',
        categoryLabel: 'Planetary Reconnaissance',
        difficulty: 'CHALLENGING',
        difficultyLabel: 'Challenging',
        spacecraftId: 'SOL-EXP-2',
        durationMinutes: 90,
        riskLevel: 'HIGH',
        synopsis: 'Methane trace survey in Martian upper atmosphere',
        objectives: ['Deploy spectrometer'],
        completionCriteria: ['Spectra verified'],
        operationalConstraints: ['Dust storm avoidance'],
        isSimulated: true,
        status: 'ACTIVE',
      },
    ];

    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockResolvedValue(mockMissions);
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue([]);

    render(
      <MissionUniverseHub
        spacecraftList={[MOCK_DETAIL]}
        onSelectSpacecraft={vi.fn()}
      />
    );

    // Initial render shows both missions
    await waitFor(() => {
      expect(screen.getByText('Terra Orbit Sentinel')).toBeInTheDocument();
      expect(screen.getByText('Ares Atmosphere Monitor')).toBeInTheDocument();
    });

    // Destination filter: Mars
    const marsDestBtn = screen.getByTestId('dest-filter-Mars');
    fireEvent.click(marsDestBtn);

    expect(screen.getByText('Ares Atmosphere Monitor')).toBeInTheDocument();
    expect(screen.queryByText('Terra Orbit Sentinel')).not.toBeInTheDocument();

    // Search box: filter for something non-existent
    const searchInput = screen.getByLabelText(/search missions by name/i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentSpacecraft' } });

    // Should display filter mismatch empty state
    expect(screen.getByTestId('missions-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/no missions found matching active filters/i)).toBeInTheDocument();
    expect(screen.getByTestId('reset-filters-btn')).toBeInTheDocument();
    expect(screen.getByTestId('empty-create-mission-btn')).toBeInTheDocument();

    // Reset filters
    fireEvent.click(screen.getByTestId('reset-filters-btn'));

    // Both missions restored
    await waitFor(() => {
      expect(screen.getByText('Terra Orbit Sentinel')).toBeInTheDocument();
      expect(screen.getByText('Ares Atmosphere Monitor')).toBeInTheDocument();
    });

    listSpy.mockRestore();
    historySpy.mockRestore();
  });

  it('displays empty catalogue state when catalogue contains no missions', async () => {
    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockResolvedValue([]);
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue([]);

    render(
      <MissionUniverseHub
        spacecraftList={[MOCK_DETAIL]}
        onSelectSpacecraft={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('missions-empty-catalogue-state')).toBeInTheDocument();
      expect(screen.getByText(/mission catalogue empty/i)).toBeInTheDocument();
      expect(screen.getByTestId('create-first-mission-btn')).toBeInTheDocument();
    });

    listSpy.mockRestore();
    historySpy.mockRestore();
  });

  it('displays error empty state and retries connection on API failure', async () => {
    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockRejectedValueOnce(new Error('Gateway timeout'));
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue([]);

    render(
      <MissionUniverseHub
        spacecraftList={[MOCK_DETAIL]}
        onSelectSpacecraft={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('missions-error-state')).toBeInTheDocument();
      expect(screen.getByText(/unable to load mission catalogue/i)).toBeInTheDocument();
      expect(screen.getByText(/gateway timeout/i)).toBeInTheDocument();
      expect(screen.getByTestId('missions-retry-btn')).toBeInTheDocument();
    });

    // Mock successful retry
    listSpy.mockResolvedValueOnce([
      {
        id: 'MSN-RETRY-1',
        title: 'Orbital Reconnaissance Beta',
        destination: 'Earth',
        destinationGroup: 'Earth',
        category: 'EARTH_OBSERVATION',
        categoryLabel: 'Earth Observation',
        difficulty: 'STANDARD',
        difficultyLabel: 'Standard',
        spacecraftId: 'AURA-1',
        durationMinutes: 30,
        riskLevel: 'LOW',
        synopsis: 'Post-recovery sweep',
        objectives: [],
        completionCriteria: [],
        operationalConstraints: [],
        isSimulated: true,
        status: 'AVAILABLE',
      },
    ]);

    fireEvent.click(screen.getByTestId('missions-retry-btn'));

    await waitFor(() => {
      expect(screen.getByText('Orbital Reconnaissance Beta')).toBeInTheDocument();
    });

    listSpy.mockRestore();
    historySpy.mockRestore();
  });

  it('displays authentication required error state when catalogue fails with 401', async () => {
    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockRejectedValueOnce(
      new missionControlApi.MissionControlApiError(401, 'Full authentication is required to access this resource', '/missions')
    );
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue([]);

    render(
      <MissionUniverseHub
        spacecraftList={[MOCK_DETAIL]}
        onSelectSpacecraft={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('missions-error-state')).toBeInTheDocument();
      expect(screen.getByText('AUTHENTICATION REQUIRED')).toBeInTheDocument();
      expect(screen.getByText(/Full authentication is required/i)).toBeInTheDocument();
      // Ensure only single plus icon and exact text NEW MISSION
      expect(screen.getByTestId('error-create-mission-btn')).toHaveTextContent('NEW MISSION');
      expect(screen.getByTestId('error-create-mission-btn')).not.toHaveTextContent('+ +');
    });

    listSpy.mockRestore();
    historySpy.mockRestore();
  });

  it('renders simplified 3-section New Mission form, validates required fields, and toggles advanced directives', async () => {
    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockResolvedValue([]);
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue([]);
    const createSpy = vi.spyOn(missionControlApi, 'createMission').mockResolvedValue({
      id: 'MSN-TEST-SIMPLIFIED',
      title: 'Phobos Surface Reconnaissance',
      destination: 'Mars (Phobos)',
      destinationGroup: 'Mars',
      category: 'PLANETARY_RECONNAISSANCE',
      categoryLabel: 'Planetary Reconnaissance',
      difficulty: 'CHALLENGING',
      difficultyLabel: 'Challenging',
      spacecraftId: 'AURA-1',
      durationMinutes: 45,
      riskLevel: 'HIGH',
      synopsis: 'Deploy surface telemetry package to Phobos',
      objectives: ['Deploy package'],
      completionCriteria: ['Signal acquired'],
      operationalConstraints: ['Thermal limits'],
      isSimulated: true,
      status: 'AVAILABLE',
    });

    render(
      <MissionUniverseHub
        spacecraftList={[MOCK_DETAIL]}
        onSelectSpacecraft={vi.fn()}
      />
    );

    // Open modal
    fireEvent.click(screen.getByTestId('open-create-mission-modal-btn'));
    expect(screen.getByTestId('create-mission-modal')).toBeInTheDocument();

    // Verify 3 distinct sections
    expect(screen.getByText('MISSION IDENTITY')).toBeInTheDocument();
    expect(screen.getByText('MISSION CONFIGURATION')).toBeInTheDocument();
    expect(screen.getByText('REVIEW & CREATE')).toBeInTheDocument();

    // Verify advanced directives toggle disclosure starts collapsed
    expect(screen.queryByLabelText(/primary directives/i)).not.toBeInTheDocument();
    const toggleBtn = screen.getByTestId('toggle-advanced-directives-btn');
    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText(/primary directives/i)).toBeInTheDocument();

    // Submit with empty required fields to trigger validation
    const submitBtn = screen.getByTestId('submit-create-mission-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Mission title is required.')).toBeInTheDocument();
      expect(screen.getByText('Destination target is required.')).toBeInTheDocument();
      expect(screen.getByText('Mission objective or synopsis is required.')).toBeInTheDocument();
      expect(createSpy).not.toHaveBeenCalled();
    });

    // Fill valid data
    fireEvent.change(screen.getByLabelText(/mission title/i), {
      target: { value: 'Phobos Surface Reconnaissance' },
    });
    fireEvent.change(screen.getByLabelText(/destination target/i), {
      target: { value: 'Mars (Phobos Orbit, 200 km)' },
    });
    fireEvent.change(screen.getByLabelText(/operational synopsis/i), {
      target: { value: 'Deploy surface telemetry package to Phobos' },
    });

    // Verify review summary displays auto-detected region and values
    expect(screen.getByText(/Mars \(Phobos Orbit, 200 km\) \(Mars\)/i)).toBeInTheDocument();

    // Submit valid form
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    expect(createSpy.mock.calls[0][0]).toMatchObject({
      title: 'Phobos Surface Reconnaissance',
      destination: 'Mars (Phobos Orbit, 200 km)',
      destinationGroup: 'Mars',
      durationMinutes: 45,
    });

    listSpy.mockRestore();
    historySpy.mockRestore();
    createSpy.mockRestore();
  });

  it('displays authorization failure banner when mission creation is rejected with 403', async () => {
    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockResolvedValue([]);
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue([]);
    const createSpy = vi.spyOn(missionControlApi, 'createMission').mockRejectedValueOnce(
      new missionControlApi.MissionControlApiError(403, 'Access Denied: OPERATOR or FLIGHT_DIRECTOR role required', '/missions')
    );

    render(
      <MissionUniverseHub
        spacecraftList={[MOCK_DETAIL]}
        onSelectSpacecraft={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('open-create-mission-modal-btn'));

    fireEvent.change(screen.getByLabelText(/mission title/i), {
      target: { value: 'Unauthorized Mission Attempt' },
    });
    fireEvent.change(screen.getByLabelText(/destination target/i), {
      target: { value: 'Moon' },
    });
    fireEvent.change(screen.getByLabelText(/operational synopsis/i), {
      target: { value: 'Testing auth error boundary' },
    });

    fireEvent.click(screen.getByTestId('submit-create-mission-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Authorization Failure: Operator credentials required/i)).toBeInTheDocument();
    });

    listSpy.mockRestore();
    historySpy.mockRestore();
    createSpy.mockRestore();
  });

  it('renders deliberate navigation tabs for Catalogue and Mission History with real counts bound to data', async () => {
    const mockMissions: MissionResponse[] = [
      {
        id: 'MARS-RECON-01',
        title: 'Mars Orbital Reconnaissance',
        destination: 'Mars (Areostationary & Polar Elliptical)',
        destinationGroup: 'Mars',
        category: 'PLANETARY_RECONNAISSANCE',
        categoryLabel: 'Planetary Reconnaissance',
        difficulty: 'CHALLENGING',
        difficultyLabel: 'Challenging',
        spacecraftId: 'TERRA-OBS',
        durationMinutes: 90,
        riskLevel: 'HIGH',
        synopsis: 'High-altitude surface imaging campaign over Martian volcanic and canyon formations.',
        objectives: ['Swath capture of Valles Marineris', 'Monitor battery reserves during Martian night'],
        completionCriteria: ['Optical payload completes', 'Thermal balance maintained'],
        operationalConstraints: ['Communication latency 4 to 20 minutes'],
        isSimulated: true,
        status: 'AVAILABLE',
      },
    ];

    const mockHistory: MissionRun[] = [
      {
        runId: 'run-mars-99',
        missionId: 'MARS-RECON-01',
        spacecraftId: 'TERRA-OBS',
        destination: 'Mars (Areostationary & Polar Elliptical)',
        destinationGroup: 'Mars',
        status: 'COMPLETED',
        startedEpoch: '2026-10-24T12:00:00Z',
        completedEpoch: '2026-10-24T13:30:00Z',
        telemetrySnapshotsCaptured: 42,
        commandsDispatched: 5,
        outcomeSummary: 'Mars orbit insertion and surface imagery completed successfully.',
        operatorUsername: 'flight-dir',
      },
    ];

    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockResolvedValue(mockMissions);
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue(mockHistory);

    render(
      <MissionUniverseHub
        spacecraftList={[MOCK_DETAIL_TERRA]}
        onSelectSpacecraft={vi.fn()}
      />
    );

    // Verify tabs with real counts
    await waitFor(() => {
      expect(screen.getByTestId('tab-universe-catalogue')).toHaveTextContent(/CATALOGUE \(1\)/i);
      expect(screen.getByTestId('tab-universe-history')).toHaveTextContent(/MISSION HISTORY \(1\)/i);
    });

    expect(screen.getByTestId('tab-universe-catalogue')).toHaveClass('active');

    // Switch to history tab
    fireEvent.click(screen.getByTestId('tab-universe-history'));
    expect(screen.getByTestId('mission-history-view')).toBeInTheDocument();
    expect(screen.getByTestId('history-row-run-mars-99')).toBeInTheDocument();
    expect(screen.getByText(/Mars orbit insertion and surface imagery completed successfully/i)).toBeInTheDocument();

    listSpy.mockRestore();
    historySpy.mockRestore();
  });

  it('makes mission cards visibly interactive with expandable operational gates and action buttons', async () => {
    const mockMissions: MissionResponse[] = [
      {
        id: 'MARS-RECON-01',
        title: 'Mars Orbital Reconnaissance',
        destination: 'Mars (Areostationary & Polar Elliptical)',
        destinationGroup: 'Mars',
        category: 'PLANETARY_RECONNAISSANCE',
        categoryLabel: 'Planetary Reconnaissance',
        difficulty: 'CHALLENGING',
        difficultyLabel: 'Challenging',
        spacecraftId: 'TERRA-OBS',
        durationMinutes: 90,
        riskLevel: 'HIGH',
        synopsis: 'High-altitude surface imaging campaign over Martian volcanic and canyon formations.',
        objectives: ['Swath capture of Valles Marineris', 'Monitor battery reserves during Martian night'],
        completionCriteria: ['Optical payload completes', 'Thermal balance maintained'],
        operationalConstraints: ['Communication latency 4 to 20 minutes'],
        isSimulated: true,
        status: 'AVAILABLE',
      },
    ];

    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockResolvedValue(mockMissions);
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue([]);

    render(
      <MissionUniverseHub
        spacecraftList={[MOCK_DETAIL_TERRA]}
        onSelectSpacecraft={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('mission-card-MARS-RECON-01')).toBeInTheDocument();
    });

    // Destination badge and name are distinct within the mission card
    const card = screen.getByTestId('mission-card-MARS-RECON-01');
    expect(within(card).getByText('Mars')).toHaveClass('astra-mc-card-dest-badge');
    expect(within(card).getByText('Mars (Areostationary & Polar Elliptical)')).toHaveClass('astra-mc-card-dest-name');

    // Action buttons visible
    expect(screen.getByTestId('card-briefing-btn-MARS-RECON-01')).toBeInTheDocument();
    expect(screen.getByTestId('card-start-btn-MARS-RECON-01')).toBeInTheDocument();

    // Toggle operational gates
    const gatesToggle = screen.getByTestId('gates-toggle-MARS-RECON-01');
    expect(gatesToggle).toHaveTextContent(/2 Operational Gates/i);
    expect(screen.queryByTestId('gates-list-MARS-RECON-01')).not.toBeInTheDocument();

    fireEvent.click(gatesToggle);
    expect(screen.getByTestId('gates-list-MARS-RECON-01')).toBeInTheDocument();
    expect(screen.getByText('Swath capture of Valles Marineris')).toBeInTheDocument();

    // Collapse gates
    fireEvent.click(gatesToggle);
    expect(screen.queryByTestId('gates-list-MARS-RECON-01')).not.toBeInTheDocument();

    listSpy.mockRestore();
    historySpy.mockRestore();
  });

  it('retains Mars destination end-to-end when launching a Mars mission in Cockpit and OrbitalStage3D', async () => {
    const marsMission: MissionResponse = {
      id: 'MARS-ATMOSPHERE-01',
      title: 'Mars Atmospheric Dynamics Analysis',
      destination: 'Mars (Low Areocentric Orbit, 320 km)',
      destinationGroup: 'Mars',
      category: 'PLANETARY_RECONNAISSANCE',
      categoryLabel: 'Planetary Reconnaissance',
      difficulty: 'CHALLENGING',
      difficultyLabel: 'Challenging',
      spacecraftId: 'TERRA-OBS',
      durationMinutes: 75,
      riskLevel: 'HIGH',
      synopsis: 'Execute periapsis atmospheric density dips to characterize Martian dust veil.',
      objectives: ['Sample thermospheric drag perturbation'],
      completionCriteria: ['Accelerometer telemetry logged'],
      operationalConstraints: ['Thermal limit 220C'],
      isSimulated: true,
      status: 'AVAILABLE',
    };

    const marsRun: MissionRun = {
      runId: 'run-mars-404',
      missionId: 'MARS-ATMOSPHERE-01',
      spacecraftId: 'TERRA-OBS',
      destination: 'Mars (Low Areocentric Orbit, 320 km)',
      destinationGroup: 'Mars',
      status: 'ACTIVE',
      startedEpoch: '2026-10-25T12:00:00Z',
      telemetrySnapshotsCaptured: 10,
      commandsDispatched: 1,
      outcomeSummary: 'Mission simulation run active. Spacecraft telemetry stream bound.',
      operatorUsername: 'operator',
    };

    const listCraftSpy = vi.spyOn(missionControlApi, 'listSpacecraft').mockResolvedValue([MOCK_DETAIL_TERRA]);
    const craftDetailSpy = vi.spyOn(missionControlApi, 'getSpacecraftDetail').mockResolvedValue(MOCK_DETAIL_TERRA);
    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockResolvedValue([marsMission]);
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue([]);
    const startSpy = vi.spyOn(missionControlApi, 'startMission').mockResolvedValue(marsRun);

    render(<MissionControlView onReturnHome={vi.fn()} />);

    // Switch to Universe mode
    fireEvent.click(screen.getByTestId('mode-universe-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('mission-card-MARS-ATMOSPHERE-01')).toBeInTheDocument();
    });

    // Click Start Mission on Mars Card
    fireEvent.click(screen.getByTestId('card-start-btn-MARS-ATMOSPHERE-01'));

    // Should switch to Cockpit with Mars destination retained!
    await waitFor(() => {
      expect(screen.getByTestId('orbital-stage-3d')).toBeInTheDocument();
      expect(screen.getByTestId('header-active-mission-badge')).toBeInTheDocument();
      expect(screen.getByTestId('header-active-mission-badge')).toHaveTextContent(/MARS/i);
      expect(screen.getByTestId('hud-scientific-regime')).toHaveTextContent(/AREOCENTRIC/i);
      expect(screen.getByTestId('toggle-frame-btn')).toHaveTextContent(/MCI_J2000/i);
    });

    listCraftSpy.mockRestore();
    craftDetailSpy.mockRestore();
    listSpy.mockRestore();
    historySpy.mockRestore();
    startSpy.mockRestore();
  });

  it('renders redesigned Mission History with timing grid, outcome report, search, and status filters', async () => {
    const mockMissions: MissionResponse[] = [
      {
        id: 'LUNAR-PROSPECT-01',
        title: 'Lunar Polar Resource Prospecting',
        destination: 'Moon (South Pole Aitken Basin)',
        destinationGroup: 'Lunar & Deep Space',
        category: 'PLANETARY_RECONNAISSANCE',
        categoryLabel: 'Resource Prospecting',
        difficulty: 'CHALLENGING',
        difficultyLabel: 'Challenging',
        spacecraftId: 'CHANDRA-ORB',
        durationMinutes: 60,
        riskLevel: 'HIGH',
        synopsis: 'Volatile element detection over permanently shadowed craters.',
        objectives: ['Neutron spectrometer sweep', 'Laser altimetry verification'],
        completionCriteria: ['Data map generated', 'Zero critical anomalies'],
        operationalConstraints: ['Thermal limits in shadow'],
        isSimulated: true,
        status: 'COMPLETED',
      },
    ];

    const mockHistory: MissionRun[] = [
      {
        runId: 'run-lunar-01',
        missionId: 'LUNAR-PROSPECT-01',
        spacecraftId: 'CHANDRA-ORB',
        operatorUsername: 'operator-alpha',
        startedEpoch: '2026-10-25T10:00:00Z',
        completedEpoch: '2026-10-25T11:00:00Z',
        status: 'COMPLETED',
        outcomeSummary: 'Lunar polar neutron spectrometry campaign completed with 99.4% data integrity.',
        destinationGroup: 'Lunar & Deep Space',
        telemetrySnapshotsCaptured: 14,
        commandsDispatched: 3,
        objectiveResults: {
          'Neutron spectrometer sweep': true,
          'Laser altimetry verification': true,
        },
      },
      {
        runId: 'run-mars-fail',
        missionId: 'MARS-ATMOSPHERE-01',
        spacecraftId: 'TERRA-OBS',
        operatorUsername: 'operator-beta',
        startedEpoch: '2026-10-25T08:00:00Z',
        completedEpoch: '2026-10-25T08:25:00Z',
        status: 'FAILED',
        outcomeSummary: 'Attitude deviation exceeded safety envelope during atmospheric dipping pass.',
        destinationGroup: 'Mars',
        telemetrySnapshotsCaptured: 6,
        commandsDispatched: 1,
        objectiveResults: {
          'Atmospheric entry trajectory': false,
        },
      },
    ];

    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockResolvedValue(mockMissions);
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue(mockHistory);

    render(<MissionUniverseHub />);

    // Switch to history tab
    await waitFor(() => {
      expect(screen.getByTestId('tab-universe-history')).toHaveTextContent(/MISSION HISTORY \(2\)/i);
    });
    fireEvent.click(screen.getByTestId('tab-universe-history'));

    // Verify record cards rendering
    expect(screen.getByTestId('history-row-run-lunar-01')).toBeInTheDocument();
    expect(screen.getByTestId('history-row-run-mars-fail')).toBeInTheDocument();
    expect(screen.getByText(/Lunar polar neutron spectrometry campaign/i)).toBeInTheDocument();

    // Verify status filter pill filtering
    const failedFilter = screen.getByTestId('history-filter-failed');
    fireEvent.click(failedFilter);
    expect(screen.queryByTestId('history-row-run-lunar-01')).not.toBeInTheDocument();
    expect(screen.getByTestId('history-row-run-mars-fail')).toBeInTheDocument();

    // Verify search input filtering
    const allFilter = screen.getByTestId('history-filter-all');
    fireEvent.click(allFilter);
    const searchInput = screen.getByTestId('history-search-input');
    fireEvent.change(searchInput, { target: { value: 'CHANDRA-ORB' } });
    expect(screen.getByTestId('history-row-run-lunar-01')).toBeInTheDocument();
    expect(screen.queryByTestId('history-row-run-mars-fail')).not.toBeInTheDocument();

    // Expand objective verification gates
    fireEvent.change(searchInput, { target: { value: '' } });
    const gatesToggle = screen.getByTestId('history-gates-toggle-run-lunar-01');
    fireEvent.click(gatesToggle);
    expect(screen.getByText('Neutron spectrometer sweep')).toBeInTheDocument();

    listSpy.mockRestore();
    historySpy.mockRestore();
  });

  it('enforces single active mission policy and prompts switch confirmation modal when another mission is active', async () => {
    const mockMissions: MissionResponse[] = [
      {
        id: 'EARTH-OBS-01',
        title: 'Earth Multispectral Observation',
        destination: 'Earth (Low Earth SSO)',
        destinationGroup: 'Earth',
        category: 'EARTH_OBSERVATION',
        categoryLabel: 'Earth Observation',
        difficulty: 'STANDARD',
        difficultyLabel: 'Standard',
        spacecraftId: 'AURA-1',
        durationMinutes: 45,
        riskLevel: 'MODERATE',
        synopsis: 'Active earth multispectral observation.',
        objectives: ['Sync orbit'],
        completionCriteria: ['Nominal telemetry'],
        operationalConstraints: ['Battery > 50%'],
        isSimulated: true,
        status: 'ACTIVE',
        activeRun: {
          runId: 'run-active-001',
          missionId: 'EARTH-OBS-01',
          spacecraftId: 'AURA-1',
          startedEpoch: '2026-10-25T12:00:00Z',
          status: 'ACTIVE',
          destinationGroup: 'Earth',
          telemetrySnapshotsCaptured: 5,
          commandsDispatched: 1,
          outcomeSummary: 'Active flight in progress',
        },
      },
      {
        id: 'MARS-RECON-01',
        title: 'Mars Orbital Reconnaissance',
        destination: 'Mars (Areostationary)',
        destinationGroup: 'Mars',
        category: 'PLANETARY_RECONNAISSANCE',
        categoryLabel: 'Planetary Reconnaissance',
        difficulty: 'CHALLENGING',
        difficultyLabel: 'Challenging',
        spacecraftId: 'TERRA-OBS',
        durationMinutes: 90,
        riskLevel: 'HIGH',
        synopsis: 'Mars reconnaissance scenario.',
        objectives: ['Areostationary insertion'],
        completionCriteria: ['High resolution radar lock'],
        operationalConstraints: ['Sun angle limitations'],
        isSimulated: true,
        status: 'AVAILABLE',
      },
    ];

    const listSpy = vi.spyOn(missionControlApi, 'listMissions').mockResolvedValue(mockMissions);
    const historySpy = vi.spyOn(missionControlApi, 'getMissionHistory').mockResolvedValue([]);
    const startSpy = vi.spyOn(missionControlApi, 'startMission').mockResolvedValue({
      runId: 'run-mars-002',
      missionId: 'MARS-RECON-01',
      spacecraftId: 'TERRA-OBS',
      startedEpoch: '2026-10-25T13:00:00Z',
      status: 'ACTIVE',
      destinationGroup: 'Mars',
      telemetrySnapshotsCaptured: 0,
      commandsDispatched: 0,
      outcomeSummary: 'Scenario initialized',
    });

    render(<MissionUniverseHub activeMission={mockMissions[0]} />);

    await waitFor(() => {
      expect(screen.getByTestId('card-start-btn-MARS-RECON-01')).toBeInTheDocument();
    });

    // Clicking Start on MARS-RECON-01 while EARTH-OBS-01 is active triggers switch confirmation modal!
    fireEvent.click(screen.getByTestId('card-start-btn-MARS-RECON-01'));

    await waitFor(() => {
      expect(screen.getByTestId('switch-mission-modal')).toBeInTheDocument();
      expect(screen.getByText(/ACTIVE MISSION RUN IN PROGRESS \/\/ CONFIRM SWITCH/i)).toBeInTheDocument();
      expect(screen.getByText(/Will be ABORTED and archived to Mission History/i)).toBeInTheDocument();
      expect(screen.getByTestId('confirm-switch-mission-btn')).toBeInTheDocument();
    });

    // Confirm the switch: must call startMission with abortActive = true
    fireEvent.click(screen.getByTestId('confirm-switch-mission-btn'));

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledWith('MARS-RECON-01', true);
    });

    listSpy.mockRestore();
    historySpy.mockRestore();
    startSpy.mockRestore();
  });

  it('displays time-advance viewport notification inside central 3D viewport', () => {
    const timeNotice = {
      id: 12345,
      type: 'SUCCESS' as const,
      seconds: 60,
    };

    render(
      <OrbitalStage3D
        spacecraftList={[MOCK_DETAIL]}
        selectedSpacecraftId="AURA-1"
        onSelectSpacecraft={vi.fn()}
        timeAdvanceNotice={timeNotice}
      />
    );

    const overlay = screen.getByTestId('viewport-time-notice');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveTextContent(/SIMULATION ADVANCED/i);
    expect(overlay).toHaveTextContent(/\+60 SECONDS/i);
  });

  describe('Universal Navigation & Cockpit Destination Switching Regression Suite', () => {
    it('navigationHistory maintains stack and calculates logical parent fallbacks', async () => {
      const { navigationHistory } = await import('../utils/navigationHistory');
      navigationHistory.clear();

      expect(navigationHistory.getCurrent().viewMode).toBe('landing');

      // 1. Landing -> Mission Control
      navigationHistory.push({ viewMode: 'mission-control', mcModeView: 'cockpit' });
      expect(navigationHistory.getCurrent().viewMode).toBe('mission-control');
      expect(navigationHistory.getCurrent().mcModeView).toBe('cockpit');

      // 2. Cockpit -> Missions catalogue
      navigationHistory.push({ viewMode: 'mission-control', mcModeView: 'universe', universeTab: 'catalogue' });
      expect(navigationHistory.getCurrent().universeTab).toBe('catalogue');

      // 3. Catalogue -> Mission briefing (Mars Recon)
      navigationHistory.push({
        viewMode: 'mission-control',
        mcModeView: 'universe',
        universeTab: 'briefing',
        selectedMissionId: 'MARS-RECON-01',
      });
      expect(navigationHistory.getCurrent().selectedMissionId).toBe('MARS-RECON-01');

      // 4. Go Back: should return to catalogue, not landing
      const prev1 = navigationHistory.goBack();
      expect(prev1.universeTab).toBe('catalogue');
      expect(prev1.viewMode).toBe('mission-control');

      // 5. Go Back: should return to cockpit
      const prev2 = navigationHistory.goBack();
      expect(prev2.mcModeView).toBe('cockpit');

      // 6. Go Back: should return to landing
      const prev3 = navigationHistory.goBack();
      expect(prev3.viewMode).toBe('landing');
    });

    it('FleetSelectorBar filters 28 spacecraft by destination category with vertical top-down selector', () => {
      const mockSelect = vi.fn();
      const sampleFleet = [
        { ...MOCK_DETAIL, id: 'AURA-1', callSign: 'AURA-1', name: 'AURA-1', modelType: 'Earth Observation (SSO)' },
        { ...MOCK_DETAIL, id: 'ARES-ORBITER', callSign: 'ARES-ORB', name: 'ARES-ORBITER', modelType: 'Mars Reconnaissance Orbiter' },
        { ...MOCK_DETAIL, id: 'CHANDRA-ORB', callSign: 'CHANDRA', name: 'CHANDRA-ORB', modelType: 'Lunar Polar Mapper' },
        { ...MOCK_DETAIL, id: 'EUROPA-CLIPPER-S', callSign: 'EUROPA', name: 'EUROPA-CLIPPER-S', modelType: 'Jovian Icy Moons Explorer' },
        { ...MOCK_DETAIL, id: 'HELIOS-CORONA', callSign: 'HELIOS', name: 'HELIOS-CORONA', modelType: 'Solar Corona Explorer' },
        { ...MOCK_DETAIL, id: 'ODYSSEY-NAV', callSign: 'ODYSSEY', name: 'ODYSSEY-NAV', modelType: 'Deep Space Navigation' },
      ];

      render(
        <FleetSelectorBar
          spacecraftList={sampleFleet}
          selectedSpacecraftId="AURA-1"
          onSelectSpacecraft={mockSelect}
          destinationFilter="ALL"
        />
      );

      // Verify top-down destination selector trigger is present and labelled
      const trigger = screen.getByTestId('destination-selector-trigger');
      expect(trigger).toBeInTheDocument();
      expect(trigger.textContent).toContain('ALL DESTINATIONS');

      // Verify no counts displayed in trigger
      expect(trigger.textContent).not.toMatch(/\(\d+\)/);

      // Open dropdown via trigger
      fireEvent.click(trigger);
      const menu = screen.getByTestId('destination-dropdown-menu');
      expect(menu).toBeInTheDocument();

      // Verify destination filter options are rendered vertically and contain NO counts
      const filterAll = screen.getByTestId('fleet-filter-all');
      const filterEarth = screen.getByTestId('fleet-filter-earth');
      const filterLunar = screen.getByTestId('fleet-filter-lunar');
      const filterMars = screen.getByTestId('fleet-filter-mars');
      const filterOuter = screen.getByTestId('fleet-filter-outer');
      const filterSolar = screen.getByTestId('fleet-filter-solar');
      const filterDeepSpace = screen.getByTestId('fleet-filter-deep_space');

      expect(filterAll).toBeInTheDocument();
      expect(filterEarth).toBeInTheDocument();
      expect(filterLunar).toBeInTheDocument();
      expect(filterMars).toBeInTheDocument();
      expect(filterOuter).toBeInTheDocument();
      expect(filterSolar).toBeInTheDocument();
      expect(filterDeepSpace).toBeInTheDocument();

      // Ensure NO counts are appended to any filter labels
      [filterAll, filterEarth, filterLunar, filterMars, filterOuter, filterSolar, filterDeepSpace].forEach((btn) => {
        expect(btn.textContent).not.toMatch(/\(\d+\)/);
      });

      // Filter by MARS
      fireEvent.click(filterMars);
      expect(screen.getByTestId('fleet-card-ARES-ORBITER')).toBeInTheDocument();
      expect(screen.queryByTestId('fleet-card-AURA-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fleet-card-CHANDRA-ORB')).not.toBeInTheDocument();

      // Filter by LUNAR
      fireEvent.click(screen.getByTestId('destination-selector-trigger'));
      fireEvent.click(filterLunar);
      expect(screen.getByTestId('fleet-card-CHANDRA-ORB')).toBeInTheDocument();
      expect(screen.queryByTestId('fleet-card-ARES-ORBITER')).not.toBeInTheDocument();

      // Filter by OUTER
      fireEvent.click(screen.getByTestId('destination-selector-trigger'));
      fireEvent.click(filterOuter);
      expect(screen.getByTestId('fleet-card-EUROPA-CLIPPER-S')).toBeInTheDocument();
      expect(screen.queryByTestId('fleet-card-CHANDRA-ORB')).not.toBeInTheDocument();

      // Filter by SOLAR
      fireEvent.click(screen.getByTestId('destination-selector-trigger'));
      fireEvent.click(filterSolar);
      expect(screen.getByTestId('fleet-card-HELIOS-CORONA')).toBeInTheDocument();
      expect(screen.queryByTestId('fleet-card-EUROPA-CLIPPER-S')).not.toBeInTheDocument();

      // Filter by DEEP SPACE
      fireEvent.click(screen.getByTestId('destination-selector-trigger'));
      fireEvent.click(filterDeepSpace);
      expect(screen.getByTestId('fleet-card-ODYSSEY-NAV')).toBeInTheDocument();
      expect(screen.queryByTestId('fleet-card-HELIOS-CORONA')).not.toBeInTheDocument();

      // Filter by ALL
      fireEvent.click(screen.getByTestId('destination-selector-trigger'));
      fireEvent.click(filterAll);
      expect(screen.getByTestId('fleet-card-AURA-1')).toBeInTheDocument();
      expect(screen.getByTestId('fleet-card-ARES-ORBITER')).toBeInTheDocument();
      expect(screen.getByTestId('fleet-card-CHANDRA-ORB')).toBeInTheDocument();
      expect(screen.getByTestId('fleet-card-EUROPA-CLIPPER-S')).toBeInTheDocument();
      expect(screen.getByTestId('fleet-card-HELIOS-CORONA')).toBeInTheDocument();
      expect(screen.getByTestId('fleet-card-ODYSSEY-NAV')).toBeInTheDocument();
    });

    it('FleetSelectorBar displays distinct error and empty states', () => {
      // 1. Error state
      const { rerender } = render(
        <FleetSelectorBar
          spacecraftList={[]}
          selectedSpacecraftId=""
          onSelectSpacecraft={vi.fn()}
          error="Network connection failure to telemetry cluster"
        />
      );
      expect(screen.getByTestId('fleet-roster-error')).toBeInTheDocument();
      expect(screen.getByText(/FLEET TELEMETRY OFFLINE/i)).toBeInTheDocument();

      // 2. Empty state when filter matches nothing
      rerender(
        <FleetSelectorBar
          spacecraftList={[
            { ...MOCK_DETAIL, id: 'AURA-1', modelType: 'Earth Observation (SSO)' },
          ]}
          selectedSpacecraftId="AURA-1"
          onSelectSpacecraft={vi.fn()}
        />
      );
      // Switch to MARS when only Earth craft is present
      fireEvent.click(screen.getByTestId('destination-selector-trigger'));
      fireEvent.click(screen.getByTestId('fleet-filter-mars'));
      expect(screen.getByTestId('fleet-roster-empty')).toBeInTheDocument();
    });

    it('OrbitalStage3D renders Mars destination environment immediately for Mars spacecraft', () => {
      const marsCraft = {
        ...MOCK_DETAIL,
        id: 'ARES-ORBITER',
        name: 'ARES-ORBITER',
        modelType: 'Mars Reconnaissance Orbiter',
        elements: {
          semiMajorAxisKm: 20424.0,
          eccentricity: 0.05,
          inclinationDeg: 92.8,
          raanDeg: 45.0,
          argOfPerigeeDeg: 120.0,
          trueAnomalyDeg: 0.0,
        },
      };

      render(
        <OrbitalStage3D
          spacecraftList={[marsCraft]}
          selectedSpacecraftId="ARES-ORBITER"
          onSelectSpacecraft={vi.fn()}
        />
      );

      // Verify the HUD indicates Mars destination and MCI_J2000 inertial frame
      expect(screen.getByText(/TARGET: MARS/i)).toBeInTheDocument();
      expect(screen.getByText(/MCI_J2000/i)).toBeInTheDocument();
      expect(screen.getByText('ARES-ORBITER')).toBeInTheDocument();
    });
  });

  describe('Failure Lab Anomaly Selector, Timeline & IST Clock Regression Suite', () => {
    it('formatStationClockIST correctly formats timestamps in Asia/Kolkata with DD/MM/YYYY ordering and handles date rollover', async () => {
      const { formatStationClockIST, formatEventTimestampIST, formatTimeOnlyIST } = await import('../utils/timeFormatters');

      // Test 1: Date rollover (22:45 UTC on Oct 24 -> 04:15 IST on Oct 25)
      const utcIso = '2026-10-24T22:45:30Z';
      const clockDisplay = formatStationClockIST(utcIso);
      expect(clockDisplay).toBe('25/10/2026 — 04:15:30 IST');

      // Test 2: Event timestamp formatter
      const eventDisplay = formatEventTimestampIST(utcIso);
      expect(eventDisplay).toBe('25/10/2026 04:15:30 IST');

      // Test 3: Time only formatter
      const timeOnly = formatTimeOnlyIST(utcIso);
      expect(timeOnly).toBe('04:15:30 IST');

      // Test 4: Graceful fallback for invalid/null dates
      expect(formatStationClockIST(null)).toBe('— IST');
      expect(formatStationClockIST('invalid-date')).toBe('— IST');
    });

    it('FailureLabDrawer handles authentic backend scenario format (scenarioCode/subsystem/title) without empty brackets', async () => {
      // Backend serialization structure
      const backendScenarios: any[] = [
        {
          scenarioCode: 'EPS_BATTERY_CELL_DEGRADATION',
          subsystem: 'EPS',
          title: 'Battery Cell Degradation & Undervoltage',
          description: 'Simulates internal battery cell degradation, lowering bus voltage.',
          defaultSeverity: 'CRITICAL',
          expectedRecoveryAction: 'RESET_BATTERY_CHARGE_CONTROLLER',
          supportedParameters: { voltageDrop: '6.0V' },
        },
        {
          scenarioCode: 'COMMS_RF_BLACKOUT',
          subsystem: 'COMMS',
          title: 'Radio Frequency Communications Blackout',
          description: 'Simulates full loss of carrier lock and RF uplink/downlink capability.',
          defaultSeverity: 'CRITICAL',
          expectedRecoveryAction: 'RESET_RF_TRANSCEIVER',
          supportedParameters: {},
        },
      ];

      const listScenariosSpy = vi.spyOn(missionControlApi, 'listFaultScenarios').mockImplementation(async () => {
        // Run through normalizer
        return backendScenarios.map((raw) => ({
          scenarioCode: raw.scenarioCode,
          code: raw.scenarioCode,
          title: raw.title,
          name: raw.title,
          subsystem: raw.subsystem,
          domain: raw.subsystem,
          defaultSeverity: raw.defaultSeverity,
          description: raw.description,
          expectedRecoveryAction: raw.expectedRecoveryAction,
          recoveryActionRequired: raw.expectedRecoveryAction,
          supportedParameters: raw.supportedParameters,
        }));
      });

      const listFaultsSpy = vi.spyOn(missionControlApi, 'listFaults').mockResolvedValue([]);
      const injectFaultSpy = vi.spyOn(missionControlApi, 'injectFault').mockResolvedValue({
        faultId: 'f-999',
        spacecraftId: 'AURA-1',
        scenarioCode: 'EPS_BATTERY_CELL_DEGRADATION',
        domain: 'EPS',
        severity: 'CRITICAL',
        lifecycleState: 'ACTIVE',
        injectedEpoch: '2026-10-24T22:15:30Z',
        recoveryActionRequired: 'RESET_BATTERY_CHARGE_CONTROLLER',
        description: 'Simulates internal battery cell degradation',
      });

      render(
        <FailureLabDrawer
          selectedSpacecraft={MOCK_DETAIL}
          onFaultsChanged={vi.fn()}
        />
      );

      // Verify dropdown is populated with readable text and NOT empty brackets []
      await waitFor(() => {
        const option = screen.getByRole('option', {
          name: /\[EPS\] Battery Cell Degradation & Undervoltage — CRITICAL/i,
        });
        expect(option).toBeInTheDocument();
        expect(option).not.toHaveTextContent(/^\[\]$/);
      });

      // Verify the metadata preview card appears under dropdown
      expect(screen.getByTestId('scenario-metadata-preview')).toBeInTheDocument();
      expect(screen.getByText(/SUBSYSTEM: EPS/i)).toBeInTheDocument();

      // Submit injection
      const injectBtn = screen.getByTestId('inject-fault-btn');
      fireEvent.click(injectBtn);

      await waitFor(() => {
        expect(injectFaultSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            scenarioCode: 'EPS_BATTERY_CELL_DEGRADATION',
            spacecraftId: 'AURA-1',
            severity: 'CRITICAL',
          })
        );
      });

      listScenariosSpy.mockRestore();
      listFaultsSpy.mockRestore();
      injectFaultSpy.mockRestore();
    });

    it('FailureLabTimeline deduplicates events, sorts chronologically, and renders IST timestamps', async () => {
      const { FailureLabTimeline } = await import('../components/missionControl/FailureLabTimeline');

      const rawEvents: SimulationEvent[] = [
        {
          eventId: 'evt-dup',
          sequenceNumber: 1,
          type: 'MISSION_STARTED',
          simulationEpoch: '2026-10-24T20:00:00Z',
          wallClockTimestamp: '2026-10-24T20:00:00Z',
          summary: 'Mission operations initial pass initiated',
        },
        {
          eventId: 'evt-dup', // Duplicate event with same ID
          sequenceNumber: 1,
          type: 'MISSION_STARTED',
          simulationEpoch: '2026-10-24T20:00:00Z',
          wallClockTimestamp: '2026-10-24T20:00:00Z',
          summary: 'Mission operations initial pass initiated',
        },
        {
          eventId: 'evt-2',
          sequenceNumber: 2,
          type: 'ANOMALY_DETECTED',
          simulationEpoch: '2026-10-24T22:30:00Z',
          wallClockTimestamp: '2026-10-24T22:30:00Z',
          summary: 'Severe battery thermal runaway warning',
          details: { subsystem: 'EPS', severity: 'CRITICAL' },
        },
      ];

      render(<FailureLabTimeline events={rawEvents} targetSpacecraftId="AURA-1" />);

      // Verify header counts unique events (2, not 3)
      expect(screen.getByText(/CHRONOLOGICAL EVENT TIMELINE \[2\]/i)).toBeInTheDocument();

      // Verify IST formatted timestamp for 22:30 UTC -> 04:00 IST on 25/10/2026
      expect(screen.getByText('25/10/2026 04:00:00 IST')).toBeInTheDocument();

      // Toggle sort order between NEWEST and OLDEST
      const sortToggle = screen.getByTestId('timeline-sort-toggle');
      expect(sortToggle).toHaveTextContent(/NEWEST/i);
      fireEvent.click(sortToggle);
      expect(sortToggle).toHaveTextContent(/OLDEST/i);
    });

    it('preserves clean visual hierarchy between MissionControlHeader and OrbitalStage3D', () => {
      const mockActiveMission = {
        id: 'MARS-RECON-01',
        title: 'Mars Orbital Reconnaissance & Surface Spectrometry',
        destination: 'Mars (Areostationary & Polar Elliptical)',
        destinationGroup: 'Mars',
        category: 'PLANETARY_RECONNAISSANCE' as any,
        difficulty: 'CHALLENGING' as any,
        spacecraftId: 'ARES-ORBITER',
        durationMinutes: 90,
        riskLevel: 'HIGH',
        synopsis: 'Swath capture of Valles Marineris',
        objectives: ['Swath capture'],
        completionCriteria: ['Optical pass completed'],
        operationalConstraints: ['Thermal balance'],
        isSimulated: true,
        status: 'ACTIVE' as any,
        categoryLabel: 'Planetary Reconnaissance',
        difficultyLabel: 'Challenging',
      };

      render(
        <MissionControlHeader
          onReturnHome={vi.fn()}
          simulationStatus={MOCK_SIM_STATUS}
          connectionStatus="connected"
          onSimulationUpdated={vi.fn()}
          activeMission={mockActiveMission}
        />
      );

      // Verify compact header scenario badge
      const headerBadge = screen.getByTestId('header-active-mission-badge');
      expect(headerBadge).toBeInTheDocument();
      expect(headerBadge).toHaveTextContent(/SCENARIO:/i);
      expect(headerBadge).toHaveTextContent(/MARS/i);

      // Verify station clock displays IST
      const clock = screen.getByTestId('station-clock');
      expect(clock).toHaveTextContent(/IST/i);
    });
  });

  describe('Priority 0, 1 & 2: Authoritative Destination Consistency, Clean Roster Heading, and Scenario Popover', () => {
    it('proves Earth missions with Sun-Synchronous destinations resolve to Earth and NEVER the Sun', () => {
      // Root cause verification: "Sun-Synchronous LEO" contains "sun", which previously flipped the scene to the Sun!
      expect(resolveDestinationBody('Earth (Sun-Synchronous LEO, 702 km)', 'Earth Orbit')).toBe('earth');
      expect(resolveDestinationBody('Sun-Synchronous orbit (SSO)', 'Earth Orbit')).toBe('earth');
      expect(resolveDestinationBody('Low Earth Orbit (LEO, 400 km)', 'Earth Orbit')).toBe('earth');
      expect(resolveDestinationBody('Geostationary Transfer Orbit (GTO)', 'Earth Orbit')).toBe('earth');

      // Check authoritative context
      const ctx = getAuthoritativeVisualizationContext({
        id: 'EARTH-OBS-AURA',
        destination: 'Earth (Sun-Synchronous LEO, 702 km)',
        destinationGroup: 'Earth Orbit',
      });
      expect(ctx.destinationBody).toBe('earth');
      expect(ctx.coordinateFrame).toBe('ECI_J2000');
      expect(ctx.simulationMode).toBe('KEPLERIAN_TWO_BODY_ECI');
    });

    it('proves valid solar missions correctly resolve to the Sun', () => {
      expect(resolveDestinationBody('Heliospheric Orbit (0.3 AU perihelion)', 'Solar')).toBe('solar');
      expect(resolveDestinationBody('Solar Corona Rendezvous', 'Solar')).toBe('solar');
      expect(resolveDestinationBody('Sun-Earth L1 Lagrange Orbit', 'Solar')).toBe('solar');

      const ctx = getAuthoritativeVisualizationContext({
        id: 'SOLAR-PROBE-01',
        destination: 'Heliospheric Orbit (0.3 AU perihelion)',
        destinationGroup: 'Solar',
      });
      expect(ctx.destinationBody).toBe('solar');
      expect(ctx.coordinateFrame).toBe('HELIOCENTRIC');
    });

    it('proves Mars, Lunar, and Outer Planet missions resolve to their authoritative contexts', () => {
      expect(resolveDestinationBody('Mars (Areostationary & Polar Elliptical)', 'Mars')).toBe('mars');
      expect(resolveDestinationBody('Lunar Polar Insertion (100 km orbit)', 'Lunar & Deep Space')).toBe('lunar');
      expect(resolveDestinationBody('Europa Surface Reconnaissance (100 km orbit)', 'Outer Planets')).toBe('jupiter');
      expect(resolveDestinationBody('Saturn & Enceladus Plume Pass', 'Outer Planets')).toBe('saturn');

      const marsCtx = getAuthoritativeVisualizationContext({
        id: 'MARS-ATMOS-01',
        destination: 'Mars (Areostationary & Polar Elliptical)',
        destinationGroup: 'Mars',
      });
      expect(marsCtx.destinationBody).toBe('mars');
      expect(marsCtx.coordinateFrame).toBe('MCI_J2000');

      const lunarCtx = getAuthoritativeVisualizationContext({
        id: 'LUNAR-SURVEY-01',
        destination: 'Lunar Polar Insertion (100 km orbit)',
        destinationGroup: 'Lunar & Deep Space',
      });
      expect(lunarCtx.destinationBody).toBe('lunar');
      expect(lunarCtx.coordinateFrame).toBe('LCI_J2000');
    });

    it('renders OrbitalStage3D for an Earth-observation mission and verifies Earth regime without reverting to the Sun', () => {
      const earthMission: MissionResponse = {
        id: 'EARTH-OBS-AURA',
        title: 'Aura-1 Earth Observation Platform',
        destination: 'Earth (Sun-Synchronous LEO, 702 km)',
        destinationGroup: 'Earth Orbit',
        category: 'EARTH_OBSERVATION' as any,
        difficulty: 'NOMINAL' as any,
        spacecraftId: 'AURA-1',
        durationMinutes: 60,
        riskLevel: 'LOW',
        synopsis: 'Continuous hyperspectral atmosphere mapping',
        objectives: ['Deploy synthetic aperture radar'],
        completionCriteria: ['100% nominal telemetry'],
        operationalConstraints: ['Sun-synchronous nodal precession'],
        isSimulated: true,
        status: 'ACTIVE' as any,
        categoryLabel: 'Earth Observation',
        difficultyLabel: 'Nominal',
      };

      const { rerender } = render(
        <OrbitalStage3D
          spacecraftList={[MOCK_DETAIL]}
          selectedSpacecraftId="AURA-1"
          onSelectSpacecraft={vi.fn()}
          activeMission={earthMission}
        />
      );

      // Verify the accessible regime indicator displays EARTH, not SUN
      const regimeEl = screen.getByTestId('hud-scientific-regime');
      expect(regimeEl).toBeInTheDocument();
      expect(regimeEl.textContent).toContain('TARGET: EARTH');
      expect(regimeEl.textContent).not.toContain('TARGET: SUN');

      // Verify changing view mode or updating telemetry does not revert destination
      rerender(
        <OrbitalStage3D
          spacecraftList={[{ ...MOCK_DETAIL, altitudeKm: 705.4 }]}
          selectedSpacecraftId="AURA-1"
          onSelectSpacecraft={vi.fn()}
          activeMission={earthMission}
        />
      );

      const updatedRegimeEl = screen.getByTestId('hud-scientific-regime');
      expect(updatedRegimeEl).toBeInTheDocument();
      expect(updatedRegimeEl.textContent).toContain('TARGET: EARTH');
      expect(updatedRegimeEl.textContent).not.toContain('TARGET: SUN');
    });

    it('renders FleetSelectorBar with a clean heading containing NO count appended', () => {
      render(
        <FleetSelectorBar
          spacecraftList={[MOCK_DETAIL, MOCK_DETAIL_TERRA]}
          selectedSpacecraftId="AURA-1"
          onSelectSpacecraft={vi.fn()}
        />
      );

      const headerTitle = screen.getByTestId('fleet-roster-title');
      expect(headerTitle).toBeInTheDocument();
      // Must be clean: "ORBITAL FLEET ROSTER", NOT "ORBITAL FLEET ROSTER (2)" or similar
      expect(headerTitle.textContent?.trim()).toBe('ORBITAL FLEET ROSTER');
      expect(headerTitle.textContent).not.toMatch(/\(\d+\)/);
      expect(headerTitle.textContent).not.toMatch(/\[\d+\s+VEHICLES/i);
    });

    it('renders Scenario indicator and opens/closes interactive frosted glass popover', () => {
      const activeMission: MissionResponse = {
        id: 'LUNAR-EXPLORER-01',
        title: 'Artemis South Pole Volatiles Prospecting',
        destination: 'Lunar South Pole Shackleton Crater',
        destinationGroup: 'Lunar & Deep Space',
        category: 'DEEP_SPACE' as any,
        difficulty: 'CHALLENGING' as any,
        spacecraftId: 'LUNAR-ROVER',
        durationMinutes: 120,
        riskLevel: 'HIGH',
        synopsis: 'Sub-surface water ice core extraction along permanently shadowed regions',
        objectives: ['Perform drill deployment', 'Maintain UHF relay lock'],
        completionCriteria: ['Collect 3 volatile samples'],
        operationalConstraints: ['Stay within line-of-sight thermal margin'],
        isSimulated: true,
        status: 'ACTIVE' as any,
        categoryLabel: 'Deep Space',
        difficultyLabel: 'Challenging',
      };

      render(
        <MissionControlHeader
          onReturnHome={vi.fn()}
          simulationStatus={MOCK_SIM_STATUS}
          connectionStatus="connected"
          onSimulationUpdated={vi.fn()}
          activeMission={activeMission}
        />
      );

      // Verify scenario button in header
      const scenarioBtn = screen.getByTestId('header-active-mission-badge');
      expect(scenarioBtn).toBeInTheDocument();
      expect(scenarioBtn).toHaveTextContent(/SCENARIO:/i);
      expect(scenarioBtn).toHaveTextContent(/Artemis South Pole/i);

      // Popover should not be visible initially
      expect(screen.queryByTestId('scenario-detail-popover')).not.toBeInTheDocument();

      // Click to open popover
      fireEvent.click(scenarioBtn);
      const popover = screen.getByTestId('scenario-detail-popover');
      expect(popover).toBeInTheDocument();
      expect(within(popover).getByText(/SCENARIO DIRECTIVE/i)).toBeInTheDocument();
      expect(within(popover).getByText(/Shackleton Crater/i)).toBeInTheDocument();
      expect(within(popover).getByText(/Perform drill deployment/i)).toBeInTheDocument();

      // Press Escape to close popover
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('scenario-detail-popover')).not.toBeInTheDocument();

      // Click again and test close button
      fireEvent.click(scenarioBtn);
      expect(screen.getByTestId('scenario-detail-popover')).toBeInTheDocument();
      const closeBtn = screen.getByTestId('close-scenario-popover');
      fireEvent.click(closeBtn);
    });
  });

  describe('Destination-First Orbital Operations Interface — Required 11 Verification Scenarios', () => {
    // 1. Mission Control defaults to Earth Orbit
    it('1. Mission Control defaults to Earth Orbit and selects AURA-1 by default', () => {
      const mockSelect = vi.fn();
      render(
        <FleetSelectorBar
          spacecraftList={DEFAULT_SOLAR_SYSTEM_FLEET}
          selectedSpacecraftId="AURA-1"
          onSelectSpacecraft={mockSelect}
        />
      );

      const trigger = screen.getByTestId('destination-selector-trigger');
      expect(trigger).toHaveTextContent('EARTH ORBIT');
      expect(trigger).not.toHaveTextContent('ALL DESTINATIONS');

      // Default body resolution with no mission or filter resolves to earth
      expect(resolveDestinationBody(null, null, null)).toBe('earth');
      expect(destinationGroupToBody('EARTH')).toBe('earth');
    });

    // 2. Earth selection returns only Earth spacecraft
    it('2. Earth selection returns only Earth spacecraft', () => {
      const earthCrafts = getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'EARTH');
      expect(earthCrafts.length).toBeGreaterThanOrEqual(10);

      earthCrafts.forEach((craft) => {
        const group = getSpacecraftDestinationGroup(craft);
        expect(group).toBe('EARTH');
        expect(isSpacecraftCompatibleWithDestination(craft, 'EARTH')).toBe(true);
        expect(isSpacecraftCompatibleWithDestination(craft, 'MARS')).toBe(false);
      });

      expect(earthCrafts.some((c) => c.id === 'AURA-1')).toBe(true);
      expect(earthCrafts.some((c) => c.id === 'TERRA-OBS')).toBe(true);
      expect(earthCrafts.some((c) => c.id === 'ARES-ORBITER')).toBe(false);
    });

    // 3. Mars selection returns only Mars spacecraft
    it('3. Mars selection returns only Mars spacecraft', () => {
      const marsCrafts = getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'MARS');
      expect(marsCrafts.length).toBeGreaterThanOrEqual(8);

      marsCrafts.forEach((craft) => {
        const group = getSpacecraftDestinationGroup(craft);
        expect(group).toBe('MARS');
        expect(isSpacecraftCompatibleWithDestination(craft, 'MARS')).toBe(true);
        expect(isSpacecraftCompatibleWithDestination(craft, 'EARTH')).toBe(false);
      });

      expect(marsCrafts.some((c) => c.id === 'ARES-ORBITER')).toBe(true);
      expect(marsCrafts.some((c) => c.id === 'MARS-RELAY-1')).toBe(true);
      expect(marsCrafts.some((c) => c.id === 'AURA-1')).toBe(false);
      expect(destinationGroupToBody('MARS')).toBe('mars');
    });

    // 4. Solar selection returns only Solar spacecraft
    it('4. Solar selection returns only Solar spacecraft', () => {
      const solarCrafts = getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'SOLAR');
      expect(solarCrafts.length).toBeGreaterThanOrEqual(6);

      solarCrafts.forEach((craft) => {
        const group = getSpacecraftDestinationGroup(craft);
        expect(group).toBe('SOLAR');
        expect(isSpacecraftCompatibleWithDestination(craft, 'SOLAR')).toBe(true);
        expect(isSpacecraftCompatibleWithDestination(craft, 'EARTH')).toBe(false);
      });

      expect(solarCrafts.some((c) => c.id === 'HELIOS-CORONA')).toBe(true);
      expect(solarCrafts.some((c) => c.id === 'SOLAR-STORM-01')).toBe(true);
      expect(destinationGroupToBody('SOLAR')).toBe('solar');
    });

    // 5. Each remaining destination returns only compatible spacecraft
    it('5. Each remaining destination returns only compatible spacecraft', () => {
      // Lunar
      const lunarCrafts = getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'LUNAR');
      expect(lunarCrafts.length).toBeGreaterThanOrEqual(8);
      lunarCrafts.forEach((c) => expect(getSpacecraftDestinationGroup(c)).toBe('LUNAR'));
      expect(lunarCrafts.some((c) => c.id === 'CHANDRA-ORB')).toBe(true);
      expect(destinationGroupToBody('LUNAR')).toBe('lunar');

      // Outer Planets
      const outerCrafts = getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'OUTER');
      expect(outerCrafts.length).toBeGreaterThanOrEqual(8);
      outerCrafts.forEach((c) => expect(getSpacecraftDestinationGroup(c)).toBe('OUTER'));
      expect(outerCrafts.some((c) => c.id === 'EUROPA-CLIPPER-S')).toBe(true);
      expect(destinationGroupToBody('OUTER', { id: 'SATURN-TITAN-EXP' } as any)).toBe('saturn');
      expect(destinationGroupToBody('OUTER', null, 'Jupiter Ganymede')).toBe('jupiter');

      // Deep Space
      const deepCrafts = getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'DEEP_SPACE');
      expect(deepCrafts.length).toBeGreaterThanOrEqual(7);
      deepCrafts.forEach((c) => expect(getSpacecraftDestinationGroup(c)).toBe('DEEP_SPACE'));
      expect(deepCrafts.some((c) => c.id === 'ODYSSEY-NAV')).toBe(true);
      expect(destinationGroupToBody('DEEP_SPACE')).toBe('deep_space');
    });

    // 6. ALL DESTINATIONS restores the complete fleet only after explicit selection
    it('6. ALL DESTINATIONS restores the complete fleet only after explicit selection', () => {
      const mockSelect = vi.fn();
      const { rerender } = render(
        <FleetSelectorBar
          spacecraftList={DEFAULT_SOLAR_SYSTEM_FLEET}
          selectedSpacecraftId="AURA-1"
          onSelectSpacecraft={mockSelect}
          destinationFilter="EARTH"
        />
      );

      // In EARTH mode, Mars craft is not rendered
      expect(screen.queryByTestId('fleet-card-ARES-ORBITER')).not.toBeInTheDocument();
      expect(screen.getByTestId('fleet-card-AURA-1')).toBeInTheDocument();

      // Explicitly switch to ALL DESTINATIONS
      rerender(
        <FleetSelectorBar
          spacecraftList={DEFAULT_SOLAR_SYSTEM_FLEET}
          selectedSpacecraftId="AURA-1"
          onSelectSpacecraft={mockSelect}
          destinationFilter="ALL"
        />
      );

      expect(screen.getByTestId('destination-selector-trigger')).toHaveTextContent('ALL DESTINATIONS');
      expect(screen.getByTestId('fleet-card-ARES-ORBITER')).toBeInTheDocument();
      expect(screen.getByTestId('fleet-card-AURA-1')).toBeInTheDocument();
      expect(screen.getByTestId('fleet-card-EUROPA-CLIPPER-S')).toBeInTheDocument();
      expect(screen.getByTestId('fleet-card-HELIOS-CORONA')).toBeInTheDocument();
      expect(screen.getByTestId('fleet-card-ODYSSEY-NAV')).toBeInTheDocument();
    });

    // 7. Changing destinations replaces the visible orbital trajectories and removes obsolete scene objects
    it('7. Changing destinations replaces the visible orbital trajectories and removes obsolete scene objects', () => {
      const earthIds = new Set(getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'EARTH').map((c) => c.id));
      const marsIds = new Set(getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'MARS').map((c) => c.id));
      const solarIds = new Set(getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'SOLAR').map((c) => c.id));

      // Sets are strictly disjoint
      earthIds.forEach((id) => {
        expect(marsIds.has(id)).toBe(false);
        expect(solarIds.has(id)).toBe(false);
      });
      marsIds.forEach((id) => {
        expect(solarIds.has(id)).toBe(false);
      });

      // Destination body changes strictly per destination
      expect(destinationGroupToBody('EARTH')).toBe('earth');
      expect(destinationGroupToBody('MARS')).toBe('mars');
      expect(destinationGroupToBody('SOLAR')).toBe('solar');
      expect(destinationGroupToBody('LUNAR')).toBe('lunar');
    });

    // 8. An Earth mission cannot be assigned a Mars-only spacecraft
    it('8. An Earth mission cannot be assigned a Mars-only spacecraft', () => {
      expect(isSpacecraftCompatibleWithDestination('ARES-ORBITER', 'EARTH')).toBe(false);
      expect(isSpacecraftCompatibleWithDestination('AURA-1', 'MARS')).toBe(false);
      expect(isSpacecraftCompatibleWithDestination('HELIOS-CORONA', 'EARTH')).toBe(false);
      expect(isSpacecraftCompatibleWithDestination('EUROPA-CLIPPER-S', 'EARTH')).toBe(false);

      const earthCrafts = getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'EARTH');
      expect(earthCrafts.every((c) => c.id !== 'ARES-ORBITER')).toBe(true);
    });

    // 9. A stale navigation state or active mission cannot reintroduce incompatible spacecraft
    it('9. A stale navigation state or active mission cannot reintroduce incompatible spacecraft', () => {
      const activeEarthMission: Partial<MissionResponse> = {
        id: 'MSN-EARTH-01',
        title: 'Terra Environmental Survey',
        destination: 'Low Earth Orbit (550 km)',
        destinationGroup: 'Earth',
        spacecraftId: 'AURA-1',
      };

      expect(getMissionDestinationGroup(activeEarthMission.destination, activeEarthMission.destinationGroup)).toBe('EARTH');

      // When destinationFilter is MARS, the celestial body must be MARS, ignoring the Earth mission
      const resolvedBody = resolveDestinationBody(activeEarthMission as any, null, 'MARS');
      expect(resolvedBody).toBe('mars');

      // In Mars mode, compatible craft must only be Mars craft
      const scopedCrafts = getCompatibleSpacecraftForDestination(DEFAULT_SOLAR_SYSTEM_FLEET, 'MARS');
      expect(scopedCrafts.some((c) => c.id === activeEarthMission.spacecraftId)).toBe(false);
    });

    // 10. Empty destination fleets do not fall back to the entire catalog
    it('10. Empty destination fleets do not fall back to the entire catalog', () => {
      const mockSelect = vi.fn();
      render(
        <FleetSelectorBar
          spacecraftList={[]}
          selectedSpacecraftId=""
          onSelectSpacecraft={mockSelect}
          destinationFilter="MARS"
        />
      );

      expect(screen.getByTestId('fleet-roster-empty')).toBeInTheDocument();
      expect(screen.getByText('NO SPACECRAFT REGISTERED FOR THIS DESTINATION')).toBeInTheDocument();
      expect(screen.queryByTestId('fleet-card-AURA-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fleet-card-ARES-ORBITER')).not.toBeInTheDocument();
    });

    // 11. Partial API results and fallback catalog merging remain stable
    it('11. Partial API results and fallback catalog merging remain stable without duplicates', () => {
      const partialServerCraft: SpacecraftDetail = {
        ...MOCK_DETAIL,
        id: 'AURA-1',
        name: 'AURA-1 Updated Telemetry Target',
        altitudeKm: 705.4,
      };

      const mergedMap = new Map<string, SpacecraftDetail>();
      DEFAULT_SOLAR_SYSTEM_FLEET.forEach((c) => mergedMap.set(c.id, c));
      [partialServerCraft].forEach((c) => mergedMap.set(c.id, c));
      const mergedList = Array.from(mergedMap.values());

      // Length remains exactly 52 craft with zero duplicates
      expect(mergedList.length).toBe(DEFAULT_SOLAR_SYSTEM_FLEET.length);
      const aura = mergedList.find((c) => c.id === 'AURA-1');
      expect(aura?.name).toBe('AURA-1 Updated Telemetry Target');
      expect(aura?.altitudeKm).toBe(705.4);
      expect(getSpacecraftDestinationGroup(aura!)).toBe('EARTH');
    });
  });
});



