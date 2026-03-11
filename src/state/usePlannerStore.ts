import { create } from 'zustand';
import type { Anchor, BarType, DentalArch, ScoreBreakdown } from '../domain/models';

interface PlannerState {
  randomSeed: number;
  barLengths: Record<BarType, number>;
  arch: DentalArch;
  score: ScoreBreakdown;
  setRandomSeed: (seed: number) => void;
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

const makeAnchor = (id: number, width: number, height: number, barLengths: Record<BarType, number>): Anchor => ({
  id: `A-${id}`,
  x: 120 + (id * 53) % (width - 240),
  y: 90 + (id * 31) % (height - 160),
  active: true,
  bars: {
    short: { type: 'short', length: barLengths.short },
    medium: { type: 'medium', length: barLengths.medium },
    long: { type: 'long', length: barLengths.long }
  }
});

const initialBarLengths: Record<BarType, number> = {
  short: 8,
  medium: 12,
  long: 16
};

const initialArch: DentalArch = {
  width: 720,
  height: 360,
  anchors: [1, 2, 3, 4, 5].map((id) => makeAnchor(id, 720, 360, initialBarLengths))
};

export const usePlannerStore = create<PlannerState>((set) => ({
  randomSeed: 42,
  barLengths: initialBarLengths,
  arch: initialArch,
  score: calcScore(initialArch),
  setRandomSeed: (seed) => set({ randomSeed: seed }),
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
      const newAnchor = makeAnchor(nextId, state.arch.width, state.arch.height, state.barLengths);
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
