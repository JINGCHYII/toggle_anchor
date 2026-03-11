export type BarType = 'short' | 'medium' | 'long';

export interface ScanBar {
  type: BarType;
  length: number;
}

export interface Anchor {
  id: string;
  x: number;
  y: number;
  active: boolean;
  bars: Record<BarType, ScanBar>;
}

export interface ArchPoint {
  x: number;
  y: number;
}

export interface DentalArch {
  width: number;
  height: number;
  contour: ArchPoint[];
  innerCenter: ArchPoint;
  anchors: Anchor[];
}

export interface ScoreBreakdown {
  cohesion: number;
  compactness: number;
  collision: number;
  balance: number;
  total: number;
}
