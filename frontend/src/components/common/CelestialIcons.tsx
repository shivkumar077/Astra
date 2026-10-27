import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * ASTRA Signature Star: An elegant 4-point radiant astronomical star
 * with acute tapered points, central core, and fine cross-ticks.
 */
export const SignatureStar: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.25,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    {/* Central Core Diamond */}
    <path
      d="M12 2L13.8 9.2L21 11L13.8 12.8L12 20L10.2 12.8L3 11L10.2 9.2L12 2Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Micro diagonal flares */}
    <line x1="6.5" y1="6.5" x2="8.5" y2="8.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.6" />
    <line x1="17.5" y1="6.5" x2="15.5" y2="8.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.6" />
    <line x1="6.5" y1="15.5" x2="8.5" y2="13.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.6" />
    <line x1="17.5" y1="15.5" x2="15.5" y2="13.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.6" />
    {/* Center celestial point */}
    <circle cx="12" cy="11" r="1" fill={color} />
  </svg>
);

/**
 * Terrestrial Planet: Fine-line globe with latitude contour and subtle terminator arc
 */
export const TerrestrialPlanet: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.25,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={strokeWidth} />
    {/* Equator & Latitude arcs */}
    <path d="M3.8 10C6.5 11.8 17.5 11.8 20.2 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M5.5 15C8 16.5 16 16.5 18.5 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.7" />
    <path d="M12 3.5C14.5 7 14.5 17 12 20.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.7" />
  </svg>
);

/**
 * Ringed Planet: Saturnian body intersected by fine elliptical ring arcs
 */
export const RingedPlanet: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.25,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    {/* Rear Ring Arc */}
    <path
      d="M2.5 13C3.5 9 19 5.5 21.5 10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      opacity="0.45"
    />
    {/* Planet Body */}
    <circle cx="12" cy="12" r="6" stroke={color} strokeWidth={strokeWidth} />
    {/* Front Ring Arc */}
    <path
      d="M2 13C2.5 16 9 18.5 16 17C18.5 16.5 21 15 22 13.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Gas Giant: Banded atmospheric striation lines
 */
export const GasGiant: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.25,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={strokeWidth} />
    <path d="M4 8.5C8 7.5 16 7.5 20 8.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.6" />
    <path d="M3.5 12C7.5 11 16.5 11 20.5 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M4.5 15.5C8.5 14.5 15.5 14.5 19.5 15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.6" />
    {/* Storm vortex spot */}
    <ellipse cx="15.5" cy="13.5" rx="1.8" ry="1" stroke={color} strokeWidth={strokeWidth} />
  </svg>
);

/**
 * Moon: Cratered body and phase terminator
 */
export const MoonCrater: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.25,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="8.5" cy="9.5" r="1.5" stroke={color} strokeWidth={strokeWidth} opacity="0.8" />
    <circle cx="14.5" cy="8.5" r="1" stroke={color} strokeWidth={strokeWidth} opacity="0.7" />
    <circle cx="13" cy="14" r="2" stroke={color} strokeWidth={strokeWidth} opacity="0.8" />
    <path d="M12 3.5C16.5 6 16.5 18 12 20.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.4" />
  </svg>
);

/**
 * Spacecraft: Fine-line satellite with articulate solar arrays and high-gain antenna
 */
export const Spacecraft: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.25,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    {/* Central Bus Core */}
    <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" stroke={color} strokeWidth={strokeWidth} />
    {/* Left Solar Array */}
    <line x1="2" y1="12" x2="9.5" y2="12" stroke={color} strokeWidth={strokeWidth} />
    <rect x="2.5" y="10" width="5.5" height="4" stroke={color} strokeWidth={strokeWidth} />
    {/* Right Solar Array */}
    <line x1="14.5" y1="12" x2="22" y2="12" stroke={color} strokeWidth={strokeWidth} />
    <rect x="16" y="10" width="5.5" height="4" stroke={color} strokeWidth={strokeWidth} />
    {/* High-Gain Antenna Dish */}
    <path d="M10 5.5C11 4.5 13 4.5 14 5.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="12" y1="5.5" x2="12" y2="9.5" stroke={color} strokeWidth={strokeWidth} />
    {/* Thruster Bell */}
    <line x1="11" y1="15.5" x2="13" y2="15.5" stroke={color} strokeWidth={strokeWidth} />
    <line x1="12" y1="14.5" x2="12" y2="17" stroke={color} strokeWidth={strokeWidth} />
  </svg>
);

/**
 * Orbital Trajectory: Keplerian conic ellipse with periapsis vector marker
 */
export const OrbitalTrajectory: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.25,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    {/* Tilted Elliptical Orbit */}
    <ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(-25 12 12)" stroke={color} strokeWidth={strokeWidth} strokeDasharray="3 2" />
    {/* Central Gravitational Body */}
    <circle cx="10" cy="12.5" r="2" fill={color} />
    {/* Periapsis Point */}
    <circle cx="18" cy="8.8" r="1.5" stroke={color} strokeWidth={strokeWidth} />
  </svg>
);

/**
 * Optical Aperture: Telescopic camera sensor aperture for astronomical observation
 */
export const OpticalAperture: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.25,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth={strokeWidth} opacity="0.7" />
    <line x1="12" y1="2" x2="12" y2="5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="12" y1="19" x2="12" y2="22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="2" y1="12" x2="5" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="19" y1="12" x2="22" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

/**
 * Observatory Telescope: Multi-spectral space observatory telescope aperture
 */
export const ObservatoryTelescope: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.25,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    {/* Hexagonal segmented aperture (James Webb / deep space telescope) */}
    <path
      d="M12 2.5L18.5 6.25V13.75L12 17.5L5.5 13.75V6.25L12 2.5Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2.8" stroke={color} strokeWidth={strokeWidth} />
    <line x1="12" y1="17.5" x2="12" y2="21.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="8" y1="21.5" x2="16" y2="21.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

