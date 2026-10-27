import React, { useEffect, useRef } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { Spacecraft, OpticalAperture, SignatureStar, OrbitalTrajectory } from '../common/CelestialIcons';

export type DestinationType = 'mission-control' | 'space-imagery' | 'about';

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
        backgroundColor: 'rgba(5, 6, 8, 0.88)',
        backdropFilter: 'blur(16px)',
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
          maxWidth: '600px',
          backgroundColor: 'var(--color-panel-translucent)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--color-border-active)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(56, 189, 248, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-ground)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: isMissionControl ? 'var(--color-earth-cyan)' : 'var(--color-earth-blue)' }}>
              {isMissionControl ? (
                <Spacecraft size={18} strokeWidth={1.5} />
              ) : (
                <OpticalAperture size={18} strokeWidth={1.5} />
              )}
            </div>
            <div>
              <span
                id="entry-modal-title"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: 'var(--color-text-display)',
                  display: 'block',
                }}
              >
                {isMissionControl ? 'I. Mission Control — Flight Readiness' : 'II. Space Imagery — Astronomical Archives'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-text-ghost)',
                  letterSpacing: '0.08em',
                }}
              >
                {isMissionControl ? 'SYS_GATE_02 // ORBITAL TELEMETRY & FAILURE SIMULATION' : 'SYS_GATE_05 // NASA GIBS & IMAGE ARCHIVE GATEWAY'}
              </span>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            style={{
              padding: '6px',
              color: 'var(--color-text-muted)',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition-quick)',
              cursor: 'pointer',
            }}
            aria-label="Close modal dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Engineering Stage Gate Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              backgroundColor: 'rgba(245, 158, 11, 0.06)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--color-advisory)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              lineHeight: 1.55,
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '3px', color: 'var(--color-text-display)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em' }}>
                {isMissionControl ? 'ENGINEERING STAGE GATE: PHASE 2 IN PROGRESS' : 'ENGINEERING STAGE GATE: PHASE 5 SCHEDULED'}
              </strong>
              <span style={{ color: 'var(--color-text-body)' }}>
                {isMissionControl
                  ? 'The authoritative Keplerian + J2 orbital propagation engine and bidirectional WebSocket telemetry broker are currently scheduled for Phase 2 implementation. The live 3D planetary renderer in this view represents the complete Prompt 3 art-direction milestone.'
                  : 'The NASA Image & Video Library REST client and NASA GIBS WMTS layer browser are scheduled for Phase 5 implementation. Deep-space imaging will stream directly into the high-resolution optical inspector.'}
              </span>
            </div>
          </div>

          {/* Planned Architectural Modules */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-text-ghost)',
                letterSpacing: '0.12em',
                marginBottom: '12px',
                textTransform: 'uppercase',
              }}
            >
              <SignatureStar size={11} color="var(--color-earth-cyan)" strokeWidth={1.5} />
              <span>Architectural Specifications</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {isMissionControl ? (
                <>
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--color-ground)',
                      border: '1px solid var(--color-border-hairline)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-earth-cyan)', marginBottom: '6px' }}>
                      <OrbitalTrajectory size={14} strokeWidth={1.5} />
                      <strong style={{ color: 'var(--color-text-display)' }}>Sim Core (10 Hz)</strong>
                    </div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', lineHeight: 1.45, display: 'block', fontFamily: 'var(--font-sans)' }}>
                      Deterministic Keplerian two-body + J2 perturbation propagator with monotonic tick timing.
                    </span>
                  </div>
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--color-ground)',
                      border: '1px solid var(--color-border-hairline)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-nominal)', marginBottom: '6px' }}>
                      <SignatureStar size={14} strokeWidth={1.5} />
                      <strong style={{ color: 'var(--color-text-display)' }}>Failure Lab</strong>
                    </div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', lineHeight: 1.45, display: 'block', fontFamily: 'var(--font-sans)' }}>
                      Six-domain anomaly state machines (EPS, TCS, ADCS, COMMS, PROP, OBC) with emergency recovery trees.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--color-ground)',
                      border: '1px solid var(--color-border-hairline)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-earth-blue)', marginBottom: '6px' }}>
                      <OpticalAperture size={14} strokeWidth={1.5} />
                      <strong style={{ color: 'var(--color-text-display)' }}>NASA Images API</strong>
                    </div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', lineHeight: 1.45, display: 'block', fontFamily: 'var(--font-sans)' }}>
                      Direct public REST queries across JWST, Hubble, Apollo, Mars rover, and Solar Dynamics archives.
                    </span>
                  </div>
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--color-ground)',
                      border: '1px solid var(--color-border-hairline)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-earth-cyan)', marginBottom: '6px' }}>
                      <OrbitalTrajectory size={14} strokeWidth={1.5} />
                      <strong style={{ color: 'var(--color-text-display)' }}>NASA GIBS WMTS</strong>
                    </div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', lineHeight: 1.45, display: 'block', fontFamily: 'var(--font-sans)' }}>
                      Full-resolution daily Earth science satellite tiles and VIIRS Black Marble nighttime composites.
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Engineering Reference Link & Return Action */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--color-border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
            }}
          >
            <span>DOCUMENTATION: docs/ROADMAP.md</span>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--color-border-active)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--color-text-display)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                transition: 'var(--transition-quick)',
              }}
            >
              ACKNOWLEDGE &amp; RETURN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

