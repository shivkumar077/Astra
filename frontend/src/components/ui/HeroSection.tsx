import React from 'react';
import { Radio, Image as ImageIcon, ArrowRight, Activity } from 'lucide-react';
import { DestinationType } from './EntryModal';

interface HeroSectionProps {
  onSelectDestination: (dest: DestinationType) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectDestination }) => {
  return (
    <main
      className="astra-hero-container"
      style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        padding: '40px 48px',
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%',
      }}
      data-testid="astra-hero-section"
    >
      {/* Left Column: Product Identity & Exactly Two Entry Points */}
      <div
        className="astra-hero-left"
        style={{
          width: '100%',
          maxWidth: '640px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Classification Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-cyan)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              backgroundColor: 'var(--color-cyan)',
              borderRadius: '1px',
            }}
          />
          <span>ORBITAL SIMULATION PLATFORM // VER 0.1.0</span>
        </div>

        {/* Primary Typography Hierarchy */}
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(42px, 5.5vw, 68px)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: 'var(--color-text-primary)',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            ASTRA
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(18px, 2.2vw, 24px)',
              fontWeight: 600,
              color: 'var(--color-cyan)',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              marginBottom: '16px',
            }}
          >
            Satellite Operations &amp; Failure Simulation Platform
          </p>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
              maxWidth: '560px',
            }}
          >
            An aerospace engineering environment combining real-time multi-craft telemetry, 
            deterministic orbital propagation, six-domain controlled failure scenarios, 
            and authentic NASA astronomical imagery.
          </p>
        </div>

        {/* Supporting Engineering Statement */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            backgroundColor: 'rgba(22, 27, 34, 0.65)',
            borderLeft: '2px solid var(--color-cyan)',
            borderTop: '1px solid var(--color-border-subtle)',
            borderRight: '1px solid var(--color-border-subtle)',
            borderBottom: '1px solid var(--color-border-subtle)',
            borderRadius: '0 var(--radius-xs) var(--radius-xs) 0',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <Activity size={15} color="var(--color-cyan)" style={{ flexShrink: 0 }} />
          <span>
            Deterministic physics, server-authoritative state, and instrument-grade visual telemetry.
          </span>
        </div>

        {/* EXACTLY TWO PRIMARY ENTRY POINTS */}
        <div
          className="astra-entry-points"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            marginTop: '8px',
          }}
          data-testid="primary-entry-points"
        >
          {/* Entry Point 1: Mission Control */}
          <button
            onClick={() => onSelectDestination('mission-control')}
            className="astra-entry-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '18px 22px',
              backgroundColor: 'var(--color-panel-translucent)',
              border: '1px solid var(--color-border-active)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
            aria-label="Enter Mission Control: Operate simulated spacecraft, monitor telemetry, and investigate failures"
            data-testid="entry-mission-control"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'rgba(0, 229, 255, 0.1)',
                    border: '1px solid rgba(0, 229, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-cyan)',
                  }}
                >
                  <Radio size={16} />
                </div>
                <div>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '17px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: 'var(--color-text-primary)',
                      display: 'block',
                    }}
                  >
                    MISSION CONTROL
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--color-cyan)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    SYS_MODE_01 // ORBITAL FLEET OPERATIONS
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--color-nominal)',
                    backgroundColor: 'rgba(0, 230, 118, 0.1)',
                    border: '1px solid rgba(0, 230, 118, 0.3)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  PHASE 2 READY
                </span>
                <ArrowRight size={16} color="var(--color-cyan)" />
              </div>
            </div>

            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              Operate simulated spacecraft across interplanetary regimes, monitor real-time telemetry, 
              issue flight commands, and inject controlled failure anomalies in the Failure Lab.
            </p>
          </button>

          {/* Entry Point 2: Space Imagery */}
          <button
            onClick={() => onSelectDestination('space-imagery')}
            className="astra-entry-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '18px 22px',
              backgroundColor: 'var(--color-panel-translucent)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
            aria-label="Explore Space Imagery: Discover high-resolution NASA photography and Earth observation layers"
            data-testid="entry-space-imagery"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'rgba(10, 132, 255, 0.1)',
                    border: '1px solid rgba(10, 132, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-orbit-blue)',
                  }}
                >
                  <ImageIcon size={16} />
                </div>
                <div>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '17px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: 'var(--color-text-primary)',
                      display: 'block',
                    }}
                  >
                    SPACE IMAGERY
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--color-orbit-blue)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    SYS_MODE_02 // ASTRONOMICAL DISCOVERY
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--color-orbit-blue)',
                    backgroundColor: 'rgba(10, 132, 255, 0.1)',
                    border: '1px solid rgba(10, 132, 255, 0.3)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  PHASE 5 GATEWAY
                </span>
                <ArrowRight size={16} color="var(--color-orbit-blue)" />
              </div>
            </div>

            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              Explore authentic high-resolution space photography from the NASA Image and Video Library, 
              Mars surface cameras, and daily NASA GIBS Earth observation satellite layers.
            </p>
          </button>
        </div>

        {/* Minimal Supporting System Metadata (Truthful Engineering Parameters) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border-subtle)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>COORDINATE FRAME:</span> ECI J2000
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>SIM CLOCK:</span> 10 HZ DETERMINISTIC
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>FAILURE DOMAINS:</span> 6 SUBSYSTEMS
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>RENDER CONSOLE:</span> THREE.JS WEBGL
          </div>
        </div>
      </div>
    </main>
  );
};
