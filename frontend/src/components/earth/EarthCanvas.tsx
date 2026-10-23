import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface EarthCanvasProps {
  onLoaded?: () => void;
  reducedMotion?: boolean;
}

export const EarthCanvas: React.FC<EarthCanvasProps> = ({ onLoaded, reducedMotion = false }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // 1. Detect WebGL Availability
    const checkWebGL = (): boolean => {
      try {
        const testCanvas = document.createElement('canvas');
        const gl = !!(
          window.WebGLRenderingContext &&
          (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl') || testCanvas.getContext('webgl2'))
        );
        return gl;
      } catch {
        return false;
      }
    };

    if (!checkWebGL()) {
      setHasError(true);
      setErrorMessage('WebGL hardware acceleration is unavailable in this browser.');
      onLoaded?.();
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    let animationFrameId: number;
    let isDisposed = false;

    // Dimensions
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 2. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08090c, 0.035);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.2);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      container.appendChild(renderer.domElement);
    } catch {
      setHasError(true);
      setErrorMessage('Failed to initialize WebGL graphics context.');
      onLoaded?.();
      return;
    }

    // 3. Earth Assembly Group
    // Visually anchored on the right side on desktop, centered on mobile
    const earthGroup = new THREE.Group();
    const updateGroupPosition = (w: number) => {
      if (w >= 1024) {
        earthGroup.position.set(1.65, 0.05, 0);
        earthGroup.scale.set(1, 1, 1);
      } else if (w >= 768) {
        earthGroup.position.set(0.7, -0.2, -0.5);
        earthGroup.scale.set(0.9, 0.9, 0.9);
      } else {
        earthGroup.position.set(0, -0.6, -1.2);
        earthGroup.scale.set(0.78, 0.78, 0.78);
      }
    };
    updateGroupPosition(width);
    scene.add(earthGroup);

    // Natural Earth Axial Tilt (23.4 degrees)
    earthGroup.rotation.z = THREE.MathUtils.degToRad(-23.4);

    // 4. Loading Manager for Provenance Textures
    const loadingManager = new THREE.LoadingManager(
      () => {
        if (!isDisposed) {
          setIsLoaded(true);
          onLoaded?.();
        }
      },
      (_item, loaded, total) => {
        if (!isDisposed && total > 0) {
          setLoadProgress(Math.round((loaded / total) * 100));
        }
      },
      (url) => {
        console.warn(`[ASTRA] Texture stream notice: ${url}`);
      }
    );

    const textureLoader = new THREE.TextureLoader(loadingManager);

    // Load textures
    const earthTexture = textureLoader.load(
      '/assets/earth/earth_2048.jpg',
      () => {},
      undefined,
      () => {
        console.warn('[ASTRA] Base surface texture deferred to fallback.');
      }
    );
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const lightsTexture = textureLoader.load('/assets/earth/earth_lights_2048.jpg');
    lightsTexture.colorSpace = THREE.SRGBColorSpace;

    const cloudsTexture = textureLoader.load('/assets/earth/earth_clouds_2048.jpg');
    cloudsTexture.colorSpace = THREE.SRGBColorSpace;

    // 5. Geometries & Materials
    const sphereRadius = 2.0;
    const earthGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);

    // Custom Shaded Earth Material: Emissive night lights modulated by sun terminator
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.72,
      metalness: 0.08,
      emissiveMap: lightsTexture,
      emissive: new THREE.Color(0xffe8a3),
      emissiveIntensity: 0.9,
    });

    // Modulate night lights with sun angle so city lights turn off in daytime
    earthMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uSunDirection = { value: new THREE.Vector3(-1.0, 0.4, 0.8).normalize() };
      shader.fragmentShader = `
        uniform vec3 uSunDirection;
        ${shader.fragmentShader}
      `;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        float sunAngle = dot(normalize(vNormal), uSunDirection);
        // Fade emissive city lights on illuminated hemisphere (transition across twilight terminator)
        float nightFactor = smoothstep(0.15, -0.25, sunAngle);
        totalEmissiveRadiance *= nightFactor * 1.4;
        `
      );
    };

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // 6. Atmospheric Cloud Layer (Decoupled Rotation)
    const cloudGeometry = new THREE.SphereGeometry(sphereRadius + 0.025, 64, 64);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(cloudMesh);

    // 7. Atmospheric Limb Rim (Fresnel Glow)
    const atmosphereGeometry = new THREE.SphereGeometry(sphereRadius + 0.16, 64, 64);
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
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
          float intensity = pow(fresnel, 3.2);
          // Crisp aerospace cyan atmosphere fading into orbital blue
          vec3 atmosColor = mix(vec3(0.0, 0.898, 1.0), vec3(0.039, 0.518, 1.0), fresnel);
          gl_FragColor = vec4(atmosColor, intensity * 0.85);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphereMesh);

    // 8. Subtle Technical Orbital Vector Ring (LEO Inclination 51.6°)
    const orbitRadius = 2.45;
    const orbitPoints: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, 0, Math.sin(theta) * orbitRadius));
    }
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineDashedMaterial({
      color: 0x00e5ff,
      dashSize: 0.12,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.28,
    });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    orbitLine.computeLineDistances();
    orbitLine.rotation.x = THREE.MathUtils.degToRad(51.6);
    earthGroup.add(orbitLine);

    // 9. Procedural Deep-Space Starfield
    const starsCount = 1000;
    const starsPositions = new Float32Array(starsCount * 3);
    const starsColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      const r = 60 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starsPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starsPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starsPositions[i * 3 + 2] = r * Math.cos(phi);

      const colorChance = Math.random();
      if (colorChance > 0.85) {
        // Subtle cyan star
        starsColors[i * 3] = 0.5;
        starsColors[i * 3 + 1] = 0.9;
        starsColors[i * 3 + 2] = 1.0;
      } else if (colorChance > 0.75) {
        // Subtle warm star
        starsColors[i * 3] = 1.0;
        starsColors[i * 3 + 1] = 0.85;
        starsColors[i * 3 + 2] = 0.6;
      } else {
        // Pure off-white
        starsColors[i * 3] = 0.94;
        starsColors[i * 3 + 1] = 0.96;
        starsColors[i * 3 + 2] = 0.98;
      }
    }

    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // 10. Directional Solar Illumination & Ambient Space Fill
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(-6, 2.5, 5);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x0a1128, 0.22);
    scene.add(ambientLight);

    // 11. Damped Pointer Tracking & Camera Motion
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      if (reducedMotion) return;
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;

      // Clamped subtle rotation offsets to prevent Earth drifting out of frame
      targetRotY = normX * 0.22;
      targetRotX = -normY * 0.16;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 12. Responsive Resize Handling
    const handleResize = () => {
      if (!container || !renderer) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      updateGroupPosition(width);
    };

    window.addEventListener('resize', handleResize);

    // 13. Page Visibility Optimization (Pause rendering when tab is hidden)
    let isPageVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 14. Render Animation Loop
    const baseRotationSpeed = reducedMotion ? 0.0003 : 0.0012;
    const cloudRotationMultiplier = 1.18;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isPageVisible) return;

      // Continuous axial rotation (Earth west-to-east)
      earthMesh.rotation.y += baseRotationSpeed;
      cloudMesh.rotation.y += baseRotationSpeed * cloudRotationMultiplier;

      // Smooth pointer damping (LERP)
      if (!reducedMotion) {
        currentRotX += (targetRotX - currentRotX) * 0.04;
        currentRotY += (targetRotY - currentRotY) * 0.04;

        earthGroup.rotation.x = currentRotX;
        earthGroup.rotation.y = currentRotY;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 15. Disposal & Cleanup
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Three.js objects
      earthGeometry.dispose();
      cloudGeometry.dispose();
      atmosphereGeometry.dispose();
      orbitGeometry.dispose();
      starsGeometry.dispose();

      earthMaterial.dispose();
      cloudMaterial.dispose();
      atmosphereMaterial.dispose();
      orbitMaterial.dispose();
      starsMaterial.dispose();

      earthTexture.dispose();
      lightsTexture.dispose();
      cloudsTexture.dispose();

      renderer.dispose();
    };
  }, [reducedMotion, onLoaded]);

  return (
    <div
      ref={mountRef}
      className="astra-earth-canvas-root"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none', // Keeps foreground UI inputs completely clickable
      }}
      data-testid="earth-canvas-container"
    >
      {/* Designed Telemetry Preloader */}
      {!isLoaded && !hasError && (
        <div
          className="astra-preloader-overlay"
          style={{
            position: 'absolute',
            top: '50%',
            right: '18%',
            transform: 'translate(50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.08em',
            zIndex: 10,
          }}
          data-testid="earth-loading-indicator"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                backgroundColor: 'var(--color-cyan)',
                borderRadius: '50%',
                boxShadow: '0 0 10px var(--color-cyan)',
              }}
            />
            <span style={{ color: 'var(--color-text-primary)' }}>
              SYNTHESIZING OPTICAL SPHERE // {loadProgress}%
            </span>
          </div>
          <div
            style={{
              width: '180px',
              height: '2px',
              backgroundColor: 'var(--color-border-subtle)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${loadProgress}%`,
                height: '100%',
                backgroundColor: 'var(--color-cyan)',
                transition: 'width 200ms ease-out',
              }}
            />
          </div>
          <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
            DATASET: NASA BLUE MARBLE // 2048x1024
          </span>
        </div>
      )}

      {/* Graceful Fallback if WebGL Unsupported or Texture Error */}
      {hasError && (
        <div
          className="astra-static-fallback"
          style={{
            position: 'absolute',
            top: '50%',
            right: '12%',
            transform: 'translateY(-50%)',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #0A84FF 0%, #051C3D 55%, #08090C 90%)',
            boxShadow: '0 0 60px rgba(0, 229, 255, 0.12), inset -30px -30px 60px rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px',
            zIndex: 5,
          }}
          data-testid="earth-static-fallback"
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-advisory)',
              letterSpacing: '0.1em',
              marginBottom: '8px',
              border: '1px solid var(--color-advisory)',
              padding: '2px 8px',
              borderRadius: '2px',
            }}
          >
            TACTICAL STATIC DISPLAY MODE
          </div>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              maxWidth: '280px',
              lineHeight: 1.4,
            }}
          >
            Earth Sphere Synthesizer in 2D Precision Mode
          </p>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-text-secondary)',
              marginTop: '12px',
            }}
          >
            {errorMessage || 'Primary operational controls remain online.'}
          </span>
        </div>
      )}
    </div>
  );
};
