import { describe, expect, it } from 'vitest';

import type { DentalArch } from '../models';
import { scoreBalance, scoreCollision, scoreCompactness, scoreTotal } from '../scoring';
import { regressionCases } from './fixtures/regressionCases';

const makeArch = (anchors: DentalArch['anchors']): DentalArch => ({
  width: 420,
  height: 320,
  contour: [],
  innerCenter: { x: 210, y: 205 },
  anchors
});

describe('scoring boundary behavior', () => {
  it('full collision drives collision score to zero (penalty cap)', () => {
    const arch = makeArch([
      {
        id: 'stacked',
        x: 180,
        y: 220,
        bars: {
          short: { type: 'short', length: 90, placed: true, angle: 0 },
          medium: { type: 'medium', length: 90, placed: true, angle: 0 },
          long: { type: 'long', length: 90, placed: true, angle: 0 }
        }
      }
    ]);

    const collision = scoreCollision(arch);

    expect(collision.collisionPairs).toBe(3);
    expect(collision.penalty).toBe(100);
    expect(collision.score).toBe(0);
  });

  it('all bars tightly clustered yields low compactness score', () => {
    const arch = makeArch([
      {
        id: 'a1',
        x: 190,
        y: 220,
        bars: {
          short: { type: 'short', length: 40, placed: true, angle: -Math.PI / 2 },
          medium: { type: 'medium', length: 42, placed: true, angle: -Math.PI / 2 },
          long: { type: 'long', length: 44, placed: true, angle: -Math.PI / 2 }
        }
      }
    ]);

    const compactness = scoreCompactness(arch);

    expect(compactness.value).toBeLessThanOrEqual(18);
    expect(compactness.score).toBeLessThanOrEqual(30);
  });

  it('extremely imbalanced bar types lowers balance score near minimum', () => {
    const arch = makeArch([
      {
        id: 'a1',
        x: 90,
        y: 260,
        bars: {
          short: { type: 'short', length: 36, placed: true, angle: -1.0 },
          medium: { type: 'medium', length: 52, placed: false, angle: -1.1 },
          long: { type: 'long', length: 74, placed: false, angle: -1.2 }
        }
      },
      {
        id: 'a2',
        x: 210,
        y: 260,
        bars: {
          short: { type: 'short', length: 36, placed: true, angle: -1.6 },
          medium: { type: 'medium', length: 52, placed: false, angle: -1.7 },
          long: { type: 'long', length: 74, placed: false, angle: -1.8 }
        }
      },
      {
        id: 'a3',
        x: 330,
        y: 260,
        bars: {
          short: { type: 'short', length: 36, placed: true, angle: -2.2 },
          medium: { type: 'medium', length: 52, placed: false, angle: -2.3 },
          long: { type: 'long', length: 74, placed: false, angle: -2.4 }
        }
      }
    ]);

    const balance = scoreBalance(arch);

    expect(balance.counts).toEqual({ short: 3, medium: 0, long: 0 });
    expect(balance.score).toBe(0);
  });
});

describe('scoring regression snapshot ranges', () => {
  it('keeps stable score ranges for fixed anchors and bars', () => {
    const scored = regressionCases.map((caseItem) => {
      const score = scoreTotal(caseItem.arch);
      return {
        name: caseItem.name,
        score,
        expected: caseItem.expectedRanges
      };
    });

    scored.forEach(({ name, score, expected }) => {
      expect(score.convergence, `${name} convergence`).toBeGreaterThanOrEqual(expected.convergence.min);
      expect(score.convergence, `${name} convergence`).toBeLessThanOrEqual(expected.convergence.max);

      expect(score.compactness, `${name} compactness`).toBeGreaterThanOrEqual(expected.compactness.min);
      expect(score.compactness, `${name} compactness`).toBeLessThanOrEqual(expected.compactness.max);

      expect(score.collision, `${name} collision`).toBeGreaterThanOrEqual(expected.collision.min);
      expect(score.collision, `${name} collision`).toBeLessThanOrEqual(expected.collision.max);

      expect(score.balance, `${name} balance`).toBeGreaterThanOrEqual(expected.balance.min);
      expect(score.balance, `${name} balance`).toBeLessThanOrEqual(expected.balance.max);
    });
  });
});
