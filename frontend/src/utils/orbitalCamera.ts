import * as THREE from 'three';
import { KeplerianElements } from '../types/missionControl';

export const EARTH_RADIUS_UNITS = 2.0;
export const EARTH_RADIUS_KM = 6378.137;

/**
 * Validates a Three.js Vector3, ensuring no NaN or Infinite coordinates.
 */
export function validateVector(v: THREE.Vector3, fallback = new THREE.Vector3(0, 0, 0)): THREE.Vector3 {
  if (
    !v ||
    isNaN(v.x) || !isFinite(v.x) ||
    isNaN(v.y) || !isFinite(v.y) ||
    isNaN(v.z) || !isFinite(v.z)
  ) {
    return fallback.clone();
  }
  return v;
}

/**
 * Computes authoritative 3D Cartesian coordinates (ECI frame mapped to Three.js)
 * from Keplerian orbital elements.
 */
export function computeKeplerianCartesian(
  elem: KeplerianElements,
  earthRadiusUnits = EARTH_RADIUS_UNITS,
  earthRadiusKm = EARTH_RADIUS_KM
): { points: THREE.Vector3[]; currentNode: THREE.Vector3 } {
  if (!elem || isNaN(elem.semiMajorAxisKm) || elem.semiMajorAxisKm <= 0) {
    const fallbackNode = new THREE.Vector3(earthRadiusUnits * 1.15, 0, 0);
    return { points: [fallbackNode], currentNode: fallbackNode };
  }

  const a_units = (elem.semiMajorAxisKm / earthRadiusKm) * earthRadiusUnits;
  const e = Math.max(0, Math.min(0.95, isNaN(elem.eccentricity) ? 0.001 : elem.eccentricity));
  const inc_rad = ((elem.inclinationDeg || 0) * Math.PI) / 180;
  const raan_rad = ((elem.raanDeg || 0) * Math.PI) / 180;
  const argp_rad = ((elem.argOfPerigeeDeg || 0) * Math.PI) / 180;

  const points: THREE.Vector3[] = [];
  const segments = 160;

  for (let i = 0; i <= segments; i++) {
    const nu = (i / segments) * Math.PI * 2;
    const r = (a_units * (1 - e * e)) / (1 + e * Math.cos(nu));

    const x_p = r * Math.cos(nu);
    const y_p = r * Math.sin(nu);

    const x1 = x_p * Math.cos(argp_rad) - y_p * Math.sin(argp_rad);
    const y1 = x_p * Math.sin(argp_rad) + y_p * Math.cos(argp_rad);

    const x2 = x1;
    const y2 = y1 * Math.cos(inc_rad);
    const z2 = y1 * Math.sin(inc_rad);

    const x_eci = x2 * Math.cos(raan_rad) - y2 * Math.sin(raan_rad);
    const y_eci = x2 * Math.sin(raan_rad) + y2 * Math.cos(raan_rad);
    const z_eci = z2;

    points.push(validateVector(new THREE.Vector3(x_eci, z_eci, -y_eci)));
  }

  // Current Spacecraft Node Position from true anomaly
  const trueNu = ((elem.trueAnomalyDeg || 0) * Math.PI) / 180;
  const r_now = (a_units * (1 - e * e)) / (1 + e * Math.cos(trueNu));
  const px = r_now * Math.cos(trueNu);
  const py = r_now * Math.sin(trueNu);

  const cx1 = px * Math.cos(argp_rad) - py * Math.sin(argp_rad);
  const cy1 = px * Math.sin(argp_rad) + py * Math.cos(argp_rad);
  const cx2 = cx1;
  const cy2 = cy1 * Math.cos(inc_rad);
  const cz2 = cy1 * Math.sin(inc_rad);

  const nodeX = cx2 * Math.cos(raan_rad) - cy2 * Math.sin(raan_rad);
  const nodeY = cx2 * Math.sin(raan_rad) + cy2 * Math.cos(raan_rad);
  const nodeZ = cz2;

  const currentNode = validateVector(new THREE.Vector3(nodeX, nodeZ, -nodeY));
  return { points, currentNode };
}

/**
 * Computes target look-at vector for camera given the tracking mode and active target.
 */
export function getCameraTargetVector(
  trackingMode: 'FREE' | 'TARGET_LOCK',
  targetWorldPosition: THREE.Vector3 | null
): THREE.Vector3 {
  if (trackingMode === 'TARGET_LOCK' && targetWorldPosition) {
    return validateVector(targetWorldPosition, new THREE.Vector3(0, 0, 0));
  }
  return new THREE.Vector3(0, 0, 0);
}

/**
 * Clamps observer camera distance to ensure camera never clips inside planetary surface
 * or gets so far that depth precision degrades.
 */
export function clampObserverDistance(
  spherical: THREE.Spherical,
  minRadius = EARTH_RADIUS_UNITS * 1.35, // 2.7 units (safely outside 2.0 Earth + 2.02 Atmosphere)
  maxRadius = 24.0
): THREE.Spherical {
  spherical.radius = Math.max(minRadius, Math.min(maxRadius, spherical.radius));
  spherical.phi = Math.max(0.12, Math.min(Math.PI - 0.12, spherical.phi));
  return spherical;
}
