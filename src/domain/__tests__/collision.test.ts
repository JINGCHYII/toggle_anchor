import { describe, expect, it } from 'vitest';

import type { DentalArch } from '../models';
import { scoreCollision } from '../scoring';

const createArch = (anchors: DentalArch['anchors']): DentalArch => ({
  width: 420,
  height: 320,
  contour: [],
  innerCenter: { x: 210, y: 200 },
  anchors
});

describe('scoreCollision', () => {
  it('detects a typical overlap', () => {
    const arch = createArch([
      {
        id: 'left',
        x: 120,
        y: 200,
        bars: {
          short: { type: 'short', length: 120, placed: true, angle: 0 },
          medium: { type: 'medium', length: 52, placed: false, angle: 0 },
          long: { type: 'long', length: 74, placed: false, angle: 0 }
        }
      },
      {
        id: 'right',
        x: 160,
        y: 200,
        bars: {
          short: { type: 'short', length: 120, placed: true, angle: Math.PI },
          medium: { type: 'medium', length: 52, placed: false, angle: 0 },
          long: { type: 'long', length: 74, placed: false, angle: 0 }
        }
      }
    ]);

    const result = scoreCollision(arch);

    expect(result.collisionPairs).toBe(1);
    expect(result.score).toBe(65);
  });

  it('keeps score perfect when bars are clearly separated', () => {
    const arch = createArch([
      {
        id: 'a1',
        x: 40,
        y: 40,
        bars: {
          short: { type: 'short', length: 36, placed: true, angle: 0 },
          medium: { type: 'medium', length: 52, placed: false, angle: 0 },
          long: { type: 'long', length: 74, placed: false, angle: 0 }
        }
      },
      {
        id: 'a2',
        x: 360,
        y: 260,
        bars: {
          short: { type: 'short', length: 36, placed: true, angle: 0 },
          medium: { type: 'medium', length: 52, placed: false, angle: 0 },
          long: { type: 'long', length: 74, placed: false, angle: 0 }
        }
      }
    ]);

    const result = scoreCollision(arch);

    expect(result.collisionPairs).toBe(0);
    expect(result.score).toBe(100);
  });
});
