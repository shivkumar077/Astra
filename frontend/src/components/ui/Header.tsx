import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface HeaderProps {
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

export const Header: React.FC<HeaderProps> = ({ reducedMotion, onToggleReducedMotion }) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className="astra-header"
      style={{
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'rgba(8, 9, 12, 0.75)',
        backdropFilter: 'blur(12px)',
      }}
      data-testid="astra-header"
    >
      {/* Brand Identity & Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--color-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 229, 255, 0.08)',
          }}
          aria-hidden="true"
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--color-cyan)',
              borderRadius: '50%',
              boxShadow: '0 0 8px var(--color-cyan)',
            }}
          />
        </div>
        <div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--color-text-primary)',
            }}
          >
            ASTRA
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.05em',
              marginLeft: '10px',
              borderLeft: '1px solid var(--color-border-subtle)',
              paddingLeft: '10px',
            }}
          >
            GROUND OPERATIONS & MISSION SIM
          </span>
        </div>
      </div>

      {/* System Telemetry Badges & Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* UTC System Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-primary)',
            padding: '4px 10px',
            background: 'var(--color-panel)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-xs)',
          }}
          title="Authoritative Universal Time Coordinate"
        >
          <Clock size={13} color="var(--color-cyan)" />
          <span data-telemetry="utc-clock">{utcTime || 'SYNCHRONIZING...'}</span>
        </div>

        {/* System Integrity Annunciator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-nominal)',
            padding: '4px 10px',
            background: 'rgba(0, 230, 118, 0.08)',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            borderRadius: 'var(--radius-xs)',
          }}
          title="Telemetry Bus Status"
        >
          <ShieldCheck size={13} />
          <span>LINK: NOMINAL</span>
        </div>

        {/* Reduced Motion Toggle Button */}
        <button
          onClick={onToggleReducedMotion}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: reducedMotion ? 'var(--color-advisory)' : 'var(--color-text-secondary)',
            padding: '4px 10px',
            background: reducedMotion ? 'rgba(255, 179, 0, 0.1)' : 'var(--color-panel)',
            border: `1px solid ${reducedMotion ? 'var(--color-advisory)' : 'var(--color-border-subtle)'}`,
            borderRadius: 'var(--radius-xs)',
            transition: 'var(--transition-fast)',
          }}
          aria-label={reducedMotion ? 'Disable reduced motion mode' : 'Enable reduced motion mode'}
          title="Toggle 3D orbital animation and transition intensity"
        >
          {reducedMotion ? <EyeOff size={13} /> : <Eye size={13} />}
          <span>{reducedMotion ? 'MOTION: REDUCED' : 'MOTION: ACTIVE'}</span>
        </button>
      </div>
    </header>
  );
};
