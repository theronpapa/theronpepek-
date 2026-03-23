import { GridData, Shape } from '../types';

export const canPlaceBlock = (grid: GridData, shape: Shape, startRow: number, startCol: number): boolean => {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 1) {
        const gridRow = startRow + r;
        const gridCol = startCol + c;
        if (gridRow < 0 || gridRow >= 8 || gridCol < 0 || gridCol >= 8) {
          return false;
        }
        if (grid[gridRow][gridCol] !== null) {
          return false;
        }
      }
    }
  }
  return true;
};

export const checkLines = (grid: GridData) => {
  const rowsToClear: number[] = [];
  const colsToClear: number[] = [];

  // Check rows
  for (let r = 0; r < 8; r++) {
    if (grid[r].every((cell) => cell !== null)) {
      rowsToClear.push(r);
    }
  }

  // Check columns
  for (let c = 0; c < 8; c++) {
    let full = true;
    for (let r = 0; r < 8; r++) {
      if (grid[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) {
      colsToClear.push(c);
    }
  }

  return { rowsToClear, colsToClear };
};

export const clearLines = (grid: GridData, rowsToClear: number[], colsToClear: number[]) => {
  const newGrid = grid.map((row) => [...row]);

  rowsToClear.forEach((r) => {
    for (let c = 0; c < 8; c++) {
      newGrid[r][c] = null;
    }
  });

  colsToClear.forEach((c) => {
    for (let r = 0; r < 8; r++) {
      newGrid[r][c] = null;
    }
  });

  return newGrid;
};

export const isGameOver = (grid: GridData, availableBlocks: (Shape | null)[]): boolean => {
  const activeBlocks = availableBlocks.filter((b) => b !== null) as Shape[];
  if (activeBlocks.length === 0) return false;

  for (const shape of activeBlocks) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (canPlaceBlock(grid, shape, r, c)) {
          return false;
        }
      }
    }
  }
  return true;
};
