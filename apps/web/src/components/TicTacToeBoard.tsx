/**
 * Shared presentational components for TicTacToe.
 * Used by both TicTacToeLocal (offline) and TicTacToeGame (online).
 */

import type { Cell } from "@games-hub/shared";

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

type BoardProps = {
  board: Cell[];
  canClick: (index: number) => boolean;
  onCellClick: (index: number) => void;
  /** Indices of the three winning cells (highlights them on game-over). */
  winningLine?: readonly number[] | null;
  /**
   * Current player's mark. When set, hovering an empty clickable cell shows a
   * faint preview so players know what they're about to place.
   */
  currentMark?: "X" | "O" | null;
};

export function Board({ board, canClick, onCellClick, winningLine, currentMark }: BoardProps) {
  const winSet = winningLine ? new Set(winningLine) : null;

  return (
    <div className="grid grid-cols-3 gap-2.5" role="grid" aria-label="Tic-Tac-Toe board">
      {board.map((cell, i) => (
        <CellButton
          key={i}
          index={i}
          value={cell}
          clickable={canClick(i)}
          winning={winSet?.has(i) ?? false}
          onClick={() => onCellClick(i)}
          currentMark={currentMark}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CellButton
// ---------------------------------------------------------------------------

type CellButtonProps = {
  index: number;
  value: Cell;
  clickable: boolean;
  winning: boolean;
  onClick: () => void;
  currentMark?: "X" | "O" | null;
};

function CellButton({ index, value, clickable, winning, onClick, currentMark }: CellButtonProps) {
  const base =
    "group relative w-24 h-24 rounded-2xl border text-4xl font-bold flex items-center justify-center " +
    "transition-all duration-150 select-none " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950";

  let variantClass: string;
  if (winning) {
    variantClass =
      value === "X"
        ? "bg-indigo-900/80 border-indigo-400 text-indigo-200 scale-105 shadow-lg shadow-indigo-900/60 focus-visible:ring-indigo-400"
        : "bg-rose-900/80 border-rose-400 text-rose-200 scale-105 shadow-lg shadow-rose-900/60 focus-visible:ring-rose-400";
  } else if (value === "X") {
    variantClass = "bg-indigo-950 border-indigo-800 text-indigo-300 focus-visible:ring-indigo-500";
  } else if (value === "O") {
    variantClass = "bg-rose-950 border-rose-800 text-rose-300 focus-visible:ring-rose-500";
  } else if (clickable) {
    const hoverBg =
      currentMark === "X"
        ? "hover:bg-indigo-950/50 hover:border-indigo-800/70"
        : currentMark === "O"
          ? "hover:bg-rose-950/50 hover:border-rose-800/70"
          : "hover:bg-gray-700 hover:border-gray-500";
    variantClass = `bg-gray-800/50 border-gray-700/60 cursor-pointer active:scale-95 focus-visible:ring-gray-500 ${hoverBg}`;
  } else {
    variantClass = "bg-gray-900/30 border-gray-800/40 cursor-default";
  }

  // Faint preview of the current player's mark on hover
  const previewMark = !value && clickable && currentMark ? currentMark : null;
  const previewColor = previewMark === "X" ? "text-indigo-400" : "text-rose-400";

  return (
    <button
      role="gridcell"
      aria-label={`Cell ${index + 1}${value ? `, ${value}` : ", empty"}`}
      className={`${base} ${variantClass}`}
      onClick={onClick}
      disabled={!clickable}
    >
      {value ? (
        value
      ) : previewMark ? (
        <span
          className={`opacity-0 group-hover:opacity-25 transition-opacity duration-100 ${previewColor}`}
          aria-hidden="true"
        >
          {previewMark}
        </span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// PlayerChip
// ---------------------------------------------------------------------------

type PlayerChipProps = {
  name: string;
  mark: "X" | "O";
  active: boolean;
};

export function PlayerChip({ name, mark, active }: PlayerChipProps) {
  const activeClass =
    mark === "X"
      ? "bg-indigo-950 border-indigo-600 text-indigo-300"
      : "bg-rose-950 border-rose-600 text-rose-300";

  return (
    <span
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium
                  transition-all duration-200
                  ${active ? activeClass : "border-gray-800 text-gray-500 bg-transparent"}`}
    >
      <span className="font-bold text-xs">{mark}</span>
      <span className="truncate max-w-[7rem]">{name}</span>
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" aria-hidden="true" />
      )}
    </span>
  );
}
