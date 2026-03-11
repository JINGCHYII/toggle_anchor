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
  segmentCount = 60,
  archInset = 80
}: GenerateArchOptions): ArchCurve => {
  const rng = createSeededRng(seed);
  const centerX = width / 2;
  const baseY = height - 68;
  const a = width / 2 - archInset;
  const b = Math.min(height * 0.45, 140 + rng() * 45);

  const curvePoints: ArchPoint[] = [];
  for (let i = 0; i <= segmentCount; i += 1) {
    const t = i / segmentCount;
    const theta = Math.PI * (1 - t);
    const baseX = centerX + a * Math.cos(theta);
    const basePointY = baseY - b * Math.sin(theta);

    const edgeWeight = Math.sin(Math.PI * t);
    const jitterX = (rng() - 0.5) * 16 * edgeWeight;
    const jitterY = (rng() - 0.5) * 20 * edgeWeight;

    curvePoints.push({
      x: baseX + jitterX,
      y: basePointY + jitterY
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
