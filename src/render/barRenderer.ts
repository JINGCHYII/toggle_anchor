import type { Anchor, ScanBar } from '../domain/models';
import { BAR_WIDTH } from '../domain/placement';

export interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
  angleDeg: number;
}

export const getBarRect = (anchor: Pick<Anchor, 'x' | 'y'>, bar: Pick<ScanBar, 'length' | 'angle'>): BarRect => {
  const width = bar.length * 10;
  const height = BAR_WIDTH;
  const x = anchor.x;
  const y = anchor.y - height / 2;

  return {
    x,
    y,
    width,
    height,
    angleDeg: (bar.angle * 180) / Math.PI
  };
};
