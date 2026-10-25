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
    expect(returnBtn).toHaveAttribute('aria-label', 'Return to landing page');

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
});


