export type BarType = 'short' | 'medium' | 'long';

export interface ScanBar {
  type: BarType;
  length: number;
  placed: boolean;
  angle: number;
}

export interface Anchor {
  id: string;
  x: number;
  y: number;
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
