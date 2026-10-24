import React from 'react';
import { Spacecraft, OpticalAperture, SignatureStar } from '../common/CelestialIcons';
import { AstraWordmark } from '../common/AstraBrand';
import { DestinationType } from './EntryModal';

interface HeroSectionProps {
  scrollProgress: number; // 0.0 (opening frame) -> 1.0 (settled operations)
  reducedMotion: boolean;
  onSelectDestination: (dest: DestinationType) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  scrollProgress,
  reducedMotion,
  onSelectDestination,
}) => {
  // If reduced motion is preferred by OS, jump straight to settled frame
  const t = reducedMotion ? 1.0 : scrollProgress;

  // 1. Opening Brand Depth Layer (z-index: 2, behind Earth Canvas at z-index: 3)
  // Holds firmly through initial view, smoothly transitioning as Earth moves into position
  const introOpacity = Math.max(1.0 - Math.pow(Math.max(t - 0.22, 0) / 0.45, 1.2), 0);
  const introScale = 1.0 - t * 0.06;
  const introTranslateY = -t * 50;

  // 2. Settled Operational Content (z-index: 10, in front of Earth Canvas)
  // Emerges smoothly as user completes the approach (t: 0.58 -> 1.0)
  const settledOpacity = Math.min(Math.max((t - 0.58) / 0.38, 0), 1);
  const settledTranslateY = (1.0 - settledOpacity) * 24;

  return (
    <div
      className="astra-hero-stage"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: reducedMotion ? '100vh' : '280vh',
        display: 'flex',
        flexDirection: 'column',
      }}
      data-testid="astra-hero-section"
    >
      {/* =========================================================================
          OPENING FRAME & DEPTH LAYER (z-index: 2, BEHIND Earth Canvas at z-index: 3)
          The complete word ASTRA is prominently rendered on the left/center.
          Earth is positioned in the right hemisphere so the entire wordmark is
          immediately legible and never obscured behind the globe.
          ========================================================================= */}
      <div
        className="astra-intro-depth-plane"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          textAlign: 'left',
          opacity: introOpacity,
          transform: `translateY(${introTranslateY}px) scale(${introScale})`,
          pointerEvents: introOpacity > 0.08 ? 'auto' : 'none',
          transition: 'opacity 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          padding: '0 64px',
          maxWidth: '1280px',
          margin: '0 auto',
        }}
      >
        {/* Subtle Celestial Star Lead */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <SignatureStar size={12} color="var(--color-star-warm)" strokeWidth={1.5} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            SATELLITE OPERATIONS &amp; MISSION PLATFORM
          </span>
        </div>

        {/* Master Bespoke ASTRA Wordmark (The Entire Word is the Hero) */}
        <div
          style={{
            position: 'relative',
            display: 'block',
            maxWidth: '680px',
            width: '100%',
            filter: 'drop-shadow(0 4px 32px rgba(0, 0, 0, 0.9))',
          }}
        >
          <AstraWordmark
            height="clamp(48px, 6vw, 78px)"
            color="var(--color-star-ivory)"
            accentColor="var(--color-star-warm)"
          />
        </div>

        {/* Quiet Editorial Statement */}
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(18px, 2.2vw, 24px)',
            fontStyle: 'italic',
            color: 'var(--color-text-muted)',
            marginTop: '24px',
            maxWidth: '520px',
            lineHeight: 1.45,
            filter: 'drop-shadow(0 2px 16px rgba(0, 0, 0, 0.8))',
          }}
        >
          The quiet expanse of planetary operations and orbital intelligence.
        </p>

        {/* Delicate Downward Scroll Cue (Fades gracefully as scroll starts) */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            left: '64px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-ghost)',
            letterSpacing: '0.18em',
            opacity: Math.max(1.0 - t * 4.0, 0),
            transition: 'opacity 300ms ease-out',
          }}
        >
          <span>SCROLL TO ENGAGE ORBIT</span>
          <div
            style={{
              width: '48px',
              height: '1px',
              backgroundColor: 'var(--color-border-hairline)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '100%',
                backgroundColor: 'var(--color-star-ivory)',
                animation: reducedMotion ? 'none' : 'scrollPulseHorizontal 2.4s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SETTLED OPERATIONAL FRAME (z-index: 10, IN FRONT OF Earth Canvas)
          Emerges cleanly on the left side of the viewport in front of Earth.
          ========================================================================= */}
      <div
        className="astra-settled-frame"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          padding: '0 56px',
          opacity: settledOpacity,
          transform: `translateY(${settledTranslateY}px)`,
          pointerEvents: settledOpacity > 0.1 ? 'auto' : 'none',
          transition: 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="astra-settled-left"
          style={{
            width: '100%',
            maxWidth: '600px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Header Identity & Editorial Introduction */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <AstraWordmark
                height="clamp(32px, 3.8vw, 46px)"
                color="var(--color-star-ivory)"
                accentColor="var(--color-star-warm)"
              />
            </div>

            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(18px, 1.8vw, 21px)',
                fontStyle: 'italic',
                color: 'var(--color-text-muted)',
                lineHeight: 1.35,
                marginTop: '4px',
              }}
            >
              Satellite Operations &amp; Mission Simulation Platform
            </p>

            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--color-text-body)',
                marginTop: '12px',
                maxWidth: '540px',
              }}
            >
              A deterministic aerospace operations platform combining multi-craft telemetry, 
              orbital kinematics, six-domain controlled failure simulation, 
              and authentic NASA observational archives.
            </p>
          </div>

          {/* EXACTLY TWO PRIMARY DESTINATIONS (Editorial Destination Rows) */}
          <div
            className="astra-editorial-destinations"
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderTop: '1px solid var(--color-border-hairline)',
              marginTop: '4px',
            }}
            data-testid="primary-entry-points"
          >
            {/* Destination 1: Mission Control */}
            <button
              onClick={() => onSelectDestination('mission-control')}
              className="astra-destination-row"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 0',
                borderBottom: '1px solid var(--color-border-hairline)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'var(--transition-quick)',
                outline: 'none',
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
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ color: 'var(--color-star-ivory)' }}>
                    <Spacecraft size={20} strokeWidth={1.25} />
                  </div>
                  <div>
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '22px',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: 'var(--color-text-display)',
                        display: 'block',
                      }}
                    >
                      I. MISSION CONTROL
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-ghost)' }}>[ 01 ]</span>
                  <span style={{ fontSize: '18px', color: 'var(--color-star-ivory)' }}>&rarr;</span>
                </div>
              </div>

              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: 'var(--color-text-muted)',
                  marginTop: '10px',
                  paddingLeft: '34px',
                  maxWidth: '520px',
                }}
              >
                Operate simulated spacecraft across interplanetary regimes, monitor real-time subsystem telemetry, 
                and execute controlled contingency recovery in the Failure Lab.
              </p>
            </button>

            {/* Destination 2: Space Imagery */}
            <button
              onClick={() => onSelectDestination('space-imagery')}
              className="astra-destination-row"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 0',
                borderBottom: '1px solid var(--color-border-hairline)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'var(--transition-quick)',
                outline: 'none',
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
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ color: 'var(--color-star-ivory)' }}>
                    <OpticalAperture size={20} strokeWidth={1.25} />
                  </div>
                  <div>
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '22px',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: 'var(--color-text-display)',
                        display: 'block',
                      }}
                    >
                      II. SPACE IMAGERY
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-ghost)' }}>[ 02 ]</span>
                  <span style={{ fontSize: '18px', color: 'var(--color-star-ivory)' }}>&rarr;</span>
                </div>
              </div>

              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: 'var(--color-text-muted)',
                  marginTop: '10px',
                  paddingLeft: '34px',
                  maxWidth: '520px',
                }}
              >
                Explore authentic high-resolution deep space photography from the NASA Image and Video Library, 
                planetary science cameras, and global satellite Earth observations.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded CSS for Interactive Transitions & Responsive Framing */}
      <style>{`
        @keyframes scrollPulseHorizontal {
          0% { transform: translateX(-100%); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateX(200%); opacity: 0; }
        }
        .astra-destination-row:hover {
          background-color: rgba(255, 255, 255, 0.02);
          padding-left: 8px;
        }
        .astra-destination-row:focus-visible {
          background-color: rgba(255, 255, 255, 0.04);
          outline: 1px solid var(--color-star-warm);
        }
        @media (max-width: 768px) {
          .astra-settled-frame {
            padding: 0 24px !important;
          }
          .astra-intro-depth-plane {
            padding: 0 24px !important;
            align-items: center !important;
            text-align: center !important;
          }
        }
      `}</style>
    </div>
  );
};

