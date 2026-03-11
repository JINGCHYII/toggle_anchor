import type { ArchPoint } from './models';

export interface ArchCurve {
  outerPoints: ArchPoint[];
  innerCenter: ArchPoint;
}

interface GenerateArchOptions {
  width: number;
  height: number;
  seed: number;
  segmentCount?: number;
  archInset?: number;
}

const createSeededRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

export const generateArchCurve = ({
  width,
  height,
  seed,
  segmentCount = 60
}: GenerateArchOptions): ArchCurve => {
  const rng = createSeededRng(seed);
  const centerX = width / 2;
  const baseY = height - 52;

  // y = ax^3 + bx^2 + cx + d, x in [-30, 30]mm, y in [0, 40]mm
  const cubicA = 0.00005 + rng() * (0.0003 - 0.00005);
  const cubicB = 0.01 + rng() * (0.02 - 0.01);
  const cubicC = (rng() - 0.5) * 0.001;
  const cubicD = (rng() - 0.5) * 0.5;

  const xRangeMm = 60;
  const maxDepthMm = 40;
  const mmToCanvasX = width / xRangeMm;
  const mmToCanvasY = (height * 0.55) / maxDepthMm;

  const curvePoints: ArchPoint[] = [];
  for (let i = 0; i <= segmentCount; i += 1) {
    const t = i / segmentCount;
    const xMm = -30 + t * xRangeMm;
    const rawDepthMm = cubicA * xMm ** 3 + cubicB * xMm ** 2 + cubicC * xMm + cubicD;
    const depthMm = Math.max(0, Math.min(maxDepthMm, rawDepthMm));
    const baseX = centerX + xMm * mmToCanvasX;
    const basePointY = baseY - depthMm * mmToCanvasY;

    curvePoints.push({
      x: baseX,
      y: basePointY
    });
  }

  const geometricCenter = curvePoints.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );

  geometricCenter.x /= curvePoints.length;
  geometricCenter.y /= curvePoints.length;

  const innerCenter: ArchPoint = {
    x: geometricCenter.x,
    y: Math.min(height - 80, geometricCenter.y + 58)
  };

  return { outerPoints: curvePoints, innerCenter };
};
