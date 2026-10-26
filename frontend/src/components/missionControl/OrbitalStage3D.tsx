import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SpacecraftDetail, KeplerianElements, MissionResponse } from '../../types/missionControl';
import { getProceduralPlanetTexture, getProceduralRingTexture } from '../imagery/PlanetTextureGenerator';
import {
  computeKeplerianCartesian,
  clampObserverDistance,
  EARTH_RADIUS_UNITS,
  EARTH_RADIUS_KM,
} from '../../utils/orbitalCamera';
import { Crosshair, Compass, FastForward } from 'lucide-react';

export interface TimeAdvanceNotice {
  id: number;
  type: 'SUCCESS' | 'ERROR';
  seconds: number;
  message?: string;
}

interface OrbitalStage3DProps {
  spacecraftList: SpacecraftDetail[];
  selectedSpacecraftId: string;
  onSelectSpacecraft: (id: string) => void;
  reducedMotion?: boolean;
  activeMission?: MissionResponse | null;
  timeAdvanceNotice?: TimeAdvanceNotice | null;
  destinationFilter?: DestinationFilter;
}

// Authoritative orbital elements fallback for the full 52-vehicle solar operations fleet
const DEFAULT_ELEMENTS: Record<string, KeplerianElements> = {
  // Earth Orbit (10)
  'AURA-1': { semiMajorAxisKm: 7080.0, eccentricity: 0.0012, inclinationDeg: 98.2, raanDeg: 25.0, argOfPerigeeDeg: 90.0, trueAnomalyDeg: 0.0 },
  'TERRA-OBS': { semiMajorAxisKm: 6880.0, eccentricity: 0.0008, inclinationDeg: 51.6, raanDeg: 120.0, argOfPerigeeDeg: 45.0, trueAnomalyDeg: 60.0 },
  'SOLIS-RELAY': { semiMajorAxisKm: 24370.0, eccentricity: 0.72, inclinationDeg: 28.5, raanDeg: 200.0, argOfPerigeeDeg: 270.0, trueAnomalyDeg: 0.0 },
  'GEO-COM-4': { semiMajorAxisKm: 42164.0, eccentricity: 0.0002, inclinationDeg: 0.05, raanDeg: 110.0, argOfPerigeeDeg: 0.0, trueAnomalyDeg: 180.0 },
  'NAV-STAR-09': { semiMajorAxisKm: 26560.0, eccentricity: 0.012, inclinationDeg: 55.0, raanDeg: 140.0, argOfPerigeeDeg: 60.0, trueAnomalyDeg: 90.0 },
  'DEBRIS-TRAC-2': { semiMajorAxisKm: 7150.0, eccentricity: 0.002, inclinationDeg: 97.8, raanDeg: 45.0, argOfPerigeeDeg: 120.0, trueAnomalyDeg: 210.0 },
  'HELIOS-OBS': { semiMajorAxisKm: 7088.0, eccentricity: 0.0011, inclinationDeg: 98.3, raanDeg: 35.0, argOfPerigeeDeg: 90.0, trueAnomalyDeg: 45.0 },
  'MERIDIAN-RELAY': { semiMajorAxisKm: 42164.0, eccentricity: 0.0001, inclinationDeg: 0.05, raanDeg: 115.0, argOfPerigeeDeg: 0.0, trueAnomalyDeg: 90.0 },
  'VIGIL-TRACK': { semiMajorAxisKm: 7160.0, eccentricity: 0.0025, inclinationDeg: 97.9, raanDeg: 55.0, argOfPerigeeDeg: 130.0, trueAnomalyDeg: 195.0 },
  'STRATUS-MET': { semiMajorAxisKm: 6920.0, eccentricity: 0.001, inclinationDeg: 52.0, raanDeg: 130.0, argOfPerigeeDeg: 50.0, trueAnomalyDeg: 75.0 },

  // Lunar Operations (10)
  'CHANDRA-ORB': { semiMajorAxisKm: 68400.0, eccentricity: 0.04, inclinationDeg: 88.5, raanDeg: 10.0, argOfPerigeeDeg: 0.0, trueAnomalyDeg: 45.0 },
  'LUNAR-HALO-1': { semiMajorAxisKm: 65000.0, eccentricity: 0.18, inclinationDeg: 14.5, raanDeg: 30.0, argOfPerigeeDeg: 90.0, trueAnomalyDeg: 120.0 },
  'SELENA-MAPPER': { semiMajorAxisKm: 72000.0, eccentricity: 0.02, inclinationDeg: 86.2, raanDeg: 75.0, argOfPerigeeDeg: 45.0, trueAnomalyDeg: 15.0 },
  'ARTEMIS-RELAY': { semiMajorAxisKm: 54000.0, eccentricity: 0.15, inclinationDeg: 54.7, raanDeg: 210.0, argOfPerigeeDeg: 270.0, trueAnomalyDeg: 0.0 },
  'LUNAR-RECON-X': { semiMajorAxisKm: 62000.0, eccentricity: 0.05, inclinationDeg: 89.5, raanDeg: 15.0, argOfPerigeeDeg: 30.0, trueAnomalyDeg: 240.0 },
  'MOON-NAV-01': { semiMajorAxisKm: 75000.0, eccentricity: 0.015, inclinationDeg: 45.0, raanDeg: 180.0, argOfPerigeeDeg: 120.0, trueAnomalyDeg: 60.0 },
  'SELENE-MAP': { semiMajorAxisKm: 72500.0, eccentricity: 0.022, inclinationDeg: 86.5, raanDeg: 80.0, argOfPerigeeDeg: 50.0, trueAnomalyDeg: 20.0 },
  'POLARIS-LR': { semiMajorAxisKm: 68900.0, eccentricity: 0.038, inclinationDeg: 88.8, raanDeg: 15.0, argOfPerigeeDeg: 10.0, trueAnomalyDeg: 60.0 },
  'LUNA-LINK': { semiMajorAxisKm: 65500.0, eccentricity: 0.175, inclinationDeg: 15.0, raanDeg: 35.0, argOfPerigeeDeg: 95.0, trueAnomalyDeg: 135.0 },
  'ARGUS-LNAV': { semiMajorAxisKm: 75500.0, eccentricity: 0.016, inclinationDeg: 46.0, raanDeg: 185.0, argOfPerigeeDeg: 125.0, trueAnomalyDeg: 70.0 },

  // Mars Operations (10)
  'ARES-ORBITER': { semiMajorAxisKm: 37900.0, eccentricity: 0.003, inclinationDeg: 93.0, raanDeg: 50.0, argOfPerigeeDeg: 90.0, trueAnomalyDeg: 0.0 },
  'MARS-RELAY-1': { semiMajorAxisKm: 20428.0, eccentricity: 0.0005, inclinationDeg: 1.2, raanDeg: 160.0, argOfPerigeeDeg: 0.0, trueAnomalyDeg: 180.0 },
  'PHOBOS-SCOUT': { semiMajorAxisKm: 9376.0, eccentricity: 0.015, inclinationDeg: 1.08, raanDeg: 90.0, argOfPerigeeDeg: 30.0, trueAnomalyDeg: 45.0 },
  'DEIMOS-OBS': { semiMajorAxisKm: 23460.0, eccentricity: 0.0002, inclinationDeg: 1.79, raanDeg: 210.0, argOfPerigeeDeg: 150.0, trueAnomalyDeg: 90.0 },
  'MARS-ATMOS-4': { semiMajorAxisKm: 18650.0, eccentricity: 0.045, inclinationDeg: 74.5, raanDeg: 115.0, argOfPerigeeDeg: 270.0, trueAnomalyDeg: 30.0 },
  'AERO-MAP-02': { semiMajorAxisKm: 19820.0, eccentricity: 0.002, inclinationDeg: 92.8, raanDeg: 30.0, argOfPerigeeDeg: 45.0, trueAnomalyDeg: 150.0 },
  'AREION-RECON': { semiMajorAxisKm: 38200.0, eccentricity: 0.0032, inclinationDeg: 93.2, raanDeg: 55.0, argOfPerigeeDeg: 95.0, trueAnomalyDeg: 10.0 },
  'AETHER-MET': { semiMajorAxisKm: 18750.0, eccentricity: 0.042, inclinationDeg: 75.0, raanDeg: 120.0, argOfPerigeeDeg: 275.0, trueAnomalyDeg: 45.0 },
  'DEIMOS-RELAY': { semiMajorAxisKm: 23500.0, eccentricity: 0.0003, inclinationDeg: 1.82, raanDeg: 215.0, argOfPerigeeDeg: 155.0, trueAnomalyDeg: 100.0 },
  'BOREALIS-MAP': { semiMajorAxisKm: 19900.0, eccentricity: 0.0022, inclinationDeg: 93.0, raanDeg: 35.0, argOfPerigeeDeg: 50.0, trueAnomalyDeg: 160.0 },

  // Outer Planets (9)
  'JOVIAN-RADIATION': { semiMajorAxisKm: 1850000.0, eccentricity: 0.78, inclinationDeg: 4.2, raanDeg: 45.0, argOfPerigeeDeg: 180.0, trueAnomalyDeg: 0.0 },
  'EUROPA-CLIPPER-S': { semiMajorAxisKm: 670900.0, eccentricity: 0.009, inclinationDeg: 1.8, raanDeg: 130.0, argOfPerigeeDeg: 60.0, trueAnomalyDeg: 45.0 },
  'CALLISTO-SURVEY': { semiMajorAxisKm: 1883000.0, eccentricity: 0.007, inclinationDeg: 0.5, raanDeg: 80.0, argOfPerigeeDeg: 90.0, trueAnomalyDeg: 110.0 },
  'CHRONOS-SATURN': { semiMajorAxisKm: 185000.0, eccentricity: 0.001, inclinationDeg: 26.7, raanDeg: 240.0, argOfPerigeeDeg: 0.0, trueAnomalyDeg: 90.0 },
  'TITAN-RELAY': { semiMajorAxisKm: 1222000.0, eccentricity: 0.028, inclinationDeg: 0.35, raanDeg: 15.0, argOfPerigeeDeg: 45.0, trueAnomalyDeg: 180.0 },
  'JOVE-SCOPE': { semiMajorAxisKm: 1860000.0, eccentricity: 0.76, inclinationDeg: 4.5, raanDeg: 50.0, argOfPerigeeDeg: 185.0, trueAnomalyDeg: 15.0 },
  'ION-GUARD': { semiMajorAxisKm: 1890000.0, eccentricity: 0.008, inclinationDeg: 0.6, raanDeg: 85.0, argOfPerigeeDeg: 95.0, trueAnomalyDeg: 120.0 },
  'TITAN-ORBIT': { semiMajorAxisKm: 1228000.0, eccentricity: 0.029, inclinationDeg: 0.38, raanDeg: 20.0, argOfPerigeeDeg: 50.0, trueAnomalyDeg: 190.0 },
  'RHEA-SURVEY': { semiMajorAxisKm: 527000.0, eccentricity: 0.0012, inclinationDeg: 0.35, raanDeg: 245.0, argOfPerigeeDeg: 10.0, trueAnomalyDeg: 95.0 },

  // Solar & Deep Space (13)
  'HELIOS-CORONA': { semiMajorAxisKm: 48000000.0, eccentricity: 0.68, inclinationDeg: 3.4, raanDeg: 10.0, argOfPerigeeDeg: 0.0, trueAnomalyDeg: 180.0 },
  'SOLAR-STORM-01': { semiMajorAxisKm: 1500000.0, eccentricity: 0.05, inclinationDeg: 0.2, raanDeg: 0.0, argOfPerigeeDeg: 0.0, trueAnomalyDeg: 0.0 },
  'HELIO-WATCH': { semiMajorAxisKm: 49000000.0, eccentricity: 0.65, inclinationDeg: 3.6, raanDeg: 15.0, argOfPerigeeDeg: 10.0, trueAnomalyDeg: 190.0 },
  'CORONA-TRACE': { semiMajorAxisKm: 22000000.0, eccentricity: 0.75, inclinationDeg: 5.0, raanDeg: 25.0, argOfPerigeeDeg: 0.0, trueAnomalyDeg: 180.0 },
  'STORM-SENTINEL': { semiMajorAxisKm: 1520000.0, eccentricity: 0.048, inclinationDeg: 0.22, raanDeg: 5.0, argOfPerigeeDeg: 0.0, trueAnomalyDeg: 10.0 },
  'FLARE-ALERT': { semiMajorAxisKm: 35000000.0, eccentricity: 0.55, inclinationDeg: 4.1, raanDeg: 30.0, argOfPerigeeDeg: 45.0, trueAnomalyDeg: 90.0 },
  'ASTEROID-SCOUT': { semiMajorAxisKm: 160000000.0, eccentricity: 0.21, inclinationDeg: 7.1, raanDeg: 85.0, argOfPerigeeDeg: 140.0, trueAnomalyDeg: 60.0 },
  'DEEP-NAV-ALPHA': { semiMajorAxisKm: 220000000.0, eccentricity: 0.15, inclinationDeg: 1.8, raanDeg: 190.0, argOfPerigeeDeg: 30.0, trueAnomalyDeg: 110.0 },
  'VOYAGER-EXP': { semiMajorAxisKm: 350000000.0, eccentricity: 0.42, inclinationDeg: 12.0, raanDeg: 310.0, argOfPerigeeDeg: 80.0, trueAnomalyDeg: 20.0 },
  'ODYSSEY-NAV': { semiMajorAxisKm: 225000000.0, eccentricity: 0.16, inclinationDeg: 1.9, raanDeg: 195.0, argOfPerigeeDeg: 35.0, trueAnomalyDeg: 115.0 },
  'VOYAGER-RELAY': { semiMajorAxisKm: 355000000.0, eccentricity: 0.43, inclinationDeg: 12.2, raanDeg: 315.0, argOfPerigeeDeg: 85.0, trueAnomalyDeg: 25.0 },
  'KEPLER-DRIFT': { semiMajorAxisKm: 165000000.0, eccentricity: 0.22, inclinationDeg: 7.3, raanDeg: 90.0, argOfPerigeeDeg: 145.0, trueAnomalyDeg: 65.0 },
  'FARPOINT-PROBE': { semiMajorAxisKm: 450000000.0, eccentricity: 0.50, inclinationDeg: 15.0, raanDeg: 330.0, argOfPerigeeDeg: 90.0, trueAnomalyDeg: 30.0 },
};

import {
  resolveDestinationBody,
  getDefaultCoordinateFrame,
  DestinationBody,
  DestinationFilter,
  destinationGroupToBody,
  getSpacecraftDestinationGroup,
} from '../../utils/destinationModel';

export type TargetDestination = DestinationBody;

export function resolveDestination(
  mission?: MissionResponse | null,
  craft?: SpacecraftDetail | null,
  destinationFilter?: DestinationFilter
): TargetDestination {
  return resolveDestinationBody(mission, craft, destinationFilter);
}

export const OrbitalStage3D: React.FC<OrbitalStage3DProps> = ({
  spacecraftList = [],
  selectedSpacecraftId,
  onSelectSpacecraft,
  reducedMotion = false,
  activeMission = null,
  timeAdvanceNotice = null,
  destinationFilter,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const craftList = spacecraftList || [];
  const selectedCraft =
    craftList.find((s) => s.id === selectedSpacecraftId) || craftList[0] || null;

  // Resolve target celestial destination based on active destinationFilter, mission, and selected craft
  const resolvedDest = destinationFilter && destinationFilter !== 'ALL'
    ? destinationGroupToBody(destinationFilter, selectedCraft)
    : resolveDestination(activeMission, selectedCraft, destinationFilter);

  // Destination-aware default reference frame
  const defaultFrame = getDefaultCoordinateFrame(resolvedDest);

  const [referenceFrame, setReferenceFrame] = useState<string>(defaultFrame);
  const [trackingMode, setTrackingMode] = useState<'FREE' | 'TARGET_LOCK'>('TARGET_LOCK');

  // Tracking state refs to avoid tearing down the WebGL context on UI toggles
  const trackingModeRef = useRef<'FREE' | 'TARGET_LOCK'>(trackingMode);
  trackingModeRef.current = trackingMode;

  const destinationFilterRef = useRef<DestinationFilter>(destinationFilter || 'EARTH');
  destinationFilterRef.current = destinationFilter || 'EARTH';

  const selectedSpacecraftIdRef = useRef<string>(selectedSpacecraftId);
  selectedSpacecraftIdRef.current = selectedSpacecraftId;

  const selectedCraftRef = useRef<SpacecraftDetail | null>(selectedCraft);
  selectedCraftRef.current = selectedCraft;

  const spacecraftListRef = useRef<SpacecraftDetail[]>(spacecraftList);
  spacecraftListRef.current = spacecraftList;

  const reducedMotionRef = useRef<boolean>(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const activeMissionRef = useRef<MissionResponse | null>(activeMission);
  activeMissionRef.current = activeMission;

  const updateOrbitsRef = useRef<() => void>(() => {});
  const updateCelestialBodyRef = useRef<() => void>(() => {});

  // Auto-switch reference frame and celestial system when destination filter, active mission or spacecraft changes
  useEffect(() => {
    setReferenceFrame(defaultFrame);
    if (updateCelestialBodyRef.current) {
      updateCelestialBodyRef.current();
    }
  }, [defaultFrame, activeMission, selectedSpacecraftId, destinationFilter]);

  // Orbit update effect: runs only when spacecraft data or destination filter changes, WITHOUT recreating canvas or WebGLRenderer
  useEffect(() => {
    updateOrbitsRef.current();
  }, [spacecraftList, selectedSpacecraftId, destinationFilter]);

  // Main 3D Scene Initialization: Runs once on mount
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animId: number;
    let isDisposed = false;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = null;

    const spherical = new THREE.Spherical(8.2, Math.PI / 3, Math.PI / 4);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL init failed in OrbitalStage3D', e);
      return;
    }

    // 2. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x1a2638, 1.4);
    scene.add(ambientLight);

    const sunDirection = new THREE.Vector3(12, 4, 8).normalize();
    const sunLight = new THREE.DirectionalLight(0xfffaed, 3.2);
    sunLight.position.set(12, 4, 8);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x0284c7, 0.6);
    fillLight.position.set(-8, -4, -6);
    scene.add(fillLight);

    // 3. Realistic Deep Space Starfield (1,200 particle stars)
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 80 + Math.random() * 140;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const spectral = Math.random();
      if (spectral > 0.8) {
        starColors[i * 3] = 0.55;
        starColors[i * 3 + 1] = 0.82;
        starColors[i * 3 + 2] = 1.0; // Pale Blue
      } else if (spectral > 0.65) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 0.6; // Amber
      } else {
        starColors[i * 3] = 0.95;
        starColors[i * 3 + 1] = 0.96;
        starColors[i * 3 + 2] = 0.98; // Starlight Ivory
      }
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 4. Multi-Body Celestial Stage System (Earth, Mars, Moon, Jupiter)
    const celestialHost = new THREE.Group();
    scene.add(celestialHost);

    // --- 4A. Earth System ---
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = THREE.MathUtils.degToRad(-23.4);
    celestialHost.add(earthGroup);

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/assets/earth/earth_2048.jpg', () => {
      if (!isDisposed) renderer.render(scene, camera);
    });
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const lightsTexture = textureLoader.load('/assets/earth/earth_lights_2048.jpg', () => {
      if (!isDisposed) renderer.render(scene, camera);
    });
    lightsTexture.colorSpace = THREE.SRGBColorSpace;

    const cloudsTexture = textureLoader.load('/assets/earth/earth_clouds_2048.jpg', () => {
      if (!isDisposed) renderer.render(scene, camera);
    });
    cloudsTexture.colorSpace = THREE.SRGBColorSpace;

    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.68,
      metalness: 0.05,
      emissiveMap: lightsTexture,
      emissive: new THREE.Color(0xffe29a),
      emissiveIntensity: 0.5,
    });
    earthMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uSunDir = { value: sunDirection };
      shader.fragmentShader = `
        uniform vec3 uSunDir;
        ${shader.fragmentShader}
      `;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        float sunAngle = dot(normalize(vNormal), uSunDir);
        float nightFactor = smoothstep(0.05, -0.15, sunAngle);
        totalEmissiveRadiance *= nightFactor * 1.8;
        `
      );
    };
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    const cloudGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.015, 64, 64);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.38,
      blending: THREE.NormalBlending,
      roughness: 0.9,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(cloudMesh);

    const earthGridGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.002, 36, 18);
    const earthGridMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const earthGridMesh = new THREE.Mesh(earthGridGeometry, earthGridMaterial);
    earthGroup.add(earthGridMesh);

    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS + 0.02, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 uSunDir;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
          float intensity = pow(fresnel, 4.5);
          float sunCos = dot(vNormal, uSunDir);
          float dayMask = smoothstep(-0.1, 0.25, sunCos);
          vec3 atmosColor = mix(vec3(0.12, 0.28, 0.65), vec3(0.22, 0.52, 0.88), fresnel);
          gl_FragColor = vec4(atmosColor, intensity * dayMask * 0.7);
        }
      `,
      uniforms: { uSunDir: { value: sunDirection } },
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphereMesh);

    // --- 4B. Mars System ---
    const marsGroup = new THREE.Group();
    marsGroup.rotation.z = THREE.MathUtils.degToRad(-25.19);
    celestialHost.add(marsGroup);

    const marsTexture = getProceduralPlanetTexture('mars');
    if (marsTexture) marsTexture.colorSpace = THREE.SRGBColorSpace;
    const marsGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS, 64, 64);
    const marsMaterial = new THREE.MeshStandardMaterial({
      map: marsTexture,
      roughness: 0.88,
      metalness: 0.04,
    });
    const marsMesh = new THREE.Mesh(marsGeometry, marsMaterial);
    marsGroup.add(marsMesh);

    const marsAtmosMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereMaterial.vertexShader,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 uSunDir;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
          float intensity = pow(fresnel, 4.0);
          float sunCos = dot(vNormal, uSunDir);
          float dayMask = smoothstep(-0.15, 0.2, sunCos);
          vec3 atmosColor = mix(vec3(0.65, 0.32, 0.18), vec3(0.85, 0.52, 0.3), fresnel);
          gl_FragColor = vec4(atmosColor, intensity * dayMask * 0.55);
        }
      `,
      uniforms: { uSunDir: { value: sunDirection } },
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    const marsAtmosMesh = new THREE.Mesh(atmosphereGeometry, marsAtmosMaterial);
    marsGroup.add(marsAtmosMesh);

    const marsGridMaterial = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
    const marsGridMesh = new THREE.Mesh(earthGridGeometry, marsGridMaterial);
    marsGroup.add(marsGridMesh);

    // --- 4C. Lunar System ---
    const lunarGroup = new THREE.Group();
    lunarGroup.rotation.z = THREE.MathUtils.degToRad(-1.54);
    celestialHost.add(lunarGroup);

    const lunarTexture = getProceduralPlanetTexture('mercury');
    if (lunarTexture) lunarTexture.colorSpace = THREE.SRGBColorSpace;
    const lunarGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS, 64, 64);
    const lunarMaterial = new THREE.MeshStandardMaterial({
      map: lunarTexture,
      roughness: 0.95,
      metalness: 0.02,
    });
    const lunarMesh = new THREE.Mesh(lunarGeometry, lunarMaterial);
    lunarGroup.add(lunarMesh);

    const lunarGridMaterial = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const lunarGridMesh = new THREE.Mesh(earthGridGeometry, lunarGridMaterial);
    lunarGroup.add(lunarGridMesh);

    // --- 4D. Outer Planets / Jupiter System ---
    const jupiterGroup = new THREE.Group();
    jupiterGroup.rotation.z = THREE.MathUtils.degToRad(-3.13);
    celestialHost.add(jupiterGroup);

    const jupiterTexture = getProceduralPlanetTexture('jupiter');
    if (jupiterTexture) jupiterTexture.colorSpace = THREE.SRGBColorSpace;
    const jupiterGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.05, 64, 64);
    const jupiterMaterial = new THREE.MeshStandardMaterial({
      map: jupiterTexture,
      roughness: 0.72,
      metalness: 0.03,
    });
    const jupiterMesh = new THREE.Mesh(jupiterGeometry, jupiterMaterial);
    jupiterGroup.add(jupiterMesh);

    const jupiterAtmosMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereMaterial.vertexShader,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 uSunDir;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
          float intensity = pow(fresnel, 3.8);
          float sunCos = dot(vNormal, uSunDir);
          float dayMask = smoothstep(-0.1, 0.2, sunCos);
          vec3 atmosColor = mix(vec3(0.72, 0.52, 0.18), vec3(0.92, 0.75, 0.32), fresnel);
          gl_FragColor = vec4(atmosColor, intensity * dayMask * 0.65);
        }
      `,
      uniforms: { uSunDir: { value: sunDirection } },
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    const jupiterAtmosMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.05 + 0.02, 64, 64),
      jupiterAtmosMaterial
    );
    jupiterGroup.add(jupiterAtmosMesh);

    const jupiterGridMaterial = new THREE.MeshBasicMaterial({
      color: 0xeab308,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const jupiterGridMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.052, 36, 18),
      jupiterGridMaterial
    );
    jupiterGroup.add(jupiterGridMesh);

    // --- 4E. Saturn System (Planet Sphere + Procedural Ring System) ---
    const saturnGroup = new THREE.Group();
    saturnGroup.rotation.z = THREE.MathUtils.degToRad(-26.73); // Saturn axial tilt
    celestialHost.add(saturnGroup);

    const saturnTexture = getProceduralPlanetTexture('saturn');
    if (saturnTexture) saturnTexture.colorSpace = THREE.SRGBColorSpace;
    const saturnGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 0.96, 64, 64);
    const saturnMaterial = new THREE.MeshStandardMaterial({
      map: saturnTexture,
      roughness: 0.82,
      metalness: 0.02,
    });
    const saturnMesh = new THREE.Mesh(saturnGeometry, saturnMaterial);
    saturnGroup.add(saturnMesh);

    const saturnRingTexture = getProceduralRingTexture('saturn');
    if (saturnRingTexture) saturnRingTexture.colorSpace = THREE.SRGBColorSpace;
    const saturnRingGeometry = new THREE.RingGeometry(EARTH_RADIUS_UNITS * 1.25, EARTH_RADIUS_UNITS * 2.35, 64);
    // Align ring horizontally in Saturn equatorial plane
    const saturnRingMaterial = new THREE.MeshStandardMaterial({
      map: saturnRingTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      roughness: 0.8,
      metalness: 0.05,
      depthWrite: false,
    });
    const saturnRingMesh = new THREE.Mesh(saturnRingGeometry, saturnRingMaterial);
    saturnRingMesh.rotation.x = Math.PI / 2;
    saturnGroup.add(saturnRingMesh);

    // --- 4F. Ice Giant System (Uranus / Neptune Cyan/Azure Atmosphere) ---
    const iceGiantGroup = new THREE.Group();
    iceGiantGroup.rotation.z = THREE.MathUtils.degToRad(-97.77);
    celestialHost.add(iceGiantGroup);

    const uranusTexture = getProceduralPlanetTexture('uranus');
    if (uranusTexture) uranusTexture.colorSpace = THREE.SRGBColorSpace;
    const iceGiantGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 0.92, 64, 64);
    const iceGiantMaterial = new THREE.MeshStandardMaterial({
      map: uranusTexture,
      roughness: 0.65,
      metalness: 0.05,
    });
    const iceGiantMesh = new THREE.Mesh(iceGiantGeometry, iceGiantMaterial);
    iceGiantGroup.add(iceGiantMesh);

    const iceGiantAtmosMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereMaterial.vertexShader,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 uSunDir;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
          float intensity = pow(fresnel, 3.5);
          vec3 atmosColor = mix(vec3(0.15, 0.62, 0.75), vec3(0.35, 0.85, 0.95), fresnel);
          gl_FragColor = vec4(atmosColor, intensity * 0.7);
        }
      `,
      uniforms: { uSunDir: { value: sunDirection } },
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    const iceGiantAtmosMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 0.92 + 0.02, 64, 64),
      iceGiantAtmosMaterial
    );
    iceGiantGroup.add(iceGiantAtmosMesh);

    // --- 4G. Solar Environment (The Sun Radiant Emissive Body + Coronal Plasma) ---
    const solarGroup = new THREE.Group();
    celestialHost.add(solarGroup);

    const sunGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.12, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff0b3,
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    solarGroup.add(sunMesh);

    const coronaGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.38, 64, 64);
    const coronaMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
          float corona = pow(fresnel, 2.2);
          vec3 coronaColor = mix(vec3(1.0, 0.55, 0.05), vec3(1.0, 0.88, 0.4), fresnel);
          gl_FragColor = vec4(coronaColor, corona * 0.85);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const coronaMesh = new THREE.Mesh(coronaGeometry, coronaMaterial);
    solarGroup.add(coronaMesh);

    // --- 4H. Deep-Space Environment (Irregular 3D Asteroid + Cosmic Void Backdrop) ---
    const deepSpaceGroup = new THREE.Group();
    celestialHost.add(deepSpaceGroup);

    // Procedural irregular rocky asteroid geometry
    const asteroidGeometry = new THREE.DodecahedronGeometry(EARTH_RADIUS_UNITS * 0.75, 2);
    const posAttr = asteroidGeometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const r = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const noise = 1.0 + 0.16 * Math.sin(vx * 4.2) * Math.cos(vy * 3.8 + vz * 2.1);
      posAttr.setXYZ(i, (vx / r) * r * noise, (vy / r) * r * noise, (vz / r) * r * noise);
    }
    asteroidGeometry.computeVertexNormals();

    const asteroidMaterial = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.94,
      metalness: 0.06,
      wireframe: false,
    });
    const asteroidMesh = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    deepSpaceGroup.add(asteroidMesh);

    // Deep-space wireframe reference grid
    const deepSpaceGridMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const deepSpaceGridMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 0.85, 24, 12),
      deepSpaceGridMaterial
    );
    deepSpaceGroup.add(deepSpaceGridMesh);

    // Authoritative Destination-Aware Celestial Body Synchronizer
    const updateCelestialBody = () => {
      const currentFilter = destinationFilterRef.current;
      const dest = currentFilter && currentFilter !== 'ALL'
        ? destinationGroupToBody(currentFilter, selectedCraftRef.current)
        : resolveDestination(activeMissionRef.current, selectedCraftRef.current, currentFilter);

      earthGroup.visible = dest === 'earth';
      marsGroup.visible = dest === 'mars';
      lunarGroup.visible = dest === 'lunar';
      jupiterGroup.visible = dest === 'jupiter';
      saturnGroup.visible = dest === 'saturn';
      iceGiantGroup.visible = dest === 'ice_giant';
      solarGroup.visible = dest === 'solar';
      deepSpaceGroup.visible = dest === 'deep_space';

      if (!isDisposed) renderer.render(scene, camera);
    };

    updateCelestialBodyRef.current = updateCelestialBody;
    updateCelestialBody();

    // 5. Orbital Trajectory Ribbons & Spacecraft Nodes
    const trajectoryGroup = new THREE.Group();
    scene.add(trajectoryGroup);

    const spacecraftMeshes = new Map<string, THREE.Mesh>();

    interface CraftRenderNode {
      craftGroup: THREE.Group;
      coreMesh: THREE.Mesh;
      haloMesh?: THREE.Mesh;
      trajLine: THREE.Line;
      elementsKey: string;
      isSelected: boolean;
    }
    const craftRenderNodes = new Map<string, CraftRenderNode>();

    const updateOrbits = () => {

      const list = spacecraftListRef.current;
      const selectedId = selectedSpacecraftIdRef.current;
      const currentFilter = destinationFilterRef.current || 'ALL';

      // Scope spacecraft strictly to the current destination unless ALL is chosen
      const scopedList = currentFilter === 'ALL'
        ? list
        : list.filter((craft) => getSpacecraftDestinationGroup(craft) === currentFilter);

      const craftsToRender = scopedList.length > 0
        ? scopedList
        : (selectedCraftRef.current && (currentFilter === 'ALL' || getSpacecraftDestinationGroup(selectedCraftRef.current) === currentFilter)
            ? [selectedCraftRef.current]
            : []);

      const activeIds = new Set<string>();

      craftsToRender.forEach((craft) => {
        activeIds.add(craft.id);
        const isSelected = craft.id === selectedId;
        const elem = craft.elements || DEFAULT_ELEMENTS[craft.id] || DEFAULT_ELEMENTS['AURA-1'];
        if (!elem) return;

        const scale = EARTH_RADIUS_UNITS / EARTH_RADIUS_KM;
        let targetPosition: THREE.Vector3;
        if (
          craft.positionKm &&
          Number.isFinite(craft.positionKm.x) &&
          Number.isFinite(craft.positionKm.y) &&
          Number.isFinite(craft.positionKm.z)
        ) {
          targetPosition = new THREE.Vector3(
            craft.positionKm.x * scale,
            craft.positionKm.z * scale,
            -craft.positionKm.y * scale
          );
        } else {
          const { currentNode } = computeKeplerianCartesian(elem, EARTH_RADIUS_UNITS, EARTH_RADIUS_KM);
          targetPosition = currentNode;
        }

        const elementsKey = `${elem.semiMajorAxisKm.toFixed(1)}_${elem.eccentricity.toFixed(4)}_${elem.inclinationDeg.toFixed(2)}`;
        const existingNode = craftRenderNodes.get(craft.id);

        if (existingNode && existingNode.elementsKey === elementsKey && existingNode.isSelected === isSelected) {
          existingNode.craftGroup.position.copy(targetPosition);
          spacecraftMeshes.set(craft.id, existingNode.coreMesh);
          return;
        }

        if (existingNode) {
          trajectoryGroup.remove(existingNode.trajLine);
          trajectoryGroup.remove(existingNode.craftGroup);
          existingNode.trajLine.geometry?.dispose();
          if (existingNode.trajLine.material instanceof THREE.Material) {
            existingNode.trajLine.material.dispose();
          }
          existingNode.coreMesh.geometry?.dispose();
          if (existingNode.coreMesh.material instanceof THREE.Material) {
            existingNode.coreMesh.material.dispose();
          }
          if (existingNode.haloMesh) {
            existingNode.haloMesh.geometry?.dispose();
            if (existingNode.haloMesh.material instanceof THREE.Material) {
              existingNode.haloMesh.material.dispose();
            }
          }
          craftRenderNodes.delete(craft.id);
        }

        const { points } = computeKeplerianCartesian(elem, EARTH_RADIUS_UNITS, EARTH_RADIUS_KM);
        const trajGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const trajMaterial = new THREE.LineBasicMaterial({
          color: isSelected ? 0x00e5ff : 0x475569,
          transparent: true,
          opacity: isSelected ? 0.95 : 0.35,
          linewidth: isSelected ? 2 : 1,
        });
        const trajLine = new THREE.Line(trajGeometry, trajMaterial);
        trajectoryGroup.add(trajLine);

        const craftGroup = new THREE.Group();
        craftGroup.position.copy(targetPosition);

        // Spacecraft Core Node
        const coreGeometry = new THREE.SphereGeometry(isSelected ? 0.09 : 0.06, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
          color: isSelected ? 0x00e5ff : 0x94a3b8,
        });
        const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
        craftGroup.add(coreMesh);

        // Selected Spacecraft Glowing Halo
        let haloMesh: THREE.Mesh | undefined = undefined;
        if (isSelected) {
          const haloGeometry = new THREE.SphereGeometry(0.18, 16, 16);
          const haloMaterial = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.35,
          });
          haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
          craftGroup.add(haloMesh);
        }

        trajectoryGroup.add(craftGroup);
        spacecraftMeshes.set(craft.id, coreMesh);
        craftRenderNodes.set(craft.id, {
          craftGroup,
          coreMesh,
          haloMesh,
          trajLine,
          elementsKey,
          isSelected,
        });
      });

      // Thoroughly dispose any craft nodes that are no longer part of active destination
      for (const [id, node] of Array.from(craftRenderNodes.entries())) {
        if (!activeIds.has(id)) {
          trajectoryGroup.remove(node.trajLine);
          trajectoryGroup.remove(node.craftGroup);
          node.trajLine.geometry?.dispose();
          if (node.trajLine.material instanceof THREE.Material) {
            node.trajLine.material.dispose();
          }
          node.coreMesh.geometry?.dispose();
          if (node.coreMesh.material instanceof THREE.Material) {
            node.coreMesh.material.dispose();
          }
          if (node.haloMesh) {
            node.haloMesh.geometry?.dispose();
            if (node.haloMesh.material instanceof THREE.Material) {
              node.haloMesh.material.dispose();
            }
          }
          craftRenderNodes.delete(id);
          spacecraftMeshes.delete(id);
        }
      }
    };

    updateOrbitsRef.current = updateOrbits;
    updateOrbits();

    // 6. Interactive Orbit & Pan Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      spherical.theta -= deltaX * 0.006;
      spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, spherical.phi - deltaY * 0.006));
      clampObserverDistance(spherical);
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(3.0, Math.min(22.0, spherical.radius + e.deltaY * 0.012));
      clampObserverDistance(spherical);
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 7. Animation Loop with Target Camera Tracking & Damping
    const clock = new THREE.Clock();
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const tempTarget = new THREE.Vector3();

    const animate = () => {
      if (isDisposed) return;
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();

      if (!reducedMotionRef.current) {
        // Slow continuous Earth rotation
        earthMesh.rotation.y += delta * 0.02;
        cloudMesh.rotation.y += delta * 0.026;
        earthGridMesh.rotation.y += delta * 0.02;
        marsMesh.rotation.y += delta * 0.019;
      }

      // Smooth Target Camera Tracking
      if (trackingModeRef.current === 'TARGET_LOCK') {
        const activeNode = spacecraftMeshes.get(selectedSpacecraftIdRef.current);
        if (activeNode) {
          activeNode.getWorldPosition(tempTarget);
          if (
            !isNaN(tempTarget.x) && isFinite(tempTarget.x) &&
            !isNaN(tempTarget.y) && isFinite(tempTarget.y) &&
            !isNaN(tempTarget.z) && isFinite(tempTarget.z) &&
            tempTarget.lengthSq() > 0.01
          ) {
            targetLookAt.copy(tempTarget);
          } else {
            targetLookAt.set(0, 0, 0);
          }
        } else {
          targetLookAt.set(0, 0, 0);
        }
      } else {
        targetLookAt.set(0, 0, 0);
      }

      // Smooth look-at interpolation without sudden jumps
      const lerpFactor = reducedMotionRef.current ? 1.0 : 0.07;
      currentLookAt.lerp(targetLookAt, lerpFactor);

      // Compute camera position relative to target
      camera.position.setFromSpherical(spherical).add(currentLookAt);

      // Safety: camera must maintain distance from lookAt to prevent near-clipping
      const distToLookAt = camera.position.distanceTo(currentLookAt);
      if (distToLookAt < 2.5) {
        camera.position.sub(currentLookAt).setLength(2.5).add(currentLookAt);
      }

      camera.lookAt(currentLookAt);
      renderer.render(scene, camera);
    };

    animate();

    // 8. Responsive Resizing with ResizeObserver
    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth || 800;
      const newH = container.clientHeight || 600;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(container);
    }

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      if (resizeObserver) resizeObserver.disconnect();

      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);

      while (trajectoryGroup.children.length > 0) {
        const obj = trajectoryGroup.children[0];
        trajectoryGroup.remove(obj);
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
      }

      celestialHost.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      starGeometry.dispose();
      starMaterial.dispose();

      earthTexture.dispose();
      lightsTexture.dispose();
      cloudsTexture.dispose();

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // Run ONCE on mount: No context thrashing on target toggle!

  // Robust metrics with fallbacks
  const alt = (selectedCraft?.altitudeKm ?? 700.1).toFixed(1);
  const spd = (selectedCraft?.speedKmS ?? 7.51).toFixed(2);
  const inc = (selectedCraft?.elements?.inclinationDeg ?? 98.2).toFixed(1);
  const soc = (selectedCraft?.batterySocPercent ?? 94.2).toFixed(1);
  const inEcl = selectedCraft?.inEclipse ?? false;

  return (
    <div className="astra-mc-center-viewport" data-testid="orbital-stage-3d">
      <div ref={mountRef} className="astra-mc-canvas-container" />

      {/* Top HUD: Target Telemetry Badge & Control Toolbar */}
      <div className="astra-mc-viewport-hud">
        {/* Accessible telemetry context preserving active target and regime for screen readers and tests without overlaying the 3D scene */}
        <div className="sr-only" data-testid="hud-target-card" aria-label="Active Vehicle Telemetry Context">
          <span className="astra-mc-hud-target-tag">
            [ ACTIVE TARGET // {selectedCraft ? selectedCraft.callSign : 'AURA-1'} ]
          </span>
          <span className="astra-mc-hud-target-title">
            {selectedCraft ? selectedCraft.name : 'AURA-1 Earth Observation Platform'}
          </span>
          <span className="astra-mc-hud-target-regime" data-testid="hud-scientific-regime">
            TARGET: {activeMission ? activeMission.destination.toUpperCase() : (
              resolvedDest === 'mars' ? 'MARS (ARES)' :
              resolvedDest === 'lunar' ? 'MOON (LUNA)' :
              resolvedDest === 'saturn' ? 'SATURN & RINGS' :
              resolvedDest === 'jupiter' ? 'JUPITER SYSTEM' :
              resolvedDest === 'ice_giant' ? 'ICE GIANT SYSTEM' :
              resolvedDest === 'solar' ? 'THE SUN (HELIOS)' :
              resolvedDest === 'deep_space' ? 'DEEP SPACE VOID' : 'EARTH (TERRA)'
            )} // REGIME: {
              resolvedDest === 'mars' ? 'AREOCENTRIC (MARS KEPLERIAN TWO-BODY APPROXIMATION)' :
              resolvedDest === 'lunar' ? 'SELENOCENTRIC TWO-BODY REGIME' :
              resolvedDest === 'saturn' ? 'SATURNIAN EQUATORIAL RING PLANE SYSTEM' :
              resolvedDest === 'jupiter' ? 'JOVIAN BARYCENTRIC RADIATION REGIME' :
              resolvedDest === 'ice_giant' ? 'OUTER SOLAR SYSTEM (URANIAN/NEPTUNIAN SYSTEM)' :
              resolvedDest === 'solar' ? 'HELIOCENTRIC INNER CORONAL DYNAMICS' :
              resolvedDest === 'deep_space' ? 'INTERPLANETARY / DEEP SPACE (SCIENTIFIC VISUALIZATION)' :
              'ECI J2000 TWO-BODY KEPLERIAN'
            }
          </span>
        </div>

        <div className="astra-mc-hud-controls">
          <button
            onClick={() => {
              if (resolvedDest === 'mars') {
                setReferenceFrame((f) => (f === 'MCI_J2000' ? 'AREOCENTRIC' : 'MCI_J2000'));
              } else if (resolvedDest === 'lunar') {
                setReferenceFrame((f) => (f === 'LCI_J2000' ? 'SELENOCENTRIC' : 'LCI_J2000'));
              } else if (resolvedDest === 'saturn') {
                setReferenceFrame((f) => (f === 'SATURNIAN_CENTRIC' ? 'RING_PLANE' : 'SATURNIAN_CENTRIC'));
              } else if (resolvedDest === 'solar') {
                setReferenceFrame((f) => (f === 'HELIOCENTRIC' ? 'CORONAL_BODY' : 'HELIOCENTRIC'));
              } else if (resolvedDest === 'deep_space') {
                setReferenceFrame((f) => (f === 'BARYCENTRIC_INERTIAL' ? 'HELIOCENTRIC_CRUISE' : 'BARYCENTRIC_INERTIAL'));
              } else {
                setReferenceFrame((f) => (f === 'ECI_J2000' ? 'LVLH' : 'ECI_J2000'));
              }
            }}
            className="astra-mc-hud-btn active"
            title="Toggle Reference Frame"
            data-testid="toggle-frame-btn"
          >
            <Compass size={12} />
            <span>FRAME: {referenceFrame}</span>
          </button>

          <button
            onClick={() => setTrackingMode((m) => (m === 'TARGET_LOCK' ? 'FREE' : 'TARGET_LOCK'))}
            className={`astra-mc-hud-btn ${trackingMode === 'TARGET_LOCK' ? 'active' : ''}`}
            title="Toggle Target Camera Lock"
            data-testid="toggle-target-camera-btn"
          >
            <Crosshair size={12} />
            <span>TRACK: {trackingMode}</span>
          </button>

          {spacecraftList.length > 1 && (
            <button
              onClick={() => {
                const idx = spacecraftList.findIndex((s) => s.id === selectedSpacecraftId);
                const next = spacecraftList[(idx + 1) % spacecraftList.length];
                if (next) onSelectSpacecraft(next.id);
              }}
              className="astra-mc-hud-btn"
              title="Cycle target spacecraft"
              data-testid="cycle-target-btn"
            >
              <span>CYCLE TARGET</span>
            </button>
          )}
        </div>
      </div>

      {/* Time Advance Feedback Overlay (Anchored to Central Orbital Viewport) */}
      {timeAdvanceNotice && (
        <div
          className={`astra-mc-viewport-time-notice ${(timeAdvanceNotice.type || 'success').toLowerCase()} ${timeAdvanceNotice.type === 'ERROR' ? 'notice-error' : ''}`}
          role="status"
          aria-live="polite"
          data-testid="viewport-time-notice"
        >
          <div className="astra-mc-time-notice-header">
            <FastForward size={14} className="astra-mc-time-notice-icon" aria-hidden="true" />
            <span className="astra-mc-time-notice-label">
              {timeAdvanceNotice.type === 'SUCCESS' ? 'SIMULATION ADVANCED' : 'SIMULATION ADVANCE FAILED'}
            </span>
          </div>
          <div className="astra-mc-time-notice-readout">
            {timeAdvanceNotice.type === 'SUCCESS' ? `+${timeAdvanceNotice.seconds} SECONDS` : 'REQUEST REJECTED'}
          </div>
          <div className="astra-mc-time-notice-sub">
            {timeAdvanceNotice.type === 'SUCCESS'
              ? 'AUTHORITATIVE TIME STEP APPLIED'
              : (timeAdvanceNotice.message || 'Simulation time advancement was rejected by the engine.')}
          </div>
        </div>
      )}

      {/* Bottom HUD: Live Orbital Telemetry Ribbon */}
      <div className="astra-mc-viewport-bottom-hud">
        <div className="astra-mc-orbital-metrics-bar">
          <div className="astra-mc-hud-metric-cell">
            <span className="astra-mc-hud-metric-k">ALTITUDE</span>
            <span className="astra-mc-hud-metric-v">{alt} km</span>
          </div>
          <div className="astra-mc-hud-metric-cell">
            <span className="astra-mc-hud-metric-k">SPEED</span>
            <span className="astra-mc-hud-metric-v">{spd} km/s</span>
          </div>
          <div className="astra-mc-hud-metric-cell">
            <span className="astra-mc-hud-metric-k">INCLINATION</span>
            <span className="astra-mc-hud-metric-v">{inc}°</span>
          </div>
          <div className="astra-mc-hud-metric-cell">
            <span className="astra-mc-hud-metric-k">ECLIPSE</span>
            <span
              className="astra-mc-hud-metric-v"
              style={{ color: inEcl ? 'var(--color-advisory)' : 'var(--color-nominal)' }}
            >
              {inEcl ? 'SHADOW (ECLIPSE)' : 'DAYLIGHT'}
            </span>
          </div>
          <div className="astra-mc-hud-metric-cell">
            <span className="astra-mc-hud-metric-k">BATTERY</span>
            <span className="astra-mc-hud-metric-v">{soc}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
