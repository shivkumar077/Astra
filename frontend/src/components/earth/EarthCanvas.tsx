import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface EarthCanvasProps {
  scrollProgress?: number; // Normalized scroll progress 0.0 (top) -> 1.0 (settled)
  reducedMotion?: boolean;
  onLoaded?: () => void;
}

export const EarthCanvas: React.FC<EarthCanvasProps> = ({
  scrollProgress = 0,
  reducedMotion = false,
  onLoaded,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Ref to hold dynamic scroll progress for the animation loop
  const scrollRef = useRef<number>(scrollProgress);
  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    // 1. Detect WebGL Availability
    const checkWebGL = (): boolean => {
      try {
        const testCanvas = document.createElement('canvas');
        return !!(
          window.WebGLRenderingContext &&
          (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl') || testCanvas.getContext('webgl2'))
        );
      } catch {
        return false;
      }
    };

    if (!checkWebGL()) {
      setHasError(true);
      setErrorMessage('WebGL hardware acceleration is unavailable.');
      onLoaded?.();
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    let animationFrameId: number;
    let isDisposed = false;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 2. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050608, 0.025);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 8.5);

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
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);
    } catch {
      setHasError(true);
      setErrorMessage('Failed to initialize WebGL context.');
      onLoaded?.();
      return;
    }

    // 3. Planetary Assembly
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Natural Earth Axial Tilt: 23.4 degrees
    earthGroup.rotation.z = THREE.MathUtils.degToRad(-23.4);

    // 4. Multi-Layer Starfield (Parallax Depths)
    const createStarLayer = (count: number, minRadius: number, maxRadius: number, size: number, opacity: number) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const r = minRadius + Math.random() * (maxRadius - minRadius);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Subdued astronomical stellar colors: 70% soft ivory, 20% pale blue-white, 10% warm amber
        const spectral = Math.random();
        if (spectral > 0.8) {
          colors[i * 3] = 0.75;
          colors[i * 3 + 1] = 0.88;
          colors[i * 3 + 2] = 1.0;
        } else if (spectral > 0.7) {
          colors[i * 3] = 1.0;
          colors[i * 3 + 1] = 0.92;
          colors[i * 3 + 2] = 0.75;
        } else {
          colors[i * 3] = 0.94;
          colors[i * 3 + 1] = 0.95;
          colors[i * 3 + 2] = 0.96;
        }
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size,
        vertexColors: true,
        transparent: true,
        opacity,
      });

      return new THREE.Points(geom, mat);
    };

    // Deep stars (slowest parallax)
    const deepStars = createStarLayer(700, 110, 150, 1.2, 0.75);
    scene.add(deepStars);

    // Midground stars (medium parallax)
    const midStars = createStarLayer(400, 70, 100, 1.6, 0.85);
    scene.add(midStars);

    // Foreground stars (closest parallax)
    const foreStars = createStarLayer(150, 40, 65, 2.0, 0.9);
    scene.add(foreStars);

    // 5. Textures Loading
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
      }
    );

    const textureLoader = new THREE.TextureLoader(loadingManager);

    const earthTexture = textureLoader.load('/assets/earth/earth_2048.jpg');
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const lightsTexture = textureLoader.load('/assets/earth/earth_lights_2048.jpg');
    lightsTexture.colorSpace = THREE.SRGBColorSpace;

    const cloudsTexture = textureLoader.load('/assets/earth/earth_clouds_2048.jpg');
    cloudsTexture.colorSpace = THREE.SRGBColorSpace;

    // 6. Earth Mesh & Realistic Shading
    const sphereRadius = 2.0;
    const earthGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);

    const sunDirection = new THREE.Vector3(-1.2, 0.5, 0.9).normalize();

    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.75,
      metalness: 0.05,
      emissiveMap: lightsTexture,
      emissive: new THREE.Color(0xffdf80),
      emissiveIntensity: 0.85,
    });

    // Modulate night lights so they emerge only on the dark side of Earth
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
        // Soft twilight transition into the night hemisphere
        float nightFactor = smoothstep(0.08, -0.22, sunAngle);
        totalEmissiveRadiance *= nightFactor * 1.5;
        `
      );
    };

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // 7. Cloud Layer (Delicate, Soft)
    const cloudGeometry = new THREE.SphereGeometry(sphereRadius + 0.022, 64, 64);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(cloudMesh);

    // 8. Delicate Atmospheric Rim (Soft Limb Scattering, No Thick Neon Outline)
    const atmosphereGeometry = new THREE.SphereGeometry(sphereRadius + 0.075, 64, 64);
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
          // Very sharp, delicate limb falloff (hugs the horizon tightly)
          float intensity = pow(fresnel, 4.2);

          // Atmospheric scattering is active only on the illuminated limb
          float sunCos = dot(vNormal, uSunDir);
          float dayMask = smoothstep(-0.15, 0.35, sunCos);

          // Delicate atmospheric color: soft azure (#3B82F6) to celestial cyan (#38BDF8)
          vec3 atmosColor = mix(vec3(0.12, 0.35, 0.85), vec3(0.22, 0.74, 0.97), fresnel);
          gl_FragColor = vec4(atmosColor, intensity * dayMask * 0.75);
        }
      `,
      uniforms: {
        uSunDir: { value: sunDirection },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphereMesh);

    // 9. Cinematic Signature Star Trajectory & Particle Trail
    // When scrolling from opening to settled view, the signature star arcs from the identity toward Earth
    const starTrailPointsCount = 60;
    const starTrailPositions = new Float32Array(starTrailPointsCount * 3);
    const starTrailAlphas = new Float32Array(starTrailPointsCount);

    const starTrailGeometry = new THREE.BufferGeometry();
    starTrailGeometry.setAttribute('position', new THREE.BufferAttribute(starTrailPositions, 3));
    starTrailGeometry.setAttribute('alpha', new THREE.BufferAttribute(starTrailAlphas, 1));

    const starTrailMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          gl_PointSize = 3.5 * alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float intensity = (0.5 - dist) * 2.0;
          gl_FragColor = vec4(0.95, 0.93, 0.9, intensity * vAlpha * 0.85);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starTrailMesh = new THREE.Points(starTrailGeometry, starTrailMaterial);
    scene.add(starTrailMesh);

    // Signature Star Core Spark
    const starCoreGeometry = new THREE.BufferGeometry();
    starCoreGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    const starCoreMaterial = new THREE.PointsMaterial({
      size: 8,
      color: 0xfff9e6,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const starCorePoint = new THREE.Points(starCoreGeometry, starCoreMaterial);
    scene.add(starCorePoint);

    // 10. Rare Occasional Meteor Streak
    const meteorGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-1.8, 1.2, 0),
    ]);
    const meteorMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const meteorLine = new THREE.Line(meteorGeometry, meteorMaterial);
    scene.add(meteorLine);

    let meteorActive = false;
    let meteorStartTime = 0;
    const meteorDuration = 1100; // ms
    let nextMeteorTime = performance.now() + 8000;

    // 11. Directional Sun & Ambient Lighting
    const sunLight = new THREE.DirectionalLight(0xfffdf6, 2.4);
    sunLight.position.copy(sunDirection).multiplyScalar(10);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x0c121e, 0.28);
    scene.add(ambientLight);

    // 12. Responsive Group Layout Calculations
    const getLayoutParameters = (w: number, t: number) => {
      // Opening frame (t = 0.0): Earth is distant, smaller, serene
      // Settled frame (t = 1.0): Earth is anchored on the right side in hero view
      if (w >= 1024) {
        // Desktop
        const startX = 0.45;
        const startY = -0.05;
        const startZ = -2.4;
        const startScale = 0.52;

        const endX = 1.68;
        const endY = 0.02;
        const endZ = 0.0;
        const endScale = 1.0;

        return {
          x: THREE.MathUtils.lerp(startX, endX, t),
          y: THREE.MathUtils.lerp(startY, endY, t),
          z: THREE.MathUtils.lerp(startZ, endZ, t),
          scale: THREE.MathUtils.lerp(startScale, endScale, t),
        };
      } else if (w >= 768) {
        // Tablet
        return {
          x: THREE.MathUtils.lerp(0.2, 0.85, t),
          y: THREE.MathUtils.lerp(-0.2, -0.15, t),
          z: THREE.MathUtils.lerp(-2.8, -0.4, t),
          scale: THREE.MathUtils.lerp(0.48, 0.88, t),
        };
      } else {
        // Mobile
        return {
          x: 0,
          y: THREE.MathUtils.lerp(-0.4, -0.65, t),
          z: THREE.MathUtils.lerp(-3.2, -1.1, t),
          scale: THREE.MathUtils.lerp(0.42, 0.74, t),
        };
      }
    };

    // 13. Damped Pointer Tracking
    let targetPointerX = 0;
    let targetPointerY = 0;
    let currentPointerX = 0;
    let currentPointerY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      if (reducedMotion) return;
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      targetPointerY = normX * 0.16;
      targetPointerX = -normY * 0.12;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 14. Responsive Resize
    const handleResize = () => {
      if (!container || !renderer) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize);

    // 15. Tab Visibility Handling
    let isPageVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 16. Animation Loop
    const baseRotationSpeed = reducedMotion ? 0.0003 : 0.001;
    const cloudRotationMultiplier = 1.15;

    // Signature star trajectory Bézier path (from wordmark coordinates toward Earth atmospheric horizon)
    const curveStart = new THREE.Vector3(-2.2, 1.4, 0);
    const curveControl = new THREE.Vector3(-0.4, 2.5, 0.5);
    const curveEnd = new THREE.Vector3(1.2, 0.35, 0.8);
    const starCurve = new THREE.QuadraticBezierCurve3(curveStart, curveControl, curveEnd);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isPageVisible) return;

      const now = performance.now();
      const currentScroll = reducedMotion ? 1.0 : scrollRef.current;

      // Update Group Position & Scale according to scroll progression
      const layout = getLayoutParameters(width, currentScroll);
      earthGroup.position.set(layout.x, layout.y, layout.z);
      earthGroup.scale.set(layout.scale, layout.scale, layout.scale);

      // Continuous axial rotation (Earth west-to-east)
      earthMesh.rotation.y += baseRotationSpeed;
      cloudMesh.rotation.y += baseRotationSpeed * cloudRotationMultiplier;

      // Pointer parallax damping
      if (!reducedMotion) {
        currentPointerX += (targetPointerX - currentPointerX) * 0.04;
        currentPointerY += (targetPointerY - currentPointerY) * 0.04;

        earthGroup.rotation.x = currentPointerX;
        earthGroup.rotation.y = currentPointerY;

        // Multi-depth Star Parallax
        deepStars.rotation.y = currentPointerY * 0.08;
        deepStars.rotation.x = currentPointerX * 0.06;

        midStars.rotation.y = currentPointerY * 0.2;
        midStars.rotation.x = currentPointerX * 0.15;

        foreStars.rotation.y = currentPointerY * 0.45;
        foreStars.rotation.x = currentPointerX * 0.35;
      }

      // Cinematic Signature Star Flight (Occurs between scroll 0.12 and 0.70)
      if (currentScroll > 0.08 && currentScroll < 0.75 && !reducedMotion) {
        // Map currentScroll [0.08, 0.70] -> [0, 1]
        const trajectoryProgress = Math.min(Math.max((currentScroll - 0.08) / 0.62, 0), 1);
        const starPos = starCurve.getPoint(trajectoryProgress);

        starCorePoint.visible = true;
        starCorePoint.position.copy(starPos);

        // Alpha fades as it enters the atmospheric edge of Earth
        const coreAlpha = trajectoryProgress < 0.85 ? 1.0 : 1.0 - (trajectoryProgress - 0.85) / 0.15;
        starCoreMaterial.opacity = coreAlpha;

        // Populate trailing particle points
        const posAttr = starTrailGeometry.getAttribute('position') as THREE.BufferAttribute;
        const alphaAttr = starTrailGeometry.getAttribute('alpha') as THREE.BufferAttribute;

        for (let i = 0; i < starTrailPointsCount; i++) {
          const lag = (i / starTrailPointsCount) * 0.18;
          const trailT = Math.max(trajectoryProgress - lag, 0);
          const p = starCurve.getPoint(trailT);

          posAttr.setXYZ(i, p.x + (Math.random() - 0.5) * 0.03, p.y + (Math.random() - 0.5) * 0.03, p.z);
          alphaAttr.setX(i, (1 - i / starTrailPointsCount) * coreAlpha);
        }
        posAttr.needsUpdate = true;
        alphaAttr.needsUpdate = true;
        starTrailMesh.visible = true;
      } else {
        starCorePoint.visible = false;
        starTrailMesh.visible = false;
      }

      // Rare Subtle Meteor Generator
      if (!meteorActive && now > nextMeteorTime && !reducedMotion) {
        meteorActive = true;
        meteorStartTime = now;
        nextMeteorTime = now + 16000 + Math.random() * 14000; // Next meteor in 16-30 seconds

        const meteorStartX = 1.0 + Math.random() * 4.0;
        const meteorStartY = 2.5 + Math.random() * 2.0;
        const meteorStartZ = -8.0;

        meteorLine.position.set(meteorStartX, meteorStartY, meteorStartZ);
      }

      if (meteorActive) {
        const elapsed = now - meteorStartTime;
        const mProgress = elapsed / meteorDuration;

        if (mProgress >= 1.0) {
          meteorActive = false;
          meteorMaterial.opacity = 0;
        } else {
          // Velocity translation across sky
          meteorLine.position.x -= 0.08;
          meteorLine.position.y -= 0.05;

          // Parabolic opacity envelope (quick fade in, smooth fade out)
          const mAlpha = Math.sin(mProgress * Math.PI) * 0.65;
          meteorMaterial.opacity = mAlpha;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 17. Cleanup & GPU Disposal
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      earthGeometry.dispose();
      cloudGeometry.dispose();
      atmosphereGeometry.dispose();
      starTrailGeometry.dispose();
      starCoreGeometry.dispose();
      meteorGeometry.dispose();
      deepStars.geometry.dispose();
      midStars.geometry.dispose();
      foreStars.geometry.dispose();

      earthMaterial.dispose();
      cloudMaterial.dispose();
      atmosphereMaterial.dispose();
      starTrailMaterial.dispose();
      starCoreMaterial.dispose();
      meteorMaterial.dispose();
      (deepStars.material as THREE.Material).dispose();
      (midStars.material as THREE.Material).dispose();
      (foreStars.material as THREE.Material).dispose();

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
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }}
      data-testid="earth-canvas-container"
    >
      {/* Designed Subtle Preloader */}
      {!isLoaded && !hasError && (
        <div
          className="astra-preloader-overlay"
          style={{
            position: 'absolute',
            top: '50%',
            right: '20%',
            transform: 'translate(50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.08em',
            zIndex: 10,
          }}
          data-testid="earth-loading-indicator"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: 'var(--color-earth-cyan)',
                borderRadius: '50%',
                boxShadow: '0 0 8px var(--color-earth-cyan)',
              }}
            />
            <span style={{ color: 'var(--color-text-display)' }}>
              SYNTHESIZING PLANETARY SPHERE // {loadProgress}%
            </span>
          </div>
          <div
            style={{
              width: '160px',
              height: '1px',
              backgroundColor: 'var(--color-border-subtle)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${loadProgress}%`,
                height: '100%',
                backgroundColor: 'var(--color-earth-cyan)',
                transition: 'width 200ms ease-out',
              }}
            />
          </div>
        </div>
      )}

      {/* Graceful Fallback if WebGL Unsupported */}
      {hasError && (
        <div
          className="astra-static-fallback"
          style={{
            position: 'absolute',
            top: '50%',
            right: '15%',
            transform: 'translateY(-50%)',
            width: '440px',
            height: '440px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #1E3A8A 0%, #0F172A 50%, #050608 90%)',
            boxShadow: '0 0 60px rgba(56, 189, 248, 0.08), inset -30px -30px 60px rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.15)',
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
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '2px 8px',
              borderRadius: '2px',
            }}
          >
            TACTICAL 2D DISPLAY MODE
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              color: 'var(--color-text-display)',
              maxWidth: '300px',
              lineHeight: 1.4,
            }}
          >
            Planetary Visualization in Restrained 2D Precision
          </p>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              marginTop: '12px',
            }}
          >
            {errorMessage || 'Primary operational interfaces remain online.'}
          </span>
        </div>
      )}
    </div>
  );
};
