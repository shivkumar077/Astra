import React, { useEffect, useRef, useMemo } from 'react';

interface ParticleDefinition {
  id: number;
  u: number; // 0..1 relative to wordmark width
  v: number; // 0..1 relative to wordmark height
  driftX: number;
  driftY: number;
  startT: number;
  baseSize: number;
  color: string;
}

interface WordmarkDissolutionFieldProps {
  scrollProgress: number; // 0.0 -> 1.0
  reducedMotion: boolean;
}

/**
 * Generates 160 deterministic stroke-anchored particles matching the ASTRA wordmark silhouette.
 * Staggered from left-to-right with subtle cosmic float.
 */
function createAstraParticles(): ParticleDefinition[] {
  const particles: ParticleDefinition[] = [];
  let id = 0;

  function addPt(x: number, y: number, letterIdx: number) {
    // Deterministic pseudo-random values
    const seed = (id * 9301 + 49297) % 233280;
    const rnd1 = seed / 233280;
    const rnd2 = ((seed * 9301 + 49297) % 233280) / 233280;
    const rnd3 = ((seed * 49297 + 9301) % 233280) / 233280;

    // Outward cosmic drift with subtle upward expansion into starfield
    const angle = rnd1 * Math.PI * 2;
    const speed = 28 + rnd2 * 65; // px drift at maximum extent
    const driftX = Math.cos(angle) * speed;
    const driftY = Math.sin(angle) * speed - 18; // gentle float upward into celestial space

    // Staggered departure threshold (t: 0.16 to 0.34)
    const letterStagger = (letterIdx / 4) * 0.08;
    const localStagger = rnd3 * 0.08;
    const startT = 0.16 + letterStagger + localStagger;

    // Palette: Ivory, warm celestial gold, radiant starlight white
    let color = '#F0EFEA';
    if (rnd2 > 0.65) color = '#FDE68A';
    else if (rnd1 > 0.8) color = '#FFFFFF';

    particles.push({
      id: id++,
      u: x / 540,
      v: y / 88,
      driftX,
      driftY,
      startT,
      baseSize: 1.1 + rnd1 * 1.3,
      color,
    });
  }

  function sampleLine(x1: number, y1: number, x2: number, y2: number, n: number, letterIdx: number) {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      addPt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, letterIdx);
    }
  }

  // 1. LETTER A1 (letterIdx = 0, X offset = 32)
  sampleLine(70, 18, 38, 66, 11, 0); // left diagonal leg
  sampleLine(70, 18, 102, 66, 11, 0); // right diagonal leg
  sampleLine(54, 50, 86, 50, 6, 0); // continuous crossbar
  sampleLine(70, 24, 70, 42, 3, 0); // apex core infill

  // 2. LETTER S (letterIdx = 1, X offset = 136)
  // Top aerodynamic loop
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * Math.PI;
    const px = 168 + Math.cos(t) * 26;
    const py = 28 - Math.sin(t) * 11;
    addPt(px, py, 1);
  }
  // Central diagonal spine
  sampleLine(148, 28, 188, 56, 9, 1);
  // Bottom aerodynamic loop
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * Math.PI;
    const px = 168 - Math.cos(t) * 26;
    const py = 56 + Math.sin(t) * 11;
    addPt(px, py, 1);
  }

  // 3. LETTER T (letterIdx = 2, X offset = 234)
  sampleLine(234, 21.5, 306, 21.5, 14, 2); // horizontal crossbeam
  sampleLine(270, 21.5, 270, 66, 11, 2); // vertical central pillar

  // 4. LETTER R (letterIdx = 3, X offset = 334)
  sampleLine(338, 18, 338, 66, 11, 3); // left vertical stem
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * Math.PI - Math.PI / 2;
    const px = 358 + Math.cos(t) * 24;
    const py = 31 + Math.sin(t) * 13;
    addPt(px, py, 3);
  }
  sampleLine(362, 44, 402, 66, 8, 3); // sweeping diagonal leg

  // 5. LETTER A2 (letterIdx = 4, X offset = 432)
  sampleLine(470, 18, 438, 66, 11, 4); // left diagonal leg
  sampleLine(470, 18, 502, 66, 11, 4); // right diagonal leg
  sampleLine(454, 50, 486, 50, 6, 4); // continuous crossbar
  sampleLine(470, 24, 470, 42, 3, 4); // apex core infill

  return particles;
}

export const WordmarkDissolutionField: React.FC<WordmarkDissolutionFieldProps> = ({
  scrollProgress,
  reducedMotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useMemo(() => createAstraParticles(), []);

  // Padding margin around canvas so particles float outside the wordmark bounds without clipping
  const PADDING = 50;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    // If outside the active dissolution window, keep canvas completely clear
    if (scrollProgress < 0.05 || scrollProgress > 0.56) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = rect.width + PADDING * 2;
    const displayHeight = rect.height + PADDING * 2;

    const targetWidth = Math.round(displayWidth * dpr);
    const targetHeight = Math.round(displayHeight * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const baseW = rect.width;
    const baseH = rect.height;

    // Dissolution Master Alpha Envelope:
    // Fades in smoothly from t=0.06 to t=0.14 as solid wordmark prepares to dissolve,
    // holds steady through t=0.40, then finishes dispersing by t=0.54
    let masterAlpha = 1.0;
    if (scrollProgress < 0.14) {
      masterAlpha = (scrollProgress - 0.06) / 0.08;
    } else if (scrollProgress > 0.42) {
      masterAlpha = Math.max(1.0 - (scrollProgress - 0.42) / 0.12, 0);
    }

    if (masterAlpha <= 0.001) {
      ctx.restore();
      return;
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const originX = PADDING + p.u * baseW;
      const originY = PADDING + p.v * baseH;

      let curX = originX;
      let curY = originY;
      let pAlpha = masterAlpha;

      if (scrollProgress > p.startT) {
        // Controlled celestial dispersion
        const dispersionT = Math.min((scrollProgress - p.startT) / 0.22, 1.0);
        const ease = Math.pow(dispersionT, 1.25);

        curX = originX + p.driftX * ease;
        curY = originY + p.driftY * ease;

        // Scintillating fade as particle drifts into the background starfield
        const shimmer = 0.82 + 0.18 * Math.sin(scrollProgress * 24 + p.id);
        pAlpha = Math.max((1.0 - dispersionT) * masterAlpha * shimmer, 0);
      }

      if (pAlpha < 0.01) continue;

      // Draw celestial starlight core
      ctx.fillStyle = p.color;
      ctx.globalAlpha = pAlpha;
      ctx.beginPath();
      ctx.arc(curX, curY, p.baseSize, 0, Math.PI * 2);
      ctx.fill();

      // Soft ambient starlight halo for prominent particles
      if (p.id % 4 === 0 && pAlpha > 0.2) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = pAlpha * 0.22;
        ctx.beginPath();
        ctx.arc(curX, curY, p.baseSize * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }, [scrollProgress, reducedMotion, particles]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="astra-wordmark-dissolution-canvas"
      style={{
        position: 'absolute',
        top: -PADDING,
        left: -PADDING,
        width: `calc(100% + ${PADDING * 2}px)`,
        height: `calc(100% + ${PADDING * 2}px)`,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 4,
      }}
      aria-hidden="true"
    />
  );
};
