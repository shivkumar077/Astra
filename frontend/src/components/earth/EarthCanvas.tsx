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

  // Ref to hold dynamic scroll progress for the 60fps render loop
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

    // 2. Scene, Camera & High-Precision Renderer
    const scene = new THREE.Scene();
    // NOTE: Removed scene.fog completely to eliminate pale rectangular boundary artifacts on transparent canvas

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 8.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      // Explicitly set clear color to true black with zero alpha for perfect DOM layering
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
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

    // 4. Real Celestial Point Starfield (4 Tiers, No Square Quads, Gaussian Optical Airy-Disc Profile)
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2.0) },
        uTime: { value: 0.0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aSize * (175.0 / -mvPosition.z) * uPixelRatio, 1.0, 36.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          if (r > 0.5) discard;
          // Gaussian-like optical stellar profile: intense central pinprick with delicate halo
          float core = exp(-r * r * 30.0);
          float halo = exp(-r * 6.0) * 0.32;
          float intensity = core + halo;
          gl_FragColor = vec4(vColor, intensity * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Optical Scintillation Shader for Prominent Celestial Navigational Stars
    const majorStarMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2.0) },
        uTime: { value: 0.0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vPhase;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vPhase = aPhase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aSize * (210.0 / -mvPosition.z) * uPixelRatio, 2.0, 48.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vPhase;
        uniform float uTime;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float r = length(coord);
          if (r > 0.5) discard;

          // Cross-diffraction spikes (astronomical telescope spider vane optics)
          float crossGlow = max(
            exp(-abs(coord.x) * 38.0) * exp(-abs(coord.y) * 4.0),
            exp(-abs(coord.y) * 38.0) * exp(-abs(coord.x) * 4.0)
          );
          float coreDisc = exp(-r * r * 32.0);

          // Subtle organic scintillation breathing
          float twinkle = 0.85 + 0.15 * sin(uTime * 2.2 + vPhase);
          float intensity = (coreDisc * 0.95 + crossGlow * 0.55) * twinkle;

          gl_FragColor = vec4(vColor, intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const createStarLayer = (
      count: number,
      minRadius: number,
      maxRadius: number,
      minSize: number,
      maxSize: number,
      minAlpha: number,
      maxAlpha: number,
      excludeCorridor: boolean = false
    ) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const alphas = new Float32Array(count);

      let placed = 0;
      let attempts = 0;
      while (placed < count && attempts < count * 3) {
        attempts++;
        const r = minRadius + Math.random() * (maxRadius - minRadius);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        // Preserve negative space around central-left typography corridor
        if (excludeCorridor && x > -2.8 && x < 0.2 && y > 0.2 && y < 2.0 && z > -15) {
          continue;
        }

        positions[placed * 3] = x;
        positions[placed * 3 + 1] = y;
        positions[placed * 3 + 2] = z;

        // Astronomical spectral distribution:
        // 70% soft star ivory, 18% pale blue-white, 12% warm stellar amber
        const spectral = Math.random();
        if (spectral > 0.82) {
          colors[placed * 3] = 0.80;
          colors[placed * 3 + 1] = 0.90;
          colors[placed * 3 + 2] = 1.0; // Cool Blue-White (B/A class)
        } else if (spectral > 0.70) {
          colors[placed * 3] = 1.0;
          colors[placed * 3 + 1] = 0.92;
          colors[placed * 3 + 2] = 0.74; // Warm Amber (K/M class)
        } else {
          colors[placed * 3] = 0.96;
          colors[placed * 3 + 1] = 0.96;
          colors[placed * 3 + 2] = 0.97; // Neutral Ivory (G class)
        }

        sizes[placed] = minSize + Math.random() * (maxSize - minSize);
        alphas[placed] = minAlpha + Math.random() * (maxAlpha - minAlpha);
        placed++;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, placed * 3), 3));
      geom.setAttribute('aColor', new THREE.BufferAttribute(colors.subarray(0, placed * 3), 3));
      geom.setAttribute('aSize', new THREE.BufferAttribute(sizes.subarray(0, placed), 1));
      geom.setAttribute('aAlpha', new THREE.BufferAttribute(alphas.subarray(0, placed), 1));

      return new THREE.Points(geom, starMaterial);
    };

    // Tier 1: Distant Cosmic Deep Field (1400 ultra-fine stars, minimal drift)
    const deepStars = createStarLayer(1400, 180, 320, 0.6, 1.2, 0.22, 0.50, false);
    scene.add(deepStars);

    // Tier 2: Midfield Stellar Field (850 crisp stars, medium parallax)
    const midStars = createStarLayer(850, 90, 175, 1.3, 2.2, 0.45, 0.78, true);
    scene.add(midStars);

    // Tier 3: Foreground Orbital Field (350 distinct stars, strong parallax)
    const foreStars = createStarLayer(350, 45, 88, 2.2, 3.6, 0.70, 0.95, true);
    scene.add(foreStars);

    // Tier 4: Major Optical Navigational Beacons (42 prominent stars with diffraction spikes)
    const majorStarCount = 42;
    const majorPositions = new Float32Array(majorStarCount * 3);
    const majorColors = new Float32Array(majorStarCount * 3);
    const majorSizes = new Float32Array(majorStarCount);
    const majorPhases = new Float32Array(majorStarCount);

    for (let i = 0; i < majorStarCount; i++) {
      const r = 30 + Math.random() * 55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      majorPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      majorPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      majorPositions[i * 3 + 2] = r * Math.cos(phi);

      majorColors[i * 3] = 0.98;
      majorColors[i * 3 + 1] = 0.96;
      majorColors[i * 3 + 2] = 0.90;

      majorSizes[i] = 4.2 + Math.random() * 2.8;
      majorPhases[i] = Math.random() * Math.PI * 2;
    }

    const majorGeom = new THREE.BufferGeometry();
    majorGeom.setAttribute('position', new THREE.BufferAttribute(majorPositions, 3));
    majorGeom.setAttribute('aColor', new THREE.BufferAttribute(majorColors, 3));
    majorGeom.setAttribute('aSize', new THREE.BufferAttribute(majorSizes, 1));
    majorGeom.setAttribute('aPhase', new THREE.BufferAttribute(majorPhases, 1));

    const majorStarsMesh = new THREE.Points(majorGeom, majorStarMaterial);
    scene.add(majorStarsMesh);

    // 5. Texture Pipeline with Anisotropic Filtering
    const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);

    const loadingManager = new THREE.LoadingManager(
      () => {
        setIsLoaded(true);
        onLoaded?.();
      },
      (_item, loaded, total) => {
        setLoadProgress(Math.round((loaded / total) * 100));
      },
      () => {
        setHasError(true);
        setErrorMessage('Failed to load planetary assets. Running in tactical fallback mode.');
        onLoaded?.();
      }
    );

    const textureLoader = new THREE.TextureLoader(loadingManager);

    const earthTexture = textureLoader.load('/assets/earth/earth_2048.jpg');
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = maxAnisotropy;
    earthTexture.generateMipmaps = true;
    earthTexture.minFilter = THREE.LinearMipmapLinearFilter;
    earthTexture.magFilter = THREE.LinearFilter;

    const lightsTexture = textureLoader.load('/assets/earth/earth_lights_2048.jpg');
    lightsTexture.colorSpace = THREE.SRGBColorSpace;
    lightsTexture.anisotropy = maxAnisotropy;
    lightsTexture.generateMipmaps = true;
    lightsTexture.minFilter = THREE.LinearMipmapLinearFilter;
    lightsTexture.magFilter = THREE.LinearFilter;

    const cloudsTexture = textureLoader.load('/assets/earth/earth_clouds_2048.jpg');
    cloudsTexture.colorSpace = THREE.SRGBColorSpace;
    cloudsTexture.anisotropy = maxAnisotropy;
    cloudsTexture.generateMipmaps = true;
    cloudsTexture.minFilter = THREE.LinearMipmapLinearFilter;
    cloudsTexture.magFilter = THREE.LinearFilter;

    // 6. Earth Mesh & Realistic Shading (High Tessellation: 96x96 Segments)
    const sphereRadius = 2.0;
    const earthGeometry = new THREE.SphereGeometry(sphereRadius, 96, 96);
    const sunDirection = new THREE.Vector3(-1.2, 0.45, 0.85).normalize();

    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.68,
      metalness: 0.05,
      emissiveMap: lightsTexture,
      emissive: new THREE.Color(0xffe29a),
      emissiveIntensity: 0.85,
    });

    // Modulate night lights and add physical Rayleigh daylight scattering directly on the globe
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
        // Realistic twilight falloff into nocturnal hemisphere: city lights glow only in darkness
        float nightFactor = smoothstep(0.04, -0.18, sunAngle);
        totalEmissiveRadiance *= nightFactor * 1.5;
        `
      );
      // Soft natural Rayleigh atmospheric scattering on daylight limb
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        vec3 viewD = normalize(vViewPosition);
        float limbFresnel = 1.0 - max(dot(normalize(vNormal), -viewD), 0.0);
        float sunLit = smoothstep(-0.08, 0.25, dot(normalize(vNormal), uSunDir));
        // Soft atmospheric blue haze on the illuminated horizon (no cyan outlines)
        vec3 rayleighBlue = vec3(0.16, 0.36, 0.68);
        gl_FragColor.rgb += rayleighBlue * pow(limbFresnel, 4.2) * sunLit * 0.45;
        `
      );
    };

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // 7. Atmospheric Cloud Layer (Decoupled Rotation & Diffuse Realism)
    const cloudGeometry = new THREE.SphereGeometry(sphereRadius + 0.018, 96, 96);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.32,
      blending: THREE.NormalBlending,
      roughness: 0.9,
      metalness: 0.0,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(cloudMesh);

    // 8. Thin, Delicate Atmospheric Limb (Natural Rayleigh Scattering, Zero Thick Cyan Strip)
    const atmosphereGeometry = new THREE.SphereGeometry(sphereRadius + 0.014, 96, 96);
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
          // Very tight limb falloff hugging planetary curvature
          float intensity = pow(fresnel, 5.5);

          // Atmospheric scattering active strictly on the illuminated limb
          float sunCos = dot(vNormal, uSunDir);
          float dayMask = smoothstep(-0.08, 0.25, sunCos);

          // Natural Rayleigh atmospheric blue (rich sapphire to soft sky azure)
          vec3 atmosColor = mix(vec3(0.12, 0.28, 0.65), vec3(0.22, 0.52, 0.88), fresnel);
          gl_FragColor = vec4(atmosColor, intensity * dayMask * 0.65);
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

    // 9. Rebuilt Meteor System: Incandescent Diamond Core & Emerging Diagonal Path
    // Trajectory spans from Upper-Left (-7.0, 4.8) through behind Earth to Lower-Right (7.0, -4.8)
    // Passing BEHIND Earth: situated at z = -3.2 with depthTest: true so it is occluded by Earth
    // and VISIBLY EMERGES on the opposite (lower-right) side before fading.
    const meteorGeometry = new THREE.PlaneGeometry(0.26, 4.8, 1, 24);
    const meteorMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          // vUv.y: 0.0 = tail tip, 1.0 = incandescent leading head
          // vUv.x: 0.0 = left edge, 0.5 = centerline, 1.0 = right edge
          float u = vUv.y;
          float lateral = abs(vUv.x - 0.5) * 2.0;

          // Aerodynamic envelope tapering smoothly toward tail tip
          float widthTaper = pow(u, 0.72);
          float lateralFalloff = exp(-pow(lateral / max(widthTaper, 0.04), 2.0) * 4.2);

          // Longitudinal trail radiance with fine ablation frequency
          float ablation = 1.0 + 0.14 * sin(u * 44.0);
          float trail = pow(u, 1.9) * ablation;

          // Blazing diamond head core
          float headDist = length(vec2((u - 0.96) * 7.5, lateral * 3.8));
          float headGlow = exp(-headDist * 4.8);

          // Spectral coloration: incandescent white diamond head + ionized azure-cyan trail
          vec3 headColor = vec3(1.0, 0.99, 0.96);
          vec3 ionColor = vec3(0.28, 0.65, 0.96);
          vec3 tailColor = vec3(0.12, 0.22, 0.60);

          vec3 color = mix(tailColor, ionColor, smoothstep(0.12, 0.82, u));
          color = mix(color, headColor, headGlow * 1.5 + step(0.96, u) * 0.4);

          float alpha = (trail * lateralFalloff * 0.85 + headGlow * 1.1) * uOpacity;
          if (alpha < 0.002) discard;
          gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: true, // Hardware depth buffer occludes meteor behind Earth
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const meteorPoolSize = 3;
    const meteorPool: {
      mesh: THREE.Mesh;
      material: THREE.ShaderMaterial;
      active: boolean;
      startTime: number;
      duration: number;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }[] = [];

    for (let i = 0; i < meteorPoolSize; i++) {
      const mat = meteorMaterial.clone();
      const mesh = new THREE.Mesh(meteorGeometry, mat);
      mesh.visible = false;
      scene.add(mesh);
      meteorPool.push({
        mesh,
        material: mat,
        active: false,
        startTime: 0,
        duration: 2500,
        startX: -7.0,
        startY: 4.8,
        endX: 7.0,
        endY: -4.8,
      });
    }

    // 10. Signature Star Trajectory: Dynamically Anchored to the Final 'A' Apex of Wordmark
    const starTrailPointsCount = 50;
    const starTrailPositions = new Float32Array(starTrailPointsCount * 3);
    const starTrailAlphas = new Float32Array(starTrailPointsCount);
    const starTrailSizes = new Float32Array(starTrailPointsCount);

    const starTrailGeometry = new THREE.BufferGeometry();
    starTrailGeometry.setAttribute('position', new THREE.BufferAttribute(starTrailPositions, 3));
    starTrailGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(starTrailAlphas, 1));
    starTrailGeometry.setAttribute('aSize', new THREE.BufferAttribute(starTrailSizes, 1));

    const starTrailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2.0) },
      },
      vertexShader: `
        attribute float aAlpha;
        attribute float aSize;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vAlpha = aAlpha;
          gl_PointSize = aSize * uPixelRatio;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          if (r > 0.5) discard;
          float intensity = exp(-r * r * 22.0);
          gl_FragColor = vec4(1.0, 0.96, 0.86, intensity * vAlpha * 0.95);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starTrailMesh = new THREE.Points(starTrailGeometry, starTrailMaterial);
    starTrailMesh.visible = false;
    scene.add(starTrailMesh);

    // Radiant Signature Star Core Spark (Circular Airy Disc, No Square Quads)
    const starSparkGeometry = new THREE.BufferGeometry();
    starSparkGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    const starSparkMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uAlpha: { value: 0.0 },
      },
      vertexShader: `
        void main() {
          gl_PointSize = 26.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uAlpha;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float r = length(coord);
          if (r > 0.5) discard;

          // Cross sparkle rays (+ shape)
          float crossGlow = max(
            exp(-abs(coord.x) * 45.0) * exp(-abs(coord.y) * 4.0),
            exp(-abs(coord.y) * 45.0) * exp(-abs(coord.x) * 4.0)
          );
          float coreDisc = exp(-r * r * 35.0);

          float intensity = coreDisc * 0.9 + crossGlow * 0.6;
          gl_FragColor = vec4(1.0, 0.97, 0.88, intensity * uAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starSparkPoint = new THREE.Points(starSparkGeometry, starSparkMaterial);
    starSparkPoint.visible = false;
    scene.add(starSparkPoint);

    // Dynamic unprojected Bézier path originating from the rendered wordmark's final 'A'
    const getSignatureStarOrigin = (): THREE.Vector3 => {
      const starEl = typeof document !== 'undefined' ? document.getElementById('astra-signature-star') : null;
      if (starEl && camera) {
        const rect = starEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const ndcX = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
          const ndcY = -(((rect.top + rect.height / 2) / window.innerHeight) * 2 - 1);

          const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
          vec.unproject(camera);
          const dir = vec.sub(camera.position).normalize();
          const dist = -camera.position.z / dir.z;
          return camera.position.clone().add(dir.multiplyScalar(dist));
        }
      }
      return new THREE.Vector3(width >= 1024 ? 0.35 : 0.0, width >= 1024 ? 1.05 : 1.4, 0);
    };

    // 11. Directional Sun & Ambient Lighting
    const sunLight = new THREE.DirectionalLight(0xfffdf6, 2.6);
    sunLight.position.copy(sunDirection).multiplyScalar(10);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x0c121e, 0.3);
    scene.add(ambientLight);

    // 12. Responsive Group Layout Calculations
    // Mobile: Earth anchored in the lower 35% of the viewport (Y: -1.65 -> -1.35)
    // Desktop: Earth anchored in the right hemisphere (X: 1.35 -> 1.68)
    const getLayoutParameters = (w: number, t: number) => {
      if (w >= 1024) {
        // Desktop
        const startX = 1.35;
        const startY = -0.06;
        const startZ = -1.6;
        const startScale = 0.65;

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
          x: THREE.MathUtils.lerp(0.95, 1.15, t),
          y: THREE.MathUtils.lerp(-0.15, -0.10, t),
          z: THREE.MathUtils.lerp(-2.0, -0.3, t),
          scale: THREE.MathUtils.lerp(0.55, 0.85, t),
        };
      } else {
        // Mobile (320px - 767px): framed strictly below the wordmark
        return {
          x: 0,
          y: THREE.MathUtils.lerp(-1.65, -1.35, t),
          z: THREE.MathUtils.lerp(-2.2, -0.8, t),
          scale: THREE.MathUtils.lerp(0.52, 0.76, t),
        };
      }
    };

    // 13. Damped Pointer Tracking for Parallax
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      starMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2.0);
      majorStarMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2.0);
    };
    window.addEventListener('resize', handleResize);

    // 15. Tab Visibility Handling (Zero GPU Waste When Tab Inactive)
    let isPageVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 16. Meteor State Tracking (Upper-Left to Lower-Right, Visibly Emerging Past Earth)
    const mountTime = performance.now();
    let openingMeteorTriggered = false;
    let nextMeteorTime = mountTime + 750;
    const meteorZ = -3.2; // Situated strictly behind Earth (Earth is at z: -1.6 to 0.0)

    const spawnMeteor = (now: number, duration: number, sx: number, sy: number, ex: number, ey: number) => {
      const slot = meteorPool.find((m) => !m.active);
      if (!slot) return;
      slot.active = true;
      slot.startTime = now;
      slot.duration = duration;
      slot.startX = sx;
      slot.startY = sy;
      slot.endX = ex;
      slot.endY = ey;
      // Leading head points down-right in direction of travel, tail streams up-left
      const angleRad = Math.atan2(ey - sy, ex - sx) - Math.PI / 2;
      slot.mesh.rotation.z = angleRad;
      slot.mesh.visible = true;
      slot.material.uniforms.uOpacity.value = 0;
    };

    // 17. Animation Loop
    const baseRotationSpeed = reducedMotion ? 0.0003 : 0.001;
    const cloudRotationMultiplier = 1.15;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isPageVisible || isDisposed) return;

      const now = performance.now();
      const currentScroll = reducedMotion ? 1.0 : scrollRef.current;

      // Update shader uniforms
      starMaterial.uniforms.uTime.value = now * 0.001;
      majorStarMaterial.uniforms.uTime.value = now * 0.001;

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

        // Multi-tier Star Parallax
        deepStars.rotation.y = currentPointerY * 0.06;
        deepStars.rotation.x = currentPointerX * 0.04;

        midStars.rotation.y = currentPointerY * 0.18;
        midStars.rotation.x = currentPointerX * 0.12;

        foreStars.rotation.y = currentPointerY * 0.42;
        foreStars.rotation.x = currentPointerX * 0.30;

        majorStarsMesh.rotation.y = currentPointerY * 0.32;
        majorStarsMesh.rotation.x = currentPointerX * 0.22;
      }

      // Opening Frame Signature Meteor Event (Triggers at ~750ms after load)
      // Path: Upper-Left (-7.0, 4.8) -> traverses behind Earth -> emerges Lower-Right (7.0, -4.8)
      if (!openingMeteorTriggered && now - mountTime > 750 && !reducedMotion) {
        openingMeteorTriggered = true;
        spawnMeteor(now, 2600, -7.0, 4.8, 7.0, -4.8);
        nextMeteorTime = now + 3000 + Math.random() * 1000;
      }

      // Ambient Recurring Meteor System (Initiated every 3 to 4 seconds while scene is active)
      if (openingMeteorTriggered && now > nextMeteorTime && !reducedMotion) {
        nextMeteorTime = now + 3000 + Math.random() * 1000; // 3.0 to 4.0 second randomized interval
        const sx = -7.2 + Math.random() * 0.9;
        const sy = 4.4 + Math.random() * 0.8;
        const ex = 6.6 + Math.random() * 0.9;
        const ey = -4.4 - Math.random() * 0.8;
        const dur = 2300 + Math.random() * 500;
        spawnMeteor(now, dur, sx, sy, ex, ey);
      }

      // Animate Active Meteors in Pool (Enters upper-left, crosses behind Earth, visibly emerges lower-right)
      for (let i = 0; i < meteorPoolSize; i++) {
        const m = meteorPool[i];
        if (m.active) {
          const elapsed = now - m.startTime;
          const mProgress = elapsed / m.duration;

          if (mProgress >= 1.0) {
            m.active = false;
            m.mesh.visible = false;
            m.material.uniforms.uOpacity.value = 0;
          } else {
            m.mesh.visible = true;

            const curX = THREE.MathUtils.lerp(m.startX, m.endX, mProgress);
            const curY = THREE.MathUtils.lerp(m.startY, m.endY, mProgress);
            m.mesh.position.set(curX, curY, meteorZ);

            // Sustained brilliance envelope: plateau at 1.0 so emergence on lower-right side is clearly visible
            let mAlpha = 1.0;
            if (mProgress < 0.10) {
              mAlpha = mProgress / 0.10;
            } else if (mProgress > 0.88) {
              mAlpha = (1.0 - mProgress) / 0.12;
            }
            m.material.uniforms.uOpacity.value = Math.pow(mAlpha, 1.1) * 0.95;
          }
        }
      }

      // Phase D — Cinematic Large Star Journey: Seamlessly continues from particle convergence point at t=0.35 towards Earth
      if (currentScroll > 0.35 && currentScroll < 0.80 && !reducedMotion) {
        const trajectoryProgress = Math.min(Math.max((currentScroll - 0.35) / 0.43, 0), 1);

        // Dynamically compute Bézier curve starting at the wordmark's final 'A' apex
        const pStart = getSignatureStarOrigin();
        const pEnd = new THREE.Vector3(
          layout.x - 1.15 * layout.scale,
          layout.y + 0.15 * layout.scale,
          0.5
        );
        const pControl = new THREE.Vector3(
          (pStart.x + pEnd.x) * 0.5,
          Math.max(pStart.y, pEnd.y) + 0.75,
          0.4
        );
        const activeStarCurve = new THREE.QuadraticBezierCurve3(pStart, pControl, pEnd);

        const starPos = activeStarCurve.getPoint(trajectoryProgress);
        starSparkPoint.visible = true;
        starSparkPoint.position.copy(starPos);

        // Alpha fades smoothly as it enters Earth's atmospheric horizon
        const coreAlpha = trajectoryProgress < 0.84 ? 1.0 : 1.0 - (trajectoryProgress - 0.84) / 0.16;
        starSparkMaterial.uniforms.uAlpha.value = coreAlpha;

        // Trailing luminous starlight points
        const posAttr = starTrailGeometry.getAttribute('position') as THREE.BufferAttribute;
        const alphaAttr = starTrailGeometry.getAttribute('aAlpha') as THREE.BufferAttribute;
        const sizeAttr = starTrailGeometry.getAttribute('aSize') as THREE.BufferAttribute;

        for (let i = 0; i < starTrailPointsCount; i++) {
          const lag = (i / starTrailPointsCount) * 0.15;
          const trailT = Math.max(trajectoryProgress - lag, 0);
          const p = activeStarCurve.getPoint(trailT);

          posAttr.setXYZ(i, p.x + (Math.random() - 0.5) * 0.02, p.y + (Math.random() - 0.5) * 0.02, p.z);
          alphaAttr.setX(i, (1 - i / starTrailPointsCount) * coreAlpha);
          sizeAttr.setX(i, 4.5 * (1 - i / starTrailPointsCount));
        }
        posAttr.needsUpdate = true;
        alphaAttr.needsUpdate = true;
        sizeAttr.needsUpdate = true;
        starTrailMesh.visible = true;
      } else {
        starSparkPoint.visible = false;
        starTrailMesh.visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 18. Cleanup & Complete GPU Resource Disposal
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Geometries
      earthGeometry.dispose();
      cloudGeometry.dispose();
      atmosphereGeometry.dispose();
      meteorGeometry.dispose();
      starTrailGeometry.dispose();
      starSparkGeometry.dispose();
      deepStars.geometry.dispose();
      midStars.geometry.dispose();
      foreStars.geometry.dispose();
      majorGeom.dispose();

      // Dispose Materials
      earthMaterial.dispose();
      cloudMaterial.dispose();
      atmosphereMaterial.dispose();
      meteorMaterial.dispose();
      meteorPool.forEach((m) => m.material.dispose());
      starTrailMaterial.dispose();
      starSparkMaterial.dispose();
      starMaterial.dispose();
      majorStarMaterial.dispose();

      // Dispose Textures
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
        zIndex: 3, // Positioned in front of zIndex: 2 typography for the layered depth overlap
      }}
      data-testid="earth-canvas-container"
    >
      {/* Subtle Preloader */}
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
