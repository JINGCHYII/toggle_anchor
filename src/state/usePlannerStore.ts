import { create } from 'zustand';
import { generateArchCurve } from '../domain/archGenerator';
import type { Anchor, ArchPoint, BarType, DentalArch, ScoreBreakdown } from '../domain/models';

interface PlannerState {
  randomSeed: number;
  barLengths: Record<BarType, number>;
  arch: DentalArch;
  score: ScoreBreakdown;
  setRandomSeed: (seed: number) => void;
  rerollArch: () => void;
  setBarLength: (type: BarType, length: number) => void;
  addAnchor: () => void;
  removeAnchor: (id: string) => void;
  toggleAnchor: (id: string) => void;
}

const calcScore = (arch: DentalArch): ScoreBreakdown => {
  const count = arch.anchors.length;
  const active = arch.anchors.filter((a) => a.active).length;
  const cohesion = Math.min(100, active * 8);
  const compactness = Math.max(0, 100 - count * 4);
  const collision = Math.max(0, 100 - Math.max(0, count - 10) * 10);
  const balance = Math.max(0, 100 - Math.abs(active - (count - active)) * 6);
  const total = Math.round((cohesion + compactness + collision + balance) / 4);

  return { cohesion, compactness, collision, balance, total };
};

const makeAnchor = (
  id: number,
  fallbackWidth: number,
  fallbackHeight: number,
  barLengths: Record<BarType, number>,
  contour: ArchPoint[]
): Anchor => {
  const contourIndex = Math.max(0, Math.min(contour.length - 1, Math.round((id / 7) * contour.length)));
  const curvePoint = contour[contourIndex];

  return {
    id: `A-${id}`,
    x: curvePoint?.x ?? 120 + (id * 53) % (fallbackWidth - 240),
    y: curvePoint ? curvePoint.y + 44 : 90 + (id * 31) % (fallbackHeight - 160),
    active: true,
    bars: {
      short: { type: 'short', length: barLengths.short },
      medium: { type: 'medium', length: barLengths.medium },
      long: { type: 'long', length: barLengths.long }
    }
  };
};

const initialBarLengths: Record<BarType, number> = {
  short: 8,
  medium: 12,
  long: 16
};

const buildArch = (
  seed: number,
  barLengths: Record<BarType, number>,
  width = 720,
  height = 360,
  anchorCount = 5
): DentalArch => {
  const curve = generateArchCurve({ width, height, seed, segmentCount: 64 });

  return {
    width,
    height,
    contour: curve.outerPoints,
    innerCenter: curve.innerCenter,
    anchors: Array.from({ length: anchorCount }, (_, idx) => makeAnchor(idx + 1, width, height, barLengths, curve.outerPoints))
  };
};

const initialSeed = 42;
const initialArch: DentalArch = buildArch(initialSeed, initialBarLengths);

export const usePlannerStore = create<PlannerState>((set) => ({
  randomSeed: initialSeed,
  barLengths: initialBarLengths,
  arch: initialArch,
  score: calcScore(initialArch),
  setRandomSeed: (seed) =>
    set((state) => {
      const arch = buildArch(seed, state.barLengths, state.arch.width, state.arch.height, state.arch.anchors.length);
      return { randomSeed: seed, arch, score: calcScore(arch) };
    }),
  rerollArch: () =>
    set((state) => {
      const nextSeed = state.randomSeed + 1;
      const arch = buildArch(nextSeed, state.barLengths, state.arch.width, state.arch.height, state.arch.anchors.length);
      return { randomSeed: nextSeed, arch, score: calcScore(arch) };
    }),
  setBarLength: (type, length) =>
    set((state) => {
      const barLengths = { ...state.barLengths, [type]: length };
      const arch = {
        ...state.arch,
        anchors: state.arch.anchors.map((anchor) => ({
          ...anchor,
          bars: {
            ...anchor.bars,
            [type]: { ...anchor.bars[type], length }
          }
        }))
      };
      return { barLengths, arch, score: calcScore(arch) };
    }),
  addAnchor: () =>
    set((state) => {
      const nextId = state.arch.anchors.length + 1;
      const newAnchor = makeAnchor(nextId, state.arch.width, state.arch.height, state.barLengths, state.arch.contour);
      const arch = { ...state.arch, anchors: [...state.arch.anchors, newAnchor] };
      return { arch, score: calcScore(arch) };
    }),
  removeAnchor: (id) =>
    set((state) => {
      const arch = {
        ...state.arch,
        anchors: state.arch.anchors.filter((anchor) => anchor.id !== id)
      };
      return { arch, score: calcScore(arch) };
    }),
  toggleAnchor: (id) =>
    set((state) => {
      const arch = {
        ...state.arch,
        anchors: state.arch.anchors.map((anchor) =>
          anchor.id === id ? { ...anchor, active: !anchor.active } : anchor
        )
      };
      return { arch, score: calcScore(arch) };
    })
}));
