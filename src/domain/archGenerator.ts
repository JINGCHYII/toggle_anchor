import type { ArchPoint } from './models';

export interface CubicCoefficients {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface ArchCurve {
  outerPoints: ArchPoint[];
  innerCenter: ArchPoint;
  coefficients: CubicCoefficients;
}

interface GenerateArchOptions {
  width: number;
  height: number;
  seed: number;
  segmentCount?: number;
  coefficients?: CubicCoefficients;
}

const X_MIN_MM = -30;
const X_MAX_MM = 30;
const MAX_DEPTH_MM = 40;

export const CUBIC_RANGES = {
  a: { min: 0.00005, max: 0.0003 },
  b: { min: 0.1, max: 1 },
  c: { min: -0.001, max: 0.001 },
  d: { min: -0.5, max: 0.5 }
};

const createSeededRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};


export const mmXToCanvasX = (xMm: number, width: number) => {
  const centerX = width / 2;
  const mmToCanvasX = width / (X_MAX_MM - X_MIN_MM);
  return centerX + xMm * mmToCanvasX;
};

export const canvasXToMmX = (xCanvas: number, width: number) => {
  const centerX = width / 2;
  const canvasToMmX = (X_MAX_MM - X_MIN_MM) / width;
  return (xCanvas - centerX) * canvasToMmX;
};

export const evaluateCubicDepthMm = (coefficients: CubicCoefficients, xMm: number) =>
  coefficients.a * xMm ** 3 + coefficients.b * xMm ** 2 + coefficients.c * xMm + coefficients.d;

const calcInnerCenter = (points: ArchPoint[], height: number): ArchPoint => {
  const geometricCenter = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );

  geometricCenter.x /= points.length;
  geometricCenter.y /= points.length;

  return {
    x: geometricCenter.x,
    y: Math.min(height - 80, geometricCenter.y + 58)
  };
};

const randomCoefficients = (seed: number): CubicCoefficients => {
  const rng = createSeededRng(seed);
  return {
    a: CUBIC_RANGES.a.min + rng() * (CUBIC_RANGES.a.max - CUBIC_RANGES.a.min),
    b: CUBIC_RANGES.b.min + rng() * (CUBIC_RANGES.b.max - CUBIC_RANGES.b.min),
    c: CUBIC_RANGES.c.min + rng() * (CUBIC_RANGES.c.max - CUBIC_RANGES.c.min),
    d: CUBIC_RANGES.d.min + rng() * (CUBIC_RANGES.d.max - CUBIC_RANGES.d.min)
  };
};

export const closestPointOnCurve = (contour: ArchPoint[], x: number, y: number): ArchPoint => {
  if (contour.length === 0) {
    return { x, y };
  }

  return contour.reduce((nearest, point) => {
    const currentDistance = (point.x - x) ** 2 + (point.y - y) ** 2;
    const nearestDistance = (nearest.x - x) ** 2 + (nearest.y - y) ** 2;
    return currentDistance < nearestDistance ? point : nearest;
  });
};

export const generateArchCurve = ({
  width,
  height,
  seed,
  segmentCount = 60,
  coefficients
}: GenerateArchOptions): ArchCurve => {
  const usedCoefficients = coefficients ?? randomCoefficients(seed);
  const baseY = height - 52;

  const xRangeMm = X_MAX_MM - X_MIN_MM;
  const mmToCanvasY = (height * 0.55) / MAX_DEPTH_MM;

  const curvePoints: ArchPoint[] = [];
  for (let i = 0; i <= segmentCount; i += 1) {
    const t = i / segmentCount;
    const xMm = X_MIN_MM + t * xRangeMm;
    const depthMm = evaluateCubicDepthMm(usedCoefficients, xMm);
    const baseX = mmXToCanvasX(xMm, width);

    curvePoints.push({
      x: baseX,
      y: baseY - depthMm * mmToCanvasY
    });
  }

  return {
    outerPoints: curvePoints,
    innerCenter: calcInnerCenter(curvePoints, height),
    coefficients: usedCoefficients
  };
};
