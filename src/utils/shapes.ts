import { BlockData, Shape } from '../types';

export const SHAPES: { shape: Shape; color: string }[] = [
  // 1x1
  { shape: [[1]], color: 'bg-red-500' },
  // 1x2, 2x1
  { shape: [[1, 1]], color: 'bg-blue-500' },
  { shape: [[1], [1]], color: 'bg-blue-500' },
  // 1x3, 3x1
  { shape: [[1, 1, 1]], color: 'bg-green-500' },
  { shape: [[1], [1], [1]], color: 'bg-green-500' },
  // 1x4, 4x1
  { shape: [[1, 1, 1, 1]], color: 'bg-yellow-500' },
  { shape: [[1], [1], [1], [1]], color: 'bg-yellow-500' },
  // 1x5, 5x1
  { shape: [[1, 1, 1, 1, 1]], color: 'bg-purple-500' },
  { shape: [[1], [1], [1], [1], [1]], color: 'bg-purple-500' },
  // 2x2
  { shape: [[1, 1], [1, 1]], color: 'bg-pink-500' },
  // 3x3
  { shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 'bg-indigo-500' },
  // L-shapes (small)
  { shape: [[1, 0], [1, 1]], color: 'bg-orange-500' },
  { shape: [[0, 1], [1, 1]], color: 'bg-orange-500' },
  { shape: [[1, 1], [1, 0]], color: 'bg-orange-500' },
  { shape: [[1, 1], [0, 1]], color: 'bg-orange-500' },
  // L-shapes (large)
  { shape: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: 'bg-teal-500' },
  { shape: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], color: 'bg-teal-500' },
  { shape: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: 'bg-teal-500' },
  { shape: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: 'bg-teal-500' },
  // T-shapes
  { shape: [[1, 1, 1], [0, 1, 0], [0, 1, 0]], color: 'bg-cyan-500' },
  { shape: [[0, 1, 0], [0, 1, 0], [1, 1, 1]], color: 'bg-cyan-500' },
  { shape: [[1, 0, 0], [1, 1, 1], [1, 0, 0]], color: 'bg-cyan-500' },
  { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 1]], color: 'bg-cyan-500' },
  // Z-shapes
  { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-lime-500' },
  { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-lime-500' },
  { shape: [[1, 0], [1, 1], [0, 1]], color: 'bg-lime-500' },
  { shape: [[0, 1], [1, 1], [1, 0]], color: 'bg-lime-500' },
];

export const getRandomBlocks = (count: number): BlockData[] => {
  return Array.from({ length: count }, () => {
    const shapeObj = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return {
      id: Math.random().toString(36).substring(2, 9),
      shape: shapeObj.shape,
      color: shapeObj.color,
    };
  });
};
