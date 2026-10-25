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
  MissionControlApiError,
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  X,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { resolveDestinationBody } from '../../utils/destinationModel';
import { FALLBACK_MISSION_CATALOG } from '../../utils/fallbackMissionCatalog';

interface MissionUniverseHubProps {
  spacecraftList?: SpacecraftDetail[];
  activeMission?: MissionResponse | null;
  onSelectSpacecraft?: (id: string) => void;
  onStartMissionSuccess?: (mission: MissionResponse, run: MissionRun) => void;
  onMissionStatusChanged?: () => void;
  onNavigateToConsole?: (mission?: MissionResponse) => void;
  backSignal?: number;
  onTabChanged?: (tab: 'catalogue' | 'briefing' | 'history', missionId?: string | null) => void;
}

const DESTINATION_TABS = [
  { id: 'ALL', label: 'All Destinations' },
  { id: 'Earth', label: 'Earth Orbit' },
  { id: 'Lunar', label: 'Lunar' },
  { id: 'Mars', label: 'Mars' },
  { id: 'Outer Planets', label: 'Outer Planets' },
  { id: 'Solar', label: 'Solar' },
  { id: 'Deep Space', label: 'Deep Space' },
];

export const MissionUniverseHub: React.FC<MissionUniverseHubProps> = ({
  spacecraftList = [],
  activeMission = null,
  onSelectSpacecraft,
  onStartMissionSuccess,
  onMissionStatusChanged,
  onNavigateToConsole,
  backSignal = 0,
  onTabChanged,
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
  const [expandedGatesMissionId, setExpandedGatesMissionId] = useState<string | null>(null);
  const [showSwitchConfirmModal, setShowSwitchConfirmModal] = useState<MissionResponse | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [expandedHistoryRunId, setExpandedHistoryRunId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Handle universal back navigation signal from top header
  useEffect(() => {
    if (backSignal > 0) {
      if (activeTab === 'briefing' || activeTab === 'history') {
        setActiveTab('catalogue');
        if (onTabChanged) onTabChanged('catalogue');
      }
    }
  }, [backSignal, activeTab, onTabChanged]);

  const formatDuration = (startEpoch: string, endEpoch?: string | null): string => {
    const start = new Date(startEpoch).getTime();
    const end = endEpoch ? new Date(endEpoch).getTime() : Date.now();
    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    if (mins < 60) {
      return `${mins}m ${secs}s`;
    }
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m ${secs}s`;
  };

  const getDestinationBadgeClass = (destGroup?: string) => {
    const grp = (destGroup || '').toLowerCase();
    if (grp.includes('mars')) return 'dest-mars';
    if (grp.includes('lunar') || grp.includes('deep space')) return 'dest-lunar';
    if (grp.includes('outer') || grp.includes('jupiter')) return 'dest-outer';
    if (grp.includes('solar') || grp.includes('sun')) return 'dest-solar';
    return 'dest-earth';
  };

  // New Mission Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showAdvancedDirectives, setShowAdvancedDirectives] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createTitle, setCreateTitle] = useState<string>('');
  const [createDestination, setCreateDestination] = useState<string>('');
  const [createCategory, setCreateCategory] = useState<MissionCategory>('EARTH_OBSERVATION');
  const [createDifficulty, setCreateDifficulty] = useState<MissionDifficulty>('STANDARD');
  const [createSpacecraftId, setCreateSpacecraftId] = useState<string>(
    availableCraftOptions.length > 0 ? availableCraftOptions[0].id : 'AURA-1'
  );
  const [createDuration, setCreateDuration] = useState<number>(45);
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
  const [createErrorType, setCreateErrorType] = useState<'AUTH' | 'VALIDATION' | 'SERVER' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorType, setLoadErrorType] = useState<'AUTH' | 'NETWORK' | 'SERVER' | null>(null);

  const deriveDestinationGroup = useCallback((dest: string): string => {
    const body = resolveDestinationBody(dest);
    switch (body) {
      case 'mars':
        return 'Mars';
      case 'lunar':
        return 'Lunar';
      case 'deep_space':
        return 'Deep Space';
      case 'jupiter':
      case 'saturn':
      case 'ice_giant':
        return 'Outer Planets';
      case 'solar':
        return 'Solar';
      case 'earth':
      default:
        return 'Earth';
    }
  }, []);

  const getCraftDestinationGroup = useCallback((craft: SpacecraftDetail): string => {
    const clues = `${craft.destinationGroup || ''} ${craft.modelType || ''} ${craft.id || ''} ${craft.name || ''}`.toLowerCase();
    if (clues.includes('mars') || clues.includes('areocentric') || clues.includes('phobos') || clues.includes('deimos')) return 'Mars';
    if (clues.includes('lunar') || clues.includes('moon') || clues.includes('selenocentric')) return 'Lunar';
    if (clues.includes('jupiter') || clues.includes('jovian') || clues.includes('saturn') || clues.includes('titan') || clues.includes('outer planet') || clues.includes('europa') || clues.includes('callisto') || clues.includes('rhea')) return 'Outer Planets';
    if (clues.includes('solar') || clues.includes('sun') || clues.includes('corona') || clues.includes('space weather')) return 'Solar';
    if (clues.includes('deep-space') || clues.includes('deep space') || clues.includes('interstellar') || clues.includes('asteroid') || clues.includes('voyager') || clues.includes('farpoint')) return 'Deep Space';
    return 'Earth';
  }, []);

  const destinationCraftOptions = spacecraftList.filter((craft) =>
    getCraftDestinationGroup(craft) === deriveDestinationGroup(createDestination)
  );
  const availableCraftOptions = destinationCraftOptions.length > 0 ? destinationCraftOptions : spacecraftList;

  useEffect(() => {
    if (availableCraftOptions.length === 0) return;
    if (!availableCraftOptions.some((craft) => craft.id === createSpacecraftId)) {
      setCreateSpacecraftId(availableCraftOptions[0].id);
    }
  }, [createDestination, createSpacecraftId, availableCraftOptions]);

  const loadMissionsData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setLoadErrorType(null);
    try {
      const [mList, hList] = await Promise.all([
        listMissions(),
        getMissionHistory().catch(() => []),
      ]);
      // Some local/backend deployments have a stale or partially seeded catalogue.
      // Keep the curated baseline visible and let server definitions override by ID.
      const mergedMissions = new Map(FALLBACK_MISSION_CATALOG.map((mission) => [mission.id, mission]));
      mList.forEach((mission) => mergedMissions.set(mission.id, mission));
      setMissions(Array.from(mergedMissions.values()));
      setHistory(hList);
      if (selectedMission) {
        const updated = mList.find((m) => m.id === selectedMission.id);
        if (updated) setSelectedMission(updated);
      }
    } catch (e: unknown) {
      console.warn('Failed loading mission catalogue', e);
      if (e instanceof MissionControlApiError) {
        if (e.status === 401 || e.status === 403) {
          setLoadErrorType('AUTH');
          setLoadError('Authentication required: Full authentication is required to access this resource.');
        } else if (e.status === 0) {
          setLoadErrorType('NETWORK');
          setLoadError(`Network connection to ASTRA server failed: ${e.message}`);
        } else {
          setLoadErrorType('SERVER');
          setLoadError(`Server error (${e.status}): ${e.message}`);
        }
      } else {
        const msg = e instanceof Error ? e.message : 'Failed to establish connection to mission catalogue service.';
        setLoadError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedMission]);

  const handleResetFilters = useCallback(() => {
    setSelectedDestination('ALL');
    setSelectedCategory('ALL');
    setSelectedDifficulty('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  }, []);

  useEffect(() => {
    loadMissionsData();
  }, []);

  const availableCount = missions.filter((m) => m.status === 'AVAILABLE').length;
  const activeCount = missions.filter((m) => m.status === 'ACTIVE').length;

  const handleStartMission = async (missionId: string) => {
    // Check if there is already an active mission run
    const currentActive = missions.find((m) => m.status === 'ACTIVE') || activeMission;
    if (currentActive && currentActive.id !== missionId) {
      const targetMission = missions.find((m) => m.id === missionId);
      if (targetMission) {
        setShowSwitchConfirmModal(targetMission);
        return;
      }
    }
    await executeStartMission(missionId, false);
  };

  const executeStartMission = async (missionId: string, abortActive: boolean = false) => {
    setIsActionRunning(true);
    setActionFeedback(null);
    try {
      const run = await startMission(missionId, abortActive);
      setActionFeedback(`Mission run ${run.runId} started successfully on spacecraft ${run.spacecraftId}.`);
      await loadMissionsData();
      
      const targetMission = missions.find((m) => m.id === missionId);
      if (targetMission) {
        const updatedMission: MissionResponse = {
          ...targetMission,
          status: 'ACTIVE',
          activeRun: run,
        };
        onStartMissionSuccess?.(updatedMission, run);
      } else if (onSelectSpacecraft && run.spacecraftId) {
        onSelectSpacecraft(run.spacecraftId);
      }
      onMissionStatusChanged?.();
      setShowSwitchConfirmModal(null);
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
      onMissionStatusChanged?.();
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
      onMissionStatusChanged?.();
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
    setCreateErrorType(null);

    const errors: Record<string, string> = {};
    if (!createTitle.trim()) {
      errors.title = 'Mission title is required.';
    }
    if (!createDestination.trim()) {
      errors.destination = 'Destination target is required.';
    }
    if (!createSynopsis.trim()) {
      errors.synopsis = 'Mission objective or synopsis is required.';
    }
    if (!createDuration || Number(createDuration) < 5) {
      errors.duration = 'Duration must be at least 5 minutes.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsCreating(true);
    try {
      const targetCraft = availableCraftOptions.some((craft) => craft.id === createSpacecraftId) ? createSpacecraftId : (availableCraftOptions[0]?.id || 'AURA-1');
      const destGroup = deriveDestinationGroup(createDestination);
      const derivedRisk = createDifficulty === 'CRITICAL' ? 'SEVERE' : createDifficulty === 'CHALLENGING' ? 'HIGH' : 'MODERATE';

      const payload: CreateMissionPayload = {
        title: createTitle.trim(),
        destination: createDestination.trim(),
        destinationGroup: destGroup,
        category: createCategory,
        difficulty: createDifficulty,
        spacecraftId: targetCraft,
        durationMinutes: Number(createDuration) || 45,
        riskLevel: derivedRisk,
        synopsis: createSynopsis.trim(),
        objectives: createObjectives.trim() ? createObjectives.split('\n').map((s) => s.trim()).filter(Boolean) : undefined,
        completionCriteria: createCriteria.trim() ? createCriteria.split('\n').map((s) => s.trim()).filter(Boolean) : undefined,
        operationalConstraints: createConstraints.trim() ? createConstraints.split('\n').map((s) => s.trim()).filter(Boolean) : undefined,
        isSimulated: true,
      };

      const newMission = await createMission(payload);
      setShowCreateModal(false);
      setActionFeedback(`Mission scenario '${newMission.title}' registered successfully [${newMission.id}].`);
      
      // Authoritative reload from backend
      await loadMissionsData();
      setSelectedMission(newMission);
      setActiveTab('briefing');

      // Clear form
      setCreateTitle('');
      setCreateDestination('');
      setCreateSynopsis('');
      setFieldErrors({});
    } catch (err: unknown) {
      if (err instanceof MissionControlApiError) {
        if (err.status === 401 || err.status === 403) {
          setCreateErrorType('AUTH');
          setCreateError(`Authorization Failure: Operator credentials required to register scenarios. (${err.message})`);
        } else if (err.status === 400) {
          setCreateErrorType('VALIDATION');
          setCreateError(`Validation Failure: ${err.message}`);
        } else {
          setCreateErrorType('SERVER');
          setCreateError(`Server Error (${err.status}): ${err.message}`);
        }
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setCreateError(`Registration Failed: ${msg}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const matchesDestination = (destGroup: string, selected: string): boolean => {
    if (selected === 'ALL') return true;
    const g = (destGroup || '').trim().toLowerCase();
    const s = selected.trim().toLowerCase();
    if (g === s) return true;
    if (s === 'lunar' && (g === 'lunar' || g.includes('lunar') || g.includes('moon'))) return true;
    if (s === 'deep space' && (g === 'deep space' || g.includes('deep') || g.includes('interstellar') || g.includes('asteroid'))) return true;
    if (s === 'earth' && (g === 'earth' || g.includes('earth'))) return true;
    if (s === 'mars' && (g === 'mars' || g.includes('mars'))) return true;
    if (s === 'outer planets' && (g === 'outer planets' || g.includes('outer') || g.includes('jupiter') || g.includes('saturn'))) return true;
    if (s === 'solar' && (g === 'solar' || g.includes('solar') || g.includes('sun'))) return true;
    if (s.includes('&') && (s.includes('lunar') || s.includes('deep'))) {
      return g.includes('lunar') || g.includes('deep') || g.includes('asteroid');
    }
    return false;
  };

  // Filter missions
  const filteredMissions = missions.filter((m) => {
    if (selectedDestination !== 'ALL' && !matchesDestination(m.destinationGroup, selectedDestination)) {
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

          <div className="astra-mc-universe-nav-tabs" role="tablist" aria-label="Mission universe views">
            <button
              onClick={() => {
                setActiveTab('catalogue');
                setSelectedStatus('ALL');
              }}
              className={`astra-mc-universe-tab-btn ${activeTab === 'catalogue' && selectedStatus === 'ALL' ? 'active' : ''}`}
              data-testid="tab-universe-catalogue"
              role="tab"
              aria-selected={activeTab === 'catalogue' && selectedStatus === 'ALL'}
            >
              <Layers size={13} />
              <span>CATALOGUE ({missions.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('catalogue');
                setSelectedStatus('AVAILABLE');
              }}
              className={`astra-mc-universe-tab-btn ${activeTab === 'catalogue' && selectedStatus === 'AVAILABLE' ? 'active' : ''}`}
              data-testid="tab-universe-available"
              role="tab"
              aria-selected={activeTab === 'catalogue' && selectedStatus === 'AVAILABLE'}
            >
              <CheckCircle size={13} />
              <span>AVAILABLE ({availableCount})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('catalogue');
                setSelectedStatus('ACTIVE');
              }}
              className={`astra-mc-universe-tab-btn ${activeTab === 'catalogue' && selectedStatus === 'ACTIVE' ? 'active' : ''}`}
              data-testid="tab-universe-active"
              role="tab"
              aria-selected={activeTab === 'catalogue' && selectedStatus === 'ACTIVE'}
            >
              <Activity size={13} />
              <span>ACTIVE ({activeCount})</span>
            </button>
            {selectedMission && (
              <button
                onClick={() => setActiveTab('briefing')}
                className={`astra-mc-universe-tab-btn ${activeTab === 'briefing' ? 'active' : ''}`}
                data-testid="tab-universe-briefing"
                role="tab"
                aria-selected={activeTab === 'briefing'}
              >
                <Terminal size={13} />
                <span>BRIEFING: {selectedMission.id}</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('history')}
              className={`astra-mc-universe-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              data-testid="tab-universe-history"
              role="tab"
              aria-selected={activeTab === 'history'}
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
      <div className="astra-mc-universe-destination-bar" role="toolbar" aria-label="Filter by destination">
        {DESTINATION_TABS.map((dest) => (
          <button
            key={dest.id}
            onClick={() => setSelectedDestination(dest.id)}
            className={`astra-mc-destination-btn ${selectedDestination === dest.id ? 'active' : ''}`}
            data-testid={`dest-filter-${dest.id}`}
          >
            <span>{dest.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'catalogue' && (
        <div className="astra-mc-universe-main">
          {/* Catalogue Toolbar: Search + Category + Difficulty + Status */}
          <div className="astra-mc-universe-filters" role="region" aria-label="Mission catalogue filters">
            <div className="astra-mc-search-box">
              <Search size={14} className="astra-mc-search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search missions, destinations, spacecraft..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="astra-mc-search-input"
                aria-label="Search missions by name, destination, or spacecraft"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="astra-mc-search-clear-btn"
                  aria-label="Clear search query"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="astra-mc-filter-group">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="astra-mc-select"
                aria-label="Filter by category"
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
                aria-label="Filter by difficulty"
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
                aria-label="Filter by status"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ACTIVE">Active Run</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          {/* Missions Grid or Empty States */}
          {isLoading ? (
            <div className="astra-mc-empty-state astra-mc-state-loading" data-testid="missions-loading-state">
              <div className="astra-mc-empty-icon-wrap">
                <Activity size={26} className="astra-mc-spinning-icon" />
              </div>
              <h3 className="astra-mc-empty-heading">SYNCHRONIZING MISSION UNIVERSE REPOSITORY...</h3>
              <p className="astra-mc-empty-desc">
                Querying orbital telemetry nodes and active mission scenario registry.
              </p>
            </div>
          ) : loadError ? (
            <div className="astra-mc-empty-state astra-mc-state-error" data-testid="missions-error-state">
              <div className="astra-mc-empty-icon-wrap astra-mc-icon-danger">
                {loadErrorType === 'AUTH' ? <Shield size={26} /> : <AlertTriangle size={26} />}
              </div>
              <h3 className="astra-mc-empty-heading">
                {loadErrorType === 'AUTH' ? 'AUTHENTICATION REQUIRED' : 'UNABLE TO LOAD MISSION CATALOGUE'}
              </h3>
              <p className="astra-mc-empty-desc">
                {loadError}
              </p>
              <div className="astra-mc-empty-actions">
                <button
                  onClick={loadMissionsData}
                  className="astra-mc-btn-primary"
                  data-testid="missions-retry-btn"
                >
                  <RefreshCw size={12} />
                  <span>RETRY CONNECTION</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="astra-mc-btn-secondary"
                  data-testid="error-create-mission-btn"
                >
                  <Plus size={12} />
                  <span>NEW MISSION</span>
                </button>
              </div>
            </div>
          ) : missions.length === 0 ? (
            <div className="astra-mc-empty-state" data-testid="missions-empty-catalogue-state">
              <div className="astra-mc-empty-icon-wrap">
                <Compass size={26} />
              </div>
              <h3 className="astra-mc-empty-heading">MISSION CATALOGUE EMPTY</h3>
              <p className="astra-mc-empty-desc">
                No mission scenarios are currently registered in the database. Create your first operational flight scenario to begin simulation runs.
              </p>
              <div className="astra-mc-empty-actions">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="astra-mc-btn-primary"
                  data-testid="create-first-mission-btn"
                >
                  <Plus size={12} />
                  <span>NEW MISSION</span>
                </button>
              </div>
            </div>
          ) : filteredMissions.length === 0 ? (
            <div className="astra-mc-empty-state" data-testid="missions-empty-state">
              <div className="astra-mc-empty-icon-wrap">
                <Filter size={26} />
              </div>
              <h3 className="astra-mc-empty-heading">NO MISSIONS FOUND MATCHING ACTIVE FILTERS</h3>
              <p className="astra-mc-empty-desc">
                No mission scenarios match your current destination ({selectedDestination}), category, difficulty, or search criteria.
              </p>
              <div className="astra-mc-empty-actions">
                <button
                  onClick={handleResetFilters}
                  className="astra-mc-btn-reset-filters"
                  data-testid="reset-filters-btn"
                >
                  <RefreshCw size={12} />
                  <span>RESET FILTERS</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="astra-mc-btn-primary"
                  data-testid="empty-create-mission-btn"
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
              const isGatesExpanded = expandedGatesMissionId === mission.id;
              const isCurrentlyActiveScenario = activeMission?.id === mission.id;

              return (
                <div
                  key={mission.id}
                  onClick={() => {
                    setSelectedMission(mission);
                    setActiveTab('briefing');
                  }}
                  className={`astra-mc-mission-card ${isSelected ? 'selected' : ''} ${hasActiveRun || isCurrentlyActiveScenario ? 'card-active' : ''}`}
                  data-testid={`mission-card-${mission.id}`}
                >
                  <div className="astra-mc-card-header">
                    <div className="astra-mc-card-dest-group">
                      <span className="astra-mc-card-dest-badge">{mission.destinationGroup}</span>
                      <span className="astra-mc-card-dest-name">{mission.destination}</span>
                    </div>
                    {getStatusBadge(mission.status)}
                  </div>

                  <h3 className="astra-mc-card-title">{mission.title}</h3>
                  <p className="astra-mc-card-synopsis">{mission.synopsis}</p>

                  <div className="astra-mc-card-meta-row">
                    <div className="astra-mc-card-meta-item">
                      <Clock size={11} aria-hidden="true" />
                      <span>{mission.durationMinutes}m duration</span>
                    </div>
                    <div className="astra-mc-card-meta-item">
                      <Shield size={11} color={getDifficultyColor(mission.difficulty)} aria-hidden="true" />
                      <span style={{ color: getDifficultyColor(mission.difficulty) }}>
                        {mission.difficulty}
                      </span>
                    </div>
                    <div className="astra-mc-card-meta-item">
                      <Terminal size={11} aria-hidden="true" />
                      <span>CRAFT: {mission.spacecraftId}</span>
                    </div>
                  </div>

                  {/* Expandable Operational Gates Disclosure */}
                  <div className="astra-mc-card-gates-section">
                    <button
                      type="button"
                      className={`astra-mc-card-gates-toggle-btn ${isGatesExpanded ? 'expanded' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedGatesMissionId((prev) => (prev === mission.id ? null : mission.id));
                      }}
                      aria-expanded={isGatesExpanded}
                      aria-label={`Toggle operational gates for ${mission.title}`}
                      data-testid={`gates-toggle-${mission.id}`}
                    >
                      <Layers size={11} className="astra-mc-gates-icon" aria-hidden="true" />
                      <span className="astra-mc-gates-label">{mission.objectives.length} Operational Gates</span>
                      {isGatesExpanded ? (
                        <ChevronUp size={12} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={12} aria-hidden="true" />
                      )}
                    </button>
                    {isGatesExpanded && (
                      <div className="astra-mc-card-gates-expanded-list" data-testid={`gates-list-${mission.id}`}>
                        {mission.objectives.map((gate, idx) => (
                          <div key={idx} className="astra-mc-card-gate-item">
                            <CheckCircle size={10} color="var(--color-earth-cyan)" aria-hidden="true" />
                            <span>{gate}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Briefing & Start Mission */}
                  <div className="astra-mc-card-footer">
                    <button
                      type="button"
                      className="astra-mc-card-action-btn astra-mc-card-briefing-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMission(mission);
                        setActiveTab('briefing');
                      }}
                      aria-label={`Briefing for ${mission.title}`}
                      data-testid={`card-briefing-btn-${mission.id}`}
                    >
                      <Compass size={12} aria-hidden="true" />
                      <span>BRIEFING</span>
                    </button>

                    {mission.status === 'AVAILABLE' && (
                      <button
                        type="button"
                        className="astra-mc-card-action-btn astra-mc-card-start-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartMission(mission.id);
                        }}
                        disabled={isActionRunning}
                        aria-label={`Start mission ${mission.title}`}
                        data-testid={`card-start-btn-${mission.id}`}
                      >
                        <Play size={12} aria-hidden="true" />
                        <span>START MISSION</span>
                      </button>
                    )}

                    {mission.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="astra-mc-card-action-btn astra-mc-card-active-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMission(mission);
                          setActiveTab('briefing');
                        }}
                        aria-label={`Active run for ${mission.title}`}
                        data-testid={`card-active-btn-${mission.id}`}
                      >
                        <Activity size={12} aria-hidden="true" />
                        <span>ACTIVE RUN</span>
                      </button>
                    )}
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
          <button
            type="button"
            onClick={() => {
              setActiveTab('catalogue');
              if (onTabChanged) onTabChanged('catalogue');
            }}
            className="astra-mc-filter-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '14px',
              padding: '6px 14px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-earth-cyan)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              background: 'rgba(0, 229, 255, 0.08)',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
            data-testid="briefing-back-to-catalogue-btn"
            aria-label="Return to missions catalogue"
          >
            ← RETURN TO MISSIONS CATALOGUE
          </button>
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
                      onClick={() => onNavigateToConsole(selectedMission)}
                      className="astra-mc-btn-jump-cockpit"
                      style={{ marginTop: '12px' }}
                      data-testid="jump-to-cockpit-btn"
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
            <div>
              <span className="astra-mc-hud-target-tag">[ MISSION ARCHIVE // FLIGHT AUDIT LOG ]</span>
              <h3 className="astra-mc-history-heading">Simulation Runs & Flight Verification Log</h3>
              <p className="astra-mc-history-sub">
                Authoritative chronological record of all executed simulation runs, objective verifications, and mission outcomes.
              </p>
            </div>
            <div className="astra-mc-history-header-stats">
              <span className="astra-mc-hud-metric-k">{history.length} TOTAL ARCHIVED RUNS</span>
              <button
                type="button"
                onClick={loadMissionsData}
                disabled={isLoading}
                className="astra-mc-history-refresh-btn"
                title="Refresh history from authoritative backend"
              >
                <RefreshCw size={12} className={isLoading ? 'spin' : ''} />
                <span>SYNC LOG</span>
              </button>
            </div>
          </div>

          {/* History Search & Status Filter Toolbar */}
          <div className="astra-mc-history-toolbar">
            <div className="astra-mc-history-search-wrap">
              <Search size={13} className="astra-mc-search-icon" aria-hidden="true" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search history by run ID, mission title, spacecraft, or outcome..."
                className="astra-mc-history-search-input"
                data-testid="history-search-input"
                aria-label="Search mission history"
              />
              {historySearchQuery && (
                <button
                  type="button"
                  onClick={() => setHistorySearchQuery('')}
                  className="astra-mc-search-clear-btn"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="astra-mc-history-status-pills" role="radiogroup" aria-label="Filter history by status">
              {['ALL', 'COMPLETED', 'ACTIVE', 'FAILED', 'ABORTED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setHistoryStatusFilter(st)}
                  className={`astra-mc-history-filter-pill ${historyStatusFilter === st ? 'active' : ''}`}
                  data-testid={`history-filter-${st.toLowerCase()}`}
                  role="radio"
                  aria-checked={historyStatusFilter === st}
                >
                  {st === 'ALL' ? 'ALL STATUSES' : st}
                  {st !== 'ALL' && (
                    <span className="pill-count">
                      {history.filter((r) => r.status === st).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {history.length === 0 ? (
            <div className="astra-mc-empty-state" data-testid="history-empty-state">
              <div className="astra-mc-empty-icon-wrap">
                <History size={26} />
              </div>
              <h3 className="astra-mc-empty-heading">NO HISTORICAL SIMULATION RUNS</h3>
              <p className="astra-mc-empty-desc">
                No missions have been executed yet in this simulation database. Launch an operational scenario from the catalogue to record telemetry logs and objective audits.
              </p>
              <div className="astra-mc-empty-actions">
                <button
                  onClick={() => setActiveTab('catalogue')}
                  className="astra-mc-btn-primary"
                >
                  <Layers size={12} />
                  <span>BROWSE CATALOGUE</span>
                </button>
              </div>
            </div>
          ) : (
            (() => {
              const filteredHistory = history.filter((run) => {
                if (historyStatusFilter !== 'ALL' && run.status !== historyStatusFilter) {
                  return false;
                }
                if (historySearchQuery.trim().length > 0) {
                  const q = historySearchQuery.toLowerCase();
                  const targetMission = missions.find((m) => m.id === run.missionId);
                  const title = targetMission ? targetMission.title.toLowerCase() : '';
                  const match =
                    run.runId.toLowerCase().includes(q) ||
                    run.missionId.toLowerCase().includes(q) ||
                    run.spacecraftId.toLowerCase().includes(q) ||
                    (run.outcomeSummary || '').toLowerCase().includes(q) ||
                    title.includes(q);
                  if (!match) return false;
                }
                return true;
              });

              if (filteredHistory.length === 0) {
                return (
                  <div className="astra-mc-empty-state" data-testid="history-no-matches-state">
                    <div className="astra-mc-empty-icon-wrap">
                      <Filter size={26} />
                    </div>
                    <h3 className="astra-mc-empty-heading">NO RUNS MATCH ACTIVE FILTERS</h3>
                    <p className="astra-mc-empty-desc">
                      No simulation runs match status "{historyStatusFilter}" and query "{historySearchQuery}".
                    </p>
                    <div className="astra-mc-empty-actions">
                      <button
                        onClick={() => {
                          setHistoryStatusFilter('ALL');
                          setHistorySearchQuery('');
                        }}
                        className="astra-mc-btn-reset-filters"
                      >
                        <RefreshCw size={12} />
                        <span>CLEAR FILTERS</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="astra-mc-history-cards-container" data-testid="mission-history-list">
                  {filteredHistory.map((run) => {
                    const targetMission = missions.find((m) => m.id === run.missionId);
                    const missionTitle = targetMission ? targetMission.title : run.missionId;
                    const isGatesExpanded = expandedHistoryRunId === run.runId;
                    const objectiveEntries = run.objectiveResults ? Object.entries(run.objectiveResults) : [];

                    return (
                      <div
                        key={run.runId}
                        className={`astra-mc-history-record-card astra-mc-history-row status-${run.status.toLowerCase()}`}
                        data-testid={`history-row-${run.runId}`}
                      >
                        <div className="astra-mc-history-card-top">
                          <div className="astra-mc-history-dest-group">
                            <span className={`astra-mc-card-dest-badge ${getDestinationBadgeClass(run.destinationGroup || targetMission?.destinationGroup)}`}>
                              {run.destinationGroup || targetMission?.destinationGroup || 'ORBITAL'}
                            </span>
                            <span className="astra-mc-history-id">RUN // {run.runId}</span>
                            <span className="astra-mc-history-mission-tag">MISSION // {run.missionId}</span>
                          </div>
                          <div className="astra-mc-history-status-wrap">
                            {getStatusBadge(run.status)}
                          </div>
                        </div>

                        <div className="astra-mc-history-card-main">
                          <div className="astra-mc-history-title-row">
                            <h4 className="astra-mc-history-card-title">{missionTitle}</h4>
                            <div className="astra-mc-history-craft-meta">
                              <span className="astra-mc-history-craft">
                                <Terminal size={11} aria-hidden="true" />
                                {run.spacecraftId}
                              </span>
                              <span className="astra-mc-history-op">
                                OP: {run.operatorUsername || 'operator'}
                              </span>
                            </div>
                          </div>

                          {run.outcomeSummary && (
                            <div className="astra-mc-history-outcome-callout">
                              <span className="astra-mc-history-outcome-label">FLIGHT OUTCOME EVALUATION</span>
                              <p className="astra-mc-history-outcome-text astra-mc-history-summary">
                                {run.outcomeSummary}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Timing Grid */}
                        <div className="astra-mc-history-card-timing-grid">
                          <div className="astra-mc-history-time-item">
                            <span className="astra-mc-hud-metric-k">START TIME</span>
                            <span className="astra-mc-hud-metric-v">
                              {new Date(run.startedEpoch).toLocaleString()}
                            </span>
                          </div>
                          <div className="astra-mc-history-time-item">
                            <span className="astra-mc-hud-metric-k">CONCLUDED</span>
                            <span className="astra-mc-hud-metric-v">
                              {run.completedEpoch ? new Date(run.completedEpoch).toLocaleString() : 'RUNNING (ACTIVE)'}
                            </span>
                          </div>
                          <div className="astra-mc-history-time-item">
                            <span className="astra-mc-hud-metric-k">TOTAL DURATION</span>
                            <span className="astra-mc-hud-metric-v">
                              {formatDuration(run.startedEpoch, run.completedEpoch)}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Operational Objectives & Verification Gates */}
                        {objectiveEntries.length > 0 && (
                          <div className="astra-mc-history-gates-section">
                            <button
                              type="button"
                              className={`astra-mc-history-gates-toggle ${isGatesExpanded ? 'expanded' : ''}`}
                              onClick={() => setExpandedHistoryRunId((prev) => (prev === run.runId ? null : run.runId))}
                              aria-expanded={isGatesExpanded}
                              data-testid={`history-gates-toggle-${run.runId}`}
                            >
                              <Shield size={11} aria-hidden="true" />
                              <span>Flight Objective Verification Audit ({objectiveEntries.length} Gates)</span>
                              {isGatesExpanded ? (
                                <ChevronUp size={12} aria-hidden="true" />
                              ) : (
                                <ChevronDown size={12} aria-hidden="true" />
                              )}
                            </button>
                            {isGatesExpanded && (
                              <div className="astra-mc-history-gates-expanded-list">
                                {objectiveEntries.map(([gate, passed], idx) => (
                                  <div key={idx} className="astra-mc-history-gate-item">
                                    {passed ? (
                                      <CheckCircle size={11} color="var(--color-nominal)" aria-hidden="true" />
                                    ) : (
                                      <XCircle size={11} color="var(--color-critical)" aria-hidden="true" />
                                    )}
                                    <span className={passed ? 'gate-passed' : 'gate-failed'}>{gate}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Active Run Controls */}
                        {run.status === 'ACTIVE' && (
                          <div className="astra-mc-history-card-actions">
                            <button
                              type="button"
                              className="astra-mc-card-action-btn astra-mc-card-complete-btn"
                              onClick={() => handleCompleteMission(run.runId)}
                              disabled={isActionRunning}
                              data-testid={`history-complete-btn-${run.runId}`}
                            >
                              <CheckCircle2 size={12} />
                              <span>EVALUATE & COMPLETE</span>
                            </button>
                            <button
                              type="button"
                              className="astra-mc-card-action-btn astra-mc-card-abort-btn"
                              onClick={() => handleAbortMission(run.runId)}
                              disabled={isActionRunning}
                              data-testid={`history-abort-btn-${run.runId}`}
                            >
                              <XCircle size={12} />
                              <span>ABORT RUN</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
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
              <div
                className="astra-mc-modal-error"
                role="alert"
                data-error-type={createErrorType || 'ERROR'}
              >
                {createErrorType === 'AUTH' ? (
                  <Shield size={14} color="var(--color-critical)" />
                ) : (
                  <AlertTriangle size={14} color="var(--color-critical)" />
                )}
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMissionSubmit} className="astra-mc-create-mission-form">
              <div className="astra-mc-form-body">
                {/* SECTION A: MISSION IDENTITY */}
                <div className="astra-mc-form-section">
                  <div className="astra-mc-form-section-title">
                    <span className="astra-mc-form-section-num">1</span>
                    <span>MISSION IDENTITY</span>
                  </div>

                  <div className="astra-mc-form-grid-2">
                    <div className="astra-mc-form-field">
                      <label htmlFor="create-mission-title">MISSION TITLE / NAME *</label>
                      <input
                        id="create-mission-title"
                        type="text"
                        placeholder="e.g., Europa Subsurface Conjunction Survey"
                        value={createTitle}
                        onChange={(e) => {
                          setCreateTitle(e.target.value);
                          if (fieldErrors.title) {
                            setFieldErrors((prev) => ({ ...prev, title: '' }));
                          }
                        }}
                        disabled={isCreating}
                        className={fieldErrors.title ? 'has-error' : ''}
                      />
                      {fieldErrors.title && (
                        <span className="astra-mc-field-error">{fieldErrors.title}</span>
                      )}
                    </div>

                    <div className="astra-mc-form-field">
                      <label htmlFor="create-mission-dest">DESTINATION TARGET *</label>
                      <input
                        id="create-mission-dest"
                        type="text"
                        placeholder="e.g., Mars (Gale Crater Orbit, 350 km)"
                        value={createDestination}
                        onChange={(e) => {
                          setCreateDestination(e.target.value);
                          if (fieldErrors.destination) {
                            setFieldErrors((prev) => ({ ...prev, destination: '' }));
                          }
                        }}
                        disabled={isCreating}
                        className={fieldErrors.destination ? 'has-error' : ''}
                      />
                      <span className="astra-mc-field-help">
                        Detected Region: <strong>{deriveDestinationGroup(createDestination)}</strong>
                      </span>
                      {fieldErrors.destination && (
                        <span className="astra-mc-field-error">{fieldErrors.destination}</span>
                      )}
                    </div>
                  </div>

                  <div className="astra-mc-form-field">
                    <label htmlFor="create-mission-category">MISSION CATEGORY</label>
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
                    <label htmlFor="create-mission-synopsis">SHORT OBJECTIVE / OPERATIONAL SYNOPSIS *</label>
                    <textarea
                      id="create-mission-synopsis"
                      rows={2}
                      placeholder="Brief description of operational goals, flight profile, and primary directives..."
                      value={createSynopsis}
                      onChange={(e) => {
                        setCreateSynopsis(e.target.value);
                        if (fieldErrors.synopsis) {
                          setFieldErrors((prev) => ({ ...prev, synopsis: '' }));
                        }
                      }}
                      disabled={isCreating}
                      className={fieldErrors.synopsis ? 'has-error' : ''}
                    />
                    {fieldErrors.synopsis && (
                      <span className="astra-mc-field-error">{fieldErrors.synopsis}</span>
                    )}
                  </div>
                </div>

                {/* SECTION B: MISSION CONFIGURATION */}
                <div className="astra-mc-form-section">
                  <div className="astra-mc-form-section-title">
                    <span className="astra-mc-form-section-num">2</span>
                    <span>MISSION CONFIGURATION</span>
                  </div>

                  <div className="astra-mc-form-grid-3">
                    <div className="astra-mc-form-field">
                      <label htmlFor="create-mission-craft">ASSIGNED SPACECRAFT *</label>
                      <select
                        id="create-mission-craft"
                        value={createSpacecraftId}
                        onChange={(e) => setCreateSpacecraftId(e.target.value)}
                        disabled={isCreating}
                      >
                        {availableCraftOptions.length > 0 ? (
                          availableCraftOptions.map((craft) => (
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
                      <label htmlFor="create-mission-difficulty">DIFFICULTY & OPERATIONAL RISK</label>
                      <select
                        id="create-mission-difficulty"
                        value={createDifficulty}
                        onChange={(e) => setCreateDifficulty(e.target.value as MissionDifficulty)}
                        disabled={isCreating}
                      >
                        <option value="STANDARD">Standard (Moderate Risk)</option>
                        <option value="CHALLENGING">Challenging (High Risk)</option>
                        <option value="CRITICAL">Critical (Severe Risk)</option>
                      </select>
                    </div>

                    <div className="astra-mc-form-field">
                      <label htmlFor="create-mission-duration">DURATION (MINUTES) *</label>
                      <input
                        id="create-mission-duration"
                        type="number"
                        min="5"
                        max="1440"
                        value={createDuration}
                        onChange={(e) => {
                          setCreateDuration(Number(e.target.value));
                          if (fieldErrors.duration) {
                            setFieldErrors((prev) => ({ ...prev, duration: '' }));
                          }
                        }}
                        disabled={isCreating}
                        className={fieldErrors.duration ? 'has-error' : ''}
                      />
                      {fieldErrors.duration && (
                        <span className="astra-mc-field-error">{fieldErrors.duration}</span>
                      )}
                    </div>
                  </div>

                  {/* Advanced Directives Disclosure */}
                  <button
                    type="button"
                    className="astra-mc-advanced-toggle"
                    onClick={() => setShowAdvancedDirectives(!showAdvancedDirectives)}
                    aria-expanded={showAdvancedDirectives}
                    data-testid="toggle-advanced-directives-btn"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Terminal size={12} />
                      ADVANCED SIMULATION DIRECTIVES & TELEMETRY PROTOCOLS
                    </span>
                    {showAdvancedDirectives ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {showAdvancedDirectives && (
                    <div className="astra-mc-advanced-fields">
                      <div className="astra-mc-form-field">
                        <label htmlFor="create-mission-objectives">PRIMARY DIRECTIVES (ONE PER LINE)</label>
                        <textarea
                          id="create-mission-objectives"
                          rows={2}
                          value={createObjectives}
                          onChange={(e) => setCreateObjectives(e.target.value)}
                          disabled={isCreating}
                        />
                      </div>

                      <div className="astra-mc-form-grid-2">
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
                    </div>
                  )}
                </div>

                {/* SECTION C: REVIEW AND CREATE */}
                <div className="astra-mc-form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                  <div className="astra-mc-form-section-title">
                    <span className="astra-mc-form-section-num">3</span>
                    <span>REVIEW & CREATE</span>
                  </div>

                  <div className="astra-mc-review-summary">
                    <div className="astra-mc-review-item">
                      <span className="astra-mc-review-label">Destination</span>
                      <span className="astra-mc-review-value">
                        {createDestination.trim() || 'Unassigned'} ({deriveDestinationGroup(createDestination)})
                      </span>
                    </div>

                    <div className="astra-mc-review-item">
                      <span className="astra-mc-review-label">Spacecraft</span>
                      <span className="astra-mc-review-value">{createSpacecraftId}</span>
                    </div>

                    <div className="astra-mc-review-item">
                      <span className="astra-mc-review-label">Profile / Risk</span>
                      <span className="astra-mc-review-value">
                        {createDifficulty} ({createDifficulty === 'CRITICAL' ? 'Severe' : createDifficulty === 'CHALLENGING' ? 'High' : 'Moderate'})
                      </span>
                    </div>

                    <div className="astra-mc-review-item">
                      <span className="astra-mc-review-label">Duration</span>
                      <span className="astra-mc-review-value">{createDuration} min</span>
                    </div>

                    <div className="astra-mc-review-item">
                      <span className="astra-mc-review-label">Category</span>
                      <span className="astra-mc-review-value">{createCategory.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
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
                  {isCreating ? 'CREATING MISSION...' : 'CREATE MISSION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Switch Mission Confirmation Modal (Enforcing Single Active Mission Policy) */}
      {showSwitchConfirmModal && (
        <div
          className="astra-mc-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="switch-mission-modal-title"
          data-testid="switch-mission-modal"
          onClick={() => !isActionRunning && setShowSwitchConfirmModal(null)}
        >
          <div
            className="astra-mc-modal-dialog astra-mc-switch-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="astra-mc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} color="var(--color-advisory)" />
                <h3 id="switch-mission-modal-title" className="astra-mc-modal-title">
                  ACTIVE MISSION RUN IN PROGRESS // CONFIRM SWITCH
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isActionRunning && setShowSwitchConfirmModal(null)}
                className="astra-mc-modal-close-btn"
                aria-label="Close dialog"
                disabled={isActionRunning}
              >
                <X size={16} />
              </button>
            </div>

            <div className="astra-mc-switch-modal-body">
              <p className="astra-mc-switch-warning">
                Simulator session policy enforces <strong>one active mission run at a time</strong>. Starting this mission will transition the active cockpit and telemetry stream.
              </p>

              <div className="astra-mc-switch-comparison">
                <div className="astra-mc-switch-col current">
                  <span className="astra-mc-switch-col-label">CURRENT ACTIVE RUN</span>
                  <h4>
                    {missions.find((m) => m.status === 'ACTIVE')?.title ||
                      activeMission?.title ||
                      'Active Scenario'}
                  </h4>
                  <div className="astra-mc-switch-meta">
                    <span>
                      Craft: {missions.find((m) => m.status === 'ACTIVE')?.spacecraftId || activeMission?.spacecraftId}
                    </span>
                    <span>Status: ACTIVE RUN</span>
                  </div>
                  <div className="astra-mc-switch-fate-tag">
                    Action: Will be ABORTED and archived to Mission History
                  </div>
                </div>

                <div className="astra-mc-switch-col incoming">
                  <span className="astra-mc-switch-col-label">TARGET SCENARIO</span>
                  <h4>{showSwitchConfirmModal.title}</h4>
                  <div className="astra-mc-switch-meta">
                    <span>Target: {showSwitchConfirmModal.destination}</span>
                    <span>Craft: {showSwitchConfirmModal.spacecraftId}</span>
                  </div>
                  <div className="astra-mc-switch-incoming-tag">
                    Action: Will be LAUNCHED as new active mission
                  </div>
                </div>
              </div>

              <p className="astra-mc-switch-note">
                Telemetry streams, orbital visualizer target, and cockpit flight instrumentation will transition immediately to {showSwitchConfirmModal.spacecraftId}.
              </p>
            </div>

            <div className="astra-mc-modal-footer">
              <button
                type="button"
                className="astra-mc-modal-cancel-btn"
                onClick={() => setShowSwitchConfirmModal(null)}
                disabled={isActionRunning}
                data-testid="cancel-switch-mission-btn"
              >
                KEEP CURRENT MISSION
              </button>
              <button
                type="button"
                className="astra-mc-btn-danger-switch"
                onClick={() => executeStartMission(showSwitchConfirmModal.id, true)}
                disabled={isActionRunning}
                data-testid="confirm-switch-mission-btn"
              >
                {isActionRunning ? <RefreshCw size={13} className="spin" /> : <Play size={13} />}
                <span>ABORT CURRENT & START {showSwitchConfirmModal.id}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
