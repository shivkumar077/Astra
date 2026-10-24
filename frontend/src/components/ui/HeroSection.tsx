import React from 'react';
import { Spacecraft, OpticalAperture, SignatureStar } from '../common/CelestialIcons';
import { AstraBrandLockup, AstraCelestialMark } from '../common/AstraBrand';
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
  // If reduced motion is preferred, jump straight to the settled frame
  const t = reducedMotion ? 1.0 : scrollProgress;

  // 1. Opening Brand Depth Layer (z-index: 2, behind Earth Canvas at z-index: 3)
  // Holds firmly through t = 0.30 for an unhurried reveal, then gently yields as Earth's limb overlaps
  const introOpacity = Math.max(1.0 - Math.pow(Math.max(t - 0.22, 0) / 0.45, 1.2), 0);
  const introScale = 1.0 - t * 0.08;
  const introTranslateY = -t * 60;

  // 2. Settled Operational Content (z-index: 10, in front of Earth Canvas)
  // Emerges smoothly as user completes the approach (t: 0.60 -> 1.0)
  const settledOpacity = Math.min(Math.max((t - 0.58) / 0.38, 0), 1);
  const settledTranslateY = (1.0 - settledOpacity) * 28;

  return (
    <div
      className="astra-hero-stage"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: reducedMotion ? '100vh' : '280vh', // Extended scroll track: gives ~2 extra seconds of cinematic breathing room
        display: 'flex',
        flexDirection: 'column',
      }}
      data-testid="astra-hero-section"
    >
      {/* =========================================================================
          OPENING FRAME & DEPTH LAYER (z-index: 2, BEHIND Earth Canvas at z-index: 3)
          This achieves the iPhone-inspired layered depth effect:
          As Earth approaches and scales, its 3D curved horizon physically overlaps
          and obscures the right edge of the ASTRA brand letters.
          ========================================================================= */}
      <div
        className="astra-intro-depth-plane"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          zIndex: 2, // Sits strictly behind EarthCanvas (zIndex: 3)
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          opacity: introOpacity,
          transform: `translateY(${introTranslateY}px) scale(${introScale})`,
          pointerEvents: introOpacity > 0.08 ? 'auto' : 'none',
          transition: 'opacity 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          padding: '0 24px',
        }}
      >
        {/* Subtle Astronomical Classification Header */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-ghost)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginBottom: '24px',
          }}
        >
          <SignatureStar size={13} color="var(--color-star-warm)" strokeWidth={1.5} />
          <span>AEROSPACE OPERATIONS // MISSION SIMULATION</span>
          <SignatureStar size={13} color="var(--color-star-warm)" strokeWidth={1.5} />
        </div>

        {/* Master Bespoke ASTRA Brand Lockup */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '680px',
            width: '100%',
          }}
        >
          <AstraBrandLockup size="hero" showSubtitle={false} />
        </div>

        {/* Quiet Poetic Statement */}
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(18px, 2.2vw, 24px)',
            fontStyle: 'italic',
            color: 'var(--color-text-muted)',
            marginTop: '28px',
            maxWidth: '520px',
            lineHeight: 1.45,
          }}
        >
          The quiet expanse of planetary operations and orbital intelligence.
        </p>

        {/* Delicate Downward Scroll Cue (Fades gracefully as scroll starts) */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
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
              width: '1px',
              height: '36px',
              backgroundColor: 'var(--color-border-hairline)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '14px',
                backgroundColor: 'var(--color-star-ivory)',
                animation: reducedMotion ? 'none' : 'scrollPulse 2.4s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SETTLED OPERATIONAL FRAME (z-index: 10, IN FRONT OF Earth Canvas)
          Emerges as user completes the approach to Earth in orbit.
          Contains the two primary destinations and verified operational controls.
          ========================================================================= */}
      <div
        className="astra-settled-frame"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          zIndex: 10, // Sits strictly in front of EarthCanvas for interaction
          display: 'flex',
          alignItems: 'center',
          padding: '0 48px',
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
            maxWidth: '620px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Header Identity & Stage Gate Classification */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-earth-cyan)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              <AstraCelestialMark size={14} color="var(--color-earth-cyan)" glowColor="var(--color-earth-cyan)" />
              <span>ORBITAL PLATFORM // STAGE GATE 02</span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(38px, 4.5vw, 56px)',
                fontWeight: 600,
                lineHeight: 1.05,
                letterSpacing: '0.04em',
                color: 'var(--color-text-display)',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              ASTRA
            </h2>

            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(18px, 2vw, 22px)',
                fontStyle: 'italic',
                color: 'var(--color-text-muted)',
                lineHeight: 1.35,
                marginTop: '8px',
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
                marginTop: '14px',
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
                  <div style={{ color: 'var(--color-earth-cyan)' }}>
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
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      SYS_MODE_01 // ORBITAL FLEET OPERATIONS
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
                  <span style={{ fontSize: '18px', color: 'var(--color-earth-cyan)' }}>&rarr;</span>
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
                  <div style={{ color: 'var(--color-earth-blue)' }}>
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
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      SYS_MODE_02 // ASTRONOMICAL ARCHIVES
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
                  <span style={{ fontSize: '18px', color: 'var(--color-earth-blue)' }}>&rarr;</span>
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

          {/* Quiet Technical Metadata */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-text-ghost)',
              letterSpacing: '0.06em',
            }}
          >
            <span>COORD: ECI J2000</span>
            <span>&bull;</span>
            <span>PROPAGATOR: KEPLERIAN + J2</span>
            <span>&bull;</span>
            <span>SIM CLOCK: 10 HZ DETERMINISTIC</span>
          </div>
        </div>
      </div>

      {/* Embedded CSS for Interactive Transitions & Responsive Framing */}
      <style>{`
        @keyframes scrollPulse {
          0% { transform: translateY(-100%); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateY(200%); opacity: 0; }
        }
        .astra-destination-row:hover {
          background-color: rgba(255, 255, 255, 0.02);
          padding-left: 8px;
        }
        .astra-destination-row:focus-visible {
          background-color: rgba(56, 189, 248, 0.04);
          outline: 1px solid var(--color-earth-cyan);
        }
        @media (max-width: 768px) {
          .astra-settled-frame {
            padding: 0 20px !important;
          }
          .astra-intro-depth-plane {
            padding: 0 16px !important;
          }
        }
      `}</style>
    </div>
  );
};
