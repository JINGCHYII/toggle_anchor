import type { Anchor, ArchPoint, BarType } from './models';

export const BAR_WIDTH = 10;

export const getPlacementAngle = (anchor: Pick<Anchor, 'x' | 'y'>, center: ArchPoint): number => {
  const dx = center.x - anchor.x;
  const dy = center.y - anchor.y;
  return Math.atan2(dy, dx);
};

export const getDragAngle = (anchor: Pick<Anchor, 'x' | 'y'>, cursor: ArchPoint): number => {
  const dx = cursor.x - anchor.x;
  const dy = cursor.y - anchor.y;
  return Math.atan2(dy, dx);
};

export const BAR_TYPES: BarType[] = ['short', 'medium', 'long'];
