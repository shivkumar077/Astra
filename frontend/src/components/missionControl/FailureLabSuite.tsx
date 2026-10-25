import React, { useState, useEffect, useCallback } from 'react';
import {
  SpacecraftDetail,
  FaultScenarioMetadata,
  FaultRecord,
  SubsystemsHealth,
  SimulationEvent,
} from '../../types/missionControl';
import {
  listFaultScenarios,
  listFaults,
  injectFault,
  recoverFault,
  clearFaultAlert,
  getSubsystemsHealth,
  getEvents,
} from '../../api/missionControlApi';
import { FailureLabTimeline } from './FailureLabTimeline';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  Activity,
  FileText,
  ArrowRight,
  Cpu,
  Flame,
  Radio,
  Zap,
  Gauge,
  Compass,
} from 'lucide-react';

interface FailureLabSuiteProps {
  spacecraftList: SpacecraftDetail[];
  selectedSpacecraftId: string;
  onSelectSpacecraft: (id: string) => void;
  onFaultsChanged?: () => void;
}

export const FailureLabSuite: React.FC<FailureLabSuiteProps> = ({
  spacecraftList,
  selectedSpacecraftId,
  onSelectSpacecraft,
  onFaultsChanged,
}) => {
  const [scenarios, setScenarios] = useState<FaultScenarioMetadata[]>([]);
  const [activeFaults, setActiveFaults] = useState<FaultRecord[]>([]);
  const [faultHistory, setFaultHistory] = useState<FaultRecord[]>([]);
  const [subsystemsHealth, setSubsystemsHealth] = useState<SubsystemsHealth | null>(null);
  const [events, setEvents] = useState<SimulationEvent[]>([]);

  // Selected scenario for injection
  const [selectedScenarioCode, setSelectedScenarioCode] = useState<string>('');
  const [faultSeverity, setFaultSeverity] = useState<string>('CRITICAL');
  const [scenarioParamValue, setScenarioParamValue] = useState<string>('0.35');
  const [isInjecting, setIsInjecting] = useState<boolean>(false);

  // Selected fault for detailed incident analysis
  const [selectedFault, setSelectedFault] = useState<FaultRecord | null>(null);

  // Before & After comparison state
  const [beforeRecoveryState, setBeforeRecoveryState] = useState<SubsystemsHealth | null>(null);
  const [afterRecoveryState, setAfterRecoveryState] = useState<SubsystemsHealth | null>(null);

  // View mode tab
  const [activeSubTab, setActiveSubTab] = useState<'investigate' | 'inject' | 'report'>('investigate');
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedCraft =
    spacecraftList.find((s) => s.id === selectedSpacecraftId) || spacecraftList[0] || null;

  const loadData = useCallback(async () => {
    if (!selectedSpacecraftId) return;
    try {
      const [scens, aFaults, hFaults, health, evts] = await Promise.all([
        listFaultScenarios(),
        listFaults(selectedSpacecraftId, 'ACTIVE'),
        listFaults(selectedSpacecraftId).catch(() => []),
        getSubsystemsHealth(selectedSpacecraftId).catch(() => null),
        getEvents(selectedSpacecraftId, 25).catch(() => []),
      ]);

      setScenarios(scens);
      setActiveFaults(aFaults);
      setFaultHistory(hFaults);
      setSubsystemsHealth(health);
      setEvents(evts);

      if (scens.length > 0 && !selectedScenarioCode) {
        setSelectedScenarioCode(scens[0].scenarioCode || scens[0].code || '');
      }
      if (aFaults.length > 0 && !selectedFault) {
        setSelectedFault(aFaults[0]);
      } else if (hFaults.length > 0 && !selectedFault) {
        setSelectedFault(hFaults[0]);
      }
    } catch (e) {
      console.warn('Failed loading Failure Lab diagnostics', e);
    }
  }, [selectedSpacecraftId, selectedScenarioCode, selectedFault]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCraft || !selectedScenarioCode) return;

    setIsInjecting(true);
    setFeedback(null);
    try {
      const sc = scenarios.find((s) => (s.scenarioCode || s.code) === selectedScenarioCode);
      const res = await injectFault({
        spacecraftId: selectedCraft.id,
        scenarioCode: selectedScenarioCode,
        severity: faultSeverity,
        description: sc ? `Simulated ${sc.title || sc.name} via Failure Lab Suite` : 'Injected fault',
        parameters: { paramValue: scenarioParamValue },
      });

      setFeedback(`Anomaly Injected: [${res.faultId}] ${res.scenarioCode} is now ACTIVE.`);
      setSelectedFault(res);
      await loadData();
      onFaultsChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback(`Injection Failed: ${msg}`);
    } finally {
      setIsInjecting(false);
    }
  };

  const handleRecover = async (fault: FaultRecord) => {
    setFeedback(null);
    // Snapshot state before recovery
    if (subsystemsHealth) {
      setBeforeRecoveryState(subsystemsHealth);
    }

    try {
      const res = await recoverFault(fault.faultId, fault.recoveryActionRequired);
      setFeedback(`Recovery procedure '${fault.recoveryActionRequired}' executed successfully on [${fault.faultId}].`);

      // Refresh data and snapshot state after recovery
      await loadData();
      onFaultsChanged?.();

      if (selectedSpacecraftId) {
        const newHealth = await getSubsystemsHealth(selectedSpacecraftId);
        setAfterRecoveryState(newHealth);
      }
      setSelectedFault(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback(`Recovery Failed: ${msg}`);
    }
  };

  const handleClear = async (faultId: string) => {
    try {
      await clearFaultAlert(faultId);
      setFeedback(`Alert [${faultId}] cleared from active operational telemetry.`);
      await loadData();
      onFaultsChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback(`Clear Failed: ${msg}`);
    }
  };

  return (
    <div className="astra-mc-failure-suite-container" data-testid="failure-investigation-lab">
      {/* Top Suite Header */}
      <div className="astra-mc-failure-header">
        <div className="astra-mc-failure-title-group">
          <div className="astra-mc-universe-tag">
            <ShieldAlert size={14} color="var(--color-critical)" />
            <span>FAILURE INVESTIGATION LAB // SPACECRAFT ROOT-CAUSE DIAGNOSTICS</span>
          </div>
          <h2 className="astra-mc-failure-heading">Subsystem Anomaly & Incident Investigation</h2>
        </div>

        {/* Satellite Fleet Picker */}
        <div className="astra-mc-failure-craft-selector">
          <span className="astra-mc-hud-metric-k">TARGET VEHICLE:</span>
          <div className="astra-mc-craft-pill-row">
            {spacecraftList.map((craft) => (
              <button
                key={craft.id}
                onClick={() => onSelectSpacecraft(craft.id)}
                className={`astra-mc-craft-pill ${craft.id === selectedSpacecraftId ? 'active' : ''}`}
                data-testid={`investigate-craft-${craft.id}`}
              >
                <span>{craft.id}</span>
                {craft.operationalStatus === 'NOMINAL' ? (
                  <CheckCircle2 size={11} color="var(--color-nominal)" />
                ) : (
                  <AlertTriangle size={11} color="var(--color-critical)" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="astra-mc-universe-feedback" data-testid="failure-feedback-banner">
          <Activity size={13} color="var(--color-earth-cyan)" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Sub-navigation tabs */}
      <div className="astra-mc-failure-tabs">
        <button
          onClick={() => setActiveSubTab('investigate')}
          className={`astra-mc-failure-tab-btn ${activeSubTab === 'investigate' ? 'active' : ''}`}
          data-testid="tab-investigate"
        >
          <Activity size={13} />
          <span>DIAGNOSTIC TIMELINE & ANOMALIES ({activeFaults.length} ACTIVE)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('inject')}
          className={`astra-mc-failure-tab-btn ${activeSubTab === 'inject' ? 'active' : ''}`}
          data-testid="tab-inject"
        >
          <Play size={13} />
          <span>FAULT SCENARIO INJECTION</span>
        </button>
        <button
          onClick={() => setActiveSubTab('report')}
          className={`astra-mc-failure-tab-btn ${activeSubTab === 'report' ? 'active' : ''}`}
          data-testid="tab-report"
        >
          <FileText size={13} />
          <span>INCIDENT ROOT-CAUSE REPORT</span>
        </button>
      </div>

      {/* 1. INVESTIGATE TAB */}
      {activeSubTab === 'investigate' && (
        <div className="astra-mc-failure-workspace">
          {/* Left Chamber: Active & Historical Incidents */}
          <div className="astra-mc-failure-incidents-col">
            <h4 className="astra-mc-col-heading">INCIDENT ROSTER // {selectedCraft?.id}</h4>

            {activeFaults.length === 0 && faultHistory.length === 0 ? (
              <div className="astra-mc-empty-state">
                <CheckCircle2 size={24} color="var(--color-nominal)" />
                <p>No anomalies detected. Spacecraft subsystems operating within nominal limits.</p>
              </div>
            ) : (
              <div className="astra-mc-incident-list">
                {activeFaults.map((f) => (
                  <div
                    key={f.faultId}
                    onClick={() => setSelectedFault(f)}
                    className={`astra-mc-incident-item ${selectedFault?.faultId === f.faultId ? 'selected' : ''} active-fault`}
                    data-testid={`incident-item-${f.faultId}`}
                  >
                    <div className="astra-mc-incident-top">
                      <span className="astra-mc-incident-code">{f.scenarioCode}</span>
                      <span className="astra-mc-badge astra-mc-badge-critical">{f.severity}</span>
                    </div>
                    <span className="astra-mc-incident-desc">{f.description}</span>
                    <div className="astra-mc-incident-bottom">
                      <span className="astra-mc-hud-metric-k">ACTION: {f.recoveryActionRequired}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecover(f);
                          }}
                          className="astra-mc-quick-recover-btn"
                          data-testid={`recover-btn-${f.faultId}`}
                        >
                          <RotateCcw size={11} />
                          <span>RECOVER</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClear(f.faultId);
                          }}
                          className="astra-mc-quick-recover-btn"
                          style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#94a3b8' }}
                          title="Acknowledge and clear alert"
                          data-testid={`clear-btn-${f.faultId}`}
                        >
                          <span>CLEAR</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {faultHistory.map((f) => (
                  <div
                    key={f.faultId}
                    onClick={() => setSelectedFault(f)}
                    className={`astra-mc-incident-item ${selectedFault?.faultId === f.faultId ? 'selected' : ''}`}
                  >
                    <div className="astra-mc-incident-top">
                      <span className="astra-mc-incident-code">{f.scenarioCode}</span>
                      <span className="astra-mc-badge astra-mc-badge-completed">{f.lifecycleState}</span>
                    </div>
                    <span className="astra-mc-incident-desc">{f.description}</span>
                    <span className="astra-mc-hud-metric-k">
                      INJECTED: {new Date(f.injectedEpoch).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Center Chamber: 6-Domain Subsystem Matrix & Before/After Comparison */}
          <div className="astra-mc-failure-subsystems-col">
            <h4 className="astra-mc-col-heading">6-DOMAIN PHYSICAL SUBSYSTEM STATUS</h4>

            {subsystemsHealth?.subsystems && (
              <div className="astra-mc-subsystems-cards-grid">
                {/* EPS */}
                <div className="astra-mc-diag-card">
                  <div className="astra-mc-diag-header">
                    <Zap size={13} color="var(--color-earth-cyan)" />
                    <span>EPS // ELECTRICAL POWER</span>
                  </div>
                  <div className="astra-mc-diag-metrics">
                    <div>
                      <span className="astra-mc-hud-metric-k">BATTERY SOC</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.eps.batterySocPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">SOLAR ARRAY</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.eps.solarArrayWatts.toFixed(0)}W
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">BUS VOLTAGE</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.eps.batteryVoltageVolts.toFixed(1)}V
                      </span>
                    </div>
                  </div>
                </div>

                {/* TCS */}
                <div className="astra-mc-diag-card">
                  <div className="astra-mc-diag-header">
                    <Flame size={13} color="var(--color-advisory)" />
                    <span>TCS // THERMAL CONTROL</span>
                  </div>
                  <div className="astra-mc-diag-metrics">
                    <div>
                      <span className="astra-mc-hud-metric-k">TEMPERATURE</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.tcs.temperatureCelsius.toFixed(1)}°C
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">HEATER ACTIVE</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.tcs.heaterActive ? 'TRUE' : 'FALSE'}
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">RADIATOR EFF</span>
                      <span className="astra-mc-hud-metric-v">
                        {(subsystemsHealth.subsystems.tcs.radiatorEfficiency * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* ADCS */}
                <div className="astra-mc-diag-card">
                  <div className="astra-mc-diag-header">
                    <Compass size={13} color="var(--color-earth-cyan)" />
                    <span>ADCS // ATTITUDE CONTROL</span>
                  </div>
                  <div className="astra-mc-diag-metrics">
                    <div>
                      <span className="astra-mc-hud-metric-k">POINTING ERROR</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.adcs.pointingErrorDegrees.toFixed(3)}°
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">REACTION WHEEL</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.adcs.reactionWheelSpeedRpm.toFixed(0)} RPM
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">ATTITUDE LOCK</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.adcs.attitudeLockStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* COMMS */}
                <div className="astra-mc-diag-card">
                  <div className="astra-mc-diag-header">
                    <Radio size={13} color="var(--color-nominal)" />
                    <span>COMMS // TELECOMMUNICATIONS</span>
                  </div>
                  <div className="astra-mc-diag-metrics">
                    <div>
                      <span className="astra-mc-hud-metric-k">CARRIER LOCK</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.comms.carrierLocked ? 'LOCKED' : 'UNLOCKED'}
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">LINK MARGIN</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.comms.linkMarginDb.toFixed(1)} dB
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">PACKET LOSS</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.comms.packetLossPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* OBC */}
                <div className="astra-mc-diag-card">
                  <div className="astra-mc-diag-header">
                    <Cpu size={13} color="var(--color-earth-cyan)" />
                    <span>OBC // ONBOARD COMPUTER</span>
                  </div>
                  <div className="astra-mc-diag-metrics">
                    <div>
                      <span className="astra-mc-hud-metric-k">CPU LOAD</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.obc.cpuUtilizationPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">MEMORY LOAD</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.obc.memoryUtilizationPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">REBOOT COUNT</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.obc.rebootCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PROP */}
                <div className="astra-mc-diag-card">
                  <div className="astra-mc-diag-header">
                    <Gauge size={13} color="var(--color-advisory)" />
                    <span>PROP // PROPULSION</span>
                  </div>
                  <div className="astra-mc-diag-metrics">
                    <div>
                      <span className="astra-mc-hud-metric-k">PROPELLANT</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.prop.propellantMassKg.toFixed(1)} kg
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">TANK PRESSURE</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.prop.tankPressureBar.toFixed(1)} bar
                      </span>
                    </div>
                    <div>
                      <span className="astra-mc-hud-metric-k">VALVE HEALTH</span>
                      <span className="astra-mc-hud-metric-v">
                        {subsystemsHealth.subsystems.prop.valveHealth}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Before vs After Recovery Comparison Panel */}
            {beforeRecoveryState && afterRecoveryState && (
              <div className="astra-mc-comparison-panel" data-testid="recovery-comparison-panel">
                <div className="astra-mc-active-run-header">
                  <CheckCircle2 size={13} color="var(--color-nominal)" />
                  <span>PRE-RECOVERY VS POST-RECOVERY PHYSICAL AUDIT</span>
                </div>
                <div className="astra-mc-comparison-grid">
                  <div className="astra-mc-comp-col">
                    <span className="astra-mc-hud-metric-k">BEFORE RECOVERY (FAULT ACTIVE)</span>
                    <div className="astra-mc-comp-metric">
                      <span>Status: {beforeRecoveryState.overallStatus}</span>
                      <span>Active Faults: {beforeRecoveryState.activeFaultCount}</span>
                      <span>Battery SOC: {beforeRecoveryState.subsystems.eps.batterySocPercent.toFixed(1)}%</span>
                      <span>Carrier: {beforeRecoveryState.subsystems.comms.carrierLocked ? 'LOCKED' : 'DROPOUT'}</span>
                    </div>
                  </div>
                  <ArrowRight size={20} color="var(--color-earth-cyan)" />
                  <div className="astra-mc-comp-col">
                    <span className="astra-mc-hud-metric-k">AFTER RECOVERY (PROCEDURE EXECUTED)</span>
                    <div className="astra-mc-comp-metric">
                      <span>Status: {afterRecoveryState.overallStatus}</span>
                      <span>Active Faults: {afterRecoveryState.activeFaultCount}</span>
                      <span>Battery SOC: {afterRecoveryState.subsystems.eps.batterySocPercent.toFixed(1)}%</span>
                      <span>Carrier: {afterRecoveryState.subsystems.comms.carrierLocked ? 'LOCKED' : 'DROPOUT'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Chamber: Incident Chronological Event Timeline */}
          <div className="astra-mc-failure-events-col" style={{ display: 'flex', flexDirection: 'column' }}>
            <FailureLabTimeline
              events={events}
              targetSpacecraftId={selectedCraft?.id}
            />
          </div>
        </div>
      )}

      {/* 2. INJECT TAB */}
      {activeSubTab === 'inject' && (
        <div className="astra-mc-failure-inject-view" data-testid="failure-inject-form">
          <form onSubmit={handleInject} className="astra-mc-inject-form-card">
            <h3>INJECT CONTROLLED HARDWARE FAULT SCENARIO</h3>
            <p className="astra-mc-card-synopsis">
              Select an authoritative scenario from the 6-domain catalogue to simulate physical sensor or actuator failure on {selectedCraft?.id}.
            </p>

            <div className="astra-mc-form-row">
              <label>SCENARIO CATALOGUE</label>
              <select
                value={selectedScenarioCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setSelectedScenarioCode(code);
                  const found = scenarios.find((s) => (s.scenarioCode || s.code) === code);
                  if (found?.defaultSeverity) {
                    setFaultSeverity(found.defaultSeverity);
                  }
                }}
                className="astra-mc-select"
                data-testid="suite-scenario-select"
              >
                {scenarios.map((sc) => {
                  const code = sc.scenarioCode || sc.code;
                  const title = sc.title || sc.name || code;
                  const sub = sc.subsystem || sc.domain || 'SYSTEM';
                  const sev = sc.defaultSeverity || 'CRITICAL';
                  return (
                    <option key={code} value={code}>
                      [{sub}] {title} — {sev}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="astra-mc-form-row">
              <label>FAULT SEVERITY</label>
              <select
                value={faultSeverity}
                onChange={(e) => setFaultSeverity(e.target.value)}
                className="astra-mc-select"
              >
                <option value="MINOR">MINOR (Advisory)</option>
                <option value="MAJOR">MAJOR (Subsystem Degradation)</option>
                <option value="CRITICAL">CRITICAL (Safe Mode Trigger)</option>
              </select>
            </div>

            <div className="astra-mc-form-row">
              <label>CUSTOM PARAMETER (Multiplier / Rate)</label>
              <input
                type="text"
                value={scenarioParamValue}
                onChange={(e) => setScenarioParamValue(e.target.value)}
                className="astra-mc-input"
                placeholder="e.g. 0.35"
              />
            </div>

            <button
              type="submit"
              disabled={isInjecting}
              className="astra-mc-inject-submit-btn"
              data-testid="submit-fault-inject"
            >
              <Play size={13} />
              <span>{isInjecting ? 'INJECTING...' : 'INJECT FAULT INTO SIMULATION'}</span>
            </button>
          </form>
        </div>
      )}

      {/* 3. ROOT-CAUSE REPORT TAB */}
      {activeSubTab === 'report' && (
        <div className="astra-mc-report-view" data-testid="root-cause-report-view">
          <div className="astra-mc-report-card">
            <div className="astra-mc-report-header">
              <div>
                <span className="astra-mc-hud-target-tag">
                  [ FORMAL INCIDENT REPORT // {selectedCraft?.id} ]
                </span>
                <h3 className="astra-mc-report-title">
                  Spacecraft Physical Telemetry & Anomaly Investigation Finding
                </h3>
              </div>
              <span className="astra-mc-badge astra-mc-badge-completed">
                AUTHORITATIVE SIMULATION AUDIT
              </span>
            </div>

            <div className="astra-mc-report-table">
              <div className="astra-mc-report-row">
                <span className="astra-mc-rep-k">OBSERVED TELEMETRY:</span>
                <span className="astra-mc-rep-v">
                  Battery SOC: {selectedCraft?.batterySocPercent.toFixed(1)}% | Altitude: {selectedCraft?.altitudeKm.toFixed(1)} km | Mode: {selectedCraft?.operationalMode} | Status: {selectedCraft?.operationalStatus}
                </span>
              </div>

              <div className="astra-mc-report-row">
                <span className="astra-mc-rep-k">DETECTED ANOMALIES:</span>
                <span className="astra-mc-rep-v">
                  {activeFaults.length > 0
                    ? activeFaults.map((f) => `${f.scenarioCode} (${f.severity})`).join(', ')
                    : 'Zero active anomalies. Subsystem tolerances verified.'}
                </span>
              </div>

              <div className="astra-mc-report-row">
                <span className="astra-mc-rep-k">SUSPECTED CAUSES:</span>
                <span className="astra-mc-rep-v">
                  {selectedFault
                    ? `Physical ${selectedFault.domain} excursion triggered via scenario parameter envelope.`
                    : 'Nominal operational decay.'}
                </span>
              </div>

              <div className="astra-mc-report-row">
                <span className="astra-mc-rep-k">CONFIRMED SIMULATED CAUSE:</span>
                <span className="astra-mc-rep-v">
                  {selectedFault
                    ? selectedFault.description
                    : 'System performing within nominal Keplerian orbital envelope.'}
                </span>
              </div>

              <div className="astra-mc-report-row">
                <span className="astra-mc-rep-k">RECOMMENDED RECOVERY ACTION:</span>
                <span className="astra-mc-rep-v">
                  {selectedFault
                    ? selectedFault.recoveryActionRequired
                    : 'No corrective action required.'}
                </span>
              </div>

              <div className="astra-mc-report-row">
                <span className="astra-mc-rep-k">FINAL OUTCOME EVALUATION:</span>
                <span className="astra-mc-rep-v">
                  {selectedCraft?.operationalStatus === 'NOMINAL'
                    ? 'Spacecraft operational integrity validated. Ground station carrier lock intact.'
                    : 'Spacecraft operational degradation flagged. Remediation sequence advised.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
