import { create } from 'zustand';
import { generateArchCurve } from '../domain/archGenerator';
import { getPlacementAngle } from '../domain/placement';
import { scoreTotal } from '../domain/scoring';
import type { Anchor, ArchPoint, BarType, DentalArch } from '../domain/models';
import type { ScoreResult } from '../domain/types';

interface PlannerState {
  randomSeed: number;
  barLengths: Record<BarType, number>;
  arch: DentalArch;
  score: ScoreResult;
  selectedAnchorId: string | null;
  setRandomSeed: (seed: number) => void;
  rerollArch: () => void;
  setBarLength: (type: BarType, length: number) => void;
  addAnchor: () => void;
  removeAnchor: (id: string) => void;
  selectAnchor: (id: string) => void;
  placeBar: (anchorId: string, type: BarType) => void;
  setBarAngle: (anchorId: string, type: BarType, angle: number) => void;
}

const makeAnchor = (
  id: number,
  fallbackWidth: number,
  fallbackHeight: number,
  barLengths: Record<BarType, number>,
  contour: ArchPoint[],
  innerCenter: ArchPoint
): Anchor => {
  const contourIndex = Math.max(0, Math.min(contour.length - 1, Math.round((id / 7) * contour.length)));
  const curvePoint = contour[contourIndex];

  const x = curvePoint?.x ?? 120 + (id * 53) % (fallbackWidth - 240);
  const y = curvePoint ? curvePoint.y + 44 : 90 + (id * 31) % (fallbackHeight - 160);
  const placementAngle = getPlacementAngle({ x, y }, innerCenter);

  return {
    id: `A-${id}`,
    x,
    y,
    bars: {
      short: { type: 'short', length: barLengths.short, placed: false, angle: placementAngle },
      medium: { type: 'medium', length: barLengths.medium, placed: false, angle: placementAngle },
      long: { type: 'long', length: barLengths.long, placed: false, angle: placementAngle }
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
    anchors: Array.from({ length: anchorCount }, (_, idx) =>
      makeAnchor(idx + 1, width, height, barLengths, curve.outerPoints, curve.innerCenter)
    )
  };
};

const initialSeed = 42;
const initialArch: DentalArch = buildArch(initialSeed, initialBarLengths);

export const usePlannerStore = create<PlannerState>((set) => ({
  randomSeed: initialSeed,
  barLengths: initialBarLengths,
  arch: initialArch,
  selectedAnchorId: initialArch.anchors[0]?.id ?? null,
  score: scoreTotal(initialArch),
  setRandomSeed: (seed) =>
    set((state) => {
      const arch = buildArch(seed, state.barLengths, state.arch.width, state.arch.height, state.arch.anchors.length);
      return { randomSeed: seed, arch, selectedAnchorId: arch.anchors[0]?.id ?? null, score: scoreTotal(arch) };
    }),
  rerollArch: () =>
    set((state) => {
      const nextSeed = state.randomSeed + 1;
      const arch = buildArch(nextSeed, state.barLengths, state.arch.width, state.arch.height, state.arch.anchors.length);
      return { randomSeed: nextSeed, arch, selectedAnchorId: arch.anchors[0]?.id ?? null, score: scoreTotal(arch) };
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
      return { barLengths, arch, score: scoreTotal(arch) };
    }),
  addAnchor: () =>
    set((state) => {
      const nextId = state.arch.anchors.length + 1;
      const newAnchor = makeAnchor(
        nextId,
        state.arch.width,
        state.arch.height,
        state.barLengths,
        state.arch.contour,
        state.arch.innerCenter
      );
      const arch = { ...state.arch, anchors: [...state.arch.anchors, newAnchor] };
      return { arch, selectedAnchorId: newAnchor.id, score: scoreTotal(arch) };
    }),
  removeAnchor: (id) =>
    set((state) => {
      const nextAnchors = state.arch.anchors.filter((anchor) => anchor.id !== id);
      const arch = {
        ...state.arch,
        anchors: nextAnchors
      };
      const selectedAnchorId =
        state.selectedAnchorId === id ? (nextAnchors[0]?.id ?? null) : state.selectedAnchorId;
      return { arch, selectedAnchorId, score: scoreTotal(arch) };
    }),
  selectAnchor: (id) => set(() => ({ selectedAnchorId: id })),
  placeBar: (anchorId, type) =>
    set((state) => {
      const arch = {
        ...state.arch,
        anchors: state.arch.anchors.map((anchor) => {
          if (anchor.id !== anchorId) {
            return anchor;
          }

          return {
            ...anchor,
            bars: {
              ...anchor.bars,
              [type]: {
                ...anchor.bars[type],
                placed: true,
                angle: getPlacementAngle(anchor, state.arch.innerCenter)
              }
            }
          };
        })
      };

      return { arch, score: scoreTotal(arch) };
    }),
  setBarAngle: (anchorId, type, angle) =>
    set((state) => {
      const arch = {
        ...state.arch,
        anchors: state.arch.anchors.map((anchor) => {
          if (anchor.id !== anchorId) {
            return anchor;
          }

          return {
            ...anchor,
            bars: {
              ...anchor.bars,
              [type]: {
                ...anchor.bars[type],
                angle
              }
            }
          };
        })
      };

      return { arch, score: scoreTotal(arch) };
    })
}));
