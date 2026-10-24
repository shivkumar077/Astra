import React from 'react';

interface AstraWordmarkProps extends React.SVGProps<SVGSVGElement> {
  height?: number | string;
  color?: string;
  accentColor?: string;
  className?: string;
}

// Letterform Vector Paths (Designed from first principles on a unified 540x88 grid)
// Cap height: Y = 18 to Y = 66 (Height = 48 units). Optical curve overshoot: Y = 17 to Y = 67.
// Baseline: Y = 66.
const PATH_A =
  'M 0 66 L 11 66 L 20.5 53 L 55.5 53 L 65 66 L 76 66 L 41.5 18 L 34.5 18 Z M 38 28.5 L 51.5 47.5 L 24.5 47.5 Z';
const PATH_S =
  'M 62 27.5 L 53 28.5 C 50.5 24 43.5 22.5 32 22.5 C 18.5 22.5 9.5 26.5 9.5 32 C 9.5 38 17 40.8 27 42.8 C 44 45.8 61 49.5 61 58.5 C 61 65 49 67 32 67 C 15.5 67 4.5 62 1.5 54.5 L 10.5 53.2 C 13 58.5 20.5 61.5 32 61.5 C 43.5 61.5 52 58.5 52 53.5 C 52 47.5 45 44.5 35 42.5 C 18 39 1 35 1 26.5 C 1 19.5 13.5 17 32 17 C 47.5 17 58 21.5 62 27.5 Z';
const PATH_T =
  'M 0 18 L 72 18 L 72 25 L 40 25 L 40 66 L 32 66 L 32 25 L 0 25 Z';
const PATH_R =
  'M 0 18 L 40 18 C 55 18 63 23.5 63 32 C 63 38.5 57 43 47.5 44.2 L 72 66 L 60.5 66 L 38 45 L 8 45 L 8 66 L 0 66 Z M 8 25 L 8 38 L 40 38 C 49 38 54.5 35.8 54.5 32 C 54.5 28.2 49 25 40 25 Z';

/**
 * ASTRA Bespoke Brand Wordmark
 * Precision-crafted vector identity designed from first principles:
 * - Geometrically consistent and optically balanced aerospace letterforms
 * - Unified stroke weights, coherent baselines (Y=66), and calibrated optical kerning
 * - Pure vector paths with zero arbitrary borders, fragmented strokes, or stray line artifacts
 * - Deliberate integration of the signature celestial star poised at the final 'A' apex
 * - When the star detaches on scroll, the final 'A' remains fully formed, structural, and complete
 */
export const AstraWordmark: React.FC<AstraWordmarkProps> = ({
  height = 54,
  color = 'var(--color-star-ivory, #F0EFEA)',
  accentColor = 'var(--color-star-warm, #FDE68A)',
  className = '',
  style,
  ...props
}) => (
  <svg
    viewBox="0 0 540 88"
    height={height}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`astra-hero-wordmark ${className}`}
    style={{
      display: 'block',
      maxWidth: '100%',
      height: typeof height === 'number' ? `${height}px` : height,
      aspectRatio: '540 / 88',
      overflow: 'visible',
      ...style,
    }}
    aria-label="ASTRA"
    role="img"
    {...props}
  >
    <defs>
      {/* High-end metallic starlight sheen */}
      <linearGradient id="astra-wordmark-gradient" x1="0" y1="0" x2="540" y2="88" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="45%" stopColor={color} />
        <stop offset="85%" stopColor="#D9DFE8" />
        <stop offset="100%" stopColor="#B8C4D4" />
      </linearGradient>

      {/* Radiant celestial gold accent sheen */}
      <linearGradient id="astra-star-accent" x1="0" y1="0" x2="0" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="60%" stopColor={accentColor} />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>

    {/* =========================================================================
        LETTER 1: A (Architectural Chisel Apex, Precision Crossbar)
        ========================================================================= */}
    <g transform="translate(32, 0)">
      <path
        d={PATH_A}
        fill="url(#astra-wordmark-gradient)"
        fillRule="evenodd"
      />
    </g>

    {/* =========================================================================
        LETTER 2: S (Aerodynamic Curvature, Balanced Optical Spine)
        ========================================================================= */}
    <g transform="translate(136, 0)">
      <path
        d={PATH_S}
        fill="url(#astra-wordmark-gradient)"
      />
    </g>

    {/* =========================================================================
        LETTER 3: T (Authoritative Central Pillar, Symmetrical Crossbeam)
        ========================================================================= */}
    <g transform="translate(234, 0)">
      <path
        d={PATH_T}
        fill="url(#astra-wordmark-gradient)"
      />
    </g>

    {/* =========================================================================
        LETTER 4: R (Harmonious Circular Bowl, Sweeping Diagonal Leg)
        ========================================================================= */}
    <g transform="translate(334, 0)">
      <path
        d={PATH_R}
        fill="url(#astra-wordmark-gradient)"
        fillRule="evenodd"
      />
    </g>

    {/* =========================================================================
        LETTER 5: A (Framing Apex Crowned by the Signature Star)
        ========================================================================= */}
    <g transform="translate(432, 0)">
      {/* Complete, fully structural letterform underneath */}
      <path
        d={PATH_A}
        fill="url(#astra-wordmark-gradient)"
        fillRule="evenodd"
      />

      {/* Signature Star Poised at the Final 'A' Apex (Anchors the Traveling Star) */}
      <g
        id="astra-signature-star"
        className="astra-signature-star-anchor"
        transform="translate(38, 12)"
      >
        {/* Luminous 4-point acute diamond flare */}
        <path
          d="M0 -9 L1.8 -2.2 L9 0 L1.8 2.2 L0 9 L-1.8 2.2 L-9 0 L-1.8 -2.2 Z"
          fill="url(#astra-star-accent)"
        />
        {/* Core brilliant starlight spark */}
        <circle cx="0" cy="0" r="1.3" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="3.2" fill={accentColor} opacity="0.35" />
      </g>
    </g>
  </svg>
);

/**
 * ASTRA Navigation Header Wordmark
 * Compact, razor-sharp vector identity for the top application bar.
 */
export const AstraHeaderWordmark: React.FC<AstraWordmarkProps> = ({
  height = 20,
  color = 'var(--color-star-ivory, #F0EFEA)',
  className = '',
  ...props
}) => (
  <div
    className={`astra-header-brand-lockup ${className}`}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '12px',
      textDecoration: 'none',
      userSelect: 'none',
    }}
  >
    <AstraWordmark height={height} color={color} {...props} />
  </div>
);
