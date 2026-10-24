import React from 'react';
import { SignatureStar } from '../common/CelestialIcons';

export const Footer: React.FC = () => {
  return (
    <footer
      className="astra-footer"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 44px',
        borderTop: '1px solid var(--color-border-hairline)',
        backgroundColor: 'rgba(5, 6, 8, 0.72)',
        backdropFilter: 'blur(16px)',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--color-text-ghost)',
        letterSpacing: '0.06em',
      }}
      data-testid="astra-footer"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SignatureStar size={11} color="var(--color-star-warm)" strokeWidth={1.5} />
        <span style={{ color: 'var(--color-text-muted)' }}>
          ASTRA // SATELLITE OPERATIONS &amp; MISSION SIMULATION
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ color: 'var(--color-text-ghost)' }}>
          STAGE GATE 02 — ORBITAL REVEAL
        </span>
        <span style={{ color: 'var(--color-border-hairline)' }}>|</span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          &copy; 2026 ASTRA
        </span>
      </div>
    </footer>
  );
};


