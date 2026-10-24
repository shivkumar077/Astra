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
    let cloudsMesh: THREE.Mesh | null = null;

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
    } else if (normId === 'earth') {
      // EARTH: NASA 2K Blue Marble, cloud deck & Rayleigh horizon
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load('/assets/earth/earth_2048.jpg');
      earthTexture.colorSpace = THREE.SRGBColorSpace;

      const earthMaterial = new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.65,
        metalness: 0.05,
      });

      sphereMesh = new THREE.Mesh(sphereGeometry, earthMaterial);
      celestialGroup.add(sphereMesh);

      // Cloud deck
      const cloudsTexture = textureLoader.load('/assets/earth/earth_clouds_2048.jpg');
      cloudsTexture.colorSpace = THREE.SRGBColorSpace;
      const cloudsGeo = new THREE.SphereGeometry(sphereRadius * 1.018, 48, 48);
      const cloudsMat = new THREE.MeshStandardMaterial({
        map: cloudsTexture,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
      });
      cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
      celestialGroup.add(cloudsMesh);

      // Soft Rayleigh horizon
      const earthGlowGeo = new THREE.SphereGeometry(sphereRadius * 1.12, 36, 36);
      const earthGlowMat = new THREE.ShaderMaterial({
        uniforms: {
          uGlowColor: { value: new THREE.Color(0x38bdf8) },
        },
        vertexShader: CoronalGlowShader.vertexShader,
        fragmentShader: CoronalGlowShader.fragmentShader,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
      glowMesh = new THREE.Mesh(earthGlowGeo, earthGlowMat);
      celestialGroup.add(glowMesh);

      const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
      sunLight.position.set(5, 3, 4);
      scene.add(sunLight);

      const ambientLight = new THREE.AmbientLight(0x0e131f, 0.45);
      scene.add(ambientLight);
    } else {
      // PLANETS: High-Fidelity Scientific Procedural Textures (Generated once, cached in memory)
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

      // Atmospheric Rim Glow (Restrained, natural limb scattering)
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

    // -------------------------------------------------------------------------
    // 4B. EXTRAVAGANT CELESTIAL DISINTEGRATION & STELLAR EMBER SYSTEM
    // (Core collapse, shockwave ring & 420 radial cosmic particles)
    // -------------------------------------------------------------------------
    const emberCount = 420;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberVelocities = new Float32Array(emberCount * 3);
    const emberSpeeds = new Float32Array(emberCount);
    const emberSizes = new Float32Array(emberCount);
    const emberSeeds = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = sphereRadius * (0.95 + Math.random() * 0.1);

      const sinPhi = Math.sin(phi);
      const x = r * sinPhi * Math.cos(theta);
      const y = r * sinPhi * Math.sin(theta);
      const z = r * Math.cos(phi);

      emberPositions[i * 3] = x;
      emberPositions[i * 3 + 1] = y;
      emberPositions[i * 3 + 2] = z;

      const normLen = Math.sqrt(x * x + y * y + z * z) || 1.0;
      const vx = x / normLen + (Math.random() - 0.5) * 0.45;
      const vy = y / normLen + (Math.random() - 0.5) * 0.45;
      const vz = z / normLen + (Math.random() - 0.5) * 0.45;
      const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1.0;

      emberVelocities[i * 3] = vx / vLen;
      emberVelocities[i * 3 + 1] = vy / vLen;
      emberVelocities[i * 3 + 2] = vz / vLen;

      emberSpeeds[i] = 3.2 + Math.random() * 4.6;
      emberSizes[i] = 0.8 + Math.random() * 1.5;
      emberSeeds[i] = Math.random();
    }

    const emberGeometry = new THREE.BufferGeometry();
    emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    emberGeometry.setAttribute('aVelocity', new THREE.BufferAttribute(emberVelocities, 3));
    emberGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(emberSpeeds, 1));
    emberGeometry.setAttribute('aSize', new THREE.BufferAttribute(emberSizes, 1));
    emberGeometry.setAttribute('aSeed', new THREE.BufferAttribute(emberSeeds, 1));

    const coreColor = config.isStar
      ? new THREE.Color(0xfffbeb)
      : new THREE.Color(config.atmosphereColor || config.secondaryColor);
    const outerColor = config.isStar
      ? new THREE.Color(0xea580c)
      : new THREE.Color(config.primaryColor);

    const disintegrationUniforms = {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uSize: { value: 26.0 * Math.min(window.devicePixelRatio || 1, 1.75) },
      uColorCore: { value: coreColor },
      uColorOuter: { value: outerColor },
    };

    const emberMaterial = new THREE.ShaderMaterial({
      uniforms: disintegrationUniforms,
      vertexShader: `
        uniform float uProgress;
        uniform float uTime;
        uniform float uSize;
        attribute vec3 aVelocity;
        attribute float aSpeed;
        attribute float aSize;
        attribute float aSeed;
        varying float vAlpha;
        varying float vLife;

        void main() {
          float t = pow(uProgress, 1.15) * aSpeed;
          vec3 turbulentOffset = vec3(
            sin(uTime * 3.5 + aSeed * 25.0),
            cos(uTime * 3.2 + aSeed * 30.0),
            sin(uTime * 2.8 + aSeed * 18.0)
          ) * (uProgress * 0.45);

          vec3 currentPos = position + aVelocity * t + turbulentOffset;
          float fade = clamp(1.0 - (uProgress - 0.22) / 0.78, 0.0, 1.0);
          float emergence = clamp(uProgress / 0.06, 0.0, 1.0);
          float flicker = 0.75 + 0.25 * sin(uTime * 14.0 + aSeed * 45.0);

          vAlpha = fade * emergence * flicker;
          vLife = uProgress;

          vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
          gl_PointSize = uSize * aSize * (1.0 - uProgress * 0.35) * (320.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorCore;
        uniform vec3 uColorOuter;
        varying float vAlpha;
        varying float vLife;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          float radial = smoothstep(0.5, 0.0, dist);
          vec3 col = mix(uColorCore, uColorOuter, clamp(dist * 1.4 + vLife * 0.7, 0.0, 1.0));
          gl_FragColor = vec4(col, radial * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const emberPoints = new THREE.Points(emberGeometry, emberMaterial);
    celestialGroup.add(emberPoints);

    // Shockwave Coronal Flare Ring
    const shockwaveGeo = new THREE.RingGeometry(sphereRadius * 0.75, sphereRadius * 1.25, 48);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: config.isStar ? 0xffb74d : new THREE.Color(config.primaryColor),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveMesh.visible = false;
    celestialGroup.add(shockwaveMesh);

    // Disintegration State Management (Driven via zero-overhead direct DOM calls)
    let currentDisintegration = 0.0;
    (container as any).__setDisintegration = (val: number) => {
      currentDisintegration = Math.max(0.0, Math.min(1.0, val));
    };

    let burstAnimId: number | null = null;
    (container as any).__triggerDisintegrationBurst = (onComplete?: () => void) => {
      if (burstAnimId) cancelAnimationFrame(burstAnimId);
      const startTime = performance.now();
      const duration = 380; // Instant 380ms cinematic poof

      const runBurst = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(1.0, elapsed / duration);
        currentDisintegration = p;
        if (p < 1.0) {
          burstAnimId = requestAnimationFrame(runBurst);
        } else {
          burstAnimId = null;
          onComplete?.();
        }
      };
      burstAnimId = requestAnimationFrame(runBurst);
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

    // 6. Animation Loop (Active only when visible in viewport - pauses completely when offscreen)
    const rotationSpeed = reducedMotion ? 0.0006 : 0.0025;
    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed || !isVisible) return;

      const elapsedTime = clock.getElapsedTime();

      if (sunUniforms) {
        sunUniforms.uTime.value = elapsedTime;
      }

      // Update Disintegration Particle System & Dynamic Core Collapse
      const dProg = currentDisintegration;
      disintegrationUniforms.uProgress.value = dProg;
      disintegrationUniforms.uTime.value = elapsedTime;

      if (dProg > 0.001) {
        // "I want Sun to keep getting smaller and smaller and like poof, like disintegrate like that"
        const coreScale = dProg < 0.6 ? Math.max(0.001, Math.pow(1.0 - dProg * 1.65, 2.0)) : 0.001;
        sphereMesh.scale.set(coreScale, coreScale, coreScale);

        if (glowMesh) {
          const glowScale = dProg < 0.4 ? 1.0 + dProg * 1.2 : Math.max(0.001, (1.0 - dProg) * 2.2);
          glowMesh.scale.set(glowScale, glowScale, glowScale);
          glowMesh.visible = dProg < 0.75;
        }

        if (shockwaveMesh) {
          if (dProg > 0.06 && dProg < 0.9) {
            const s = 0.8 + (dProg - 0.06) * 4.2;
            shockwaveMesh.scale.set(s, s, s);
            shockwaveMat.opacity = Math.sin((dProg - 0.06) / 0.84 * Math.PI) * 0.85;
            shockwaveMesh.visible = true;
          } else {
            shockwaveMesh.visible = false;
          }
        }

        if (cloudsMesh) cloudsMesh.visible = dProg < 0.5;
        if (ringMesh) ringMesh.visible = dProg < 0.55;
      } else {
        sphereMesh.scale.set(1, 1, 1);
        if (glowMesh) {
          glowMesh.scale.set(1, 1, 1);
          glowMesh.visible = true;
        }
        if (shockwaveMesh) shockwaveMesh.visible = false;
        if (cloudsMesh) cloudsMesh.visible = true;
        if (ringMesh) ringMesh.visible = true;
      }

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

      if (cloudsMesh) {
        cloudsMesh.rotation.y += rotationSpeed * 1.25;
      }

      if (ringMesh) {
        ringMesh.rotation.z += rotationSpeed * 0.3;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    // 7. Visibility Culling via IntersectionObserver (Zero idle RAF loop)
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const wasVisible = isVisible;
            isVisible = entry.isIntersecting;
            if (!wasVisible && isVisible && !isDisposed) {
              clock.start();
              animId = requestAnimationFrame(animate);
            }
          }
        },
        { rootMargin: '60px' }
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
      if (burstAnimId) cancelAnimationFrame(burstAnimId);
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
      if (cloudsMesh) {
        cloudsMesh.geometry.dispose();
        if (cloudsMesh.material instanceof THREE.Material) {
          cloudsMesh.material.dispose();
        }
      }

      emberGeometry.dispose();
      emberMaterial.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();

      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [normId, reducedMotion]);

  return (
    <div
      ref={mountRef}
      className={`astra-planet-visual-root ${config.isStar ? 'sun-visual-root' : ''}`.trim()}
      data-testid={`planet-visual-${normId}`}
      role="button"
      tabIndex={0}
      aria-label={`Interactive 3D model of ${name} (${type}). Drag to rotate. Click to explore mission dossier.`}
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
      {/* Interactive HUD Cue */}
      <div
        className={`astra-planet-hud-cue ${isHovered ? 'visible' : ''}`}
        aria-hidden="true"
      >
        <span className="astra-hud-pulse" />
        <span className="astra-hud-label">CLICK CELESTIAL BODY TO EXPLORE DOSSIER</span>
      </div>

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
