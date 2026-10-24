import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadPlanetaryGLB, PLANETARY_MODEL_CONFIGS } from './ModelRegistry';

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

export const PlanetVisual: React.FC<PlanetVisualProps> = ({
  destinationId,
  name,
  type,
  reducedMotion = false,
  scaleProgress = 1.0,
  onToggleExpand,
  onSelect,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const normId = destinationId.toLowerCase();
  const config = PLANETARY_MODEL_CONFIGS[normId] || PLANETARY_MODEL_CONFIGS.earth;

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
      setIsLoading(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    let animId: number;
    let isDisposed = false;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 480;

    // 2. Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, config.cameraDistance);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = config.isStar ? 1.35 : 1.1;
      container.appendChild(renderer.domElement);
    } catch {
      setWebglAvailable(false);
      setIsLoading(false);
      return;
    }

    // 3. Celestial Hierarchy Group
    const celestialGroup = new THREE.Group();
    scene.add(celestialGroup);

    // Controlled scene lighting (reveals surface detail without harsh neon halos)
    const ambientLight = new THREE.AmbientLight(config.ambientLightColor, config.ambientIntensity);
    scene.add(ambientLight);

    if (config.isStar) {
      // Sun: warm omnidirectional point lighting
      const sunPointLight = new THREE.PointLight(config.sunLightColor, config.sunLightIntensity, 40);
      sunPointLight.position.set(0, 0, 0);
      scene.add(sunPointLight);

      const subtleFrontLight = new THREE.DirectionalLight(0xfff5d0, 1.2);
      subtleFrontLight.position.set(2, 2, 4);
      scene.add(subtleFrontLight);
    } else {
      // Planets: natural directional sunlight from upper-left
      const sunLight = new THREE.DirectionalLight(config.sunLightColor, config.sunLightIntensity);
      sunLight.position.set(5, 3, 4);
      scene.add(sunLight);

      // Subtle fill light for unlit nocturnal hemisphere
      const fillLight = new THREE.DirectionalLight(0x101624, 0.4);
      fillLight.position.set(-5, -2, -2);
      scene.add(fillLight);
    }

    let mixer: THREE.AnimationMixer | null = null;

    // 4. Load the actual local .glb model from ModelRegistry
    setIsLoading(true);
    setLoadError(null);

    loadPlanetaryGLB(normId)
      .then(({ scene: modelScene, animations }) => {
        if (isDisposed) return;
        celestialGroup.add(modelScene);
        setIsLoading(false);

        // If the model contains animations (e.g. Earth cloud layer rotation), start them
        if (animations && animations.length > 0) {
          mixer = new THREE.AnimationMixer(modelScene);
          animations.forEach((clip) => {
            const action = mixer!.clipAction(clip);
            action.play();
          });
        }
      })
      .catch((err) => {
        if (isDisposed) return;
        console.error(`Error loading model for ${normId}:`, err);
        setLoadError(err.message || 'Model load failure');
        setIsLoading(false);
      });

    // 5. Interactive Pointer Drag & Rotation (Drag-vs-Click Separation)
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
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
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

      // Intentional tap or click: trigger expansion
      if (totalDragDist < 6) {
        onToggleExpand?.();
        onSelect?.();
      }
    };

    const domElement = renderer.domElement;
    domElement.style.touchAction = 'none';
    domElement.style.cursor = 'grab';
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('pointercancel', handlePointerUp);

    // 6. Render & Animation Loop (With Velocity Damping & Scroll Scale)
    const baseRotSpeed = reducedMotion ? 0.0004 : config.rotationSpeed;
    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      const delta = clock.getDelta();

      if (mixer) {
        mixer.update(delta);
      }

      if (!isPointerDown) {
        if (Math.abs(velocityX) > 0.0001) {
          celestialGroup.rotation.y += velocityX;
          velocityX *= 0.93;
        } else {
          celestialGroup.rotation.y += baseRotSpeed;
        }

        if (Math.abs(velocityY) > 0.0001) {
          celestialGroup.rotation.x += velocityY;
          velocityY *= 0.93;
        }
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth || 480;
      const newH = container.clientHeight || 480;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);

      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('pointercancel', handlePointerUp);

      if (mixer) mixer.stopAllAction();
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [normId, config, reducedMotion, onToggleExpand, onSelect]);

  // Continuous scroll scale-and-fade calculation
  const clampedScale = reducedMotion ? 1.0 : Math.max(0.5, Math.min(1.0, 0.5 + 0.5 * scaleProgress));
  const clampedOpacity = reducedMotion ? 1.0 : Math.max(0.0, Math.min(1.0, scaleProgress * 1.35));

  return (
    <div
      ref={mountRef}
      className="astra-planet-visual-root"
      data-testid={`planet-visual-${normId}`}
      role="button"
      tabIndex={0}
      aria-label={`Interactive 3D model of ${name} (${type}). Drag to rotate. Click to explore mission dossier.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleExpand?.();
          onSelect?.();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: `scale(${clampedScale})`,
        opacity: clampedOpacity,
        transition: reducedMotion ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
      }}
    >
      {/* Loading Indicator for 3D GLB assets */}
      {isLoading && webglAvailable && (
        <div className="astra-planet-loading-cue" aria-live="polite">
          <span className="astra-hud-pulse" />
          <span className="astra-loading-text">INITIALIZING 3D MODEL...</span>
        </div>
      )}

      {/* Concise Single Interaction Hint */}
      <div
        className={`astra-planet-hud-cue ${isHovered ? 'visible' : ''}`}
        aria-hidden="true"
      >
        <span className="astra-hud-pulse" />
        <span className="astra-hud-label">CLICK CELESTIAL BODY TO EXPLORE DOSSIER</span>
      </div>

      {/* Tactical 2D Fallback for JSDOM / WebGL disabled environments or load errors */}
      {(!webglAvailable || loadError) && (
        <div
          data-testid={`planet-fallback-${normId}`}
          className="astra-planet-2d-fallback"
          style={{
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: config.isStar
              ? 'radial-gradient(circle, #fffbeb 10%, #fbbf24 45%, #ea580c 75%, transparent 100%)'
              : `radial-gradient(circle at 35% 35%, #94a3b8 0%, #334155 65%, #050608 100%)`,
            boxShadow: `0 0 50px rgba(255, 255, 255, 0.2)`,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => {
            onToggleExpand?.();
            onSelect?.();
          }}
        />
      )}
    </div>
  );
};
