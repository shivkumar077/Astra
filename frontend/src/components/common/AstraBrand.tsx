import React from 'react';

interface BrandProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  glowColor?: string;
  className?: string;
}

/**
 * ASTRA Celestial Mark
 * An independent, mathematically constructed astronomical emblem:
 * - 8-point celestial diamond star with acute tapered cardinal rays
 * - Keplerian orbital trajectory ellipse at 23.4° inclination
 * - Concentric focal aperture core representing orbital observation
 */
export const AstraCelestialMark: React.FC<BrandProps> = ({
  size = 48,
  color = 'var(--color-star-ivory, #EDECE8)',
  glowColor = 'var(--color-star-warm, #FDE68A)',
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`astra-celestial-mark ${className}`}
    aria-hidden="true"
    {...props}
  >
    <defs>
      {/* Delicate celestial radial gradient for the central diamond core */}
      <radialGradient id="astra-core-glow" cx="32" cy="32" r="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={glowColor} stopOpacity="0.8" />
        <stop offset="50%" stopColor={color} stopOpacity="0.4" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </radialGradient>
      {/* Subtle linear sheen for the cardinal diamond */}
      <linearGradient id="astra-star-sheen" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor={color} />
        <stop offset="100%" stopColor={glowColor} />
      </linearGradient>
    </defs>

    {/* Outer Atmospheric / Orbital Ring (Hairline) */}
    <circle
      cx="32"
      cy="32"
      r="27"
      stroke={color}
      strokeWidth="0.85"
      strokeDasharray="2 4"
      opacity="0.3"
    />

    {/* Intersecting Orbital Trajectory Ellipse (23.4° Equatorial Incline) */}
    <ellipse
      cx="32"
      cy="32"
      rx="28"
      ry="9"
      transform="rotate(-23.4 32 32)"
      stroke={color}
      strokeWidth="1.1"
      strokeDasharray="4 2"
      opacity="0.55"
    />

    {/* Diagonal Secondary Starlight Rays (Fine Tapered 45° Cross) */}
    <line x1="16" y1="16" x2="22" y2="22" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.65" />
    <line x1="48" y1="16" x2="42" y2="22" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.65" />
    <line x1="16" y1="48" x2="22" y2="42" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.65" />
    <line x1="48" y1="48" x2="42" y2="42" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.65" />

    {/* Primary 4-Point Celestial Star (Acute Tapered Geometry) */}
    <path
      d="M32 4 L34.8 24.5 L56 32 L34.8 39.5 L32 60 L29.2 39.5 L8 32 L29.2 24.5 Z"
      fill="url(#astra-star-sheen)"
      fillOpacity="0.12"
      stroke="url(#astra-star-sheen)"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />

    {/* Inner Core Diamond Flare */}
    <path
      d="M32 18 L34 29 L46 32 L34 35 L32 46 L30 35 L18 32 L30 29 Z"
      fill="url(#astra-core-glow)"
      stroke={glowColor}
      strokeWidth="0.9"
      opacity="0.9"
    />

    {/* Central Precision Focal Aperture & Navigation Point */}
    <circle cx="32" cy="32" r="3.2" stroke={color} strokeWidth="0.9" opacity="0.8" />
    <circle cx="32" cy="32" r="1.3" fill={color} />
  </svg>
);

/**
 * ASTRA Custom Vector Wordmark
 * Precision-drawn SVG letterforms with refined classical Roman proportions,
 * sharp chisel serifs, and an integrated trajectory hairline crossbeam.
 */
export const AstraWordmark: React.FC<BrandProps> = ({
  size = 32,
  color = 'var(--color-star-ivory, #EDECE8)',
  className = '',
  ...props
}) => (
  <svg
    width={size * 4.6}
    height={size}
    viewBox="0 0 368 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`astra-wordmark-svg ${className}`}
    aria-label="ASTRA"
    role="img"
    {...props}
  >
    <defs>
      <linearGradient id="wordmark-sheen" x1="0" y1="0" x2="368" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor={color} />
        <stop offset="100%" stopColor="#D8DDE6" />
      </linearGradient>
    </defs>

    {/* =========================================================================
        LETTER 1: A (Tapered Apex with Elegant Left Hairline & Heavy Right Stem)
        ========================================================================= */}
    <g transform="translate(10, 8)">
      {/* Serifs Base Left */}
      <path d="M4 64 L20 64 M12 64 L12 60" stroke="url(#wordmark-sheen)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Serifs Base Right */}
      <path d="M44 64 L60 64 M52 64 L52 60" stroke="url(#wordmark-sheen)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Main A Contour */}
      <path
        d="M32 4 L33.2 4 L53.5 63.5 L47 63.5 L36 31 L18 31 L10 63.5 L4.5 63.5 Z"
        fill="url(#wordmark-sheen)"
      />
      {/* Fine Inner Triangular Counter */}
      <polygon points="27,14 34.5,27 19.5,27" fill="var(--color-void, #050608)" />
      {/* Extended Architectural Crossbar Hairline */}
      <line x1="12" y1="41" x2="44" y2="41" stroke="url(#wordmark-sheen)" strokeWidth="1.6" />
    </g>

    {/* =========================================================================
        LETTER 2: S (Sinuous Roman Proportions, Tapered Spine & Chisel Finials)
        ========================================================================= */}
    <g transform="translate(86, 8)">
      <path
        d="M48 18.5 C46 10 38 4 27 4 C14 4 6 12 6 22 C6 35 22 37 32 41 C42 45 47 49 47 56 C47 64 38 68 26 68 C13 68 5 61 2 51.5 L7.8 49 C10 58 17 63 26 63 C35 63 41 58 41 52 C41 43 28 39 18 35 C8 31 1 27 1 18 C1 9 9 0 26 0 C37 0 44 6 47 14 Z"
        fill="url(#wordmark-sheen)"
        transform="translate(4, 0)"
      />
      {/* Top chiseled terminal serif */}
      <path d="M52 14 L52 21 M48 18 L55 18" stroke="url(#wordmark-sheen)" strokeWidth="1.4" strokeLinecap="round" />
      {/* Bottom chiseled terminal serif */}
      <path d="M6 54 L6 47 M3 51 L9 51" stroke="url(#wordmark-sheen)" strokeWidth="1.4" strokeLinecap="round" />
    </g>

    {/* =========================================================================
        LETTER 3: T (Architectural Crossbeam with Bracketed Serifs & Strong Stem)
        ========================================================================= */}
    <g transform="translate(162, 8)">
      {/* Horizontal Crossbeam */}
      <path
        d="M2 4 L58 4 L58 11.5 L53 11.5 C50.5 7.5 48 6.5 35 6.5 L35 63.5 L42 63.5 L42 67 L18 67 L18 63.5 L25 63.5 L25 6.5 C12 6.5 9.5 7.5 7 11.5 L2 11.5 Z"
        fill="url(#wordmark-sheen)"
      />
      {/* Bracketed Left Tip Serif */}
      <line x1="2" y1="4" x2="2" y2="12" stroke="url(#wordmark-sheen)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Bracketed Right Tip Serif */}
      <line x1="58" y1="4" x2="58" y2="12" stroke="url(#wordmark-sheen)" strokeWidth="1.8" strokeLinecap="round" />
    </g>

    {/* =========================================================================
        LETTER 4: R (Noble Geometric Bowl & Graceful Tapered Sweeping Leg)
        ========================================================================= */}
    <g transform="translate(236, 8)">
      <path
        d="M8 4 L33 4 C44 4 52 10 52 21.5 C52 30.5 45.5 36.5 36 38.5 C43 45 51 56 57 67 L48 67 C42 56 35 46 27 40 L16 40 L16 63.5 L23 63.5 L23 67 L2 67 L2 63.5 L8 63.5 Z M16 9.5 L16 34.5 L31 34.5 C39 34.5 44 30 44 22 C44 14 39 9.5 31 9.5 Z"
        fill="url(#wordmark-sheen)"
      />
      {/* Top Left Bracketed Stem Serif */}
      <path d="M3 4 L14 4" stroke="url(#wordmark-sheen)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Bottom Terminal Foot on the Sweeping Leg */}
      <path d="M53 67 L61 67" stroke="url(#wordmark-sheen)" strokeWidth="1.8" strokeLinecap="round" />
    </g>

    {/* =========================================================================
        LETTER 5: A (Closing Apex Mirroring Opening Structure)
        ========================================================================= */}
    <g transform="translate(306, 8)">
      {/* Serifs Base Left */}
      <path d="M4 64 L20 64 M12 64 L12 60" stroke="url(#wordmark-sheen)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Serifs Base Right */}
      <path d="M44 64 L60 64 M52 64 L52 60" stroke="url(#wordmark-sheen)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Main A Contour */}
      <path
        d="M32 4 L33.2 4 L53.5 63.5 L47 63.5 L36 31 L18 31 L10 63.5 L4.5 63.5 Z"
        fill="url(#wordmark-sheen)"
      />
      {/* Fine Inner Triangular Counter */}
      <polygon points="27,14 34.5,27 19.5,27" fill="var(--color-void, #050608)" />
      {/* Extended Architectural Crossbar Hairline */}
      <line x1="12" y1="41" x2="44" y2="41" stroke="url(#wordmark-sheen)" strokeWidth="1.6" />
    </g>

    {/* Subtle Connecting Trajectory Hairline under the letters */}
    <line
      x1="22"
      y1="75"
      x2="352"
      y2="75"
      stroke="url(#wordmark-sheen)"
      strokeWidth="0.8"
      strokeDasharray="6 3 12 3"
      opacity="0.35"
    />
  </svg>
);

/**
 * ASTRA Master Brand Lockup
 * Combines the custom wordmark and the celestial mark with optical balance
 * for prominent hero placement and cinematic presentations.
 */
interface LockupProps {
  size?: 'hero' | 'header' | 'compact';
  showSubtitle?: boolean;
}

export const AstraBrandLockup: React.FC<LockupProps> = ({
  size = 'hero',
  showSubtitle = true,
}) => {
  if (size === 'header' || size === 'compact') {
    return (
      <div
        className="astra-brand-header-lockup"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          textDecoration: 'none',
        }}
      >
        <AstraCelestialMark size={22} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: 'var(--color-star-ivory)',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            ASTRA
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--color-text-ghost)',
              letterSpacing: '0.12em',
            }}
          >
            // ORBITAL OPERATIONS
          </span>
        </div>
      </div>
    );
  }

  // Hero Master Lockup
  return (
    <div
      className="astra-brand-hero-lockup"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Top Floating Celestial Emblem */}
      <div
        style={{
          marginBottom: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, var(--color-border-hairline))' }} />
        <AstraCelestialMark size={42} />
        <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, var(--color-border-hairline), transparent)' }} />
      </div>

      {/* Bespoke ASTRA Wordmark (Vector Scaled) */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '560px',
        }}
      >
        <AstraWordmark
          size={52}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '96px',
            filter: 'drop-shadow(0 0 40px rgba(237, 236, 232, 0.08))',
          }}
        />
      </div>

      {/* Atmospheric Lineage Annotation */}
      {showSubtitle && (
        <div
          style={{
            marginTop: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-ghost)',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
          }}
        >
          <span>ORBITAL KINEMATICS</span>
          <span style={{ color: 'var(--color-border-hairline)' }}>&bull;</span>
          <span>MISSION SIMULATION</span>
          <span style={{ color: 'var(--color-border-hairline)' }}>&bull;</span>
          <span>FAILURE LAB</span>
        </div>
      )}
    </div>
  );
};
