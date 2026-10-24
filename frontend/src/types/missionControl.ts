/**
 * ASTRA Mission Control Domain Types & Telemetry Schemas.
 * Strictly aligned with authoritative backend contracts in org.astra.*.
 */

export type OperationalMode =
  | 'NOMINAL'
  | 'SAFE_MODE'
  | 'SCIENCE_OPERATION'
  | 'COMMUNICATION'
  | 'ORBIT_CORRECTION'
  | 'LOW_POWER'
  | 'DECOMMISSIONED';

export type SpacecraftStatus = 'NOMINAL' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';

export type SimulationLifecycle = 'CREATED' | 'RUNNING' | 'PAUSED' | 'STOPPED';

export type CommandStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXECUTED' | 'FAILED';

export type SubsystemDomain = 'EPS' | 'TCS' | 'ADCS' | 'COMMS' | 'PROP' | 'OBC';

export type FaultSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';

export type FaultLifecycleState = 'ACTIVE' | 'DETECTED' | 'RECOVERED' | 'CLEARED';

export type StompConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SimulationSnapshotMessage {
  lifecycle: SimulationLifecycle;
  currentEpoch: string;
  baseEpoch: string;
  elapsedSeconds: number;
  fleet?: TelemetrySnapshot[];
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface KeplerianElements {
  semiMajorAxisKm: number;
  eccentricity: number;
  inclinationDeg: number;
  raanDeg: number;
  argOfPerigeeDeg: number;
  trueAnomalyDeg: number;
}

export interface EpsSubsystemState {
  batterySocPercent: number;
  solarArrayWatts: number;
  batteryVoltageVolts: number;
  busLoadWatts: number;
  loadSheddingActive: boolean;
  solarDegradationMultiplier: number;
  busOverloadActive: boolean;
}

export interface TcsSubsystemState {
  temperatureCelsius: number;
  heaterActive: boolean;
  heaterOperational: boolean;
  radiatorEfficiency: number;
  thermalSafingActive: boolean;
}

export interface AdcsSubsystemState {
  pointingErrorDegrees: number;
  attitudeLockStatus: string;
  reactionWheelSpeedRpm: number;
  starTrackerLocked: boolean;
  wheelFrictionActive: boolean;
}

export interface CommsSubsystemState {
  linkStatus: string;
  linkMarginDb: number;
  packetLossPercent: number;
  carrierLocked: boolean;
  blackoutActive: boolean;
}

export interface PropSubsystemState {
  propellantMassKg: number;
  tankPressureBar: number;
  valveHealth: string;
  thrustMultiplier: number;
  leakActive: boolean;
}

export interface ObcSubsystemState {
  cpuUtilizationPercent: number;
  memoryUtilizationPercent: number;
  flightSoftwareState: string;
  rebootCount: number;
  rebootRemainingSeconds: number;
}

export interface SpacecraftSubsystems {
  eps: EpsSubsystemState;
  tcs: TcsSubsystemState;
  adcs: AdcsSubsystemState;
  comms: CommsSubsystemState;
  prop: PropSubsystemState;
  obc: ObcSubsystemState;
}

export interface SpacecraftSummary {
  id: string;
  callSign: string;
  name: string;
  modelType: string;
  altitudeKm: number;
  speedKmS: number;
  operationalMode: OperationalMode;
  operationalStatus: SpacecraftStatus;
  inEclipse: boolean;
  batterySocPercent: number;
}

export interface SpacecraftDetail extends SpacecraftSummary {
  dryMassKg: number;
  propellantMassKg: number;
  totalMassKg: number;
  epoch: string;
  positionKm: Vector3D;
  velocityKmS: Vector3D;
  solarArrayWatts: number;
  elements: KeplerianElements;
  subsystems?: SpacecraftSubsystems;
}

export interface TelemetrySnapshot {
  spacecraftId: string;
  callSign: string;
  timestamp: string;
  positionKm: Vector3D;
  velocityKmS: Vector3D;
  altitudeKm: number;
  speedKmS: number;
  inEclipse: boolean;
  operationalStatus: SpacecraftStatus;
  operationalMode: OperationalMode;
  batterySocPercent: number;
  solarArrayWatts: number;
  elements: KeplerianElements;
}

export interface FleetTelemetryFrame {
  simulationEpoch: string;
  elapsedSeconds: number;
  lifecycle: SimulationLifecycle;
  spacecraftCount: number;
  fleet: TelemetrySnapshot[];
}

export interface SimulationStatus {
  lifecycle: SimulationLifecycle;
  currentEpoch: string;
  baseEpoch: string;
  elapsedSeconds: number;
  spacecraftCount: number;
}

export interface CommandRecord {
  commandId: string;
  spacecraftId: string;
  type: string;
  status: CommandStatus;
  parameters: Record<string, string>;
  dispatchedEpoch: string;
  executionEpoch?: string;
  resultMessage?: string;
  operatorUsername?: string;
  idempotentReplay?: boolean;
}

export interface CommandResponse {
  commandId: string;
  spacecraftId: string;
  type: string;
  status: CommandStatus;
  message: string;
  executionEpoch: string;
  idempotentReplay: boolean;
}

export interface SubmitCommandPayload {
  type: string;
  spacecraftId?: string;
  clientCommandId?: string;
  parameters: Record<string, string>;
}

export interface FaultScenarioMetadata {
  code: string;
  name: string;
  domain: SubsystemDomain;
  defaultSeverity: FaultSeverity;
  description: string;
  recoveryActionRequired: string;
  supportedParameters: string[];
}

export interface FaultRecord {
  faultId: string;
  spacecraftId: string;
  scenarioCode: string;
  domain: SubsystemDomain;
  severity: FaultSeverity;
  lifecycleState: FaultLifecycleState;
  injectedEpoch: string;
  recoveredEpoch?: string;
  clearedEpoch?: string;
  recoveryActionRequired: string;
  description: string;
  operatorUsername?: string;
}

export interface SubsystemsHealth {
  spacecraftId: string;
  callSign: string;
  epoch: string;
  overallStatus: SpacecraftStatus;
  subsystems: SpacecraftSubsystems;
  activeFaultIds: string[];
  activeFaultCount: number;
}

export interface SimulationEvent {
  eventId: string;
  sequenceNumber: number;
  type: string;
  simulationEpoch: string;
  wallClockTimestamp: string;
  spacecraftId?: string;
  summary: string;
  parameters?: Record<string, unknown>;
  details?: Record<string, unknown>;
}
