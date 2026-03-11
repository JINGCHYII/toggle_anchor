import type { Anchor, DentalArch } from './models';
import type { BarType } from './models';
import type { BalanceDetail, CollisionDetail, ScoreDetail, ScoreMetricDetail, ScoreResult } from './types';

interface PlacedBar {
  anchorId: string;
  type: BarType;
  anchor: Pick<Anchor, 'x' | 'y'>;
  length: number;
  angle: number;
  centerX: number;
  centerY: number;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const getPlacedBars = (arch: DentalArch): PlacedBar[] =>
  arch.anchors.flatMap((anchor) =>
    (Object.keys(anchor.bars) as BarType[])
      .map((type) => ({ type, bar: anchor.bars[type] }))
      .filter(({ bar }) => bar.placed)
      .map(({ type, bar }) => ({
        anchorId: anchor.id,
        type,
        anchor: { x: anchor.x, y: anchor.y },
        length: bar.length,
        angle: bar.angle,
        centerX: anchor.x + Math.cos(bar.angle) * (bar.length / 2),
        centerY: anchor.y + Math.sin(bar.angle) * (bar.length / 2)
      }))
  );

export const scoreConvergence = (arch: DentalArch): ScoreMetricDetail => {
  const bars = getPlacedBars(arch);
  if (bars.length === 0) {
    return { score: 0, value: 0, penalty: 100 };
  }

  const avgDistance =
    bars.reduce((sum, bar) => {
      const dx = bar.centerX - arch.innerCenter.x;
      const dy = bar.centerY - arch.innerCenter.y;
      return sum + Math.hypot(dx, dy);
    }, 0) / bars.length;

  const maxReferenceDistance = Math.hypot(arch.width, arch.height) / 2;
  const score = clamp((1 - avgDistance / maxReferenceDistance) * 100);

  return { score, value: avgDistance, penalty: 100 - score, target: { min: 0, max: maxReferenceDistance } };
};

export const scoreCompactness = (arch: DentalArch): ScoreMetricDetail => {
  const bars = getPlacedBars(arch);
  if (bars.length <= 1) {
    return { score: 100, value: 0, penalty: 0, target: { min: 18, max: 42 } };
  }

  const target = { min: 18, max: 42 };
  const nearestDistances = bars.map((bar, index) => {
    let nearest = Number.POSITIVE_INFINITY;
    bars.forEach((other, otherIndex) => {
      if (index === otherIndex) {
        return;
      }
      const distance = Math.hypot(bar.centerX - other.centerX, bar.centerY - other.centerY);
      nearest = Math.min(nearest, distance);
    });
    return nearest;
  });

  const avgDeviation =
    nearestDistances.reduce((sum, distance) => {
      if (distance < target.min) {
        return sum + (target.min - distance);
      }
      if (distance > target.max) {
        return sum + (distance - target.max);
      }
      return sum;
    }, 0) / nearestDistances.length;

  const tolerance = target.max - target.min;
  const score = clamp(100 - (avgDeviation / tolerance) * 100);

  return { score, value: avgDeviation, penalty: 100 - score, target };
};

const getBarAabb = (bar: PlacedBar) => {
  const halfWidth = bar.length / 2;
  const halfHeight = 5;
  const centerX = bar.anchor.x + Math.cos(bar.angle) * halfWidth;
  const centerY = bar.anchor.y + Math.sin(bar.angle) * halfWidth;
  const corners = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight }
  ].map((point) => ({
    x: centerX + point.x * Math.cos(bar.angle) - point.y * Math.sin(bar.angle),
    y: centerY + point.x * Math.sin(bar.angle) + point.y * Math.cos(bar.angle)
  }));

  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxY: Math.max(...corners.map((corner) => corner.y))
  };
};

export const scoreCollision = (arch: DentalArch): CollisionDetail => {
  const bars = getPlacedBars(arch);
  let collisionPairs = 0;

  for (let i = 0; i < bars.length; i += 1) {
    const a = getBarAabb(bars[i]);
    for (let j = i + 1; j < bars.length; j += 1) {
      const b = getBarAabb(bars[j]);
      const overlaps = a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
      if (overlaps) {
        collisionPairs += 1;
      }
    }
  }

  const penalty = Math.min(100, collisionPairs * 35);
  return { score: 100 - penalty, value: collisionPairs, collisionPairs, penalty, target: 0 };
};

export const scoreBalance = (arch: DentalArch): BalanceDetail => {
  const bars = getPlacedBars(arch);
  const expectedRatio: Record<BarType, number> = { short: 1 / 3, medium: 1 / 3, long: 1 / 3 };
  const counts = bars.reduce<Record<BarType, number>>(
    (acc, bar) => ({ ...acc, [bar.type]: acc[bar.type] + 1 }),
    { short: 0, medium: 0, long: 0 }
  );
  const total = bars.length;

  const actualRatio: Record<BarType, number> = {
    short: total ? counts.short / total : 0,
    medium: total ? counts.medium / total : 0,
    long: total ? counts.long / total : 0
  };

  const totalDeviation = (Object.keys(expectedRatio) as BarType[]).reduce(
    (sum, type) => sum + Math.abs(actualRatio[type] - expectedRatio[type]),
    0
  );
  const maxDeviation = 4 / 3;
  const score = total === 0 ? 0 : clamp(100 - (totalDeviation / maxDeviation) * 100);

  return {
    score,
    value: totalDeviation,
    penalty: 100 - score,
    target: expectedRatio,
    expectedRatio,
    actualRatio,
    counts
  };
};

export const scoreTotal = (arch: DentalArch): ScoreResult => {
  const convergenceDetail = scoreConvergence(arch);
  const compactnessDetail = scoreCompactness(arch);
  const collisionDetail = scoreCollision(arch);
  const balanceDetail = scoreBalance(arch);

  const total = Math.round(
    (convergenceDetail.score + compactnessDetail.score + collisionDetail.score + balanceDetail.score) / 4
  );

  const detail: ScoreDetail = {
    convergence: convergenceDetail,
    compactness: compactnessDetail,
    collision: collisionDetail,
    balance: balanceDetail
  };

  return {
    convergence: convergenceDetail.score,
    compactness: compactnessDetail.score,
    collision: collisionDetail.score,
    balance: balanceDetail.score,
    total,
    detail
  };
};
