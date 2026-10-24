import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface PlanetaryModelConfig {
  id: string;
  name: string;
  modelUrl: string;
  targetRadius: number;
  cameraDistance: number;
  axialTilt: number; // degrees
  rotationSpeed: number;
  ambientLightColor: number;
  ambientIntensity: number;
  sunLightColor: number;
  sunLightIntensity: number;
  isStar?: boolean;
  ringsFitted?: boolean;
  roughnessDefault?: number;
  metalnessDefault?: number;
}

export const PLANETARY_MODEL_CONFIGS: Record<string, PlanetaryModelConfig> = {
  sun: {
    id: 'sun',
    name: 'Sun',
    modelUrl: '/models/sun/sun_model.glb',
    targetRadius: 1.6,
    cameraDistance: 5.6,
    axialTilt: 7.25,
    rotationSpeed: 0.0015,
    ambientLightColor: 0xfff0d0,
    ambientIntensity: 1.2,
    sunLightColor: 0xfff5d0,
    sunLightIntensity: 2.5,
    isStar: true,
  },
  mercury: {
    id: 'mercury',
    name: 'Mercury',
    modelUrl: '/models/mercury/mercury_enhanced_color.glb',
    targetRadius: 1.25,
    cameraDistance: 5.4,
    axialTilt: 0.034,
    rotationSpeed: 0.0012,
    ambientLightColor: 0x40444c,
    ambientIntensity: 0.45,
    sunLightColor: 0xfff8ee,
    sunLightIntensity: 2.8,
  },
  venus: {
    id: 'venus',
    name: 'Venus',
    modelUrl: '/models/venus/venus_detailed_version1.glb',
    targetRadius: 1.35,
    cameraDistance: 5.6,
    axialTilt: 177.3,
    rotationSpeed: 0.0008,
    ambientLightColor: 0x6e5a38,
    ambientIntensity: 0.55,
    sunLightColor: 0xfff0d8,
    sunLightIntensity: 2.6,
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    modelUrl: '/models/earth/earth.glb',
    targetRadius: 1.35,
    cameraDistance: 5.6,
    axialTilt: 23.44,
    rotationSpeed: 0.002,
    ambientLightColor: 0x1a2e4c,
    ambientIntensity: 0.5,
    sunLightColor: 0xffffff,
    sunLightIntensity: 2.5,
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    modelUrl: '/models/mars/mars.glb',
    targetRadius: 1.25,
    cameraDistance: 5.4,
    axialTilt: 25.19,
    rotationSpeed: 0.002,
    ambientLightColor: 0x4a2a22,
    ambientIntensity: 0.45,
    sunLightColor: 0xfff3e6,
    sunLightIntensity: 2.6,
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    modelUrl: '/models/jupiter/jupiter.glb',
    targetRadius: 1.5,
    cameraDistance: 5.8,
    axialTilt: 3.13,
    rotationSpeed: 0.0025,
    ambientLightColor: 0x5a4832,
    ambientIntensity: 0.5,
    sunLightColor: 0xfff5e4,
    sunLightIntensity: 2.4,
  },
  saturn: {
    id: 'saturn',
    name: 'Saturn',
    modelUrl: '/models/saturn/saturn.glb',
    targetRadius: 1.2,
    cameraDistance: 6.8, // Extra camera distance to fit magnificent rings without clipping
    axialTilt: 26.73,
    rotationSpeed: 0.002,
    ambientLightColor: 0x544a38,
    ambientIntensity: 0.55,
    sunLightColor: 0xfff6e8,
    sunLightIntensity: 2.4,
    ringsFitted: true,
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus',
    modelUrl: '/models/uranus/uranus.glb',
    targetRadius: 1.3,
    cameraDistance: 6.2,
    axialTilt: 97.77, // Retrograde axial tilt
    rotationSpeed: 0.0018,
    ambientLightColor: 0x224455,
    ambientIntensity: 0.5,
    sunLightColor: 0xebf8ff,
    sunLightIntensity: 2.3,
    ringsFitted: true,
  },
  neptune: {
    id: 'neptune',
    name: 'Neptune',
    modelUrl: '/models/naptune/neptune.glb',
    targetRadius: 1.3,
    cameraDistance: 5.6,
    axialTilt: 28.32,
    rotationSpeed: 0.0018,
    ambientLightColor: 0x182855,
    ambientIntensity: 0.5,
    sunLightColor: 0xe6f0ff,
    sunLightIntensity: 2.4,
  },
};

/**
 * Custom GLTF extension plugin to handle legacy KHR_materials_pbrSpecularGlossiness
 * used by jupiter.glb, saturn.glb, and uranus.glb.
 * Seamlessly converts diffuse textures and spec-gloss parameters into MeshStandardMaterial.
 */
class GLTFMaterialsPbrSpecularGlossinessExtension {
  private parser: any;
  public name: string;

  constructor(parser: any) {
    this.parser = parser;
    this.name = 'KHR_materials_pbrSpecularGlossiness';
  }

  getMaterialType(materialIndex: number) {
    const parser = this.parser;
    const materialDef = parser.json.materials[materialIndex];
    if (!materialDef.extensions || !materialDef.extensions[this.name]) return null;
    return THREE.MeshStandardMaterial;
  }

  extendMaterialParams(materialIndex: number, materialParams: any) {
    const parser = this.parser;
    const materialDef = parser.json.materials[materialIndex];
    if (!materialDef.extensions || !materialDef.extensions[this.name]) {
      return Promise.resolve();
    }

    const pending: Promise<any>[] = [];
    const extension = materialDef.extensions[this.name];

    if (Array.isArray(extension.diffuseFactor)) {
      materialParams.color = new THREE.Color(
        extension.diffuseFactor[0],
        extension.diffuseFactor[1],
        extension.diffuseFactor[2]
      );
      if (extension.diffuseFactor[3] !== undefined && extension.diffuseFactor[3] < 1.0) {
        materialParams.opacity = extension.diffuseFactor[3];
        materialParams.transparent = true;
      }
    }

    if (extension.diffuseTexture !== undefined) {
      pending.push(
        parser.assignTexture(materialParams, 'map', extension.diffuseTexture).then((tex: THREE.Texture) => {
          if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace;
          }
        })
      );
    }

    // Convert glossiness to roughness: roughness = 1 - glossiness
    if (extension.glossinessFactor !== undefined) {
      materialParams.roughness = Math.max(0.04, 1.0 - extension.glossinessFactor);
    } else {
      materialParams.roughness = 0.55;
    }
    materialParams.metalness = 0.04;

    return Promise.all(pending);
  }
}

// Global cached loader instance
let sharedLoader: GLTFLoader | null = null;

function getSharedGLTFLoader(): GLTFLoader {
  if (!sharedLoader) {
    sharedLoader = new GLTFLoader();
    sharedLoader.register((parser) => new GLTFMaterialsPbrSpecularGlossinessExtension(parser));
  }
  return sharedLoader;
}

// In-memory model cache for instantaneous navigation between already loaded planets
const MODEL_CACHE = new Map<string, THREE.Group>();
const MODEL_ANIMATIONS_CACHE = new Map<string, THREE.AnimationClip[]>();
const LOADING_PROMISES = new Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>>();

/**
 * Loads and normalizes a planetary GLB model:
 * - Re-centers the bounding box geometry around (0,0,0)
 * - Scales model dimensions to standard astronomical display units
 * - Corrects material textures, colorSpaces, and double-sided rings
 * - Caches the processed model for instant reuse
 */
export async function loadPlanetaryGLB(
  destinationId: string,
  onProgress?: (event: ProgressEvent) => void
): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  const normId = destinationId.toLowerCase();
  const config = PLANETARY_MODEL_CONFIGS[normId] || PLANETARY_MODEL_CONFIGS.earth;

  // Check cache
  if (MODEL_CACHE.has(normId)) {
    const cachedGroup = MODEL_CACHE.get(normId)!;
    const cachedAnims = MODEL_ANIMATIONS_CACHE.get(normId) || [];
    return {
      scene: cachedGroup.clone(true),
      animations: cachedAnims,
    };
  }

  // Check in-flight loading promise
  if (LOADING_PROMISES.has(normId)) {
    const res = await LOADING_PROMISES.get(normId)!;
    return {
      scene: res.scene.clone(true),
      animations: res.animations,
    };
  }

  const loadPromise = new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>((resolve, reject) => {
    const loader = getSharedGLTFLoader();

    loader.load(
      config.modelUrl,
      (gltf) => {
        const rawScene = gltf.scene;

        // 1. Calculate bounding box & geometric center
        const bbox = new THREE.Box3().setFromObject(rawScene);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());

        // 2. Re-center geometry around (0, 0, 0)
        rawScene.position.x -= center.x;
        rawScene.position.y -= center.y;
        rawScene.position.z -= center.z;

        // 3. Normalize scale to targetRadius
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scaleFactor = (config.targetRadius * 2.0) / maxDim;
          rawScene.scale.setScalar(scaleFactor);
        }

        // 4. Material and texture normalization
        rawScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((mat) => {
                if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                  // Ensure correct sRGB color space on all textures
                  if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
                  if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;

                  // Double-sided rendering for planetary rings (e.g. Saturn, Uranus)
                  if (config.ringsFitted || mat.name.toLowerCase().includes('ring') || mat.name.includes('saturn2')) {
                    mat.side = THREE.DoubleSide;
                  }

                  // Handle special material treatment for the Sun
                  if (config.isStar) {
                    mat.emissive = new THREE.Color(0xf59e0b);
                    mat.emissiveIntensity = 0.8;
                    mat.roughness = 0.4;
                  }

                  mat.needsUpdate = true;
                }
              });
            }
          }
        });

        // 5. Wrap in root group
        const containerGroup = new THREE.Group();
        containerGroup.name = `planet-${normId}`;
        containerGroup.add(rawScene);

        // Apply natural planetary axial tilt
        if (config.axialTilt) {
          containerGroup.rotation.z = THREE.MathUtils.degToRad(-config.axialTilt);
        }

        // Cache result
        MODEL_CACHE.set(normId, containerGroup);
        MODEL_ANIMATIONS_CACHE.set(normId, gltf.animations || []);
        LOADING_PROMISES.delete(normId);

        resolve({
          scene: containerGroup.clone(true),
          animations: gltf.animations || [],
        });
      },
      onProgress,
      (error) => {
        LOADING_PROMISES.delete(normId);
        console.error(`Failed to load 3D model for ${normId} from ${config.modelUrl}:`, error);
        reject(error);
      }
    );
  });

  LOADING_PROMISES.set(normId, loadPromise);
  return loadPromise;
}
