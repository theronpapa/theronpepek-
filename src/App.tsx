import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw } from 'lucide-react';
import { BlockData, GridData } from './types';
import { getRandomBlocks } from './utils/shapes';
import { canPlaceBlock, checkLines, clearLines, isGameOver } from './utils/gameLogic';

const GRID_SIZE = 8;
const CELL_SIZE = 40; // Desktop cell size
const CELL_GAP = 4;

const createEmptyGrid = (): GridData => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

export default function App() {
  const [grid, setGrid] = useState<GridData>(createEmptyGrid());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [availableBlocks, setAvailableBlocks] = useState<(BlockData | null)[]>([null, null, null]);
  const [gameOver, setGameOver] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [draggedBlock, setDraggedBlock] = useState<{
    index: number;
    block: BlockData;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [clearingLines, setClearingLines] = useState<{ rows: number[]; cols: number[] }>({ rows: [], cols: [] });

  useEffect(() => {
    const savedHighScore = localStorage.getItem('blockBlastHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
    setAvailableBlocks(getRandomBlocks(3));
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('blockBlastHighScore', score.toString());
    }
  }, [score, highScore]);

  const handlePointerDown = (e: React.PointerEvent, index: number, block: BlockData) => {
    if (gameOver) return;
    
    // Prevent default to avoid scrolling on mobile
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    // Calculate offset from the top-left of the block container
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDraggedBlock({
      index,
      block,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      offsetX,
      offsetY,
    });
    setHoveredCell(null);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!draggedBlock) return;

    setDraggedBlock((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
      };
    });

    if (gridRef.current) {
      const gridRect = gridRef.current.getBoundingClientRect();
      
      // Calculate the top-left position of the dragged block
      const blockTopLeftX = e.clientX - draggedBlock.offsetX;
      const blockTopLeftY = e.clientY - draggedBlock.offsetY;

      // Calculate relative to grid
      const relativeX = blockTopLeftX - gridRect.left;
      const relativeY = blockTopLeftY - gridRect.top;

      // Calculate actual cell size based on grid width (for responsiveness)
      const actualCellSize = (gridRect.width - (GRID_SIZE - 1) * CELL_GAP) / GRID_SIZE;
      const totalCellSize = actualCellSize + CELL_GAP;

      // Add half a cell size to snap to nearest cell center
      const col = Math.round(relativeX / totalCellSize);
      const row = Math.round(relativeY / totalCellSize);

      if (canPlaceBlock(grid, draggedBlock.block.shape, row, col)) {
        setHoveredCell({ row, col });
      } else {
        setHoveredCell(null);
      }
    }
  }, [draggedBlock, grid]);

  const handlePointerUp = useCallback(() => {
    if (!draggedBlock) return;

    if (hoveredCell) {
      // Place block
      const newGrid = grid.map(row => [...row]);
      const { shape, color } = draggedBlock.block;
      const { row, col } = hoveredCell;

      let blocksPlaced = 0;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] === 1) {
            newGrid[row + r][col + c] = color;
            blocksPlaced++;
          }
        }
      }

      setGrid(newGrid);
      
      // Update available blocks
      const newAvailableBlocks = [...availableBlocks];
      newAvailableBlocks[draggedBlock.index] = null;
      
      // Check if all blocks are used
      if (newAvailableBlocks.every(b => b === null)) {
        const nextBlocks = getRandomBlocks(3);
        setAvailableBlocks(nextBlocks);
        
        // Check game over with new blocks
        if (isGameOver(newGrid, nextBlocks.map(b => b?.shape || null))) {
          setGameOver(true);
        }
      } else {
        setAvailableBlocks(newAvailableBlocks);
        // Check game over with remaining blocks
        if (isGameOver(newGrid, newAvailableBlocks.map(b => b?.shape || null))) {
          setGameOver(true);
        }
      }

      // Check for line clears
      const { rowsToClear, colsToClear } = checkLines(newGrid);
      
      if (rowsToClear.length > 0 || colsToClear.length > 0) {
        setClearingLines({ rows: rowsToClear, cols: colsToClear });
        
        // Calculate score
        const linesCleared = rowsToClear.length + colsToClear.length;
        const baseScore = blocksPlaced;
        const lineScore = linesCleared * 10;
        const comboScore = linesCleared > 1 ? linesCleared * 5 : 0;
        
        setScore(s => s + baseScore + lineScore + comboScore);

        // Clear lines after animation
        setTimeout(() => {
          setGrid(clearLines(newGrid, rowsToClear, colsToClear));
          setClearingLines({ rows: [], cols: [] });
          
          // Re-check game over after clearing lines, as space might have opened up
          // We need to use the latest available blocks here
          setAvailableBlocks(currentBlocks => {
             const clearedGrid = clearLines(newGrid, rowsToClear, colsToClear);
             if (!isGameOver(clearedGrid, currentBlocks.map(b => b?.shape || null))) {
                setGameOver(false);
             }
             return currentBlocks;
          });
        }, 300);
      } else {
        setScore(s => s + blocksPlaced);
      }
    }

    setDraggedBlock(null);
    setHoveredCell(null);
  }, [draggedBlock, hoveredCell, grid, availableBlocks]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const restartGame = () => {
    setGrid(createEmptyGrid());
    setScore(0);
    setAvailableBlocks(getRandomBlocks(3));
    setGameOver(false);
    setDraggedBlock(null);
    setHoveredCell(null);
    setClearingLines({ rows: [], cols: [] });
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center py-8 font-sans overflow-hidden touch-none">
      {/* Header */}
      <div className="w-full max-w-md px-6 flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">haoqian blast 666</h1>
          <div className="flex items-center gap-4 text-neutral-400 font-mono text-sm">
            <div className="flex items-center gap-1">
              <Trophy size={16} className="text-yellow-500" />
              <span>{highScore}</span>
            </div>
            <div>SCORE: <span className="text-white font-bold">{score}</span></div>
          </div>
        </div>
        <button 
          onClick={restartGame}
          className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors"
          aria-label="Restart Game"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Game Board */}
      <div className="relative mb-12 select-none">
        <div 
          ref={gridRef}
          className="bg-neutral-800 p-2 rounded-xl shadow-2xl"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            gap: `${CELL_GAP}px`,
            width: 'min(90vw, 400px)',
            height: 'min(90vw, 400px)',
          }}
        >
          {grid.map((row, rIndex) => (
            row.map((cellColor, cIndex) => {
              const isClearingRow = clearingLines.rows.includes(rIndex);
              const isClearingCol = clearingLines.cols.includes(cIndex);
              const isClearing = isClearingRow || isClearingCol;
              
              let isHovered = false;
              let hoverColor = '';
              
              if (hoveredCell && draggedBlock) {
                const { shape, color } = draggedBlock.block;
                const rOffset = rIndex - hoveredCell.row;
                const cOffset = cIndex - hoveredCell.col;
                
                if (
                  rOffset >= 0 && rOffset < shape.length &&
                  cOffset >= 0 && cOffset < shape[0].length &&
                  shape[rOffset][cOffset] === 1
                ) {
                  isHovered = true;
                  hoverColor = color;
                }
              }

              return (
                <motion.div
                  key={`${rIndex}-${cIndex}`}
                  className={`rounded-sm ${cellColor || (isHovered ? hoverColor : 'bg-neutral-700/50')}`}
                  animate={{
                    scale: isClearing ? 0 : 1,
                    opacity: isHovered && !cellColor ? 0.5 : 1,
                  }}
                  transition={{ duration: isClearing ? 0.3 : 0.1 }}
                />
              );
            })
          ))}
        </div>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 rounded-xl flex flex-col items-center justify-center z-10 backdrop-blur-sm"
            >
              <h2 className="text-4xl font-bold text-white mb-2">Game Over!</h2>
              <p className="text-neutral-300 mb-6">Final Score: {score}</p>
              <button 
                onClick={restartGame}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-full transition-colors flex items-center gap-2"
              >
                <RotateCcw size={18} />
                Play Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Available Blocks */}
      <div className="flex justify-center gap-6 px-4 w-full max-w-md h-32">
        {availableBlocks.map((block, index) => (
          <div key={index} className="flex-1 flex items-center justify-center relative">
            {block && draggedBlock?.index !== index && (
              <div
                className="cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={(e) => handlePointerDown(e, index, block)}
              >
                <BlockPreview block={block} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dragged Block Overlay */}
      {draggedBlock && (
        <div 
          className="fixed pointer-events-none z-50"
          style={{
            left: draggedBlock.currentX - draggedBlock.offsetX,
            top: draggedBlock.currentY - draggedBlock.offsetY,
          }}
        >
          <BlockPreview block={draggedBlock.block} isDragging />
        </div>
      )}
    </div>
  );
}

function BlockPreview({ block, isDragging = false }: { block: BlockData, isDragging?: boolean }) {
  // Calculate a responsive cell size for the preview blocks
  // They should be slightly smaller than the grid cells
  const previewCellSize = isDragging ? 'min(11vw, 48px)' : 'min(8vw, 32px)';
  const gap = 2;

  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${block.shape[0].length}, ${previewCellSize})`,
        gridTemplateRows: `repeat(${block.shape.length}, ${previewCellSize})`,
        gap: `${gap}px`,
      }}
      className={isDragging ? 'opacity-90 scale-110 transition-transform' : 'hover:scale-105 transition-transform'}
    >
      {block.shape.map((row, rIndex) => (
        row.map((cell, cIndex) => (
          <div
            key={`${rIndex}-${cIndex}`}
            className={`rounded-sm ${cell ? block.color : 'bg-transparent'}`}
            style={{
              boxShadow: cell && isDragging ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : 'none'
            }}
          />
        ))
      ))}
    </div>
  );
}
