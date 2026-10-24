import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getProceduralPlanetTexture, getProceduralRingTexture } from './PlanetTextureGenerator';

export interface PlanetVisualProps {
  destinationId: string;
  name: string;
  type: string;
  isExpanded?: boolean;
  reducedMotion?: boolean;
  scaleProgress?: number; // 0.0 (departed) -> 1.0 (centered & prominent)
  onToggleExpand?: () => void;
  onSelect?: () => void;
}

interface PlanetConfig {
  primaryColor: string;
  secondaryColor: string;
  atmosphereColor?: string;
  glowColor: string;
  radius: number;
  hasRings?: boolean;
  ringInner?: number;
  ringOuter?: number;
  ringTilt?: number;
  isStar?: boolean;
  roughness?: number;
  metalness?: number;
  axialTilt?: number;
  cameraDistance?: number;
}

const PLANET_CONFIGS: Record<string, PlanetConfig> = {
  sun: {
    primaryColor: '#F59E0B',
    secondaryColor: '#EA580C',
    atmosphereColor: '#FDE68A',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    radius: 1.55,
    isStar: true,
    cameraDistance: 5.6,
  },
  mercury: {
    primaryColor: '#8C827A',
    secondaryColor: '#524B46',
    glowColor: 'rgba(140, 130, 122, 0.15)',
    radius: 1.15,
    roughness: 0.95,
    metalness: 0.05,
    axialTilt: 0.03,
    cameraDistance: 4.8,
  },
  venus: {
    primaryColor: '#E3BB7B',
    secondaryColor: '#C49B58',
    atmosphereColor: '#EED9A4',
    glowColor: 'rgba(227, 187, 123, 0.25)',
    radius: 1.30,
    roughness: 0.45,
    metalness: 0.02,
    axialTilt: 177.3,
    cameraDistance: 5.2,
  },
  earth: {
    primaryColor: '#2563EB',
    secondaryColor: '#10B981',
    atmosphereColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.30)',
    radius: 1.35,
    roughness: 0.65,
    metalness: 0.05,
    axialTilt: 23.44,
    cameraDistance: 5.4,
  },
  mars: {
    primaryColor: '#C1440E',
    secondaryColor: '#E07A5F',
    atmosphereColor: '#F97316',
    glowColor: 'rgba(193, 68, 14, 0.25)',
    radius: 1.20,
    roughness: 0.85,
    metalness: 0.08,
    axialTilt: 25.19,
    cameraDistance: 5.0,
  },
  jupiter: {
    primaryColor: '#C99039',
    secondaryColor: '#E8D2B0',
    atmosphereColor: '#B45309',
    glowColor: 'rgba(201, 144, 57, 0.25)',
    radius: 1.50,
    roughness: 0.35,
    metalness: 0.02,
    axialTilt: 3.13,
    cameraDistance: 5.8,
  },
  saturn: {
    primaryColor: '#E2BF7D',
    secondaryColor: '#C5A059',
    atmosphereColor: '#FDE68A',
    glowColor: 'rgba(226, 191, 125, 0.25)',
    radius: 1.35,
    hasRings: true,
    ringInner: 1.35,
    ringOuter: 2.35,
    ringTilt: -26.73,
    roughness: 0.40,
    metalness: 0.02,
    axialTilt: 26.73,
    cameraDistance: 6.2,
  },
  uranus: {
    primaryColor: '#70D6FF',
    secondaryColor: '#38BDF8',
    atmosphereColor: '#BAE6FD',
    glowColor: 'rgba(112, 214, 255, 0.25)',
    radius: 1.30,
    hasRings: true,
    ringInner: 1.45,
    ringOuter: 1.85,
    ringTilt: 82.23,
    roughness: 0.25,
    metalness: 0.01,
    axialTilt: 97.77,
    cameraDistance: 5.4,
  },
  neptune: {
    primaryColor: '#1E40AF',
    secondaryColor: '#3B82F6',
    atmosphereColor: '#60A5FA',
    glowColor: 'rgba(30, 64, 175, 0.28)',
    radius: 1.30,
    roughness: 0.30,
    metalness: 0.02,
    axialTilt: 28.32,
    cameraDistance: 5.2,
  },
};

/**
 * GLSL Shaders for the Sun:
 * Turbulent multi-octave 3D simplex noise with dynamic time plasma convection,
 * solar convective granules, limb darkening, and radiant flare knots.
 */
const SunShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vec3 pos = normalize(vPosition);
      float t = uTime * 0.12;

      float n1 = snoise(pos * 2.8 + vec3(t * 0.4, t * 0.2, 0.0));
      float n2 = snoise(pos * 6.2 - vec3(0.0, t * 0.5, t * 0.3));
      float n3 = snoise(pos * 14.0 + vec3(t * 0.8, 0.0, t * 0.6));
      float plasma = n1 * 0.55 + n2 * 0.30 + n3 * 0.15;

      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      float mu = max(dot(vNormal, viewDir), 0.0);
      float limbDarkening = pow(max(mu, 0.0001), 0.42);

      vec3 deepCoronaAmber = vec3(0.82, 0.22, 0.03);
      vec3 solarOrange     = vec3(0.96, 0.48, 0.08);
      vec3 luminousGold    = vec3(0.98, 0.74, 0.18);
      vec3 stellarCore     = vec3(1.00, 0.96, 0.72);

      vec3 baseColor = mix(deepCoronaAmber, solarOrange, smoothstep(-0.6, 0.1, plasma));
      baseColor = mix(baseColor, luminousGold, smoothstep(0.1, 0.55, plasma));

      float flareKnot = smoothstep(0.48, 0.85, plasma);
      baseColor = mix(baseColor, stellarCore, flareKnot * 0.75);

      vec3 finalColor = baseColor * (0.35 + 0.65 * limbDarkening);
      float rim = max(0.0, 1.0 - mu);
      finalColor += vec3(0.95, 0.45, 0.08) * pow(rim, 2.8) * 0.8;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

/**
 * Atmospheric Coronal Glow Shell Shader
 */
const CoronalGlowShader = {
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uGlowColor;
    varying vec3 vNormal;
    void main() {
      // Clamp dot product to eliminate negative bases that produce GLSL NaN
      float d = max(0.0, 0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)));
      float intensity = pow(d, 2.6) * 0.65;
      gl_FragColor = vec4(uGlowColor * intensity, intensity);
    }
  `,
};

export const PlanetVisual: React.FC<PlanetVisualProps> = ({
  destinationId,
  name,
  type,
  isExpanded = false,
  reducedMotion = false,
  scaleProgress: _scaleProgress = 1.0,
  onToggleExpand,
  onSelect,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Keep callback refs stable to prevent unmounting/re-creating WebGL renderer
  const onToggleExpandRef = useRef(onToggleExpand);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onToggleExpandRef.current = onToggleExpand;
    onSelectRef.current = onSelect;
  });

  const normId = destinationId.toLowerCase();
  const config = PLANET_CONFIGS[normId] || PLANET_CONFIGS.earth;

  useEffect(() => {
    // 1. Safe WebGL Context Detection
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
    let isVisible = true;
    let observer: IntersectionObserver | null = null;

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 460;

    // 2. Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, config.cameraDistance || 5.4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        premultipliedAlpha: false,
      });
      renderer.setClearColor(0x000000, 0);
      // Clamp pixel ratio to 1.75 to prevent mobile GPU thermal throttling
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = config.isStar ? 1.25 : 1.05;

      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.outline = 'none';
      renderer.domElement.style.border = 'none';
      renderer.domElement.style.background = 'transparent';
      container.appendChild(renderer.domElement);
    } catch {
      setWebglAvailable(false);
      return;
    }

    // 3. Visibility Culling via IntersectionObserver (Pauses render loop when offscreen)
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            isVisible = entry.isIntersecting;
          }
        },
        { rootMargin: '100px' }
      );
      observer.observe(container);
    }

    // 4. Celestial Hierarchy Group
    const celestialGroup = new THREE.Group();
    scene.add(celestialGroup);

    if (config.axialTilt) {
      celestialGroup.rotation.z = THREE.MathUtils.degToRad(-config.axialTilt);
    }

    const sphereRadius = config.radius;
    // 48x48 segment sphere: smooth silhouette with 90% fewer vertices than heavy CAD models
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 48, 48);

    let sphereMesh: THREE.Mesh;
    let sunUniforms: { uTime: { value: number } } | null = null;
    let glowMesh: THREE.Mesh | null = null;
    let ringMesh: THREE.Mesh | null = null;

    if (config.isStar) {
      // SUN: Dynamic Solar Convective Plasma & Volumetric Corona
      sunUniforms = { uTime: { value: 0 } };
      const solarMaterial = new THREE.ShaderMaterial({
        uniforms: sunUniforms,
        vertexShader: SunShader.vertexShader,
        fragmentShader: SunShader.fragmentShader,
      });

      sphereMesh = new THREE.Mesh(sphereGeometry, solarMaterial);
      celestialGroup.add(sphereMesh);

      // Restrained coronal glow envelope
      const coronaGeo = new THREE.SphereGeometry(sphereRadius * 1.2, 36, 36);
      const coronaMat = new THREE.ShaderMaterial({
        uniforms: {
          uGlowColor: { value: new THREE.Color(0xf59e0b) },
        },
        vertexShader: CoronalGlowShader.vertexShader,
        fragmentShader: CoronalGlowShader.fragmentShader,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
      glowMesh = new THREE.Mesh(coronaGeo, coronaMat);
      celestialGroup.add(glowMesh);

      const sunLight = new THREE.PointLight(0xfff5b8, 2.5, 30);
      scene.add(sunLight);
    } else {
      // PLANETS (including Earth): High-Fidelity Scientific Procedural Textures (instant & offline)
      const planetTexture = getProceduralPlanetTexture(normId);

      const planetMaterial = new THREE.MeshStandardMaterial({
        map: planetTexture || undefined,
        color: planetTexture ? 0xffffff : new THREE.Color(config.primaryColor),
        roughness: config.roughness ?? 0.6,
        metalness: config.metalness ?? 0.05,
      });

      sphereMesh = new THREE.Mesh(sphereGeometry, planetMaterial);
      celestialGroup.add(sphereMesh);

      // Planetary Rings (Saturn & Uranus)
      if (config.hasRings && config.ringInner && config.ringOuter) {
        const ringGeo = new THREE.RingGeometry(
          sphereRadius * config.ringInner,
          sphereRadius * config.ringOuter,
          64
        );
        const ringTexture = getProceduralRingTexture(normId);

        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTexture || undefined,
          color: ringTexture ? 0xffffff : new THREE.Color(config.secondaryColor),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.88,
          roughness: 0.35,
        });

        ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        if (config.ringTilt) {
          celestialGroup.rotation.z = THREE.MathUtils.degToRad(config.ringTilt);
        }
        celestialGroup.add(ringMesh);
      }

      // Atmospheric Rim Glow (Natural limb scattering without whiteout)
      if (config.atmosphereColor) {
        const glowGeo = new THREE.SphereGeometry(sphereRadius * 1.08, 36, 36);
        const glowMat = new THREE.ShaderMaterial({
          uniforms: {
            uGlowColor: { value: new THREE.Color(config.atmosphereColor) },
          },
          vertexShader: CoronalGlowShader.vertexShader,
          fragmentShader: CoronalGlowShader.fragmentShader,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        });
        glowMesh = new THREE.Mesh(glowGeo, glowMat);
        celestialGroup.add(glowMesh);
      }

      const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
      sunLight.position.set(5, 3, 4);
      scene.add(sunLight);

      const ambientLight = new THREE.AmbientLight(0x0e131f, 0.4);
      scene.add(ambientLight);
    }

    // Harmless transition hooks for parent component compatibility
    (container as any).__setDisintegration = (_val: number) => {};
    (container as any).__triggerDisintegrationBurst = (onComplete?: () => void) => {
      onComplete?.();
    };

    // 5. Interactive Pointer Gestures (Drag-to-rotate vs Click-to-expand)
    let isPointerDown = false;
    let startX = 0;
    let startY = 0;
    let totalDragDist = 0;
    let velocityX = 0;
    let velocityY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      startX = e.clientX;
      startY = e.clientY;
      totalDragDist = 0;
      velocityX = 0;
      velocityY = 0;
      try {
        (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {}
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      totalDragDist += Math.hypot(dx, dy);
      startX = e.clientX;
      startY = e.clientY;

      celestialGroup.rotation.y += dx * 0.007;
      celestialGroup.rotation.x += dy * 0.005;

      velocityX = dx * 0.007;
      velocityY = dy * 0.005;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      try {
        (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {}

      // If drag was very small (< 6px), treat as an intentional click/tap
      if (totalDragDist < 6) {
        onToggleExpandRef.current?.();
        onSelectRef.current?.();
      }
    };

    const domElement = renderer.domElement;
    domElement.style.touchAction = 'none';
    domElement.style.cursor = 'grab';
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('pointercancel', handlePointerUp);

    // 6. Animation Loop (Guaranteed continuous rendering when in view, no disappearance)
    const rotationSpeed = reducedMotion ? 0.0006 : 0.0025;
    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed || !isVisible) return;

      const elapsedTime = clock.getElapsedTime();

      if (sunUniforms) {
        sunUniforms.uTime.value = elapsedTime;
      }

      // Keep model always prominent and scaled to 1.0 (never vanish or shrink to 0.001)
      sphereMesh.scale.set(1, 1, 1);
      if (glowMesh) {
        glowMesh.scale.set(1, 1, 1);
        glowMesh.visible = true;
      }
      if (ringMesh) ringMesh.visible = true;

      if (!isPointerDown) {
        if (Math.abs(velocityX) > 0.0001) {
          celestialGroup.rotation.y += velocityX;
          velocityX *= 0.93;
        } else {
          sphereMesh.rotation.y += rotationSpeed;
        }

        if (Math.abs(velocityY) > 0.0001) {
          celestialGroup.rotation.x += velocityY;
          velocityY *= 0.93;
        }
      }

      if (ringMesh) {
        ringMesh.rotation.z += rotationSpeed * 0.3;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    // 7. Visibility Culling via IntersectionObserver (Instant render on viewport entry)
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const wasVisible = isVisible;
            isVisible = entry.isIntersecting;
            if (isVisible && !isDisposed) {
              clock.start();
              renderer.render(scene, camera);
              if (!wasVisible) {
                animId = requestAnimationFrame(animate);
              }
            }
          }
        },
        { rootMargin: '100px' }
      );
      observer.observe(container);
    }

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const newWidth = container.clientWidth || 460;
      const newHeight = container.clientHeight || 460;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 8. Complete Resource Disposal on Unmount
    return () => {
      isDisposed = true;
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);

      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('pointercancel', handlePointerUp);

      sphereGeometry.dispose();
      if (sphereMesh && sphereMesh.material instanceof THREE.Material) {
        sphereMesh.material.dispose();
      }
      if (glowMesh) {
        glowMesh.geometry.dispose();
        if (glowMesh.material instanceof THREE.Material) {
          glowMesh.material.dispose();
        }
      }
      if (ringMesh) {
        ringMesh.geometry.dispose();
        if (ringMesh.material instanceof THREE.Material) {
          ringMesh.material.dispose();
        }
      }

      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [normId, reducedMotion]);

  return (
    <div
      ref={mountRef}
      className={`astra-planet-visual-root ${config.isStar ? 'sun-visual-root' : ''} ${isExpanded ? 'is-miniature' : ''}`.trim()}
      data-testid={isExpanded ? `planet-visual-mini-${normId}` : `planet-visual-${normId}`}
      role="button"
      tabIndex={0}
      aria-label={`Interactive 3D model of ${name} (${type}). Drag to rotate.${!isExpanded ? ' Click to explore mission dossier.' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleExpandRef.current?.();
          onSelectRef.current?.();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Interactive HUD Cue (Only displayed in large full-stage mode) */}
      {!isExpanded && (
        <div
          className={`astra-planet-hud-cue ${isHovered ? 'visible' : ''}`}
          aria-hidden="true"
        >
          <span className="astra-hud-pulse" />
          <span className="astra-hud-label">CLICK CELESTIAL BODY TO EXPLORE DOSSIER</span>
        </div>
      )}

      {/* Tactical 2D Fallback for JSDOM / WebGL disabled environments */}
      {!webglAvailable && (
        <div
          data-testid={`planet-fallback-${normId}`}
          className="astra-planet-2d-fallback"
          style={{
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: config.isStar
              ? 'radial-gradient(circle, #fffbeb 10%, #fbbf24 45%, #ea580c 75%, transparent 100%)'
              : `radial-gradient(circle at 35% 35%, ${config.secondaryColor} 0%, ${config.primaryColor} 65%, #050608 100%)`,
            boxShadow: `0 0 50px ${config.glowColor}`,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => {
            onToggleExpandRef.current?.();
            onSelectRef.current?.();
          }}
        >
          {config.hasRings && (
            <div
              style={{
                position: 'absolute',
                width: '380px',
                height: '16px',
                borderRadius: '50%',
                border: '3px solid rgba(226, 191, 125, 0.7)',
                transform: `rotate(${config.ringTilt || -25}deg)`,
                boxShadow: '0 0 16px rgba(226, 191, 125, 0.4)',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
