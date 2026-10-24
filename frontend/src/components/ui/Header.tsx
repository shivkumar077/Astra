import React, { useState, useEffect } from 'react';
import { AstraHeaderWordmark } from '../common/AstraBrand';

interface HeaderProps {
  visible?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
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
      {/* Brand Identity Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <AstraHeaderWordmark height={22} />
      </div>

      {/* Quiet Telemetry: UTC Timekeeper */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
        }}
      >
        <span data-telemetry="utc-clock" style={{ letterSpacing: '0.06em' }}>
          {utcTime || 'SYNCHRONIZING UTC...'}
        </span>
      </div>
    </header>
  );
};

