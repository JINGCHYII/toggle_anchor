import type { BarType } from './models';

export interface ScoreMetricDetail {
  score: number;
  value: number;
  penalty: number;
  target?: number | { min: number; max: number } | Record<string, number>;
}

export interface BalanceDetail extends ScoreMetricDetail {
  expectedRatio: Record<BarType, number>;
  actualRatio: Record<BarType, number>;
  counts: Record<BarType, number>;
}

export interface CollisionDetail extends ScoreMetricDetail {
  collisionPairs: number;
}

export interface ScoreBreakdown {
  convergence: number;
  compactness: number;
  collision: number;
  balance: number;
  total: number;
}

export interface ScoreDetail {
  convergence: ScoreMetricDetail;
  compactness: ScoreMetricDetail;
  collision: CollisionDetail;
  balance: BalanceDetail;
}

export interface ScoreResult extends ScoreBreakdown {
  detail: ScoreDetail;
}
