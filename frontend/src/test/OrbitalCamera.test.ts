import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  validateVector,
  computeKeplerianCartesian,
  getCameraTargetVector,
  clampObserverDistance,
  EARTH_RADIUS_UNITS,
} from '../utils/orbitalCamera';
import { KeplerianElements } from '../types/missionControl';

describe('Orbital Camera & Target Tracking Math Regression Tests', () => {
  it('validates vectors and replaces NaN or Infinite coordinates with safe fallbacks', () => {
    const valid = new THREE.Vector3(1.5, 2.5, 3.5);
    expect(validateVector(valid)).toBe(valid);

    const nanVec = new THREE.Vector3(NaN, 1, 2);
    const fallback = new THREE.Vector3(0, 0, 0);
    const fixed = validateVector(nanVec, fallback);
    expect(fixed.x).toBe(0);
    expect(fixed.y).toBe(0);
    expect(fixed.z).toBe(0);

    const infVec = new THREE.Vector3(1, Infinity, 3);
    const fixedInf = validateVector(infVec, fallback);
    expect(fixedInf.y).toBe(0);
  });

  it('computes valid Keplerian trajectory points and current node without NaN', () => {
    const elem: KeplerianElements = {
      semiMajorAxisKm: 7078.1,
      eccentricity: 0.0012,
      inclinationDeg: 98.2,
      raanDeg: 45.0,
      argOfPerigeeDeg: 60.0,
      trueAnomalyDeg: 142.5,
    };

    const { points, currentNode } = computeKeplerianCartesian(elem);
    expect(points.length).toBe(161);
    expect(isNaN(currentNode.x)).toBe(false);
    expect(isNaN(currentNode.y)).toBe(false);
    expect(isNaN(currentNode.z)).toBe(false);

    // Magnitude should be outside Earth radius (2.0)
    const dist = currentNode.length();
    expect(dist).toBeGreaterThan(EARTH_RADIUS_UNITS);
  });

  it('handles null, empty, or degenerate orbital elements gracefully', () => {
    // @ts-expect-error test degenerate input
    const { points, currentNode } = computeKeplerianCartesian(null);
    expect(points.length).toBeGreaterThan(0);
    expect(isNaN(currentNode.x)).toBe(false);
  });

  it('correctly toggles between FREE (Earth center) and TARGET_LOCK (spacecraft)', () => {
    const craftPos = new THREE.Vector3(2.5, 1.2, -3.1);

    // FREE mode always returns (0, 0, 0)
    const freeTarget = getCameraTargetVector('FREE', craftPos);
    expect(freeTarget.x).toBe(0);
    expect(freeTarget.y).toBe(0);
    expect(freeTarget.z).toBe(0);

    // TARGET_LOCK mode returns the spacecraft coordinates
    const lockedTarget = getCameraTargetVector('TARGET_LOCK', craftPos);
    expect(lockedTarget.x).toBe(craftPos.x);
    expect(lockedTarget.y).toBe(craftPos.y);
    expect(lockedTarget.z).toBe(craftPos.z);

    // TARGET_LOCK with null craft falls back safely to Earth center
    const fallbackTarget = getCameraTargetVector('TARGET_LOCK', null);
    expect(fallbackTarget.x).toBe(0);
    expect(fallbackTarget.y).toBe(0);
    expect(fallbackTarget.z).toBe(0);
  });

  it('prevents camera from clipping into planetary surface or escaping to infinity', () => {
    const spherical = new THREE.Spherical(0.5, Math.PI / 2, 0); // distance 0.5 is inside Earth (R = 2.0)
    const clamped = clampObserverDistance(spherical);
    expect(clamped.radius).toBeGreaterThanOrEqual(EARTH_RADIUS_UNITS * 1.35);

    const farSpherical = new THREE.Spherical(100.0, Math.PI / 2, 0);
    const clampedFar = clampObserverDistance(farSpherical);
    expect(clampedFar.radius).toBeLessThanOrEqual(24.0);
  });
});
