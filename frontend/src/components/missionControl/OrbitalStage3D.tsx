import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SpacecraftDetail, KeplerianElements } from '../../types/missionControl';
import { Crosshair, Compass } from 'lucide-react';

interface OrbitalStage3DProps {
  spacecraftList: SpacecraftDetail[];
  selectedSpacecraftId: string;
  onSelectSpacecraft: (id: string) => void;
  reducedMotion?: boolean;
}

// Earth scale constant: 1 Earth Radius = 2.0 Three.js units
const EARTH_RADIUS_UNITS = 2.0;
const EARTH_RADIUS_KM = 6378.137;

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
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [referenceFrame, setReferenceFrame] = useState<'ECI_J2000' | 'LVLH' | 'GROUND_TRACK'>('ECI_J2000');
  const [trackingMode, setTrackingMode] = useState<'FREE' | 'TARGET_LOCK'>('TARGET_LOCK');

  const selectedCraft =
    spacecraftList.find((s) => s.id === selectedSpacecraftId) || spacecraftList[0] || null;

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

      const craftsToRender = spacecraftList.length > 0
        ? spacecraftList
        : (selectedCraft ? [selectedCraft] : []);

      craftsToRender.forEach((craft) => {
        const isSelected = craft.id === selectedSpacecraftId;
        const elem = craft.elements || DEFAULT_ELEMENTS[craft.id] || DEFAULT_ELEMENTS['AURA-1'];
        if (!elem) return;

        // Compute Keplerian Ellipse Points
        const a_units = (elem.semiMajorAxisKm / EARTH_RADIUS_KM) * EARTH_RADIUS_UNITS;
        const e = elem.eccentricity;
        const inc_rad = (elem.inclinationDeg * Math.PI) / 180;
        const raan_rad = (elem.raanDeg * Math.PI) / 180;
        const argp_rad = (elem.argOfPerigeeDeg * Math.PI) / 180;

        const points: THREE.Vector3[] = [];
        const segments = 160;

        for (let i = 0; i <= segments; i++) {
          const nu = (i / segments) * Math.PI * 2;
          const r = (a_units * (1 - e * e)) / (1 + e * Math.cos(nu));

          // Perifocal coordinates
          const x_p = r * Math.cos(nu);
          const y_p = r * Math.sin(nu);

          // Rotate to 3D ECI: R_z(-raan) * R_x(-inc) * R_z(-argp)
          const x1 = x_p * Math.cos(argp_rad) - y_p * Math.sin(argp_rad);
          const y1 = x_p * Math.sin(argp_rad) + y_p * Math.cos(argp_rad);

          const x2 = x1;
          const y2 = y1 * Math.cos(inc_rad);
          const z2 = y1 * Math.sin(inc_rad);

          const x_eci = x2 * Math.cos(raan_rad) - y2 * Math.sin(raan_rad);
          const y_eci = x2 * Math.sin(raan_rad) + y2 * Math.cos(raan_rad);
          const z_eci = z2;

          points.push(new THREE.Vector3(x_eci, z_eci, -y_eci));
        }

        const trajGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const trajMaterial = new THREE.LineBasicMaterial({
          color: isSelected ? 0x00e5ff : 0x475569,
          transparent: true,
          opacity: isSelected ? 0.95 : 0.35,
          linewidth: isSelected ? 2 : 1,
        });
        const trajLine = new THREE.Line(trajGeometry, trajMaterial);
        trajectoryGroup.add(trajLine);

        // Current Spacecraft Node Position
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

        const craftGroup = new THREE.Group();
        craftGroup.position.set(nodeX, nodeZ, -nodeY);

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

      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(3.2, Math.min(22.0, spherical.radius + e.deltaY * 0.012));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 7. Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();

      if (!reducedMotion) {
        // Slow continuous Earth rotation
        earthMesh.rotation.y += delta * 0.02;
        cloudMesh.rotation.y += delta * 0.026;
        gridMesh.rotation.y += delta * 0.02;
      }

      // Smooth target-lock camera tracking
      if (trackingMode === 'TARGET_LOCK') {
        const activeNode = spacecraftMeshes.get(selectedSpacecraftId);
        if (activeNode) {
          const wp = new THREE.Vector3();
          activeNode.getWorldPosition(wp);
          camera.lookAt(wp.x * 0.35, wp.y * 0.35, wp.z * 0.35);
        } else {
          camera.lookAt(0, 0, 0);
        }
      } else {
        camera.lookAt(0, 0, 0);
      }

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
  }, [spacecraftList, selectedSpacecraftId, reducedMotion, trackingMode]);

  // Robust metrics with fallbacks
  const alt = (selectedCraft?.altitudeKm ?? 700.1).toFixed(1);
  const spd = (selectedCraft?.speedKmS ?? 7.51).toFixed(2);
  const inc = (selectedCraft?.elements?.inclinationDeg ?? 98.2).toFixed(1);
  const soc = (selectedCraft?.batterySocPercent ?? 94.2).toFixed(1);
  const inEcl = selectedCraft?.inEclipse ?? false;

  return (
    <div className="astra-mc-center-viewport" data-testid="orbital-stage-3d">
      <div ref={mountRef} className="astra-mc-canvas-container" />

      {/* Top HUD Card & Viewport Controls */}
      <div className="astra-mc-viewport-hud">
        <div className="astra-mc-hud-target-card">
          <span className="astra-mc-hud-target-tag">
            [ ACTIVE TARGET // {selectedCraft ? selectedCraft.callSign : 'AURA-1'} ]
          </span>
          <span className="astra-mc-hud-target-title">
            {selectedCraft ? selectedCraft.name : 'AURA-1 Earth Observation Platform'}
          </span>
        </div>

        <div className="astra-mc-hud-controls">
          <button
            onClick={() => setReferenceFrame((f) => (f === 'ECI_J2000' ? 'LVLH' : 'ECI_J2000'))}
            className={`astra-mc-hud-btn ${referenceFrame === 'ECI_J2000' ? 'active' : ''}`}
            title="Toggle Reference Frame"
          >
            <Compass size={12} />
            <span>FRAME: {referenceFrame}</span>
          </button>

          <button
            onClick={() => setTrackingMode((m) => (m === 'TARGET_LOCK' ? 'FREE' : 'TARGET_LOCK'))}
            className={`astra-mc-hud-btn ${trackingMode === 'TARGET_LOCK' ? 'active' : ''}`}
            title="Toggle Target Camera Lock"
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
