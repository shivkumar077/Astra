import React, { useState, useEffect } from 'react';
import { AstraCelestialMark } from '../common/AstraBrand';

interface HeaderProps {
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  visible?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  reducedMotion,
  onToggleReducedMotion,
  visible = true,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yr = now.getUTCFullYear();
      const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
      const da = String(now.getUTCDate()).padStart(2, '0');
      const hr = String(now.getUTCHours()).padStart(2, '0');
      const mi = String(now.getUTCMinutes()).padStart(2, '0');
      const sc = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${yr}.${mo}.${da} — ${hr}:${mi}:${sc} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className="astra-header"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 44px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 600ms cubic-bezier(0.19, 1, 0.22, 1), transform 600ms cubic-bezier(0.19, 1, 0.22, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      data-testid="astra-header"
    >
      {/* Brand Monogram & Bespoke Celestial Mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AstraCelestialMark size={20} color="var(--color-star-ivory)" glowColor="var(--color-star-warm)" />
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '17px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            color: 'var(--color-text-display)',
            textTransform: 'uppercase',
          }}
        >
          ASTRA
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-ghost)',
            letterSpacing: '0.08em',
            marginLeft: '8px',
          }}
        >
          // FLIGHT OPERATIONS
        </span>
      </div>

      {/* Quiet Operational Metadata & Accessible Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
        }}
      >
        {/* UTC Timekeeper */}
        <span data-telemetry="utc-clock" style={{ letterSpacing: '0.06em' }}>
          {utcTime || 'SYNCHRONIZING UTC...'}
        </span>

        <span style={{ color: 'var(--color-border-hairline)' }}>|</span>

        {/* Refined Motion Preference Toggle */}
        <button
          onClick={onToggleReducedMotion}
          style={{
            color: reducedMotion ? 'var(--color-star-warm)' : 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.04em',
            transition: 'var(--transition-quick)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 6px',
          }}
          aria-label={reducedMotion ? 'Disable reduced motion mode' : 'Enable reduced motion mode'}
        >
          <span>[ motion: {reducedMotion ? 'reduced' : 'active'} ]</span>
        </button>
      </div>
    </header>
  );
};
