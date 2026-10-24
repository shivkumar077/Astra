import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SpacecraftDetail } from '../../types/missionControl';
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

export const OrbitalStage3D: React.FC<OrbitalStage3DProps> = ({
  spacecraftList,
  selectedSpacecraftId,
  onSelectSpacecraft,
  reducedMotion = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [referenceFrame, setReferenceFrame] = useState<'ECI_J2000' | 'LVLH' | 'GROUND_TRACK'>('ECI_J2000');
  const [trackingMode, setTrackingMode] = useState<'FREE' | 'TARGET_LOCK'>('TARGET_LOCK');

  const selectedCraft = spacecraftList.find((s) => s.id === selectedSpacecraftId) || spacecraftList[0];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animId: number;
    let isDisposed = false;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030407);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4.5, 9.5);

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
    const ambientLight = new THREE.AmbientLight(0x1a2638, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    sunLight.position.set(12, 4, 8);
    scene.add(sunLight);

    // 3. 3D Earth Globe
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS, 48, 48);
    const earthMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.75,
      metalness: 0.1,
      wireframe: false,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);

    // Earth Equatorial & Meridian Wireframe Grid (Aerospace grid reference)
    const gridGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.002, 24, 12);
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    scene.add(gridMesh);

    // Earth Atmospheric Glow Layer
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.08, 36, 36);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.22, 0.74, 0.97, 1.0) * intensity * 0.75;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);

    // 4. Orbital Trajectory Ribbons & Spacecraft Nodes
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

      spacecraftList.forEach((craft) => {
        const isSelected = craft.id === selectedSpacecraftId;
        const elem = craft.elements;
        if (!elem) return;

        // Compute Keplerian Ellipse Points
        const a_units = (elem.semiMajorAxisKm / EARTH_RADIUS_KM) * EARTH_RADIUS_UNITS;
        const e = elem.eccentricity;
        const inc_rad = (elem.inclinationDeg * Math.PI) / 180;
        const raan_rad = (elem.raanDeg * Math.PI) / 180;
        const argp_rad = (elem.argOfPerigeeDeg * Math.PI) / 180;

        const points: THREE.Vector3[] = [];
        const segments = 120;

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
          color: isSelected ? 0x38bdf8 : 0x475569,
          transparent: true,
          opacity: isSelected ? 0.9 : 0.35,
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

        const nodeGeometry = new THREE.SphereGeometry(isSelected ? 0.12 : 0.08, 16, 16);
        const nodeMaterial = new THREE.MeshBasicMaterial({
          color: isSelected ? 0x38bdf8 : 0x94a3b8,
        });
        const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
        nodeMesh.position.set(nodeX, nodeZ, -nodeY);
        trajectoryGroup.add(nodeMesh);

        spacecraftMeshes.set(craft.id, nodeMesh);
      });
    };

    updateOrbits();

    // 5. Interactive Orbital Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let spherical = new THREE.Spherical(9.5, Math.PI / 3, Math.PI / 4);

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
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - deltaY * 0.006));

      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(3.8, Math.min(24.0, spherical.radius + e.deltaY * 0.012));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 6. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();

      if (!reducedMotion) {
        // Slow continuous Earth rotation
        earthMesh.rotation.y += delta * 0.025;
        gridMesh.rotation.y += delta * 0.025;
      }

      // Smooth target-lock camera tracking
      if (trackingMode === 'TARGET_LOCK') {
        const activeNode = spacecraftMeshes.get(selectedSpacecraftId);
        if (activeNode) {
          camera.lookAt(activeNode.position.x * 0.35, activeNode.position.y * 0.35, activeNode.position.z * 0.35);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Responsive Resizing with ResizeObserver
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
      gridGeometry.dispose();
      gridMaterial.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [spacecraftList, selectedSpacecraftId, reducedMotion, trackingMode]);

  return (
    <div className="astra-mc-center-viewport" data-testid="orbital-stage-3d">
      <div ref={mountRef} className="astra-mc-canvas-container" />

      {/* Top HUD Card & Viewport Controls */}
      <div className="astra-mc-viewport-hud">
        <div className="astra-mc-hud-target-card">
          <span className="astra-mc-hud-target-tag">
            [ ACTIVE TARGET // {selectedCraft ? selectedCraft.callSign : 'SYNCHRONIZING'} ]
          </span>
          <span className="astra-mc-hud-target-title">
            {selectedCraft ? selectedCraft.name : 'Orbital Vector Tracking'}
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
      {selectedCraft && (
        <div className="astra-mc-viewport-bottom-hud">
          <div className="astra-mc-orbital-metrics-bar">
            <div className="astra-mc-hud-metric-cell">
              <span className="astra-mc-hud-metric-k">ALTITUDE</span>
              <span className="astra-mc-hud-metric-v">
                {selectedCraft.altitudeKm.toFixed(1)} km
              </span>
            </div>
            <div className="astra-mc-hud-metric-cell">
              <span className="astra-mc-hud-metric-k">SPEED</span>
              <span className="astra-mc-hud-metric-v">
                {selectedCraft.speedKmS.toFixed(2)} km/s
              </span>
            </div>
            <div className="astra-mc-hud-metric-cell">
              <span className="astra-mc-hud-metric-k">INCLINATION</span>
              <span className="astra-mc-hud-metric-v">
                {selectedCraft.elements?.inclinationDeg.toFixed(1)}°
              </span>
            </div>
            <div className="astra-mc-hud-metric-cell">
              <span className="astra-mc-hud-metric-k">ECLIPSE</span>
              <span
                className="astra-mc-hud-metric-v"
                style={{ color: selectedCraft.inEclipse ? 'var(--color-advisory)' : 'var(--color-nominal)' }}
              >
                {selectedCraft.inEclipse ? 'SHADOW (ECLIPSE)' : 'DAYLIGHT'}
              </span>
            </div>
            <div className="astra-mc-hud-metric-cell">
              <span className="astra-mc-hud-metric-k">BATTERY</span>
              <span className="astra-mc-hud-metric-v">
                {selectedCraft.batterySocPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
