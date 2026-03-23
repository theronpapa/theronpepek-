export type Shape = number[][];

export interface BlockData {
  id: string;
  shape: Shape;
  color: string;
}

export type GridData = (string | null)[][];
