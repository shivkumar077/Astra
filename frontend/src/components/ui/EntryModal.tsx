import React, { useEffect, useRef } from 'react';
import { X, ShieldAlert, Cpu, Database, Compass, Globe } from 'lucide-react';

export type DestinationType = 'mission-control' | 'space-imagery';

interface EntryModalProps {
  destination: DestinationType | null;
  onClose: () => void;
}

export const EntryModal: React.FC<EntryModalProps> = ({ destination, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!destination) return;

    // Focus close button on open for keyboard accessibility
    closeButtonRef.current?.focus();

    // Trap Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [destination, onClose]);

  if (!destination) return null;

  const isMissionControl = destination === 'mission-control';

  return (
    <div
      className="astra-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(8, 9, 12, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-modal-title"
      data-testid="entry-modal"
    >
      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: 'var(--color-panel)',
          border: '1px solid var(--color-border-active)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 229, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-ground)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: isMissionControl ? 'var(--color-cyan)' : 'var(--color-orbit-blue)',
                borderRadius: '50%',
              }}
            />
            <span
              id="entry-modal-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'var(--color-text-primary)',
              }}
            >
              {isMissionControl ? 'MISSION CONTROL // PRE-FLIGHT BRIEFING' : 'SPACE IMAGERY // ARCHIVE GATEWAY'}
            </span>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            style={{
              padding: '6px',
              color: 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition-fast)',
            }}
            aria-label="Close modal dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Status Alert Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 14px',
              backgroundColor: 'rgba(255, 179, 0, 0.08)',
              border: '1px solid rgba(255, 179, 0, 0.3)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--color-advisory)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              lineHeight: 1.5,
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '2px', color: 'var(--color-text-primary)' }}>
                {isMissionControl ? 'ENGINEERING STAGE GATE: PHASE 2' : 'ENGINEERING STAGE GATE: PHASE 5'}
              </strong>
              {isMissionControl
                ? 'The authoritative server simulation engine and WebSocket telemetry broker are currently scheduled for Phase 2 implementation. The live 3D orbital scene you are observing represents the landing foundation milestone.'
                : 'The NASA Image & Video Library REST client and NASA GIBS WMTS proxy are scheduled for Phase 5 implementation. Authentic NASA archives will stream directly into the high-resolution inspector.'}
            </div>
          </div>

          {/* Planned Domain Modules */}
          <div>
            <h4
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.08em',
                marginBottom: '10px',
                textTransform: 'uppercase',
              }}
            >
              Architectural Specifications in Progress
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {isMissionControl ? (
                <>
                  <div
                    style={{
                      padding: '10px',
                      backgroundColor: 'var(--color-ground)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-cyan)', marginBottom: '4px' }}>
                      <Cpu size={14} />
                      <strong>Sim Core (10 Hz)</strong>
                    </div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '10px' }}>
                      Deterministic Keplerian two-body + J2 propagator with monotonic time.
                    </span>
                  </div>
                  <div
                    style={{
                      padding: '10px',
                      backgroundColor: 'var(--color-ground)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-nominal)', marginBottom: '4px' }}>
                      <Compass size={14} />
                      <strong>Failure Lab</strong>
                    </div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '10px' }}>
                      Six-domain anomaly state machines (EPS, TCS, ADCS, COMMS, PROP, OBC).
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      padding: '10px',
                      backgroundColor: 'var(--color-ground)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-orbit-blue)', marginBottom: '4px' }}>
                      <Globe size={14} />
                      <strong>NASA Images API</strong>
                    </div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '10px' }}>
                      Unrestricted public REST search across JWST, Hubble, Apollo, and Mars rover missions.
                    </span>
                  </div>
                  <div
                    style={{
                      padding: '10px',
                      backgroundColor: 'var(--color-ground)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-cyan)', marginBottom: '4px' }}>
                      <Database size={14} />
                      <strong>NASA GIBS WMTS</strong>
                    </div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '10px' }}>
                      Full-resolution daily Earth science satellite tiles and VIIRS Black Marble layers.
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Engineering Reference Link */}
          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>Documentation Reference: docs/ROADMAP.md</span>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-raised)',
                border: '1px solid var(--color-border-active)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              ACKNOWLEDGE & RETURN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
