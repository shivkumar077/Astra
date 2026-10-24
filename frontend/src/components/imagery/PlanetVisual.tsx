import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface PlanetVisualProps {
  destinationId: string;
  name: string;
  type: string;
  reducedMotion?: boolean;
}

interface PlanetConfig {
  primaryColor: string;
  secondaryColor: string;
  atmosphereColor: string;
  glowColor: string;
  hasRings?: boolean;
  ringColor?: string;
  ringInner?: number;
  ringOuter?: number;
  ringTilt?: number;
  isStar?: boolean;
  roughness?: number;
}

const PLANET_CONFIGS: Record<string, PlanetConfig> = {
  sun: {
    primaryColor: '#F59E0B',
    secondaryColor: '#FDE68A',
    atmosphereColor: '#EA580C',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    isStar: true,
  },
  mercury: {
    primaryColor: '#8C827A',
    secondaryColor: '#524B46',
    atmosphereColor: '#3F3B37',
    glowColor: 'rgba(140, 130, 122, 0.2)',
    roughness: 0.9,
  },
  venus: {
    primaryColor: '#E3BB7B',
    secondaryColor: '#C49B58',
    atmosphereColor: '#EED9A4',
    glowColor: 'rgba(227, 187, 123, 0.3)',
    roughness: 0.5,
  },
  earth: {
    primaryColor: '#2563EB',
    secondaryColor: '#10B981',
    atmosphereColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    roughness: 0.4,
  },
  mars: {
    primaryColor: '#C1440E',
    secondaryColor: '#E07A5F',
    atmosphereColor: '#F97316',
    glowColor: 'rgba(193, 68, 14, 0.3)',
    roughness: 0.85,
  },
  jupiter: {
    primaryColor: '#C99039',
    secondaryColor: '#E8D2B0',
    atmosphereColor: '#B45309',
    glowColor: 'rgba(201, 144, 57, 0.25)',
    roughness: 0.3,
  },
  saturn: {
    primaryColor: '#E2BF7D',
    secondaryColor: '#C5A059',
    atmosphereColor: '#FDE68A',
    glowColor: 'rgba(226, 191, 125, 0.28)',
    hasRings: true,
    ringColor: '#D8B36E',
    ringInner: 1.3,
    ringOuter: 2.1,
    ringTilt: -26,
    roughness: 0.35,
  },
  uranus: {
    primaryColor: '#70D6FF',
    secondaryColor: '#38BDF8',
    atmosphereColor: '#BAE6FD',
    glowColor: 'rgba(112, 214, 255, 0.3)',
    hasRings: true,
    ringColor: '#93C5FD',
    ringInner: 1.25,
    ringOuter: 1.55,
    ringTilt: 82,
    roughness: 0.2,
  },
  neptune: {
    primaryColor: '#1E40AF',
    secondaryColor: '#3B82F6',
    atmosphereColor: '#60A5FA',
    glowColor: 'rgba(30, 64, 175, 0.35)',
    roughness: 0.25,
  },
};

export const PlanetVisual: React.FC<PlanetVisualProps> = ({
  destinationId,
  name,
  type,
  reducedMotion = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);

  const config = PLANET_CONFIGS[destinationId.toLowerCase()] || PLANET_CONFIGS.earth;

  useEffect(() => {
    // Detect WebGL availability safely
    const checkWebGL = (): boolean => {
      try {
        const canvas = document.createElement('canvas');
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') ||
            canvas.getContext('experimental-webgl') ||
            canvas.getContext('webgl2'))
        );
      } catch {
        return false;
      }
    };

    if (!checkWebGL()) {
      setWebglAvailable(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    let animId: number;
    let isDisposed = false;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      container.appendChild(renderer.domElement);
    } catch {
      setWebglAvailable(false);
      return;
    }

    // Celestial Group
    const planetGroup = new THREE.Group();
    scene.add(planetGroup);

    // Planet Sphere Geometry
    const sphereRadius = config.hasRings ? 1.05 : 1.25;
    const geometry = new THREE.SphereGeometry(sphereRadius, 48, 48);

    // Realistic Lighting & Material
    let material: THREE.Material;
    if (config.isStar) {
      // Sun Self-Illuminated Mesh
      material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.primaryColor),
      });

      // Internal Point Light
      const starLight = new THREE.PointLight(0xffedd5, 1.5, 20);
      scene.add(starLight);
    } else {
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.primaryColor),
        roughness: config.roughness ?? 0.6,
        metalness: 0.1,
      });

      // Directional Sun Light from upper-left
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
      sunLight.position.set(4, 3, 5);
      scene.add(sunLight);

      // Soft Ambient Space Light
      const ambientLight = new THREE.AmbientLight(0x1a202c, 0.4);
      scene.add(ambientLight);
    }

    const sphereMesh = new THREE.Mesh(geometry, material);
    planetGroup.add(sphereMesh);

    // Optional Rings (Saturn, Uranus)
    let ringMesh: THREE.Mesh | null = null;
    if (config.hasRings && config.ringInner && config.ringOuter) {
      const ringGeo = new THREE.RingGeometry(
        sphereRadius * config.ringInner,
        sphereRadius * config.ringOuter,
        64
      );
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.ringColor || config.secondaryColor),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        roughness: 0.4,
      });
      ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      if (config.ringTilt) {
        planetGroup.rotation.z = THREE.MathUtils.degToRad(config.ringTilt);
      }
      planetGroup.add(ringMesh);
    }

    // Animation Render Loop
    const rotationSpeed = reducedMotion ? 0.0005 : 0.004;
    const animate = () => {
      if (isDisposed) return;
      sphereMesh.rotation.y += rotationSpeed;
      if (ringMesh) {
        ringMesh.rotation.z += rotationSpeed * 0.4;
      }
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    // Clean up on unmount
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      geometry.dispose();
      material.dispose();
      if (ringMesh) {
        ringMesh.geometry.dispose();
        (ringMesh.material as THREE.Material).dispose();
      }
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [destinationId, config, reducedMotion]);

  return (
    <div
      className="astra-planet-canvas-wrapper"
      data-testid={`planet-visual-${destinationId}`}
      style={{ position: 'relative' }}
    >
      {/* Radial Atmospheric Bloom */}
      <div
        className="astra-planet-glow"
        style={{
          background: `radial-gradient(circle, ${config.glowColor} 0%, rgba(5,6,8,0) 70%)`,
        }}
        aria-hidden="true"
      />

      {/* WebGL Canvas Container */}
      {webglAvailable ? (
        <div
          ref={mountRef}
          style={{ width: '100%', height: '100%', position: 'relative', zIndex: 2 }}
          role="img"
          aria-label={`${name} celestial sphere visualization`}
        />
      ) : (
        /* Tactical 2D SVG Fallback */
        <div
          className="astra-planet-2d-fallback"
          data-testid={`planet-fallback-${destinationId}`}
          style={{
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          role="img"
          aria-label={`${name} tactical 2D display`}
        >
          <svg
            width="280"
            height="280"
            viewBox="0 0 280 280"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id={`planet-grad-${destinationId}`} cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor={config.secondaryColor} />
                <stop offset="60%" stopColor={config.primaryColor} />
                <stop offset="100%" stopColor="#050608" />
              </radialGradient>
              <filter id={`glow-${destinationId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="10" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Atmosphere Rim */}
            <circle
              cx="140"
              cy="140"
              r="105"
              stroke={config.atmosphereColor}
              strokeWidth="1.5"
              opacity="0.4"
            />

            {/* Primary Sphere Body */}
            <circle
              cx="140"
              cy="140"
              r="95"
              fill={`url(#planet-grad-${destinationId})`}
              filter={`url(#glow-${destinationId})`}
            />

            {/* Optional Rings for Saturn / Uranus */}
            {config.hasRings && (
              <ellipse
                cx="140"
                cy="140"
                rx="135"
                ry="38"
                stroke={config.ringColor || config.secondaryColor}
                strokeWidth="6"
                opacity="0.75"
                transform={config.ringTilt ? `rotate(${config.ringTilt} 140 140)` : undefined}
              />
            )}
          </svg>
        </div>
      )}

      {/* Astronomical Telemetry Tag */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-text-ghost)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          zIndex: 3,
        }}
      >
        {type} // {name}
      </div>
    </div>
  );
};
