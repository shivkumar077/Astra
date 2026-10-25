import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SpacecraftDetail, KeplerianElements, MissionResponse } from '../../types/missionControl';
import { getProceduralPlanetTexture } from '../imagery/PlanetTextureGenerator';
import {
  computeKeplerianCartesian,
  clampObserverDistance,
  EARTH_RADIUS_UNITS,
  EARTH_RADIUS_KM,
} from '../../utils/orbitalCamera';
import { Crosshair, Compass } from 'lucide-react';

interface OrbitalStage3DProps {
  spacecraftList: SpacecraftDetail[];
  selectedSpacecraftId: string;
  onSelectSpacecraft: (id: string) => void;
  reducedMotion?: boolean;
  activeMission?: MissionResponse | null;
}

// Authoritative orbital elements fallback if elements have not arrived via REST yet
const DEFAULT_ELEMENTS: Record<string, KeplerianElements> = {
  'AURA-1': {
    semiMajorAxisKm: 7078.1,
    eccentricity: 0.0012,
    inclinationDeg: 98.2,
    raanDeg: 45.0,
    argOfPerigeeDeg: 60.0,
    trueAnomalyDeg: 142.5,
  },
  'TERRA-OBS': {
    semiMajorAxisKm: 6878.0,
    eccentricity: 0.0008,
    inclinationDeg: 51.6,
    raanDeg: 110.0,
    argOfPerigeeDeg: 30.0,
    trueAnomalyDeg: 84.0,
  },
  'SOLIS-RELAY': {
    semiMajorAxisKm: 14200.0,
    eccentricity: 0.35,
    inclinationDeg: 28.5,
    raanDeg: 200.0,
    argOfPerigeeDeg: 120.0,
    trueAnomalyDeg: 210.0,
  },
};

export const OrbitalStage3D: React.FC<OrbitalStage3DProps> = ({
  spacecraftList,
  selectedSpacecraftId,
  onSelectSpacecraft,
  reducedMotion = false,
  activeMission = null,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Destination-aware default reference frame
  const destGroup = (activeMission?.destinationGroup || '').toLowerCase();
  const destName = (activeMission?.destination || '').toLowerCase();
  const isMars = destGroup.includes('mars') || destName.includes('mars') || destName.includes('phobos');
  const isLunar = destGroup.includes('lunar') || destGroup.includes('deep space') || destName.includes('moon');
  const isOuter = destGroup.includes('outer') || destName.includes('jupiter') || destName.includes('saturn');
  const isSolar = destGroup.includes('solar') || destName.includes('sun');

  const defaultFrame = isMars
    ? 'MCI_J2000'
    : isLunar
    ? 'LCI_J2000'
    : isOuter
    ? 'JOVIAN_CENTRIC'
    : isSolar
    ? 'HELIOCENTRIC'
    : 'ECI_J2000';

  const [referenceFrame, setReferenceFrame] = useState<string>(defaultFrame);
  const [trackingMode, setTrackingMode] = useState<'FREE' | 'TARGET_LOCK'>('TARGET_LOCK');

  // Tracking state refs to avoid tearing down the WebGL context on UI toggles
  const trackingModeRef = useRef<'FREE' | 'TARGET_LOCK'>(trackingMode);
  trackingModeRef.current = trackingMode;

  const selectedSpacecraftIdRef = useRef<string>(selectedSpacecraftId);
  selectedSpacecraftIdRef.current = selectedSpacecraftId;

  const spacecraftListRef = useRef<SpacecraftDetail[]>(spacecraftList);
  spacecraftListRef.current = spacecraftList;

  const reducedMotionRef = useRef<boolean>(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const activeMissionRef = useRef<MissionResponse | null>(activeMission);
  activeMissionRef.current = activeMission;

  const updateOrbitsRef = useRef<() => void>(() => {});
  const updateCelestialBodyRef = useRef<() => void>(() => {});

  const selectedCraft =
    spacecraftList.find((s) => s.id === selectedSpacecraftId) || spacecraftList[0] || null;

  // Auto-switch reference frame when active mission destination changes
  useEffect(() => {
    setReferenceFrame(defaultFrame);
    if (updateCelestialBodyRef.current) {
      updateCelestialBodyRef.current();
    }
  }, [defaultFrame, activeMission]);

  // Orbit update effect: runs only when spacecraft data changes, WITHOUT recreating canvas or WebGLRenderer
  useEffect(() => {
    updateOrbitsRef.current();
  }, [spacecraftList, selectedSpacecraftId]);

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
    scene.background = new THREE.Color(0x020408);

    const spherical = new THREE.Spherical(8.2, Math.PI / 3, Math.PI / 4);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
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

    // 4. 3D Earth Globe with NASA Textures & Cloud Shading
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Realistic Axial Tilt (-23.4 degrees)
    earthGroup.rotation.z = THREE.MathUtils.degToRad(-23.4);

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

    // Night city light modulation based on sun angle
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

    // Cloud Layer
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

    // Aerospace Tactical Wireframe Grid
    const gridGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.002, 36, 18);
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    earthGroup.add(gridMesh);

    // Atmospheric Blue Silhouette Halo (Natural Rayleigh Scattering, FrontSide)
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
      uniforms: {
        uSunDir: { value: sunDirection },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphereMesh);

    // Dynamic Celestial Body Handler
    const updateCelestialBody = () => {
      const mission = activeMissionRef.current;
      const grp = (mission?.destinationGroup || '').toLowerCase();
      const dst = (mission?.destination || '').toLowerCase();
      const isMarsDest = grp.includes('mars') || dst.includes('mars') || dst.includes('phobos');
      const isLunarDest = grp.includes('lunar') || grp.includes('deep space') || dst.includes('moon');
      const isOuterDest = grp.includes('outer') || dst.includes('jupiter') || dst.includes('saturn') || dst.includes('titan');

      if (isMarsDest) {
        const marsTex = getProceduralPlanetTexture('mars');
        if (marsTex) {
          marsTex.colorSpace = THREE.SRGBColorSpace;
          earthMesh.material.map = marsTex;
        }
        earthMesh.material.emissiveMap = null;
        earthMesh.material.emissiveIntensity = 0.0;
        earthMesh.material.roughness = 0.85;
        earthMesh.material.needsUpdate = true;
        earthGroup.rotation.z = THREE.MathUtils.degToRad(-25.19);
        cloudMesh.visible = false;
        atmosphereMesh.visible = true;
        gridMaterial.color.setHex(0xf97316);
        gridMaterial.opacity = 0.14;
      } else if (isLunarDest) {
        const lunarTex = getProceduralPlanetTexture('mercury');
        if (lunarTex) {
          lunarTex.colorSpace = THREE.SRGBColorSpace;
          earthMesh.material.map = lunarTex;
        }
        earthMesh.material.emissiveMap = null;
        earthMesh.material.emissiveIntensity = 0.0;
        earthMesh.material.roughness = 0.95;
        earthMesh.material.needsUpdate = true;
        earthGroup.rotation.z = THREE.MathUtils.degToRad(-1.54);
        cloudMesh.visible = false;
        atmosphereMesh.visible = false;
        gridMaterial.color.setHex(0x94a3b8);
        gridMaterial.opacity = 0.12;
      } else if (isOuterDest) {
        const jupiterTex = getProceduralPlanetTexture('jupiter');
        if (jupiterTex) {
          jupiterTex.colorSpace = THREE.SRGBColorSpace;
          earthMesh.material.map = jupiterTex;
        }
        earthMesh.material.emissiveMap = null;
        earthMesh.material.emissiveIntensity = 0.0;
        earthMesh.material.roughness = 0.7;
        earthMesh.material.needsUpdate = true;
        earthGroup.rotation.z = THREE.MathUtils.degToRad(-3.13);
        cloudMesh.visible = false;
        atmosphereMesh.visible = true;
        gridMaterial.color.setHex(0xeab308);
        gridMaterial.opacity = 0.12;
      } else {
        earthMesh.material.map = earthTexture;
        earthMesh.material.emissiveMap = lightsTexture;
        earthMesh.material.emissiveIntensity = 0.5;
        earthMesh.material.roughness = 0.68;
        earthMesh.material.needsUpdate = true;
        earthGroup.rotation.z = THREE.MathUtils.degToRad(-23.4);
        cloudMesh.visible = true;
        atmosphereMesh.visible = true;
        gridMaterial.color.setHex(0x38bdf8);
        gridMaterial.opacity = 0.1;
      }
      if (!isDisposed) renderer.render(scene, camera);
    };

    updateCelestialBodyRef.current = updateCelestialBody;
    updateCelestialBody();

    // 5. Orbital Trajectory Ribbons & Spacecraft Nodes
    const trajectoryGroup = new THREE.Group();
    scene.add(trajectoryGroup);

    const spacecraftMeshes = new Map<string, THREE.Mesh>();

    const updateOrbits = () => {
      // Clear previous trajectories
      while (trajectoryGroup.children.length > 0) {
        const obj = trajectoryGroup.children[0];
        trajectoryGroup.remove(obj);
        if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
      spacecraftMeshes.clear();

      const list = spacecraftListRef.current;
      const selectedId = selectedSpacecraftIdRef.current;
      const craftsToRender = list.length > 0
        ? list
        : (selectedCraft ? [selectedCraft] : []);

      craftsToRender.forEach((craft) => {
        const isSelected = craft.id === selectedId;
        const elem = craft.elements || DEFAULT_ELEMENTS[craft.id] || DEFAULT_ELEMENTS['AURA-1'];
        if (!elem) return;

        const { points, currentNode } = computeKeplerianCartesian(elem, EARTH_RADIUS_UNITS, EARTH_RADIUS_KM);

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
        craftGroup.position.copy(currentNode);

        // Spacecraft Core Node
        const coreGeometry = new THREE.SphereGeometry(isSelected ? 0.09 : 0.06, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
          color: isSelected ? 0x00e5ff : 0x94a3b8,
        });
        const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
        craftGroup.add(coreMesh);

        // Selected Spacecraft Glowing Halo
        if (isSelected) {
          const haloGeometry = new THREE.SphereGeometry(0.18, 16, 16);
          const haloMaterial = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.35,
          });
          const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
          craftGroup.add(haloMesh);
        }

        trajectoryGroup.add(craftGroup);
        spacecraftMeshes.set(craft.id, coreMesh);
      });
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
        gridMesh.rotation.y += delta * 0.02;
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

      earthGeometry.dispose();
      earthMaterial.dispose();
      cloudGeometry.dispose();
      cloudMaterial.dispose();
      gridGeometry.dispose();
      gridMaterial.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
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
        <div className="astra-mc-hud-target-card" data-testid="hud-target-card">
          <span className="astra-mc-hud-target-tag">
            {activeMission ? (
              `[ ACTIVE SCENARIO // ${activeMission.id} [${(activeMission.destinationGroup || 'EARTH').toUpperCase()}] ]`
            ) : (
              `[ ACTIVE TARGET // ${selectedCraft ? selectedCraft.id : 'AURA-1'} ]`
            )}
          </span>
          <span className="astra-mc-hud-target-title">
            {activeMission
              ? `${activeMission.title} [${selectedCraft ? selectedCraft.id : activeMission.spacecraftId}]`
              : (selectedCraft ? selectedCraft.name : 'AURA-1 Earth Observation Platform')}
          </span>
          <span className="astra-mc-hud-target-regime" data-testid="hud-scientific-regime">
            TARGET: {activeMission ? activeMission.destination.toUpperCase() : 'EARTH (TERRA)'} // REGIME: {isMars ? 'AREOCENTRIC (MARS KEPLERIAN TWO-BODY APPROXIMATION)' : isLunar ? 'SELENOCENTRIC TWO-BODY REGIME' : isOuter ? 'JOVIAN BARYCENTRIC REGIME' : 'ECI J2000 TWO-BODY KEPLERIAN'}
          </span>
        </div>

        <div className="astra-mc-hud-controls">
          <button
            onClick={() => {
              if (isMars) {
                setReferenceFrame((f) => (f === 'MCI_J2000' ? 'AREOCENTRIC' : 'MCI_J2000'));
              } else if (isLunar) {
                setReferenceFrame((f) => (f === 'LCI_J2000' ? 'SELENOCENTRIC' : 'LCI_J2000'));
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
