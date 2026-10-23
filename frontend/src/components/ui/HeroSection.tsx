import React from 'react';
import { Spacecraft, OpticalAperture, SignatureStar } from '../common/CelestialIcons';
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

  // Opening Frame Opacity (fades out as user scrolls toward settled state)
  const introOpacity = Math.max(1.0 - t * 2.5, 0);

  // Settled Content Opacity (emerges as user scrolls from 0.4 -> 1.0)
  const settledOpacity = Math.min(Math.max((t - 0.35) / 0.55, 0), 1);
  const settledTranslateY = (1.0 - settledOpacity) * 32;

  return (
    <div
      className="astra-hero-stage"
      style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        minHeight: reducedMotion ? '100vh' : '200vh', // Extended scroll track for the cinematic journey
        display: 'flex',
        flexDirection: 'column',
      }}
      data-testid="astra-hero-section"
    >
      {/* =========================================================================
          OPENING FRAME (Quiet, Cinematic Atmosphere at Top of Scroll)
          ========================================================================= */}
      <div
        className="astra-intro-frame"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          opacity: introOpacity,
          pointerEvents: introOpacity > 0.05 ? 'auto' : 'none',
          transition: 'opacity 200ms ease-out',
          padding: '0 24px',
        }}
      >
        {/* Subtle Constellation Crosshair */}
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
            marginBottom: '18px',
          }}
        >
          <SignatureStar size={14} color="var(--color-star-warm)" strokeWidth={1.5} />
          <span>AEROSPACE OPERATIONS // MISSION SIMULATION</span>
          <SignatureStar size={14} color="var(--color-star-warm)" strokeWidth={1.5} />
        </div>

        {/* Cinematic Large Wordmark with Signature Star */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(64px, 11vw, 136px)',
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: '0.12em',
              color: 'var(--color-star-ivory)',
              textTransform: 'uppercase',
              textShadow: '0 0 40px rgba(255, 255, 255, 0.05)',
              margin: 0,
            }}
          >
            ASTRA
          </h1>

          {/* Signature Star Accompanying the Monogram in Opening Frame */}
          <div
            style={{
              position: 'absolute',
              top: '8%',
              right: '-6%',
              transform: 'translate(50%, -50%)',
              color: 'var(--color-star-warm)',
              filter: 'drop-shadow(0 0 12px rgba(253, 230, 138, 0.4))',
            }}
          >
            <SignatureStar size={28} color="var(--color-star-warm)" strokeWidth={1.25} />
          </div>
        </div>

        {/* Quiet Poetic Statement */}
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(18px, 2.2vw, 24px)',
            fontStyle: 'italic',
            color: 'var(--color-text-muted)',
            marginTop: '24px',
            maxWidth: '520px',
            lineHeight: 1.4,
          }}
        >
          The quiet expanse of planetary operations and orbital intelligence.
        </p>

        {/* Delicate Downward Scroll Cue */}
        <div
          style={{
            position: 'absolute',
            bottom: '44px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-ghost)',
            letterSpacing: '0.18em',
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
                animation: reducedMotion ? 'none' : 'scrollPulse 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SETTLED OPERATIONAL FRAME (Emerges as User Approches Earth in Orbit)
          ========================================================================= */}
      <div
        className="astra-settled-frame"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          padding: '0 48px',
          opacity: settledOpacity,
          transform: `translateY(${settledTranslateY}px)`,
          pointerEvents: settledOpacity > 0.1 ? 'auto' : 'none',
          transition: 'opacity 300ms ease-out',
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
          {/* Layered Depth Interaction Title Group */}
          <div style={{ position: 'relative' }}>
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
              <SignatureStar size={13} color="var(--color-earth-cyan)" strokeWidth={1.5} />
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

      {/* Embedded CSS for Row Hover Micro-Interactions */}
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
      `}</style>
    </div>
  );
};
