import React from 'react';
import { Radio } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer
      className="astra-footer"
      style={{
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 28px',
        borderTop: '1px solid var(--color-border-subtle)',
        backgroundColor: 'rgba(8, 9, 12, 0.85)',
        backdropFilter: 'blur(12px)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--color-text-tertiary)',
      }}
      data-testid="astra-footer"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Radio size={12} color="var(--color-cyan)" />
          <span style={{ color: 'var(--color-text-secondary)' }}>
            STATION TELEMETRY: 0.12ms LATENCY
          </span>
        </div>
        <span style={{ color: 'var(--color-border-subtle)' }}>|</span>
        <span>
          TEXTURE PROVENANCE: NASA VISIBLE EARTH &amp; BLUE MARBLE (PUBLIC DOMAIN)
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>
          RENDER LOOP: 60 FPS WEBGL // LOCALLY ANIMATED ORBIT
        </span>
        <span style={{ color: 'var(--color-border-subtle)' }}>|</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>
          ASTRA &copy; 2026 // PHASE 1-2 MILESTONE
        </span>
      </div>
    </footer>
  );
};
