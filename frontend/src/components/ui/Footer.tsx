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
        padding: '14px 44px',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SignatureStar size={12} color="var(--color-earth-cyan)" strokeWidth={1.5} />
          <span style={{ color: 'var(--color-text-muted)' }}>
            ORBITAL KINEMATICS: KEPLERIAN + J2 PERTURBATION
          </span>
        </div>
        <span style={{ color: 'var(--color-border-hairline)' }}>|</span>
        <span>
          SURFACE TEXTURES: NASA VISIBLE EARTH &amp; BLUE MARBLE (PUBLIC DOMAIN)
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>
          RENDERING: THREE.JS WEBGL // CONCURRENT SHADER PIPELINE
        </span>
        <span style={{ color: 'var(--color-border-hairline)' }}>|</span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          ASTRA &copy; 2026 // STAGE GATE 02
        </span>
      </div>
    </footer>
  );
};

