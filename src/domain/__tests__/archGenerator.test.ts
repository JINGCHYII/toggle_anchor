import { describe, expect, it } from 'vitest';

import { generateArchCurve } from '../archGenerator';

describe('generateArchCurve', () => {
  it('returns reproducible result with a fixed seed', () => {
    const options = { width: 400, height: 300, seed: 20240321, segmentCount: 12, archInset: 64 };

    const firstRun = generateArchCurve(options);
    const secondRun = generateArchCurve(options);
    const differentSeedRun = generateArchCurve({ ...options, seed: 20240322 });

    expect(secondRun).toEqual(firstRun);
    expect(differentSeedRun).not.toEqual(firstRun);

    expect(firstRun.outerPoints).toHaveLength(13);
    expect(firstRun.outerPoints[0]).toEqual({ x: 64, y: 232 });
    expect(firstRun.outerPoints.at(-1)).toEqual({ x: 336, y: 232 });
    expect(firstRun.innerCenter.y).toBeGreaterThan(120);
    expect(firstRun.innerCenter.y).toBeLessThanOrEqual(220);
  });
});
