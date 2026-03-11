import type { DentalArch } from '../../models';

interface ScoreRange {
  min: number;
  max: number;
}

export interface RegressionCase {
  name: string;
  arch: DentalArch;
  expectedRanges: {
    convergence: ScoreRange;
    compactness: ScoreRange;
    collision: ScoreRange;
    balance: ScoreRange;
  };
}

const createBars = (shortAngle: number, mediumAngle: number, longAngle: number) => ({
  short: { type: 'short' as const, length: 36, placed: true, angle: shortAngle },
  medium: { type: 'medium' as const, length: 52, placed: true, angle: mediumAngle },
  long: { type: 'long' as const, length: 74, placed: true, angle: longAngle }
});

export const regressionCases: RegressionCase[] = [
  {
    name: 'balanced-fan-layout',
    arch: {
      width: 420,
      height: 320,
      contour: [],
      innerCenter: { x: 210, y: 205 },
      anchors: [
        { id: 'a1', x: 120, y: 258, bars: createBars(-0.85, -0.65, -0.5) },
        { id: 'a2', x: 210, y: 265, bars: createBars(-1.7, -1.5, -1.3) },
        { id: 'a3', x: 300, y: 256, bars: createBars(-2.4, -2.2, -2.0) }
      ]
    },
    expectedRanges: {
      convergence: { min: 72, max: 86 },
      compactness: { min: 60, max: 75 },
      collision: { min: 0, max: 10 },
      balance: { min: 99, max: 100 }
    }
  }
];
