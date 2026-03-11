import type { ArchPoint } from '../domain/models';

export const toArchPath = (points: ArchPoint[]): string => {
  if (points.length === 0) {
    return '';
  }

  if (points.length < 3) {
    return `M ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}`;
  }

  const [first, ...rest] = points;
  const path: string[] = [`M ${first.x} ${first.y}`];

  for (let i = 0; i < rest.length - 1; i += 1) {
    const current = rest[i];
    const next = rest[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path.push(`Q ${current.x} ${current.y} ${midX} ${midY}`);
  }

  const last = points[points.length - 1];
  path.push(`T ${last.x} ${last.y}`);

  return path.join(' ');
};

export const calcInnerCenterFromPoints = (points: ArchPoint[]): ArchPoint => {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const center = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: center.x / points.length,
    y: center.y / points.length + 58
  };
};
