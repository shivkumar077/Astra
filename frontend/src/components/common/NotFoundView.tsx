import React, { useEffect } from 'react';
import { ArrowLeft, Compass, Radio, Terminal } from 'lucide-react';
import { SignatureStar } from './CelestialIcons';

interface NotFoundViewProps {
  onReturnHome: () => void;
  onEnterMissionControl?: () => void;
  reducedMotion?: boolean;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onReturnHome,
  onEnterMissionControl,
  reducedMotion = false,
}) => {
  // Listen for Escape key to return to command
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onReturnHome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReturnHome]);

  return (
    <div
      className="astra-notfound-root"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#05070A',
        color: '#E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        textAlign: 'center',
        backgroundImage: `
          radial-gradient(1px 1px at 40px 60px, rgba(255, 255, 255, 0.4), transparent),
          radial-gradient(1.2px 1.2px at 180px 140px, rgba(186, 230, 253, 0.5), transparent),
          radial-gradient(1px 1px at 320px 280px, rgba(255, 255, 255, 0.3), transparent),
          radial-gradient(1.5px 1.5px at 480px 90px, rgba(147, 197, 253, 0.55), transparent),
          radial-gradient(circle 800px at 50% 50%, rgba(14, 45, 84, 0.22), transparent 75%)
        `,
        backgroundSize: '400px 400px, 520px 520px, 460px 460px, 600px 600px, 100% 100%',
      }}
      data-testid="not-found-view"
    >
      {/* Top Left Command Return Header */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          zIndex: 10,
        }}
      >
        <button
          onClick={onReturnHome}
          className="astra-minimal-return-btn"
          aria-label="Return to ASTRA Landing Page"
          data-testid="notfound-return-arrow"
          title="Return to ASTRA [Esc]"
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      {/* Main 404 Orbital Anomaly Container */}
      <div
        style={{
          maxWidth: '680px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          zIndex: 2,
        }}
      >
        {/* Radar Beacon / Celestial Anomaly Visual */}
        <div
          style={{
            position: 'relative',
            width: '180px',
            height: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px',
          }}
          aria-hidden="true"
        >
          {/* Pulsing Target Rings */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px dashed rgba(239, 68, 68, 0.35)',
              animation: reducedMotion ? 'none' : 'spinSlow 36s linear infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '24px',
              borderRadius: '50%',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '54px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, rgba(239, 68, 68, 0.04) 70%, transparent 100%)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
            }}
          />
          <Radio size={28} color="#F87171" strokeWidth={1.5} />
        </div>

        {/* Telemetry Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.14em',
            color: '#F87171',
            textTransform: 'uppercase',
          }}
          data-testid="notfound-status-tag"
        >
          <SignatureStar size={10} color="#F87171" />
          <span>SIGNAL LOST // DESTINATION NOT FOUND</span>
        </div>

        {/* Prominent 404 Heading */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(72px, 16vw, 132px)',
            fontWeight: 600,
            lineHeight: 0.9,
            letterSpacing: '0.04em',
            color: '#FFFFFF',
            margin: '4px 0 0 0',
            textShadow: '0 0 40px rgba(239, 68, 68, 0.3)',
          }}
          data-testid="notfound-error-code"
        >
          404
        </h1>

        {/* Editorial Subheading */}
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(18px, 3.6vw, 24px)',
            fontStyle: 'italic',
            color: 'var(--color-text-display)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Uncharted Orbital Sector
        </p>

        {/* Concise Description */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(13px, 2.5vw, 14.5px)',
            lineHeight: 1.6,
            color: 'var(--color-text-muted)',
            maxWidth: '520px',
            margin: '4px 0 16px 0',
          }}
        >
          The celestial coordinates or trajectory requested do not correspond to any active telemetry node,
          verified destination, or catalogued operational asset in the ASTRA network.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            width: '100%',
          }}
        >
          {/* Primary Action: Return to Command */}
          <button
            onClick={onReturnHome}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              minHeight: '44px',
            }}
            data-testid="notfound-return-home"
            aria-label="Return to ASTRA Command Landing Page"
          >
            <Compass size={14} />
            <span>RETURN TO COMMAND</span>
          </button>

          {/* Secondary Action: Enter Mission Control */}
          {onEnterMissionControl && (
            <button
              onClick={onEnterMissionControl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '2px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: 'var(--color-earth-cyan)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                minHeight: '44px',
              }}
              data-testid="notfound-mission-control"
              aria-label="Enter ASTRA Mission Control"
            >
              <Terminal size={14} />
              <span>MISSION CONTROL</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
