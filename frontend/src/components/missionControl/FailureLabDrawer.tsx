import React, { useState, useEffect } from 'react';
import { SpacecraftDetail, FaultScenarioMetadata, FaultRecord } from '../../types/missionControl';
import { listFaultScenarios, listFaults, injectFault, recoverFault, clearFaultAlert } from '../../api/missionControlApi';
import { ShieldAlert, CheckCircle2, RotateCw, Play, RefreshCw } from 'lucide-react';

interface FailureLabDrawerProps {
  selectedSpacecraft: SpacecraftDetail | null;
  onFaultsChanged: () => void;
}

export const FailureLabDrawer: React.FC<FailureLabDrawerProps> = ({
  selectedSpacecraft,
  onFaultsChanged,
}) => {
  const [scenarios, setScenarios] = useState<FaultScenarioMetadata[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState<boolean>(false);
  const [activeFaults, setActiveFaults] = useState<FaultRecord[]>([]);
  const [selectedScenarioCode, setSelectedScenarioCode] = useState<string>('');
  const [faultSeverity, setFaultSeverity] = useState<string>('CRITICAL');
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoadingScenarios(true);
    try {
      const [scens, fList] = await Promise.all([
        listFaultScenarios(),
        listFaults(selectedSpacecraft?.id, 'ACTIVE'),
      ]);
      setScenarios(scens);
      setActiveFaults(fList);
      if (scens.length > 0) {
        setSelectedScenarioCode((prev) => {
          if (prev && scens.some((s) => (s.scenarioCode || s.code) === prev)) return prev;
          const firstCode = scens[0].scenarioCode || scens[0].code || '';
          if (scens[0].defaultSeverity) {
            setFaultSeverity(scens[0].defaultSeverity);
          }
          return firstCode;
        });
      }
    } catch (e) {
      console.warn('Failed loading Failure Lab catalog', e);
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSpacecraft?.id]);

  const selectedScenario = scenarios.find(
    (s) => (s.scenarioCode || s.code) === selectedScenarioCode
  ) || null;

  const handleInject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpacecraft || !selectedScenarioCode) return;

    setIsInjecting(true);
    setActionFeedback(null);
    try {
      const sc = selectedScenario;
      const res = await injectFault({
        spacecraftId: selectedSpacecraft.id,
        scenarioCode: selectedScenarioCode,
        severity: faultSeverity,
        description: sc
          ? `Simulated ${sc.title || sc.name} via Mission Control`
          : 'Injected anomaly',
      });
      setActionFeedback(`Anomaly Injected: [${res.faultId}] ${res.scenarioCode} is now ACTIVE.`);
      await loadData();
      onFaultsChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionFeedback(`Injection Failed: ${msg}`);
    } finally {
      setIsInjecting(false);
    }
  };

  const handleRecover = async (fault: FaultRecord) => {
    try {
      await recoverFault(fault.faultId, fault.recoveryActionRequired);
      setActionFeedback(`Recovered [${fault.faultId}] via procedure ${fault.recoveryActionRequired}.`);
      await loadData();
      onFaultsChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionFeedback(`Recovery Failed: ${msg}`);
    }
  };

  const handleClearAlert = async (faultId: string) => {
    try {
      await clearFaultAlert(faultId);
      setActionFeedback(`Alert [${faultId}] cleared from active console.`);
      await loadData();
      onFaultsChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionFeedback(`Clear Failed: ${msg}`);
    }
  };

  return (
    <div className="astra-mc-failure-lab-container" data-testid="failure-lab-drawer">
      <div className="astra-mc-section-legend">
        <ShieldAlert size={12} color="var(--color-critical)" />
        <span>FAILURE LAB // SIX-DOMAIN ANOMALY ENGINE</span>
      </div>

      {/* Active Faults Banner */}
      <div className="astra-mc-active-faults-banner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#f87171', fontWeight: 600 }}>
            ACTIVE VEHICLE ANOMALIES [{activeFaults.length}]
          </span>
          <button onClick={loadData} style={{ color: 'var(--color-text-ghost)', cursor: 'pointer' }} title="Refresh fault ledger">
            <RefreshCw size={11} />
          </button>
        </div>

        {activeFaults.length === 0 ? (
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-nominal)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={13} />
            <span>ALL SUBSYSTEM DOMAINS REPORTING NOMINAL TELEMETRY</span>
          </div>
        ) : (
          activeFaults.map((fault) => (
            <div key={fault.faultId} className="astra-mc-fault-card" data-testid={`fault-card-${fault.faultId}`}>
              <div className="astra-mc-fault-header">
                <span className="astra-mc-fault-code">
                  [{fault.domain}] {fault.scenarioCode}
                </span>
                <span className="astra-mc-status-pill status-critical" style={{ fontSize: '8px' }}>
                  {fault.severity}
                </span>
              </div>
              <p className="astra-mc-fault-desc">{fault.description}</p>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-advisory)' }}>
                RECOVERY ACTION: {fault.recoveryActionRequired}
              </div>

              <div className="astra-mc-fault-actions">
                <button
                  onClick={() => handleRecover(fault)}
                  className="astra-mc-btn-recover"
                  data-testid={`recover-btn-${fault.faultId}`}
                >
                  <RotateCw size={11} />
                  <span>EXECUTE RECOVERY</span>
                </button>
                <button
                  onClick={() => handleClearAlert(fault.faultId)}
                  className="astra-mc-btn-clear-alert"
                  data-testid={`clear-alert-btn-${fault.faultId}`}
                >
                  <span>CLEAR ALERT</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Deterministic Fault Injection Form */}
      <form onSubmit={handleInject} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(14, 18, 28, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-xs)', padding: '16px' }}>
        <div className="astra-mc-form-group">
          <label className="astra-mc-form-label">TARGET CRAFT FOR INJECTION</label>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-earth-cyan)' }}>
            {selectedSpacecraft ? `${selectedSpacecraft.callSign} (${selectedSpacecraft.name})` : 'NO VEHICLE SELECTED'}
          </div>
        </div>

        <div className="astra-mc-form-group">
          <label htmlFor="scenario-code-select" className="astra-mc-form-label">
            SELECT ANOMALY SCENARIO
          </label>
          <select
            id="scenario-code-select"
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
            disabled={isInjecting || isLoadingScenarios || scenarios.length === 0}
            data-testid="scenario-code-select"
          >
            {isLoadingScenarios && (
              <option value="" disabled>
                SCANNING SUBSYSTEM ANOMALY CATALOGUE...
              </option>
            )}
            {!isLoadingScenarios && scenarios.length === 0 && (
              <option value="" disabled>
                NO ANOMALY SCENARIOS AVAILABLE
              </option>
            )}
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

          {selectedScenario && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 10px',
                background: 'rgba(5, 10, 20, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-xs)',
                fontFamily: 'var(--font-mono)',
              }}
              data-testid="scenario-metadata-preview"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '10px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ color: 'var(--color-earth-cyan)' }}>
                  SUBSYSTEM: {selectedScenario.subsystem || selectedScenario.domain}
                </span>
                <span style={{ color: 'var(--color-advisory)' }}>
                  RECOVERY: {selectedScenario.expectedRecoveryAction || selectedScenario.recoveryActionRequired || 'MANUAL INTERVENTION'}
                </span>
              </div>
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-dim)',
                  margin: 0,
                  lineHeight: '1.4',
                }}
              >
                {selectedScenario.description}
              </p>
            </div>
          )}
        </div>

        <div className="astra-mc-form-group">
          <label htmlFor="fault-severity-select" className="astra-mc-form-label">INJECTION SEVERITY</label>
          <select
            id="fault-severity-select"
            value={faultSeverity}
            onChange={(e) => setFaultSeverity(e.target.value)}
            className="astra-mc-select"
            disabled={isInjecting}
          >
            <option value="CRITICAL">CRITICAL // Emergency Threshold Breach</option>
            <option value="MAJOR">MAJOR // Severe Telemetry Degradation</option>
            <option value="MINOR">MINOR // Advisory Tolerance Exceeded</option>
          </select>
        </div>

        <button
          type="submit"
          className="astra-mc-btn-dispatch"
          style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.35))', borderColor: 'rgba(239, 68, 68, 0.6)' }}
          disabled={isInjecting || !selectedSpacecraft}
          data-testid="inject-fault-btn"
        >
          <Play size={12} />
          <span>{isInjecting ? 'INJECTING ANOMALY...' : 'INJECT CONTROLLED FAULT'}</span>
        </button>

        {actionFeedback && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(10, 14, 22, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--color-text-display)',
            }}
          >
            {actionFeedback}
          </div>
        )}
      </form>
    </div>
  );
};
