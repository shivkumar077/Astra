import React, { useState, useEffect } from 'react';
import { SignatureStar } from '../common/CelestialIcons';

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
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      data-testid="astra-header"
    >
      {/* Subtle Orbital Interface Indicator */}
      <div className="astra-header-status">
        <SignatureStar size={11} color="var(--color-star-warm)" strokeWidth={1.5} />
        <span className="status-full">ORBITAL POSITION: SYNCHRONIZED</span>
        <span className="status-short">ORBIT: SYNC</span>
      </div>

      {/* Quiet Telemetry: UTC Timekeeper */}
      <div className="astra-header-telemetry">
        <span data-telemetry="utc-clock" style={{ letterSpacing: '0.06em' }}>
          {utcTime || 'SYNCHRONIZING UTC...'}
        </span>
      </div>
    </header>
  );
};


