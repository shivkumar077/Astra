import React, { useEffect, useRef, useMemo } from 'react';

interface ParticleDefinition {
  id: number;
  u: number; // 0..1 relative to wordmark width (540)
  v: number; // 0..1 relative to wordmark height (88)
  letterIdx: number;
  scale: number;
  color: string;
}

interface WordmarkDissolutionFieldProps {
  scrollProgress: number; // 0.0 -> 1.0
  reducedMotion: boolean;
}

/**
 * Draws the authentic ASTRA 4-point acute celestial diamond flare
 */
function drawSignatureStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  color: string,
  alpha: number,
  coreSpark: boolean = true
) {
  if (alpha <= 0.005 || scale <= 0.04) return;

  const H = 8 * scale;
  const W = 8 * scale;
  const H1 = 1.9 * scale;
  const W1 = 1.6 * scale;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = Math.min(Math.max(alpha, 0), 1);
  ctx.fillStyle = color;

  // 4-point acute celestial diamond flare
  ctx.beginPath();
  ctx.moveTo(0, -H);
  ctx.lineTo(W1, -H1);
  ctx.lineTo(W, 0);
  ctx.lineTo(W1, H1);
  ctx.lineTo(0, H);
  ctx.lineTo(-W1, H1);
  ctx.lineTo(-W, 0);
  ctx.lineTo(-W1, -H1);
  ctx.closePath();
  ctx.fill();

  if (coreSpark) {
    // Brilliant starlight core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.9 * scale, 0.5), 0, Math.PI * 2);
    ctx.fill();

    // Subtle golden starlight aureole for prominent stars
    if (scale > 1.2) {
      ctx.fillStyle = '#FDE68A';
      ctx.globalAlpha = alpha * 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, 2.6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Ray-casting point-in-polygon test
 */
function pointInPoly(x: number, y: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Letter A outer polygon & inner counter hole
const polyAOuter = [
  [0, 66], [11, 66], [20.5, 53], [55.5, 53], [65, 66], [76, 66], [41.5, 18], [34.5, 18],
];
const polyACounter = [
  [38, 28.5], [51.5, 47.5], [24.5, 47.5],
];

function isInsideA(x: number, y: number): boolean {
  return pointInPoly(x, y, polyAOuter) && !pointInPoly(x, y, polyACounter);
}

function isInsideT(x: number, y: number): boolean {
  if (x >= 0 && x <= 72 && y >= 18 && y <= 25) return true;
  if (x >= 32 && x <= 40 && y >= 25 && y <= 66) return true;
  return false;
}

function isInsideR(x: number, y: number): boolean {
  if (x >= 0 && x <= 8 && y >= 18 && y <= 66) return true;
  if (y >= 18 && y <= 45 && x >= 8) {
    const dy = (y - 31.5) / 13.5;
    if (dy * dy <= 1.0) {
      const outerX = 40 + 23 * Math.sqrt(Math.max(0, 1.0 - dy * dy));
      if (x <= outerX) {
        if (y >= 25 && y <= 38) {
          const dyIn = (y - 31.5) / 6.5;
          if (dyIn * dyIn <= 1.0) {
            const innerX = 40 + 14.5 * Math.sqrt(Math.max(0, 1.0 - dyIn * dyIn));
            if (x < innerX) return false;
          }
        }
        return true;
      }
    }
  }
  if (y >= 44 && y <= 66) {
    const t = (y - 44) / 22;
    const leftX = 38 + (60.5 - 38) * t;
    const rightX = 47.5 + (72 - 47.5) * t;
    if (x >= leftX && x <= rightX) return true;
  }
  return false;
}

function isInsideS(x: number, y: number): boolean {
  if (y >= 29 && y <= 55) {
    const t = (y - 29) / 26;
    const centerX = 16 + (48 - 16) * t;
    if (Math.abs(x - centerX) <= 5.5) return true;
  }
  if (y >= 17 && y <= 33) {
    const dy = (y - 25) / 8;
    if (dy * dy <= 1.0) {
      const centerX = 33;
      const rOuter = 28 * Math.sqrt(Math.max(0, 1.0 - dy * dy));
      const rInner = 18 * Math.sqrt(Math.max(0, 1.0 - dy * dy));
      const dist = Math.abs(x - centerX);
      if (dist <= rOuter && (dist >= rInner || y < 20 || (x > 33 && y > 26))) return true;
    }
  }
  if (y >= 51 && y <= 67) {
    const dy = (y - 59) / 8;
    if (dy * dy <= 1.0) {
      const centerX = 31;
      const rOuter = 28 * Math.sqrt(Math.max(0, 1.0 - dy * dy));
      const rInner = 18 * Math.sqrt(Math.max(0, 1.0 - dy * dy));
      const dist = Math.abs(x - centerX);
      if (dist <= rOuter && (dist >= rInner || y > 64 || (x < 31 && y < 58))) return true;
    }
  }
  return false;
}

/**
 * Samples exactly 272 verified starlight positions stationed strictly within
 * the visible strokes and silhouettes of all 5 letters: A - S - T - R - A.
 */
function generateVerifiedLetterParticles(): ParticleDefinition[] {
  const particles: ParticleDefinition[] = [];
  let id = 0;

  const letterConfigs = [
    { id: 'A1', xOff: 32, fn: isInsideA, w: 76 },
    { id: 'S',  xOff: 136, fn: isInsideS, w: 62 },
    { id: 'T',  xOff: 234, fn: isInsideT, w: 72 },
    { id: 'R',  xOff: 334, fn: isInsideR, w: 74 },
    { id: 'A2', xOff: 432, fn: isInsideA, w: 76 },
  ];

  letterConfigs.forEach((l, letterIdx) => {
    for (let y = 18; y <= 66; y += 4.8) {
      for (let x = 0; x <= l.w; x += 4.8) {
        if (l.fn(x, y)) {
          const seed = (id * 9301 + 49297) % 233280;
          const rnd = seed / 233280;
          const color = rnd > 0.65 ? '#FDE68A' : rnd > 0.85 ? '#FFFFFF' : '#F0EFEA';

          particles.push({
            id: id++,
            u: (l.xOff + x) / 540,
            v: y / 88,
            letterIdx,
            scale: 0.36 + rnd * 0.22,
            color,
          });
        }
      }
    }
  });

  return particles;
}

export const WordmarkDissolutionField: React.FC<WordmarkDissolutionFieldProps> = ({
  scrollProgress,
  reducedMotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useMemo(() => generateVerifiedLetterParticles(), []);

  // Extra margin so the converged star and dispersing stars have room without clipping
  const PADDING = 60;

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

    // Phase A: Before t = 0.05, or Phase D complete (t > 0.40):
    // Canvas is completely clear, keeping the DOM pristine
    if (scrollProgress < 0.045 || scrollProgress > 0.40) {
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

    // Convergence target point: Final 'A' apex (anchored directly to #astra-signature-star at 470, 18)
    const targetX = PADDING + (470 / 540) * baseW;
    const targetY = PADDING + (18 / 88) * baseH;

    // =========================================================================
    // PHASE B: Wordmark Dissolves into Small Signature Stars (t: 0.05 -> 0.20)
    // =========================================================================
    // Small stars emerge on letter strokes as solid SVG fades out
    let smallStarsAlpha = 1.0;
    if (scrollProgress < 0.12) {
      smallStarsAlpha = (scrollProgress - 0.045) / 0.075;
    }

    // =========================================================================
    // PHASE C: Stars Gather into One Large Signature Star (t: 0.20 -> 0.35)
    // =========================================================================
    let convergenceProg = 0;
    if (scrollProgress > 0.20) {
      convergenceProg = Math.min((scrollProgress - 0.20) / 0.15, 1.0);
    }
    // Smooth cubic easing for natural gravitational convergence
    const easeC = convergenceProg * convergenceProg * (3 - 2 * convergenceProg);

    // Alpha of individual small stars decreases as they merge into the core
    const currentSmallAlpha = Math.max(smallStarsAlpha * (1.0 - convergenceProg * 1.1), 0);

    // Draw all small signature stars
    if (currentSmallAlpha > 0.01) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const originX = PADDING + p.u * baseW;
        const originY = PADDING + p.v * baseH;

        // Smooth trajectory from letter stroke towards the convergence focal point
        const curX = originX + (targetX - originX) * easeC;
        const curY = originY + (targetY - originY) * easeC;

        // Micro starlight scintillation
        const shimmer = 0.85 + 0.15 * Math.sin(scrollProgress * 28 + p.id);
        const pAlpha = currentSmallAlpha * shimmer;

        drawSignatureStar(ctx, curX, curY, p.scale, p.color, pAlpha, true);
      }
    }

    // =========================================================================
    // FORMATION OF THE LARGE SIGNATURE STAR (t: 0.20 -> 0.35)
    // =========================================================================
    // The prominent single star grows as small stars gather, reaching full scale at t=0.35
    if (convergenceProg > 0.02) {
      let largeStarAlpha = Math.min(easeC * 1.4, 1.0);
      let largeStarScale = easeC * 2.8; // Expands to 2.8x prominent scale (~24px diameter)

      // =======================================================================
      // PHASE D HANDOFF (t: 0.35 -> 0.38): Smooth handoff to 3D star in Three.js
      // =======================================================================
      if (scrollProgress > 0.35) {
        const handoffProg = Math.min((scrollProgress - 0.35) / 0.035, 1.0);
        largeStarAlpha = Math.max(1.0 - handoffProg, 0);
      }

      if (largeStarAlpha > 0.01) {
        drawSignatureStar(ctx, targetX, targetY, largeStarScale, '#FDE68A', largeStarAlpha, true);
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
