import React from 'react';

interface AstraWordmarkProps extends React.SVGProps<SVGSVGElement> {
  height?: number | string;
  color?: string;
  accentColor?: string;
  className?: string;
}

/**
 * ASTRA Bespoke Hero Wordmark
 * An original, precision-crafted vector identity for a premium space platform:
 * - Architectural custom letterforms with refined optical contrast
 * - Sinuous aerodynamic 'S', monumental 'T', and sweeping orbital 'R' leg
 * - Subtle integrated celestial horizon hairline and central starburst focal point
 * - ZERO isolated decorative 'A'; the complete word ASTRA is the hero
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
      display: 'inline-block',
      maxWidth: '100%',
      height: typeof height === 'number' ? `${height}px` : height,
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

      {/* Subtle celestial gold accent sheen */}
      <linearGradient id="astra-star-accent" x1="270" y1="4" x2="270" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="60%" stopColor={accentColor} />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>

    {/* =========================================================================
        CENTRAL INTEGRATED CELESTIAL STARBURST (Poised above the wordmark axis)
        ========================================================================= */}
    <g transform="translate(270, 10)">
      {/* Delicate horizontal alignment flare */}
      <line x1="-36" y1="0" x2="-8" y2="0" stroke="url(#astra-star-accent)" strokeWidth="0.8" opacity="0.6" />
      <line x1="8" y1="0" x2="36" y2="0" stroke="url(#astra-star-accent)" strokeWidth="0.8" opacity="0.6" />
      {/* 4-point acute celestial diamond */}
      <path
        d="M0 -7 L1.6 -1.8 L7 0 L1.6 1.8 L0 7 L-1.6 1.8 L-7 0 L-1.6 -1.8 Z"
        fill="url(#astra-star-accent)"
      />
      <circle cx="0" cy="0" r="0.9" fill="#FFFFFF" />
    </g>

    {/* =========================================================================
        LETTER 1: A (Architectural Slant, Sharp Chisel Apex, Precision Crossbar)
        ========================================================================= */}
    <g transform="translate(18, 16)">
      {/* Left Diagonal Stroke with Foot Serif */}
      <path
        d="M2 62 L18 62 L14 58 L37.5 7 L32 7 L12 58 L8 62 Z"
        fill="url(#astra-wordmark-gradient)"
      />
      {/* Right Diagonal Main Stem */}
      <path
        d="M34 7 L39 7 L68 62 L84 62 L80 58 L46 7 Z"
        fill="url(#astra-wordmark-gradient)"
      />
      {/* Architectural Horizon Crossbar with subtle optical break */}
      <path
        d="M19 44 L32 44 L32 41.5 L20 41.5 Z M38 44 L58 44 L56.5 41.5 L38 41.5 Z"
        fill="url(#astra-wordmark-gradient)"
      />
    </g>

    {/* =========================================================================
        LETTER 2: S (Aerodynamic Sinuous Curves, Razor-Cut Terminals)
        ========================================================================= */}
    <g transform="translate(126, 16)">
      <path
        d="M68 20 C65 11 56 6 43 6 C28 6 18 14 18 24 C18 36 32 39 46 43 C60 47 67 52 67 61 C67 71 55 76 39 76 C22 76 11 68 8 57 L18 55 C20 63 28 68 40 68 C50 68 57 64 57 57 C57 48 42 45 30 41 C17 37 8 32 8 21 C8 9 20 0 41 0 C54 0 64 6 68 15 Z"
        fill="url(#astra-wordmark-gradient)"
        transform="translate(0, 1)"
      />
      {/* Razor Terminal Brackets */}
      <line x1="68" y1="14" x2="68" y2="22" stroke="url(#astra-wordmark-gradient)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8" y1="50" x2="8" y2="58" stroke="url(#astra-wordmark-gradient)" strokeWidth="1.6" strokeLinecap="round" />
    </g>

    {/* =========================================================================
        LETTER 3: T (Expansive Horizontal Beam, Chamfered Brackets, Strong Pillar)
        ========================================================================= */}
    <g transform="translate(230, 16)">
      {/* Top Crossbeam */}
      <path
        d="M4 7 L76 7 L76 15 L70 15 C67 11 63 10.5 45 10.5 L45 62 L54 62 L54 66 L26 66 L26 62 L35 62 L35 10.5 C17 10.5 13 11 10 15 L4 15 Z"
        fill="url(#astra-wordmark-gradient)"
      />
      {/* Left/Right Crossbeam Finials */}
      <line x1="4" y1="7" x2="4" y2="15" stroke="url(#astra-wordmark-gradient)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="76" y1="7" x2="76" y2="15" stroke="url(#astra-wordmark-gradient)" strokeWidth="1.6" strokeLinecap="round" />
    </g>

    {/* =========================================================================
        LETTER 4: R (Noble Circular Bowl, Sweeping Orbital Transfer Leg)
        ========================================================================= */}
    <g transform="translate(332, 16)">
      <path
        d="M10 7 L44 7 C58 7 68 14 68 27 C68 37 60 44 47 46.5 C56 53 66 65 74 77 L62 77 C55 65 46 54 35 48 L20 48 L20 62 L28 62 L28 66 L2 66 L2 62 L10 62 Z M20 13 L20 42 L42 42 C51 42 57 37 57 27 C57 17 51 13 42 13 Z"
        fill="url(#astra-wordmark-gradient)"
      />
      {/* Left Base Foot Serif */}
      <path d="M4 7 L17 7" stroke="url(#astra-wordmark-gradient)" strokeWidth="1.6" strokeLinecap="round" />
      {/* Parabolic Foot Tip */}
      <path d="M68 77 L78 77" stroke="url(#astra-wordmark-gradient)" strokeWidth="1.6" strokeLinecap="round" />
    </g>

    {/* =========================================================================
        LETTER 5: A (Closing Apex Crowned by the Signature Star)
        ========================================================================= */}
    <g transform="translate(436, 16)">
      {/* Left Diagonal Stroke with Foot Serif */}
      <path
        d="M2 62 L18 62 L14 58 L37.5 7 L32 7 L12 58 L8 62 Z"
        fill="url(#astra-wordmark-gradient)"
      />
      {/* Right Diagonal Main Stem */}
      <path
        d="M34 7 L39 7 L68 62 L84 62 L80 58 L46 7 Z"
        fill="url(#astra-wordmark-gradient)"
      />
      {/* Architectural Horizon Crossbar */}
      <path
        d="M19 44 L32 44 L32 41.5 L20 41.5 Z M38 44 L58 44 L56.5 41.5 L38 41.5 Z"
        fill="url(#astra-wordmark-gradient)"
      />

      {/* Signature Star Poised at the Final 'A' Apex (Anchors the Traveling Star) */}
      <g
        id="astra-signature-star"
        className="astra-signature-star-anchor"
        transform="translate(36.5, 4)"
      >
        {/* Luminous Diamond Flare */}
        <path
          d="M0 -9 L1.8 -2.2 L9 0 L1.8 2.2 L0 9 L-1.8 2.2 L-9 0 L-1.8 -2.2 Z"
          fill="url(#astra-star-accent)"
        />
        {/* Core Brilliant Starlight Spark */}
        <circle cx="0" cy="0" r="1.3" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="3.2" fill={accentColor} opacity="0.35" />
      </g>
    </g>

    {/* Fine Connecting Orbital Baseline Hairline */}
    <line
      x1="24"
      y1="85"
      x2="516"
      y2="85"
      stroke="url(#astra-wordmark-gradient)"
      strokeWidth="0.75"
      strokeDasharray="4 4 16 4"
      opacity="0.3"
    />
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
