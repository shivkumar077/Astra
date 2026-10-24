import React, { useEffect, useState } from 'react';
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

  // Starlight particle constellation formation on mount
  const [starsFormed, setStarsFormed] = useState<boolean>(reducedMotion);
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(() => {
      setStarsFormed(true);
    }, 1100);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  // 1. Opening Brand Depth Layer (z-index: 2, behind Earth Canvas at z-index: 3)
  // Holds firmly through initial view, smoothly transitioning as Earth moves into position
  const introOpacity = Math.max(1.0 - Math.pow(Math.max(t - 0.22, 0) / 0.45, 1.2), 0);
  const introScale = 1.0 - t * 0.06;
  const introTranslateY = -t * 50;

  // 2. Settled Operational Content (z-index: 10, in front of Earth Canvas)
  // Emerges smoothly as user completes the approach (t: 0.58 -> 1.0)
  const settledOpacity = Math.min(Math.max((t - 0.58) / 0.38, 0), 1);
  const settledTranslateY = (1.0 - settledOpacity) * 24;

  // Detach signature star from wordmark as scroll begins (t: 0.05 -> 0.18)
  const signatureStarOpacity = Math.max(1.0 - t * 7.0, 0);

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
          The SINGLE, PROUD, PRIMARY ASTRA WORDMARK is rendered here.
          On desktop: anchored on the left/center with Earth to the right.
          On mobile: anchored at the upper top half with Earth framed below.
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
        {/* Subtle Celestial Lead */}
        <div
          className="astra-classification-lead"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            opacity: starsFormed ? 1 : 0.4,
            transition: 'opacity 800ms ease-out',
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

        {/* Master Bespoke ASTRA Wordmark (Sole Hero Identity with Star Formation) */}
        <div
          className="astra-wordmark-wrapper"
          style={{
            position: 'relative',
            display: 'block',
            maxWidth: '680px',
            width: '100%',
            filter: 'drop-shadow(0 4px 32px rgba(0, 0, 0, 0.95))',
          }}
        >
          {/* Starlight particle convergence glints during opening sequence */}
          {!starsFormed && !reducedMotion && (
            <div
              className="astra-starlight-formation-field"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {[...Array(12)].map((_, i) => (
                <span
                  key={i}
                  className="astra-converging-starlight"
                  style={{
                    position: 'absolute',
                    top: `${15 + (i * 7) % 65}%`,
                    left: `${5 + (i * 9) % 90}%`,
                    width: '3px',
                    height: '3px',
                    backgroundColor: '#FFFBEB',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px #FDE68A',
                    animation: `starlightConverge 1s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                    animationDelay: `${i * 45}ms`,
                  }}
                />
              ))}
            </div>
          )}

          <AstraWordmark
            height="clamp(44px, 5.8vw, 76px)"
            color="var(--color-star-ivory)"
            accentColor="var(--color-star-warm)"
            style={{
              opacity: starsFormed ? 1 : 0.75,
              transition: 'opacity 700ms ease-out',
            }}
          />
        </div>

        {/* Quiet Editorial Statement */}
        <p
          className="astra-editorial-statement"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(17px, 2.1vw, 23px)',
            fontStyle: 'italic',
            color: 'var(--color-text-muted)',
            marginTop: '22px',
            maxWidth: '520px',
            lineHeight: 1.45,
            filter: 'drop-shadow(0 2px 16px rgba(0, 0, 0, 0.8))',
          }}
        >
          The quiet expanse of planetary operations and orbital intelligence.
        </p>

        {/* Delicate Downward Scroll Cue (Fades gracefully as scroll starts) */}
        <div
          className="astra-scroll-cue"
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
          Single ASTRA identity established in hero: this frame delivers the
          editorial destination menu with TWO prominent, beautiful panels.
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
            maxWidth: '640px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Header Classification & Editorial Introduction (NO DUPLICATE WORDMARK) */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <SignatureStar size={11} color="var(--color-star-warm)" strokeWidth={1.5} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                MISSION DISPATCH // SELECT REGIME
              </span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(28px, 3.4vw, 40px)',
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: '0.04em',
                color: 'var(--color-text-display)',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              OPERATIONAL DESTINATIONS
            </h2>

            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(16px, 1.8vw, 19px)',
                fontStyle: 'italic',
                color: 'var(--color-text-muted)',
                lineHeight: 1.35,
                marginTop: '6px',
              }}
            >
              Satellite Operations &amp; Mission Simulation Platform
            </p>

            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13.5px',
                lineHeight: 1.6,
                color: 'var(--color-text-body)',
                marginTop: '12px',
                maxWidth: '560px',
              }}
            >
              A deterministic aerospace console combining multi-craft telemetry, 
              orbital kinematics, six-domain controlled failure simulation, 
              and authentic NASA observational archives.
            </p>
          </div>

          {/* EXACTLY TWO PROMINENT, BEAUTIFUL DESTINATION PANELS */}
          <div
            className="astra-destination-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '18px',
              marginTop: '4px',
            }}
            data-testid="primary-entry-points"
          >
            {/* Destination 1: Mission Control */}
            <button
              onClick={() => onSelectDestination('mission-control')}
              className="astra-destination-panel"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '24px 22px',
                backgroundColor: 'rgba(7, 10, 16, 0.72)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 32px rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(20px)',
                borderRadius: '2px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 240ms cubic-bezier(0.16, 1, 0.3, 1)',
                outline: 'none',
              }}
              aria-label="Enter Mission Control: Operate simulated spacecraft, monitor telemetry, and investigate failures"
              data-testid="entry-mission-control"
            >
              {/* Prominent Celestial Icon Anchor */}
              <div
                className="astra-panel-icon-wrap"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--color-star-ivory)',
                  marginBottom: '16px',
                  transition: 'transform 240ms ease, border-color 240ms ease',
                }}
              >
                <Spacecraft size={24} strokeWidth={1.3} />
              </div>

              {/* Destination Name Immediately Positioned Below Icon */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-text-ghost)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                [ DESTINATION 01 ]
              </span>

              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: 'var(--color-text-display)',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                I. MISSION CONTROL
              </h3>

              {/* Concise Supporting Copy */}
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '12.5px',
                  lineHeight: 1.55,
                  color: 'var(--color-text-muted)',
                  marginTop: '10px',
                  marginBottom: '20px',
                  flexGrow: 1,
                }}
              >
                Operate simulated spacecraft across interplanetary regimes, monitor real-time subsystem telemetry, 
                and execute contingency recovery in the Failure Lab.
              </p>

              {/* Elegant Interactive Affordance */}
              <div
                className="astra-panel-action"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-star-ivory)',
                  letterSpacing: '0.08em',
                  marginTop: 'auto',
                }}
              >
                <span>ENTER CONSOLE</span>
                <span className="astra-action-arrow" style={{ transition: 'transform 200ms ease' }}>&rarr;</span>
              </div>
            </button>

            {/* Destination 2: Space Imagery */}
            <button
              onClick={() => onSelectDestination('space-imagery')}
              className="astra-destination-panel"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '24px 22px',
                backgroundColor: 'rgba(7, 10, 16, 0.72)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 32px rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(20px)',
                borderRadius: '2px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 240ms cubic-bezier(0.16, 1, 0.3, 1)',
                outline: 'none',
              }}
              aria-label="Explore Space Imagery: Discover high-resolution NASA photography and Earth observation layers"
              data-testid="entry-space-imagery"
            >
              {/* Prominent Celestial Icon Anchor */}
              <div
                className="astra-panel-icon-wrap"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--color-star-ivory)',
                  marginBottom: '16px',
                  transition: 'transform 240ms ease, border-color 240ms ease',
                }}
              >
                <OpticalAperture size={24} strokeWidth={1.3} />
              </div>

              {/* Destination Name Immediately Positioned Below Icon */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-text-ghost)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                [ DESTINATION 02 ]
              </span>

              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: 'var(--color-text-display)',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                II. SPACE IMAGERY
              </h3>

              {/* Concise Supporting Copy */}
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '12.5px',
                  lineHeight: 1.55,
                  color: 'var(--color-text-muted)',
                  marginTop: '10px',
                  marginBottom: '20px',
                  flexGrow: 1,
                }}
              >
                Explore authentic deep space photography from the NASA Image and Video Library, 
                planetary science cameras, and global satellite Earth observations.
              </p>

              {/* Elegant Interactive Affordance */}
              <div
                className="astra-panel-action"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-star-ivory)',
                  letterSpacing: '0.08em',
                  marginTop: 'auto',
                }}
              >
                <span>EXPLORE ARCHIVE</span>
                <span className="astra-action-arrow" style={{ transition: 'transform 200ms ease' }}>&rarr;</span>
              </div>
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
        @keyframes starlightConverge {
          0% { transform: scale(2.4); opacity: 0; }
          60% { opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        .astra-signature-star-anchor {
          opacity: ${signatureStarOpacity};
          transition: opacity 200ms ease-out;
        }
        .astra-destination-panel:hover {
          background-color: rgba(14, 20, 32, 0.85) !important;
          border-color: rgba(253, 230, 138, 0.35) !important;
          transform: translateY(-2px);
          box-shadow: inset 0 1px 0 rgba(253, 230, 138, 0.15), 0 14px 40px rgba(0, 0, 0, 0.65) !important;
        }
        .astra-destination-panel:hover .astra-panel-icon-wrap {
          transform: scale(1.08);
          border-color: var(--color-star-warm) !important;
          color: var(--color-star-warm) !important;
        }
        .astra-destination-panel:hover .astra-action-arrow {
          transform: translateX(4px);
        }
        .astra-destination-panel:focus-visible {
          background-color: rgba(14, 20, 32, 0.85) !important;
          border-color: var(--color-star-warm) !important;
          outline: 1px solid var(--color-star-warm);
        }

        /* Responsive Mobile Framing Rules (320px - 768px) */
        @media (max-width: 768px) {
          .astra-intro-depth-plane {
            padding: 0 20px !important;
            justify-content: flex-start !important;
            padding-top: clamp(74px, 12vh, 96px) !important;
            align-items: center !important;
            text-align: center !important;
          }
          .astra-classification-lead {
            justify-content: center;
            font-size: 10px !important;
            margin-bottom: 14px !important;
          }
          .astra-wordmark-wrapper {
            max-width: min(90vw, 360px) !important;
            display: flex;
            justify-content: center;
          }
          .astra-editorial-statement {
            font-size: 16px !important;
            margin-top: 14px !important;
            max-width: 340px !important;
          }
          .astra-scroll-cue {
            left: 50% !important;
            transform: translateX(-50%) !important;
            bottom: 28px !important;
            align-items: center !important;
          }
          .astra-settled-frame {
            padding: 80px 20px 70px 20px !important;
            overflow-y: auto !important;
            align-items: flex-start !important;
          }
          .astra-destination-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
        }
      `}</style>
    </div>
  );
};


