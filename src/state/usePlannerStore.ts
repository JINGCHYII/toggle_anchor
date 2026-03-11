import { create } from 'zustand';
import {
  CUBIC_RANGES,
  closestPointOnCurve,
  generateArchCurve,
  type CubicCoefficients
} from '../domain/archGenerator';
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
  cubic: CubicCoefficients;
  setRandomSeed: (seed: number) => void;
  rerollArch: () => void;
  setBarLength: (type: BarType, length: number) => void;
  setCubicCoefficient: (type: keyof CubicCoefficients, value: number) => void;
  addAnchor: () => void;
  addAnchorAtPoint: (x: number, y: number) => void;
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
  innerCenter: ArchPoint,
  fixedPoint?: ArchPoint
): Anchor => {
  const contourIndex = Math.max(0, Math.min(contour.length - 1, Math.round((id / 7) * contour.length)));
  const curvePoint = contour[contourIndex];

  const x = fixedPoint?.x ?? curvePoint?.x ?? 120 + (id * 53) % (fallbackWidth - 240);
  const y = fixedPoint?.y ?? (curvePoint ? curvePoint.y + 44 : 90 + (id * 31) % (fallbackHeight - 160));
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
  short: 12,
  medium: 17,
  long: 23
};

const buildArch = (
  seed: number,
  barLengths: Record<BarType, number>,
  coefficients?: CubicCoefficients,
  width = 720,
  height = 360,
  anchorCount = 0
): { arch: DentalArch; cubic: CubicCoefficients } => {
  const curve = generateArchCurve({ width, height, seed, segmentCount: 64, coefficients });

  return {
    cubic: curve.coefficients,
    arch: {
      width,
      height,
      contour: curve.outerPoints,
      innerCenter: curve.innerCenter,
      anchors: Array.from({ length: anchorCount }, (_, idx) =>
        makeAnchor(idx + 1, width, height, barLengths, curve.outerPoints, curve.innerCenter)
      )
    }
  };
};

const initialSeed = 42;
const initialState = buildArch(initialSeed, initialBarLengths);

const clampCoeff = (type: keyof CubicCoefficients, value: number) =>
  Math.max(CUBIC_RANGES[type].min, Math.min(CUBIC_RANGES[type].max, value));

export const usePlannerStore = create<PlannerState>((set) => ({
  randomSeed: initialSeed,
  barLengths: initialBarLengths,
  arch: initialState.arch,
  cubic: initialState.cubic,
  selectedAnchorId: initialState.arch.anchors[0]?.id ?? null,
  score: scoreTotal(initialState.arch),
  setRandomSeed: (seed) =>
    set((state) => {
      const { arch, cubic } = buildArch(seed, state.barLengths, undefined, state.arch.width, state.arch.height, 0);
      return { randomSeed: seed, cubic, arch, selectedAnchorId: null, score: scoreTotal(arch) };
    }),
  rerollArch: () =>
    set((state) => {
      const nextSeed = state.randomSeed + 1;
      const { arch, cubic } = buildArch(nextSeed, state.barLengths, undefined, state.arch.width, state.arch.height, 0);
      return { randomSeed: nextSeed, cubic, arch, selectedAnchorId: null, score: scoreTotal(arch) };
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
  setCubicCoefficient: (type, value) =>
    set((state) => {
      const cubic = { ...state.cubic, [type]: clampCoeff(type, value) };
      const curve = generateArchCurve({
        width: state.arch.width,
        height: state.arch.height,
        seed: state.randomSeed,
        segmentCount: 64,
        coefficients: cubic
      });

      const arch = {
        ...state.arch,
        contour: curve.outerPoints,
        innerCenter: curve.innerCenter,
        anchors: state.arch.anchors.map((anchor) => {
          const snapped = closestPointOnCurve(curve.outerPoints, anchor.x, anchor.y);
          const angle = getPlacementAngle(snapped, curve.innerCenter);
          return {
            ...anchor,
            x: snapped.x,
            y: snapped.y,
            bars: {
              short: { ...anchor.bars.short, angle },
              medium: { ...anchor.bars.medium, angle },
              long: { ...anchor.bars.long, angle }
            }
          };
        })
      };

      return { cubic, arch, score: scoreTotal(arch) };
    }),
  addAnchor: () =>
    set((state) => {
      const nextId = state.arch.anchors.length + 1;
      const snapped = closestPointOnCurve(state.arch.contour, state.arch.width / 2, state.arch.height / 2);
      const newAnchor = makeAnchor(
        nextId,
        state.arch.width,
        state.arch.height,
        state.barLengths,
        state.arch.contour,
        state.arch.innerCenter,
        snapped
      );
      const arch = { ...state.arch, anchors: [...state.arch.anchors, newAnchor] };
      return { arch, selectedAnchorId: newAnchor.id, score: scoreTotal(arch) };
    }),
  addAnchorAtPoint: (x, y) =>
    set((state) => {
      const nextId = state.arch.anchors.length + 1;
      const newAnchor = makeAnchor(
        nextId,
        state.arch.width,
        state.arch.height,
        state.barLengths,
        state.arch.contour,
        state.arch.innerCenter,
        {
          x: Math.max(0, Math.min(state.arch.width, x)),
          y: Math.max(0, Math.min(state.arch.height, y))
        }
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
