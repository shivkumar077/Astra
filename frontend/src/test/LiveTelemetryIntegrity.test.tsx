import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { TelemetryWorkspace } from '../components/missionControl/TelemetryWorkspace';
import { MissionControlView } from '../components/missionControl/MissionControlView';
import { SpacecraftDetail } from '../types/missionControl';

// Mock STOMP client
let messageHandlers: Record<string, (data: any, headers?: any) => void> = {};
let currentStompStatus = 'connected';

vi.mock('../api/stompClient', () => {
  return {
    getMissionControlStompClient: () => ({
      getStatus: () => currentStompStatus,
      onStatusChange: (cb: (s: any) => void) => {
        cb(currentStompStatus);
        return () => {};
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      subscribe: (destination: string, handler: (data: any) => void) => {
        messageHandlers[destination] = handler;
        return () => {
          delete messageHandlers[destination];
        };
      },
    }),
  };
});

const MOCK_AURA_CRAFT = {
  id: 'AURA-1',
  callSign: 'AURA-1',
  name: 'Aura Climate Observatory',
  modelType: 'Polar Observation Bus',
  destination: 'Earth (Sun-Synchronous Polar LEO, 708 km)',
  destinationGroup: 'Earth',
  operationalMode: 'NOMINAL',
  operationalStatus: 'NOMINAL',
  altitudeKm: 708.2,
  speedKmS: 7.51,
  inEclipse: false,
  batterySocPercent: 92.4,
  solarArrayWatts: 1350.0,
  epoch: '2026-10-24T00:00:00Z',
  dryMassKg: 1200.0,
  propellantMassKg: 180.0,
  totalMassKg: 1380.0,
  positionKm: { x: 7080.0, y: 0.0, z: 0.0 },
  velocityKmS: { x: 0.0, y: 7.51, z: 0.0 },
  elements: {
    semiMajorAxisKm: 7080.0,
    eccentricity: 0.0012,
    inclinationDeg: 98.2,
    raanDeg: 25.0,
    argOfPerigeeDeg: 90.0,
    trueAnomalyDeg: 0.0,
  },
};

const MOCK_ARES_CRAFT = {
  id: 'ARES-ORBITER',
  callSign: 'ARES-ORB',
  name: 'Ares Atmosphere Orbiter',
  modelType: 'Mars Science Orbiter',
  destination: 'Mars (Areocentric Elliptical Orbit, 350 x 37,900 km)',
  destinationGroup: 'Mars',
  operationalMode: 'NOMINAL',
  operationalStatus: 'NOMINAL',
  altitudeKm: 350.0,
  speedKmS: 4.2,
  inEclipse: false,
  batterySocPercent: 88.0,
  solarArrayWatts: 850.0,
  epoch: '2026-10-24T00:00:00Z',
  dryMassKg: 850.0,
  propellantMassKg: 210.0,
  totalMassKg: 1060.0,
  positionKm: { x: 37900.0, y: 0.0, z: 0.0 },
  velocityKmS: { x: 0.0, y: 4.2, z: 0.0 },
  elements: {
    semiMajorAxisKm: 37900.0,
    eccentricity: 0.003,
    inclinationDeg: 93.0,
    raanDeg: 50.0,
    argOfPerigeeDeg: 90.0,
    trueAnomalyDeg: 0.0,
  },
};

const MOCK_INITIAL_FLEET = [MOCK_AURA_CRAFT, MOCK_ARES_CRAFT];

// Mock REST API endpoints
vi.mock('../api/missionControlApi', () => ({
  listSpacecraft: vi.fn().mockImplementation(() => Promise.resolve(MOCK_INITIAL_FLEET)),
  getFleet: vi.fn().mockImplementation(() => Promise.resolve(MOCK_INITIAL_FLEET)),
  getSpacecraftDetail: vi.fn().mockImplementation((id: string) => {
    const found = MOCK_INITIAL_FLEET.find((c) => c.id === id);
    return Promise.resolve(found || MOCK_AURA_CRAFT);
  }),
  getSimulationStatus: vi.fn().mockResolvedValue({
    lifecycle: 'RUNNING',
    currentEpoch: '2026-10-24T00:00:00Z',
    baseEpoch: '2026-10-24T00:00:00Z',
    elapsedSeconds: 0.0,
    spacecraftCount: 2,
  }),
  getCommandHistory: vi.fn().mockResolvedValue([]),
  getEvents: vi.fn().mockResolvedValue([]),
  getActiveMission: vi.fn().mockResolvedValue(null),
  listMissions: vi.fn().mockResolvedValue([]),
  getMissions: vi.fn().mockResolvedValue([]),
  advanceSimulation: vi.fn().mockResolvedValue({
    lifecycle: 'RUNNING',
    currentEpoch: '2026-10-24T00:01:00Z',
    baseEpoch: '2026-10-24T00:00:00Z',
    elapsedSeconds: 60.0,
    spacecraftCount: 2,
  }),
  getSubsystemsHealth: vi.fn().mockImplementation((id: string) =>
    Promise.resolve({
      spacecraftId: id,
      callSign: id,
      epoch: '2026-10-24T00:00:00Z',
      operationalStatus: 'NOMINAL',
      subsystems: {
        eps: {
          batterySocPercent: 92.4,
          solarArrayWatts: 1350.0,
          batteryVoltageVolts: 28.2,
          busLoadWatts: 540.0,
          loadSheddingActive: false,
          solarDegradationMultiplier: 1.0,
          busOverloadActive: false,
        },
        tcs: {
          temperatureCelsius: 22.0,
          heaterActive: false,
          heaterOperational: true,
          radiatorEfficiency: 1.0,
          thermalSafingActive: false,
        },
        adcs: {
          pointingErrorDegrees: 0.04,
          attitudeLockStatus: 'LOCKED',
          reactionWheelSpeedRpm: 2450.0,
          starTrackerLocked: true,
          wheelFrictionActive: false,
        },
        comms: {
          linkStatus: 'NOMINAL',
          linkMarginDb: 8.4,
          packetLossPercent: 0.0,
          carrierLocked: true,
          blackoutActive: false,
        },
        prop: {
          propellantMassKg: 180.0,
          tankPressureBar: 22.0,
          valveHealth: 'NOMINAL',
          thrustMultiplier: 1.0,
          leakActive: false,
        },
        obc: {
          cpuUtilizationPercent: 32.5,
          memoryUtilizationPercent: 44.0,
          flightSoftwareState: 'NOMINAL',
          rebootCount: 0,
          rebootRemainingSeconds: 0.0,
        },
      },
      activeFaultIds: [],
      activeFaultCount: 0,
    })
  ),
}));

const mockCraft: SpacecraftDetail = {
  id: 'AURA-1',
  callSign: 'AURA-1',
  name: 'Aura Climate Observatory',
  modelType: 'Polar Observation Bus',
  destination: 'Earth (Sun-Synchronous Polar LEO, 708 km)',
  destinationGroup: 'Earth',
  operationalMode: 'NOMINAL',
  operationalStatus: 'NOMINAL',
  altitudeKm: 708.2,
  speedKmS: 7.51,
  inEclipse: false,
  batterySocPercent: 92.4,
  solarArrayWatts: 1350.0,
  epoch: '2026-10-24T00:00:00Z',
  dryMassKg: 1200.0,
  propellantMassKg: 180.0,
  totalMassKg: 1380.0,
  positionKm: { x: 7080.0, y: 0.0, z: 0.0 },
  velocityKmS: { x: 0.0, y: 7.51, z: 0.0 },
  elements: {
    semiMajorAxisKm: 7080.0,
    eccentricity: 0.0012,
    inclinationDeg: 98.2,
    raanDeg: 25.0,
    argOfPerigeeDeg: 90.0,
    trueAnomalyDeg: 0.0,
  },
};

describe('ASTRA Live Telemetry Integrity & Operations Suite', () => {
  beforeEach(() => {
    messageHandlers = {};
    currentStompStatus = 'connected';
    vi.clearAllMocks();
  });

  it('renders LIVE freshness badge and separates transport health from vehicle bus status', () => {
    render(
      <TelemetryWorkspace
        spacecraft={mockCraft}
        subsystemsHealth={null}
        connectionStatus="connected"
        simulationStatus={{
          lifecycle: 'RUNNING',
          currentEpoch: '2026-10-24T00:00:10Z',
          baseEpoch: '2026-10-24T00:00:00Z',
          elapsedSeconds: 10.0,
          spacecraftCount: 1,
        }}
      />
    );

    const freshnessBadge = screen.getByTestId('telemetry-freshness-badge');
    expect(freshnessBadge).toBeInTheDocument();
    expect(freshnessBadge.textContent).toContain('LIVE TELEMETRY');

    const busStatus = screen.getByTestId('spacecraft-operational-status');
    expect(busStatus).toBeInTheDocument();
    expect(busStatus.textContent).toContain('BUS: NOMINAL');
  });

  it('marks telemetry as STALE when simulation epoch moves significantly ahead of craft epoch', () => {
    render(
      <TelemetryWorkspace
        spacecraft={mockCraft}
        subsystemsHealth={null}
        connectionStatus="connected"
        simulationStatus={{
          lifecycle: 'RUNNING',
          currentEpoch: '2026-10-24T01:30:00Z', // 1.5 hours ahead
          baseEpoch: '2026-10-24T00:00:00Z',
          elapsedSeconds: 5400.0,
          spacecraftCount: 1,
        }}
      />
    );

    const freshnessBadge = screen.getByTestId('telemetry-freshness-badge');
    expect(freshnessBadge.textContent).toContain('STALE TELEMETRY');
  });

  it('marks telemetry as DISCONNECTED when WebSocket transport is offline without wiping last-known data', () => {
    render(
      <TelemetryWorkspace
        spacecraft={mockCraft}
        subsystemsHealth={null}
        connectionStatus="disconnected"
        simulationStatus={null}
      />
    );

    const freshnessBadge = screen.getByTestId('telemetry-freshness-badge');
    expect(freshnessBadge.textContent).toContain('STREAM DISCONNECTED');
    // Ensure position and telemetry metrics are still rendered as last-known state
    expect(screen.getAllByText(/7080\.0/).length).toBeGreaterThan(0);
  });

  it('displays MISSING banner when no spacecraft is selected', () => {
    render(
      <TelemetryWorkspace
        spacecraft={null}
        subsystemsHealth={null}
        connectionStatus="connected"
      />
    );

    expect(screen.getByText(/SELECT A SPACECRAFT FROM FLEET ROSTER/i)).toBeInTheDocument();
  });

  it('rejects out-of-order STOMP telemetry frames so older timestamps do not overwrite newer state', async () => {
    render(<MissionControlView onReturnHome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('mission-control-view')).toBeInTheDocument();
    });

    const handler = messageHandlers['/topic/telemetry'];
    expect(handler).toBeDefined();

    // 1. Send newer authoritative frame at T = +60s
    await act(async () => {
      handler({
        simulationEpoch: '2026-10-24T00:01:00Z',
        elapsedSeconds: 60.0,
        lifecycle: 'RUNNING',
        spacecraftCount: 1,
        fleet: [
          {
            spacecraftId: 'AURA-1',
            callSign: 'AURA-1',
            timestamp: '2026-10-24T00:01:00Z',
            positionKm: { x: 7100.0, y: 100.0, z: 0.0 },
            velocityKmS: { x: 0.0, y: 7.5, z: 0.0 },
            altitudeKm: 721.5,
            speedKmS: 7.5,
            inEclipse: true,
            operationalStatus: 'DEGRADED',
            operationalMode: 'SAFE_MODE',
            batterySocPercent: 78.5,
            solarArrayWatts: 0.0,
            elements: mockCraft.elements,
          },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByText('7100.0 km')).toBeInTheDocument();
    });

    // 2. Send an out-of-order, stale frame at T = +10s (older than current 60s)
    await act(async () => {
      handler({
        simulationEpoch: '2026-10-24T00:00:10Z',
        elapsedSeconds: 10.0,
        lifecycle: 'RUNNING',
        spacecraftCount: 1,
        fleet: [
          {
            spacecraftId: 'AURA-1',
            callSign: 'AURA-1',
            timestamp: '2026-10-24T00:00:10Z',
            positionKm: { x: 6999.0, y: 0.0, z: 0.0 },
            velocityKmS: { x: 0.0, y: 7.5, z: 0.0 },
            altitudeKm: 650.0,
            speedKmS: 7.5,
            inEclipse: false,
            operationalStatus: 'NOMINAL',
            operationalMode: 'NOMINAL',
            batterySocPercent: 95.0,
            solarArrayWatts: 1300.0,
            elements: mockCraft.elements,
          },
        ],
      });
    });

    // Verify out-of-order frame was rejected: position remains 7100.0 km and not reverted to 6999.0 km
    expect(screen.getByText('7100.0 km')).toBeInTheDocument();
    expect(screen.queryByText('6999.0 km')).not.toBeInTheDocument();
  });
});
