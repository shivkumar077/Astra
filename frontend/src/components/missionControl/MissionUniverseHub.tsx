import React, { useState, useEffect, useCallback } from 'react';
import {
  MissionResponse,
  MissionRun,
  MissionDifficulty,
  MissionCategory,
  MissionStatus,
  SpacecraftDetail,
} from '../../types/missionControl';
import {
  listMissions,
  startMission,
  completeMissionRun,
  abortMissionRun,
  getMissionHistory,
  createMission,
  CreateMissionPayload,
} from '../../api/missionControlApi';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  Shield,
  Layers,
  Search,
  CheckCircle,
  XCircle,
  History,
  Activity,
  Terminal,
  ChevronRight,
  ExternalLink,
  Plus,
  X,
} from 'lucide-react';

interface MissionUniverseHubProps {
  spacecraftList?: SpacecraftDetail[];
  onSelectSpacecraft?: (id: string) => void;
  onNavigateToConsole?: () => void;
}

const DESTINATION_TABS = [
  { id: 'ALL', label: 'All Destinations' },
  { id: 'Earth', label: 'Earth Orbit' },
  { id: 'Mars', label: 'Mars' },
  { id: 'Lunar & Deep Space', label: 'Lunar & Deep Space' },
  { id: 'Outer Planets', label: 'Outer Planets' },
  { id: 'Solar', label: 'Solar' },
];

export const MissionUniverseHub: React.FC<MissionUniverseHubProps> = ({
  spacecraftList = [],
  onSelectSpacecraft,
  onNavigateToConsole,
}) => {
  const [missions, setMissions] = useState<MissionResponse[]>([]);
  const [history, setHistory] = useState<MissionRun[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMission, setSelectedMission] = useState<MissionResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'catalogue' | 'briefing' | 'history'>('catalogue');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionRunning, setIsActionRunning] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // New Mission Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createTitle, setCreateTitle] = useState<string>('');
  const [createDestination, setCreateDestination] = useState<string>('');
  const [createDestGroup, setCreateDestGroup] = useState<string>('Earth');
  const [createCategory, setCreateCategory] = useState<MissionCategory>('EARTH_OBSERVATION');
  const [createDifficulty, setCreateDifficulty] = useState<MissionDifficulty>('STANDARD');
  const [createSpacecraftId, setCreateSpacecraftId] = useState<string>(
    spacecraftList.length > 0 ? spacecraftList[0].id : 'AURA-1'
  );
  const [createDuration, setCreateDuration] = useState<number>(45);
  const [createRisk, setCreateRisk] = useState<string>('MODERATE');
  const [createSynopsis, setCreateSynopsis] = useState<string>('');
  const [createObjectives, setCreateObjectives] = useState<string>(
    'Maintain nominal telemetry lock\nVerify subsystem thermal balance'
  );
  const [createCriteria, setCreateCriteria] = useState<string>(
    'Telemetry snapshot recorded\nZero unhandled safety triggers'
  );
  const [createConstraints, setCreateConstraints] = useState<string>(
    'Operating bus temperature <= +45C\nBattery reserves >= 60%'
  );
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadMissionsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mList, hList] = await Promise.all([
        listMissions(),
        getMissionHistory().catch(() => []),
      ]);
      setMissions(mList);
      setHistory(hList);
      if (selectedMission) {
        const updated = mList.find((m) => m.id === selectedMission.id);
        if (updated) setSelectedMission(updated);
      }
    } catch (e) {
      console.warn('Failed loading mission catalogue', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMission]);

  useEffect(() => {
    loadMissionsData();
  }, []);

  const handleStartMission = async (missionId: string) => {
    setIsActionRunning(true);
    setActionFeedback(null);
    try {
      const run = await startMission(missionId);
      setActionFeedback(`Mission run ${run.runId} started successfully on spacecraft ${run.spacecraftId}.`);
      await loadMissionsData();
      if (onSelectSpacecraft && run.spacecraftId) {
        onSelectSpacecraft(run.spacecraftId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionFeedback(`Start Failed: ${msg}`);
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleCompleteMission = async (runId: string) => {
    setIsActionRunning(true);
    setActionFeedback(null);
    try {
      const run = await completeMissionRun(runId);
      setActionFeedback(`Mission evaluated: ${run.status}. ${run.outcomeSummary}`);
      await loadMissionsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionFeedback(`Evaluation Failed: ${msg}`);
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleAbortMission = async (runId: string) => {
    setIsActionRunning(true);
    setActionFeedback(null);
    try {
      const run = await abortMissionRun(runId, 'Aborted via Mission Universe Hub');
      setActionFeedback(`Mission run ${run.runId} ABORTED.`);
      await loadMissionsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionFeedback(`Abort Failed: ${msg}`);
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleCreateMissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createTitle.trim()) {
      setCreateError('Mission title is required.');
      return;
    }
    if (!createDestination.trim()) {
      setCreateError('Mission destination is required.');
      return;
    }
    if (!createSynopsis.trim()) {
      setCreateError('Mission synopsis is required.');
      return;
    }

    setIsCreating(true);
    try {
      const payload: CreateMissionPayload = {
        title: createTitle.trim(),
        destination: createDestination.trim(),
        destinationGroup: createDestGroup,
        category: createCategory,
        difficulty: createDifficulty,
        spacecraftId: createSpacecraftId,
        durationMinutes: Number(createDuration) || 45,
        riskLevel: createRisk,
        synopsis: createSynopsis.trim(),
        objectives: createObjectives.split('\n').map((s) => s.trim()).filter(Boolean),
        completionCriteria: createCriteria.split('\n').map((s) => s.trim()).filter(Boolean),
        operationalConstraints: createConstraints.split('\n').map((s) => s.trim()).filter(Boolean),
        isSimulated: true,
      };

      const newMission = await createMission(payload);
      setShowCreateModal(false);
      setActionFeedback(`Mission scenario '${newMission.title}' registered successfully [${newMission.id}].`);
      await loadMissionsData();
      setSelectedMission(newMission);
      setActiveTab('briefing');
      setCreateTitle('');
      setCreateDestination('');
      setCreateSynopsis('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCreateError(`Registration Failed: ${msg}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Filter missions
  const filteredMissions = missions.filter((m) => {
    if (selectedDestination !== 'ALL' && m.destinationGroup !== selectedDestination) {
      return false;
    }
    if (selectedCategory !== 'ALL' && m.category !== selectedCategory) {
      return false;
    }
    if (selectedDifficulty !== 'ALL' && m.difficulty !== selectedDifficulty) {
      return false;
    }
    if (selectedStatus !== 'ALL' && m.status !== selectedStatus) {
      return false;
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const match =
        m.title.toLowerCase().includes(q) ||
        m.destination.toLowerCase().includes(q) ||
        m.spacecraftId.toLowerCase().includes(q) ||
        m.synopsis.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getDifficultyColor = (diff: MissionDifficulty) => {
    switch (diff) {
      case 'STANDARD':
        return 'var(--color-nominal)';
      case 'CHALLENGING':
        return 'var(--color-advisory)';
      case 'CRITICAL':
        return 'var(--color-critical)';
      default:
        return 'var(--color-text-muted)';
    }
  };

  const getStatusBadge = (status: MissionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="astra-mc-badge astra-mc-badge-active">ACTIVE RUN</span>;
      case 'COMPLETED':
        return <span className="astra-mc-badge astra-mc-badge-completed">COMPLETED</span>;
      case 'FAILED':
        return <span className="astra-mc-badge astra-mc-badge-failed">FAILED</span>;
      case 'ABORTED':
        return <span className="astra-mc-badge astra-mc-badge-aborted">ABORTED</span>;
      default:
        return <span className="astra-mc-badge astra-mc-badge-available">AVAILABLE</span>;
    }
  };

  return (
    <div className="astra-mc-universe-container" data-testid="mission-universe-hub">
      {/* Universe Hub Header Bar */}
      <div className="astra-mc-universe-header">
        <div className="astra-mc-universe-title-group">
          <div className="astra-mc-universe-tag">
            <Compass size={14} color="var(--color-earth-cyan)" />
            <span>MISSION UNIVERSE // SOLAR SYSTEM OPERATIONS CATALOGUE</span>
          </div>
          <h2 className="astra-mc-universe-heading">Exploration & Operations Scenarios</h2>
          <p className="astra-mc-universe-sub">
            Authoritative spacecraft operations missions distributed across Earth orbit, Mars, Lunar polar outposts, and outer solar destinations.
          </p>
        </div>

        {/* Actions Bar: NEW MISSION Button + View Tabs */}
        <div className="astra-mc-universe-header-actions">
          <button
            onClick={() => setShowCreateModal(true)}
            className="astra-mc-create-mission-btn"
            data-testid="open-create-mission-modal-btn"
            title="Create and register custom mission scenario"
          >
            <Plus size={13} aria-hidden="true" />
            <span>NEW MISSION</span>
          </button>

          <div className="astra-mc-universe-nav-tabs">
            <button
              onClick={() => setActiveTab('catalogue')}
              className={`astra-mc-universe-tab-btn ${activeTab === 'catalogue' ? 'active' : ''}`}
              data-testid="tab-universe-catalogue"
            >
              <Layers size={13} />
              <span>CATALOGUE ({filteredMissions.length})</span>
            </button>
            {selectedMission && (
              <button
                onClick={() => setActiveTab('briefing')}
                className={`astra-mc-universe-tab-btn ${activeTab === 'briefing' ? 'active' : ''}`}
                data-testid="tab-universe-briefing"
              >
                <Terminal size={13} />
                <span>BRIEFING: {selectedMission.id}</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('history')}
              className={`astra-mc-universe-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              data-testid="tab-universe-history"
            >
              <History size={13} />
              <span>MISSION HISTORY ({history.length})</span>
            </button>
          </div>
        </div>
      </div>

      {actionFeedback && (
        <div className="astra-mc-universe-feedback" data-testid="universe-feedback-banner">
          <Activity size={13} color="var(--color-earth-cyan)" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Destination Pill Navigator */}
      <div className="astra-mc-universe-destination-bar">
        {DESTINATION_TABS.map((dest) => (
          <button
            key={dest.id}
            onClick={() => setSelectedDestination(dest.id)}
            className={`astra-mc-destination-btn ${selectedDestination === dest.id ? 'active' : ''}`}
          >
            <span>{dest.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'catalogue' && (
        <div className="astra-mc-universe-main">
          {/* Filter Bar */}
          <div className="astra-mc-universe-filters">
            <div className="astra-mc-search-box">
              <Search size={14} color="var(--color-text-ghost)" />
              <input
                type="text"
                placeholder="Search missions, destinations, spacecraft..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="astra-mc-search-input"
              />
            </div>

            <div className="astra-mc-filter-group">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="astra-mc-select"
              >
                <option value="ALL">All Categories</option>
                <option value="EARTH_OBSERVATION">Earth Observation</option>
                <option value="TELEMETRY_MONITORING">Telemetry Monitoring</option>
                <option value="ORBITAL_SAFETY">Orbital Safety</option>
                <option value="COMMUNICATIONS_RECOVERY">Communications Recovery</option>
                <option value="PAYLOAD_CALIBRATION">Payload Calibration</option>
                <option value="PLANETARY_RECONNAISSANCE">Planetary Reconnaissance</option>
                <option value="DEEP_SPACE_SURVIVAL">Deep Space Survival</option>
                <option value="THERMAL_MANAGEMENT">Thermal Management</option>
              </select>

              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="astra-mc-select"
              >
                <option value="ALL">All Difficulties</option>
                <option value="STANDARD">Standard</option>
                <option value="CHALLENGING">Challenging</option>
                <option value="CRITICAL">Critical</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="astra-mc-select"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ACTIVE">Active Run</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          {/* Missions Grid */}
          {isLoading ? (
            <div className="astra-mc-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Activity size={24} style={{ color: 'var(--color-earth-cyan)', margin: '0 auto 12px' }} />
              <p>SYNCHRONIZING MISSION UNIVERSE REPOSITORY...</p>
            </div>
          ) : filteredMissions.length === 0 ? (
            <div className="astra-mc-empty-state" data-testid="missions-empty-state">
              <Compass size={28} style={{ color: 'var(--color-earth-cyan)', margin: '0 auto 12px' }} />
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.12em', color: 'var(--color-text-display)', marginBottom: '8px' }}>
                NO MISSIONS FOUND MATCHING ACTIVE FILTERS
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                Adjust your destination, category, or status criteria, or register a new scenario.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setSelectedDestination('ALL');
                    setSelectedCategory('ALL');
                    setSelectedDifficulty('ALL');
                    setSelectedStatus('ALL');
                    setSearchQuery('');
                  }}
                  className="astra-mc-card-action-btn"
                >
                  RESET FILTERS
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="astra-mc-create-mission-btn"
                >
                  <Plus size={12} />
                  <span>NEW MISSION</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="astra-mc-missions-grid" data-testid="missions-card-grid">
              {filteredMissions.map((mission) => {
              const isSelected = selectedMission?.id === mission.id;
              const hasActiveRun = mission.status === 'ACTIVE' && mission.activeRun;

              return (
                <div
                  key={mission.id}
                  onClick={() => {
                    setSelectedMission(mission);
                    setActiveTab('briefing');
                  }}
                  className={`astra-mc-mission-card ${isSelected ? 'selected' : ''} ${hasActiveRun ? 'card-active' : ''}`}
                  data-testid={`mission-card-${mission.id}`}
                >
                  <div className="astra-mc-card-header">
                    <span className="astra-mc-card-dest-tag">{mission.destinationGroup} // {mission.destination}</span>
                    {getStatusBadge(mission.status)}
                  </div>

                  <h3 className="astra-mc-card-title">{mission.title}</h3>
                  <p className="astra-mc-card-synopsis">{mission.synopsis}</p>

                  <div className="astra-mc-card-meta-row">
                    <div className="astra-mc-card-meta-item">
                      <Clock size={11} />
                      <span>{mission.durationMinutes}m duration</span>
                    </div>
                    <div className="astra-mc-card-meta-item">
                      <Shield size={11} color={getDifficultyColor(mission.difficulty)} />
                      <span style={{ color: getDifficultyColor(mission.difficulty) }}>
                        {mission.difficulty}
                      </span>
                    </div>
                    <div className="astra-mc-card-meta-item">
                      <Terminal size={11} />
                      <span>CRAFT: {mission.spacecraftId}</span>
                    </div>
                  </div>

                  <div className="astra-mc-card-footer">
                    <span className="astra-mc-objectives-count">
                      {mission.objectives.length} Operational Gates
                    </span>
                    <button
                      className="astra-mc-card-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMission(mission);
                        setActiveTab('briefing');
                      }}
                    >
                      <span>BRIEFING</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* Briefing Tab */}
      {activeTab === 'briefing' && selectedMission && (
        <div className="astra-mc-briefing-view" data-testid="mission-briefing-view">
          <div className="astra-mc-briefing-card">
            <div className="astra-mc-briefing-header">
              <div>
                <span className="astra-mc-hud-target-tag">
                  [ MISSION BRIEFING // {selectedMission.id} ]
                </span>
                <h2 className="astra-mc-briefing-title">{selectedMission.title}</h2>
                <span className="astra-mc-briefing-dest">{selectedMission.destination}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {getStatusBadge(selectedMission.status)}
                {selectedMission.status === 'AVAILABLE' && (
                  <button
                    onClick={() => handleStartMission(selectedMission.id)}
                    disabled={isActionRunning}
                    className="astra-mc-launch-btn"
                    data-testid="start-mission-btn"
                  >
                    <Play size={13} />
                    <span>START MISSION</span>
                  </button>
                )}
                {selectedMission.status === 'ACTIVE' && selectedMission.activeRun && (
                  <>
                    <button
                      onClick={() => handleCompleteMission(selectedMission.activeRun!.runId)}
                      disabled={isActionRunning}
                      className="astra-mc-complete-btn"
                      data-testid="complete-mission-btn"
                    >
                      <CheckCircle2 size={13} />
                      <span>EVALUATE & COMPLETE</span>
                    </button>
                    <button
                      onClick={() => handleAbortMission(selectedMission.activeRun!.runId)}
                      disabled={isActionRunning}
                      className="astra-mc-abort-btn"
                      data-testid="abort-mission-btn"
                    >
                      <XCircle size={13} />
                      <span>ABORT</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="astra-mc-briefing-body">
              <div className="astra-mc-briefing-section">
                <h4>OPERATIONAL SYNOPSIS</h4>
                <p className="astra-mc-briefing-text">{selectedMission.synopsis}</p>
              </div>

              <div className="astra-mc-briefing-grid-2col">
                <div className="astra-mc-briefing-section">
                  <h4>PRIMARY MISSION OBJECTIVES</h4>
                  <ul className="astra-mc-briefing-list">
                    {selectedMission.objectives.map((obj, i) => (
                      <li key={i}>
                        <CheckCircle size={12} color="var(--color-earth-cyan)" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="astra-mc-briefing-section">
                  <h4>COMPLETION CRITERIA & VERIFICATION</h4>
                  <ul className="astra-mc-briefing-list">
                    {selectedMission.completionCriteria.map((crit, i) => (
                      <li key={i}>
                        <Shield size={12} color="var(--color-nominal)" />
                        <span>{crit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="astra-mc-briefing-section">
                <h4>OPERATIONAL CONSTRAINTS & FLIGHT RULES</h4>
                <ul className="astra-mc-briefing-list">
                  {selectedMission.operationalConstraints.map((con, i) => (
                    <li key={i}>
                      <AlertTriangle size={12} color="var(--color-advisory)" />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedMission.activeRun && (
                <div className="astra-mc-active-run-panel" data-testid="active-run-cockpit">
                  <div className="astra-mc-active-run-header">
                    <Activity size={14} color="var(--color-nominal)" />
                    <span>ACTIVE SIMULATION RUN // {selectedMission.activeRun.runId}</span>
                  </div>
                  <div className="astra-mc-run-telemetry-row">
                    <div>
                      <span className="astra-mc-hud-metric-k">ASSIGNED CRAFT</span>
                      <span className="astra-mc-hud-metric-v">{selectedMission.spacecraftId}</span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">OPERATOR</span>
                      <span className="astra-mc-hud-metric-v">{selectedMission.activeRun.operatorUsername || 'operator'}</span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">STARTED AT</span>
                      <span className="astra-mc-hud-metric-v">{new Date(selectedMission.activeRun.startedEpoch).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  {onNavigateToConsole && (
                    <button
                      onClick={onNavigateToConsole}
                      className="astra-mc-btn-jump-cockpit"
                      style={{ marginTop: '12px' }}
                    >
                      <ExternalLink size={12} />
                      <span>JUMP TO 3D COCKPIT & TELEMETRY</span>
                    </button>
                  )}
                </div>
              )}

              {selectedMission.lastCompletedRun && (
                <div className="astra-mc-completed-run-panel">
                  <div className="astra-mc-active-run-header">
                    <CheckCircle2 size={14} color="var(--color-nominal)" />
                    <span>LAST SIMULATION OUTCOME // {selectedMission.lastCompletedRun.status}</span>
                  </div>
                  <p className="astra-mc-briefing-text" style={{ margin: '8px 0' }}>
                    {selectedMission.lastCompletedRun.outcomeSummary}
                  </p>
                  {selectedMission.lastCompletedRun.objectiveResults && (
                    <div className="astra-mc-objective-results">
                      {Object.entries(selectedMission.lastCompletedRun.objectiveResults).map(([key, val]) => (
                        <div key={key} className="astra-mc-obj-row">
                          {val ? (
                            <CheckCircle size={12} color="var(--color-nominal)" />
                          ) : (
                            <XCircle size={12} color="var(--color-critical)" />
                          )}
                          <span>{key}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="astra-mc-history-view" data-testid="mission-history-view">
          <div className="astra-mc-history-header">
            <h3>SIMULATION AUDIT LOG & FLIGHT OUTCOMES</h3>
            <span className="astra-mc-hud-metric-k">{history.length} RECORDED RUNS</span>
          </div>
          {history.length === 0 ? (
            <div className="astra-mc-empty-state">
              <History size={24} color="var(--color-text-ghost)" />
              <p>No historical simulation runs recorded yet. Launch a mission from the catalogue.</p>
            </div>
          ) : (
            <div className="astra-mc-history-table">
              {history.map((run) => (
                <div key={run.runId} className="astra-mc-history-row" data-testid={`history-row-${run.runId}`}>
                  <div className="astra-mc-history-col-main">
                    <span className="astra-mc-history-id">RUN // {run.runId}</span>
                    <span className="astra-mc-history-mission">{run.missionId}</span>
                    <span className="astra-mc-history-summary">{run.outcomeSummary}</span>
                  </div>
                  <div className="astra-mc-history-col-meta">
                    <span className="astra-mc-history-craft">{run.spacecraftId}</span>
                    {getStatusBadge(run.status)}
                    <span className="astra-mc-history-time">
                      {new Date(run.startedEpoch).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Mission Creation Modal */}
      {showCreateModal && (
        <div
          className="astra-mc-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-mission-modal-title"
          data-testid="create-mission-modal"
          onClick={() => !isCreating && setShowCreateModal(false)}
        >
          <div
            className="astra-mc-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="astra-mc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={16} color="var(--color-earth-cyan)" />
                <h3 id="create-mission-modal-title" className="astra-mc-modal-title">
                  CREATE NEW MISSION SCENARIO
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isCreating && setShowCreateModal(false)}
                className="astra-mc-modal-close-btn"
                aria-label="Close creation dialog"
                disabled={isCreating}
              >
                <X size={16} />
              </button>
            </div>

            {createError && (
              <div className="astra-mc-modal-error" role="alert">
                <AlertTriangle size={14} color="var(--color-critical)" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMissionSubmit} className="astra-mc-create-mission-form">
              <div className="astra-mc-form-grid">
                <div className="astra-mc-form-field astra-mc-span-2">
                  <label htmlFor="create-mission-title">MISSION TITLE *</label>
                  <input
                    id="create-mission-title"
                    type="text"
                    required
                    placeholder="e.g., Europa Subsurface Ocean Conjunction Survey"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    disabled={isCreating}
                  />
                </div>

                <div className="astra-mc-form-field">
                  <label htmlFor="create-mission-dest">DESTINATION TARGET *</label>
                  <input
                    id="create-mission-dest"
                    type="text"
                    required
                    placeholder="e.g., Europa (Low Jovian Polar, 400 km)"
                    value={createDestination}
                    onChange={(e) => setCreateDestination(e.target.value)}
                    disabled={isCreating}
                  />
                </div>

                <div className="astra-mc-form-field">
                  <label htmlFor="create-mission-destgroup">DESTINATION REGION</label>
                  <select
                    id="create-mission-destgroup"
                    value={createDestGroup}
                    onChange={(e) => setCreateDestGroup(e.target.value)}
                    disabled={isCreating}
                  >
                    <option value="Earth">Earth Orbit</option>
                    <option value="Mars">Mars</option>
                    <option value="Lunar & Deep Space">Lunar & Deep Space</option>
                    <option value="Outer Planets">Outer Planets</option>
                    <option value="Solar">Solar</option>
                  </select>
                </div>

                <div className="astra-mc-form-field">
                  <label htmlFor="create-mission-category">OPERATIONAL CATEGORY</label>
                  <select
                    id="create-mission-category"
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value as MissionCategory)}
                    disabled={isCreating}
                  >
                    <option value="EARTH_OBSERVATION">Earth Observation</option>
                    <option value="TELEMETRY_MONITORING">Telemetry Monitoring</option>
                    <option value="ORBITAL_SAFETY">Orbital Safety & Collision Avoidance</option>
                    <option value="COMMUNICATIONS_RECOVERY">Communications Recovery</option>
                    <option value="PAYLOAD_CALIBRATION">Payload Calibration</option>
                    <option value="PLANETARY_RECONNAISSANCE">Planetary Reconnaissance</option>
                    <option value="DEEP_SPACE_SURVIVAL">Deep Space Survival</option>
                    <option value="THERMAL_MANAGEMENT">Thermal Management</option>
                  </select>
                </div>

                <div className="astra-mc-form-field">
                  <label htmlFor="create-mission-difficulty">MISSION DIFFICULTY</label>
                  <select
                    id="create-mission-difficulty"
                    value={createDifficulty}
                    onChange={(e) => setCreateDifficulty(e.target.value as MissionDifficulty)}
                    disabled={isCreating}
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="CHALLENGING">Challenging</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="astra-mc-form-field">
                  <label htmlFor="create-mission-craft">ASSIGNED SPACECRAFT *</label>
                  <select
                    id="create-mission-craft"
                    value={createSpacecraftId}
                    onChange={(e) => setCreateSpacecraftId(e.target.value)}
                    disabled={isCreating}
                  >
                    {spacecraftList.length > 0 ? (
                      spacecraftList.map((craft) => (
                        <option key={craft.id} value={craft.id}>
                          {craft.id} ({craft.callSign || craft.name})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="AURA-1">AURA-1 (LEO Sentinel)</option>
                        <option value="TERRA-OBS">TERRA-OBS (Orbital Observatory)</option>
                        <option value="SOLAR-PROBE">SOLAR-PROBE (Coronal Scout)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="astra-mc-form-field">
                  <label htmlFor="create-mission-duration">DURATION (MINUTES)</label>
                  <input
                    id="create-mission-duration"
                    type="number"
                    min="5"
                    max="1440"
                    value={createDuration}
                    onChange={(e) => setCreateDuration(Number(e.target.value))}
                    disabled={isCreating}
                  />
                </div>

                <div className="astra-mc-form-field">
                  <label htmlFor="create-mission-risk">ASSESSED RISK LEVEL</label>
                  <select
                    id="create-mission-risk"
                    value={createRisk}
                    onChange={(e) => setCreateRisk(e.target.value)}
                    disabled={isCreating}
                  >
                    <option value="LOW">Low</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="HIGH">High</option>
                    <option value="SEVERE">Severe</option>
                  </select>
                </div>

                <div className="astra-mc-form-field astra-mc-span-2">
                  <label htmlFor="create-mission-synopsis">OPERATIONAL SYNOPSIS & BRIEFING *</label>
                  <textarea
                    id="create-mission-synopsis"
                    required
                    rows={3}
                    placeholder="Detailed mission parameters, operational directives, and flight profile..."
                    value={createSynopsis}
                    onChange={(e) => setCreateSynopsis(e.target.value)}
                    disabled={isCreating}
                  />
                </div>

                <div className="astra-mc-form-field astra-mc-span-2">
                  <label htmlFor="create-mission-objectives">PRIMARY OBJECTIVES (One per line)</label>
                  <textarea
                    id="create-mission-objectives"
                    rows={2}
                    value={createObjectives}
                    onChange={(e) => setCreateObjectives(e.target.value)}
                    disabled={isCreating}
                  />
                </div>

                <div className="astra-mc-form-field">
                  <label htmlFor="create-mission-criteria">COMPLETION CRITERIA</label>
                  <textarea
                    id="create-mission-criteria"
                    rows={2}
                    value={createCriteria}
                    onChange={(e) => setCreateCriteria(e.target.value)}
                    disabled={isCreating}
                  />
                </div>

                <div className="astra-mc-form-field">
                  <label htmlFor="create-mission-constraints">OPERATIONAL CONSTRAINTS</label>
                  <textarea
                    id="create-mission-constraints"
                    rows={2}
                    value={createConstraints}
                    onChange={(e) => setCreateConstraints(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
              </div>

              <div className="astra-mc-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="astra-mc-modal-cancel-btn"
                  disabled={isCreating}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="astra-mc-modal-submit-btn"
                  disabled={isCreating}
                  data-testid="submit-create-mission-btn"
                >
                  {isCreating ? 'REGISTERING...' : 'REGISTER MISSION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
