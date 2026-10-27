/**
 * ASTRA Mission Control REST API Client.
 * Connects frontend operators directly to the server-authoritative simulation endpoints at /api/v1/*.
 */

import {
  SpacecraftSummary,
  SpacecraftDetail,
  TelemetrySnapshot,
  SimulationStatus,
  CommandRecord,
  CommandResponse,
  SubmitCommandPayload,
  FaultScenarioMetadata,
  FaultRecord,
  SubsystemsHealth,
  SimulationEvent,
  MissionResponse,
  MissionRun,
  MissionCategory,
  MissionDifficulty,
} from '../types/missionControl';

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.') && !host.startsWith('10.')) {
      return 'https://astra-backend1-k9qe.onrender.com/api/v1';
    }
  }
  return 'http://localhost:8080/api/v1';
}

export class MissionControlApiError extends Error {
  public readonly status: number;
  public readonly path?: string;

  constructor(status: number, message: string, path?: string) {
    super(message);
    this.name = 'MissionControlApiError';
    this.status = status;
    this.path = path;
  }
}

export interface OperatorCredentials {
  username: string;
  password: string;
}

// Default operator credentials for local operational commands
export const DEFAULT_OPERATOR_CREDENTIALS: OperatorCredentials = {
  username: 'operator',
  password: 'operator123',
};

// Default flight director credentials for Failure Lab operations
export const DEFAULT_DIRECTOR_CREDENTIALS: OperatorCredentials = {
  username: 'director',
  password: 'director123',
};

function getAuthHeader(creds?: OperatorCredentials): Record<string, string> {
  if (!creds || !creds.username || !creds.password) {
    return {};
  }
  const token = btoa(`${creds.username}:${creds.password}`);
  return { Authorization: `Basic ${token}` };
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
      ...options,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new MissionControlApiError(
      0,
      `Unable to reach ASTRA Mission Control Server (${url}): ${errorMsg}. Ensure backend is active on port 8080.`,
      endpoint
    );
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody && errBody.message) {
        errorMessage = errBody.message;
      }
    } catch {
      // Use standard status text
    }
    throw new MissionControlApiError(response.status, errorMessage, endpoint);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// --- Simulation Lifecycle ---

export async function getSimulationStatus(): Promise<SimulationStatus> {
  return request<SimulationStatus>('/simulation/status');
}

export async function advanceSimulation(
  durationSeconds: number,
  creds: OperatorCredentials = DEFAULT_OPERATOR_CREDENTIALS
): Promise<SimulationStatus> {
  return request<SimulationStatus>('/simulation/advance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
    body: JSON.stringify({ durationSeconds }),
  });
}

export async function pauseSimulation(
  creds: OperatorCredentials = DEFAULT_OPERATOR_CREDENTIALS
): Promise<SimulationStatus> {
  return request<SimulationStatus>('/simulation/pause', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
  });
}

export async function resumeSimulation(
  creds: OperatorCredentials = DEFAULT_OPERATOR_CREDENTIALS
): Promise<SimulationStatus> {
  return request<SimulationStatus>('/simulation/resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
  });
}

// --- Spacecraft Fleet & Telemetry ---

export async function listSpacecraft(): Promise<SpacecraftSummary[]> {
  return request<SpacecraftSummary[]>('/spacecraft');
}

export async function getSpacecraftDetail(id: string): Promise<SpacecraftDetail> {
  return request<SpacecraftDetail>(`/spacecraft/${encodeURIComponent(id)}`);
}

export async function getRecentTelemetry(
  id: string,
  limit: number = 20
): Promise<TelemetrySnapshot[]> {
  return request<TelemetrySnapshot[]>(
    `/spacecraft/${encodeURIComponent(id)}/telemetry?limit=${limit}`
  );
}

export async function getSubsystemsHealth(id: string): Promise<SubsystemsHealth> {
  return request<SubsystemsHealth>(`/spacecraft/${encodeURIComponent(id)}/subsystems`);
}

// --- Telecommands & Audit Ledger ---

export async function submitCommand(
  craftId: string | null,
  payload: SubmitCommandPayload,
  creds: OperatorCredentials = DEFAULT_OPERATOR_CREDENTIALS
): Promise<CommandResponse> {
  const endpoint = craftId
    ? `/spacecraft/${encodeURIComponent(craftId)}/commands`
    : '/commands';

  return request<CommandResponse>(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
    body: JSON.stringify(payload),
  });
}

export async function getCommandHistory(
  spacecraftId?: string,
  limit: number = 50
): Promise<CommandRecord[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (spacecraftId) params.set('spacecraftId', spacecraftId);
  return request<CommandRecord[]>(`/commands?${params.toString()}`);
}

// --- Failure Lab Anomaly Simulation ---

export async function listFaultScenarios(): Promise<FaultScenarioMetadata[]> {
  const rawList = await request<Record<string, unknown>[]>('/faults/scenarios');
  return (rawList || []).map((raw) => {
    const code = String(raw.scenarioCode || raw.code || '');
    const title = String(raw.title || raw.name || code);
    const subsystem = String(raw.subsystem || raw.domain || 'SYSTEM');
    const recovery = String(raw.expectedRecoveryAction || raw.recoveryActionRequired || '');
    return {
      scenarioCode: code,
      code,
      title,
      name: title,
      subsystem,
      domain: subsystem,
      defaultSeverity: (raw.defaultSeverity as any) || 'CRITICAL',
      description: String(raw.description || ''),
      expectedRecoveryAction: recovery,
      recoveryActionRequired: recovery,
      supportedParameters: (raw.supportedParameters as any) || {},
    };
  });
}

export async function listFaults(
  spacecraftId?: string,
  state?: string
): Promise<FaultRecord[]> {
  const params = new URLSearchParams();
  if (spacecraftId) params.set('spacecraftId', spacecraftId);
  if (state) params.set('state', state);
  return request<FaultRecord[]>(`/faults?${params.toString()}`);
}

export async function injectFault(
  payload: {
    spacecraftId: string;
    scenarioCode: string;
    severity?: string;
    description?: string;
    parameters?: Record<string, string>;
  },
  creds: OperatorCredentials = DEFAULT_DIRECTOR_CREDENTIALS
): Promise<FaultRecord> {
  return request<FaultRecord>('/faults/inject', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
    body: JSON.stringify({
      spacecraftId: payload.spacecraftId,
      scenarioCode: payload.scenarioCode,
      severity: payload.severity || 'CRITICAL',
      description: payload.description || 'Operator initiated fault injection',
      parameters: payload.parameters || {},
    }),
  });
}

export async function recoverFault(
  faultId: string,
  recoveryAction: string,
  operatorNote: string = 'Commanded via Mission Control console',
  creds: OperatorCredentials = DEFAULT_DIRECTOR_CREDENTIALS
): Promise<FaultRecord> {
  return request<FaultRecord>(`/faults/${encodeURIComponent(faultId)}/recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
    body: JSON.stringify({ recoveryAction, operatorNote }),
  });
}

export async function clearFaultAlert(
  faultId: string,
  creds: OperatorCredentials = DEFAULT_DIRECTOR_CREDENTIALS
): Promise<{ cleared: boolean; status: string }> {
  return request<{ cleared: boolean; status: string }>(
    `/faults/${encodeURIComponent(faultId)}`,
    {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(creds),
      },
    }
  );
}

// --- Operational Event Audit Feed ---

export async function getEvents(
  spacecraftId?: string,
  limit: number = 50
): Promise<SimulationEvent[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (spacecraftId) params.set('spacecraftId', spacecraftId);
  return request<SimulationEvent[]>(`/events?${params.toString()}`);
}

// --- Mission Universe & Simulation Execution ---

export interface MissionFilters {
  destination?: string;
  category?: string;
  difficulty?: string;
  status?: string;
}

export async function listMissions(filters?: MissionFilters): Promise<MissionResponse[]> {
  const params = new URLSearchParams();
  if (filters?.destination) params.set('destination', filters.destination);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.difficulty) params.set('difficulty', filters.difficulty);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString();
  return request<MissionResponse[]>(`/missions${query ? `?${query}` : ''}`);
}

export async function getMissionBriefing(id: string): Promise<MissionResponse> {
  return request<MissionResponse>(`/missions/${encodeURIComponent(id)}`);
}

export async function getActiveMission(): Promise<MissionResponse | null> {
  try {
    return await request<MissionResponse>('/missions/active');
  } catch (e) {
    if (e instanceof MissionControlApiError && (e.status === 204 || e.status === 404)) {
      return null;
    }
    throw e;
  }
}

export async function startMission(
  id: string,
  abortActive: boolean = false,
  creds: OperatorCredentials = DEFAULT_OPERATOR_CREDENTIALS
): Promise<MissionRun> {
  const query = abortActive ? '?abortActive=true' : '';
  return request<MissionRun>(`/missions/${encodeURIComponent(id)}/start${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
  });
}

export async function switchMission(
  id: string,
  reason: string = 'Switched active mission via Mission Control',
  creds: OperatorCredentials = DEFAULT_OPERATOR_CREDENTIALS
): Promise<MissionRun> {
  return request<MissionRun>(`/missions/${encodeURIComponent(id)}/switch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
    body: JSON.stringify({ reason }),
  });
}

export async function completeMissionRun(
  runId: string,
  creds: OperatorCredentials = DEFAULT_OPERATOR_CREDENTIALS
): Promise<MissionRun> {
  return request<MissionRun>(`/missions/runs/${encodeURIComponent(runId)}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
  });
}

export async function abortMissionRun(
  runId: string,
  reason: string = 'Aborted by operator command',
  creds: OperatorCredentials = DEFAULT_OPERATOR_CREDENTIALS
): Promise<MissionRun> {
  return request<MissionRun>(`/missions/runs/${encodeURIComponent(runId)}/abort`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
    body: JSON.stringify({ reason }),
  });
}

export async function getMissionHistory(): Promise<MissionRun[]> {
  return request<MissionRun[]>('/missions/history');
}

export async function getMissionRun(runId: string): Promise<MissionRun> {
  return request<MissionRun>(`/missions/runs/${encodeURIComponent(runId)}`);
}

export interface CreateMissionPayload {
  id?: string;
  title: string;
  destination: string;
  destinationGroup?: string;
  category: MissionCategory;
  difficulty: MissionDifficulty;
  spacecraftId: string;
  durationMinutes?: number;
  riskLevel?: string;
  synopsis: string;
  objectives?: string[];
  completionCriteria?: string[];
  operationalConstraints?: string[];
  isSimulated?: boolean;
}

export async function createMission(
  payload: CreateMissionPayload,
  creds: OperatorCredentials = DEFAULT_OPERATOR_CREDENTIALS
): Promise<MissionResponse> {
  return request<MissionResponse>('/missions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(creds),
    },
    body: JSON.stringify(payload),
  });
}

