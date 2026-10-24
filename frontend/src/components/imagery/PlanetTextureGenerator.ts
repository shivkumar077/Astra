/**
 * Procedural Planetary Surface & Ring Texture Generator.
 * Creates scientifically recognizable equirectangular 2:1 textures and ring maps
 * for Mercury, Venus, Mars, Jupiter, Saturn, Uranus, and Neptune using HTML5 Canvas.
 */

import * as THREE from 'three';

// Cache generated textures in memory to prevent duplicate rendering
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * 2D Simplex/Perlin-style pseudo-random gradient noise generator for procedural textures.
 */
function createNoiseHelper(seed: number = 42) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  // Deterministic shuffle
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function lerp(t: number, a: number, b: number) {
    return a + t * (b - a);
  }
  function grad(hash: number, x: number, y: number) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  return function noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const a = perm[X] + Y;
    const b = perm[X + 1] + Y;

    return lerp(
      v,
      lerp(u, grad(perm[a], xf, yf), grad(perm[b], xf - 1, yf)),
      lerp(u, grad(perm[a + 1], xf, yf - 1), grad(perm[b + 1], xf - 1, yf - 1))
    );
  };
}

const noise = createNoiseHelper(1337);

function fbm(x: number, y: number, octaves: number = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise(x * freq, y * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return val;
}

/**
 * MERCURY: Airless, heavily cratered graphite-charcoal regolith with impact basins and ray systems.
 */
function generateMercuryTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.createImageData !== 'function') return new THREE.CanvasTexture(canvas);

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      // Multi-scale terrain noise
      const n1 = fbm(nx * 8.0, ny * 4.0, 5);
      const n2 = fbm(nx * 24.0, ny * 12.0, 3);
      const craterBase = Math.abs(n1) * 0.7 + n2 * 0.3;

      const baseVal = Math.floor(115 + craterBase * 75);
      const idx = (y * width + x) * 4;
      data[idx] = baseVal;
      data[idx + 1] = Math.floor(baseVal * 0.95);
      data[idx + 2] = Math.floor(baseVal * 0.90);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Overlay prominent crater rings with impact ejecta rays
  ctx.fillStyle = 'rgba(235, 230, 225, 0.15)';
  const craters = [
    { x: 300, y: 220, r: 35 },
    { x: 720, y: 160, r: 48 },
    { x: 520, y: 340, r: 28 },
    { x: 180, y: 380, r: 22 },
    { x: 880, y: 280, r: 30 },
  ];

  craters.forEach(({ x, y, r }) => {
    // Crater rim shadow & highlight
    const grad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    grad.addColorStop(0, 'rgba(40, 36, 33, 0.7)');
    grad.addColorStop(0.7, 'rgba(70, 65, 60, 0.4)');
    grad.addColorStop(0.9, 'rgba(210, 200, 190, 0.8)');
    grad.addColorStop(1, 'rgba(100, 95, 90, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Radial ray streaks
    ctx.strokeStyle = 'rgba(220, 215, 210, 0.12)';
    ctx.lineWidth = 1;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(a) * (r * 2.8), y + Math.sin(a) * (r * 2.8));
      ctx.stroke();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * VENUS: Dense, high-albedo yellowish-amber sulfuric acid cloud deck with sweeping atmospheric chevrons.
 */
function generateVenusTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.createImageData !== 'function') return new THREE.CanvasTexture(canvas);

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    // Venus equatorial wind shear
    const latDist = Math.abs(ny - 0.5) * 2.0;

    for (let x = 0; x < width; x++) {
      const nx = x / width;
      // High-speed super-rotation chevron shear
      const shearX = nx + (1.0 - latDist) * 0.3 * Math.sin(ny * Math.PI);
      const cloudN = fbm(shearX * 6.0, ny * 4.0, 4);

      const r = Math.floor(225 + cloudN * 25);
      const g = Math.floor(190 + cloudN * 30);
      const b = Math.floor(125 + cloudN * 20);

      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.max(0, r));
      data[idx + 1] = Math.min(255, Math.max(0, g));
      data[idx + 2] = Math.min(255, Math.max(0, b));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * MARS: Iron-oxide rust surface, dark basaltic albedo markings (Syrtis Major), and brilliant white polar ice cap.
 */
function generateMarsTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.createImageData !== 'function') return new THREE.CanvasTexture(canvas);

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const nTerrain = fbm(nx * 7.0, ny * 5.0, 5);

      // Dark albedo region mask (Syrtis Major & southern highlands)
      const albedoNoise = fbm((nx + 0.2) * 4.0, (ny - 0.2) * 3.0, 3);
      const isDarkBasalt = albedoNoise < -0.05 && ny > 0.35 && ny < 0.75;

      let r = 195 + nTerrain * 35;
      let g = 80 + nTerrain * 25;
      let b = 45 + nTerrain * 15;

      if (isDarkBasalt) {
        r *= 0.55;
        g *= 0.55;
        b *= 0.60;
      }

      // North Polar Ice Cap (y near 0)
      if (ny < 0.12) {
        const iceBlend = (0.12 - ny) / 0.12;
        r = r * (1 - iceBlend) + 245 * iceBlend;
        g = g * (1 - iceBlend) + 248 * iceBlend;
        b = b * (1 - iceBlend) + 255 * iceBlend;
      }

      // South Polar Ice Cap (y near height)
      if (ny > 0.90) {
        const iceBlend = (ny - 0.90) / 0.10;
        r = r * (1 - iceBlend) + 240 * iceBlend;
        g = g * (1 - iceBlend) + 242 * iceBlend;
        b = b * (1 - iceBlend) + 250 * iceBlend;
      }

      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.floor(r)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.floor(g)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.floor(b)));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * JUPITER: Prominent alternating latitudinal belts and zones, Great Red Spot vortex, and atmospheric fluid curls.
 */
function generateJupiterTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.createImageData !== 'function') return new THREE.CanvasTexture(canvas);

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Great Red Spot center in normalized coords
  const grsX = 0.62;
  const grsY = 0.64;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    // Latitudinal banded harmonic structure
    const bandFreq = Math.sin(ny * Math.PI * 14.0) * 0.5 + Math.cos(ny * Math.PI * 7.0) * 0.5;

    for (let x = 0; x < width; x++) {
      const nx = x / width;

      // Shear turbulence between belts
      const shear = fbm(nx * 12.0 + ny * 2.0, ny * 6.0, 4) * 0.25;
      const combinedBand = bandFreq + shear;

      // Colors: Cream Zone (light) vs Burnt Ochre Belt (dark)
      let r = 210 + combinedBand * 30;
      let g = 175 + combinedBand * 35;
      let b = 130 + combinedBand * 30;

      // North / South Equatorial Belts (NEB / SEB)
      if ((ny > 0.38 && ny < 0.48) || (ny > 0.54 && ny < 0.66)) {
        r += 25;
        g -= 25;
        b -= 35;
      }

      // Great Red Spot vortex oval
      const dx = (nx - grsX) * 2.0; // Horizontal elongation
      const dy = ny - grsY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.075) {
        const spotBlend = Math.cos((dist / 0.075) * (Math.PI / 2));
        r = r * (1 - spotBlend) + 215 * spotBlend;
        g = g * (1 - spotBlend) + 75 * spotBlend;
        b = b * (1 - spotBlend) + 55 * spotBlend;
      }

      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.floor(r)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.floor(g)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.floor(b)));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * SATURN: Muted golden-sand gas giant with delicate cloud bands.
 */
function generateSaturnTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.createImageData !== 'function') return new THREE.CanvasTexture(canvas);

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    const band = Math.sin(ny * Math.PI * 18.0) * 0.15;

    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const subtleN = fbm(nx * 8.0, ny * 4.0, 3) * 0.08;
      const factor = band + subtleN;

      const r = 225 + factor * 25;
      const g = 195 + factor * 20;
      const b = 135 + factor * 15;

      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.floor(r)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.floor(g)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.floor(b)));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * SATURN RINGS: Radial profile with semi-transparent C Ring, dense B Ring, Cassini Division gap, and outer A Ring.
 */
function generateSaturnRingTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 0, size, 0);
  // Inner boundary -> C Ring (faint Crepe Ring)
  grad.addColorStop(0.00, 'rgba(160, 140, 110, 0.0)');
  grad.addColorStop(0.12, 'rgba(180, 155, 120, 0.25)');
  grad.addColorStop(0.25, 'rgba(195, 170, 130, 0.45)');
  // B Ring (brightest and densest)
  grad.addColorStop(0.28, 'rgba(235, 205, 155, 0.95)');
  grad.addColorStop(0.60, 'rgba(220, 190, 145, 0.92)');
  // Cassini Division (prominent clear gap)
  grad.addColorStop(0.61, 'rgba(40, 30, 20, 0.05)');
  grad.addColorStop(0.66, 'rgba(40, 30, 20, 0.05)');
  // A Ring
  grad.addColorStop(0.68, 'rgba(215, 185, 140, 0.85)');
  grad.addColorStop(0.85, 'rgba(190, 160, 120, 0.75)');
  // Encke Gap & Outer Edge
  grad.addColorStop(0.88, 'rgba(60, 50, 40, 0.15)');
  grad.addColorStop(0.92, 'rgba(180, 150, 115, 0.65)');
  grad.addColorStop(1.00, 'rgba(140, 110, 80, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * URANUS: Featureless pale cyan-aquamarine methane haze with subtle limb fading.
 */
function generateUranusTexture(width = 512, height = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#58c4e8');
  grad.addColorStop(0.5, '#7ee1ff');
  grad.addColorStop(1, '#58c4e8');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * URANUS RINGS: Faint, slender dust rings with vertical tilt.
 */
function generateUranusRingTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0.0, 'rgba(120, 200, 230, 0.0)');
  grad.addColorStop(0.4, 'rgba(140, 215, 245, 0.35)');
  grad.addColorStop(0.6, 'rgba(170, 235, 255, 0.65)');
  grad.addColorStop(0.8, 'rgba(130, 205, 235, 0.30)');
  grad.addColorStop(1.0, 'rgba(100, 180, 210, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * NEPTUNE: Deep cobalt azure with white high-altitude methane cirrus clouds and Great Dark Spot.
 */
function generateNeptuneTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.createImageData !== 'function') return new THREE.CanvasTexture(canvas);

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Great Dark Spot center
  const gdsX = 0.45;
  const gdsY = 0.58;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;

      // Base deep ultramarine
      let r = 25 + Math.sin(ny * Math.PI) * 15;
      let g = 65 + Math.sin(ny * Math.PI) * 25;
      let b = 185 + Math.sin(ny * Math.PI) * 45;

      // High-altitude white methane cloud streaks (wispy cirrus bands)
      const cirrusN = fbm(nx * 20.0, ny * 30.0, 3);
      if (cirrusN > 0.28 && Math.abs(ny - 0.5) < 0.35) {
        const cloudFactor = (cirrusN - 0.28) * 3.5;
        r += 180 * cloudFactor;
        g += 200 * cloudFactor;
        b += 220 * cloudFactor;
      }

      // Great Dark Spot
      const dx = (nx - gdsX) * 1.8;
      const dy = ny - gdsY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.065) {
        const spotBlend = Math.cos((d / 0.065) * (Math.PI / 2));
        r *= (1 - spotBlend * 0.7);
        g *= (1 - spotBlend * 0.7);
        b *= (1 - spotBlend * 0.5);
      }

      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.floor(r)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.floor(g)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.floor(b)));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Master Texture Resolver.
 * Returns the cached canvas texture for the given destination ID.
 */
export function getProceduralPlanetTexture(destinationId: string): THREE.CanvasTexture | null {
  const id = destinationId.toLowerCase().trim();
  if (textureCache.has(id)) {
    return textureCache.get(id)!;
  }

  let texture: THREE.CanvasTexture | null = null;
  switch (id) {
    case 'mercury':
      texture = generateMercuryTexture();
      break;
    case 'venus':
      texture = generateVenusTexture();
      break;
    case 'mars':
      texture = generateMarsTexture();
      break;
    case 'jupiter':
      texture = generateJupiterTexture();
      break;
    case 'saturn':
      texture = generateSaturnTexture();
      break;
    case 'uranus':
      texture = generateUranusTexture();
      break;
    case 'neptune':
      texture = generateNeptuneTexture();
      break;
    default:
      texture = null;
  }

  if (texture) {
    textureCache.set(id, texture);
  }
  return texture;
}

/**
 * Ring Texture Resolver for Saturn and Uranus.
 */
export function getProceduralRingTexture(destinationId: string): THREE.CanvasTexture | null {
  const id = destinationId.toLowerCase().trim();
  const ringKey = `ring_${id}`;
  if (textureCache.has(ringKey)) {
    return textureCache.get(ringKey)!;
  }

  let texture: THREE.CanvasTexture | null = null;
  if (id === 'saturn') {
    texture = generateSaturnRingTexture();
  } else if (id === 'uranus') {
    texture = generateUranusRingTexture();
  }

  if (texture) {
    textureCache.set(ringKey, texture);
  }
  return texture;
}

/**
 * Bounded Preloader: Pre-warms textures for upcoming destinations in microtask/idle time
 * so destination transitions never wait for generation or decoding.
 */
export function preloadPlanetaryTexture(destinationId: string): void {
  const normId = destinationId.toLowerCase().trim();
  if (normId === 'sun') return;

  if (normId === 'earth') {
    if (typeof window !== 'undefined') {
      const img1 = new Image();
      img1.src = '/assets/earth/earth_2048.jpg';
      const img2 = new Image();
      img2.src = '/assets/earth/earth_clouds_2048.jpg';
    }
    return;
  }

  if (!textureCache.has(normId)) {
    getProceduralPlanetTexture(normId);
  }

  if ((normId === 'saturn' || normId === 'uranus') && !textureCache.has(`ring_${normId}`)) {
    getProceduralRingTexture(normId);
  }
}

