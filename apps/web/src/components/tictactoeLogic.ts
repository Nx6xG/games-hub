/**
 * Pure TicTacToe game logic — no React, no side-effects.
 * Safe to unit-test in isolation.
 */

import type { Cell } from "@games-hub/shared";

export type Mark = "X" | "O";
export type Board = Cell[]; // always 9 elements

export const WINNING_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

// ---------------------------------------------------------------------------
// Board inspection
// ---------------------------------------------------------------------------

export function checkWinner(board: Board): Mark | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Mark;
    }
  }
  return null;
}

/** Returns the three winning cell indices, or null if no winner yet. */
export function getWinningLine(board: Board): readonly [number, number, number] | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return [a, b, c];
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Board mutation (always returns a new array)
// ---------------------------------------------------------------------------

export function applyMove(board: Board, mark: Mark, index: number): Board {
  const next = [...board] as Board;
  next[index] = mark;
  return next;
}

export function emptyBoard(): Board {
  return Array(9).fill(null) as Board;
}

// ---------------------------------------------------------------------------
// AI move selection
// ---------------------------------------------------------------------------

/** Easy: uniformly random among empty cells. */
export function getEasyMove(board: Board): number {
  const empty: number[] = [];
  for (let i = 0; i < 9; i++) if (board[i] === null) empty.push(i);
  if (empty.length === 0) return -1;
  return empty[Math.floor(Math.random() * empty.length)];
}

/**
 * Hard: minimax — always finds the optimal move.
 * Operates on an internal copy; the caller's board is never mutated.
 */
export function getBestMove(board: Board, aiMark: Mark): number {
  const work = [...board] as Board; // mutable copy for minimax
  const humanMark: Mark = aiMark === "X" ? "O" : "X";

  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (work[i] !== null) continue;
    work[i] = aiMark;
    const score = minimax(work, false, aiMark, humanMark);
    work[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

/**
 * Minimax with in-place mutation + restoration.
 * Never leaks mutated state because each branch is restored before returning.
 */
function minimax(
  board: Board,
  isMaximizing: boolean,
  aiMark: Mark,
  humanMark: Mark,
): number {
  const winner = checkWinner(board);
  if (winner === aiMark) return 10;
  if (winner === humanMark) return -10;
  if (board.every((c) => c !== null)) return 0;

  let best = isMaximizing ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = isMaximizing ? aiMark : humanMark;
    const score = minimax(board, !isMaximizing, aiMark, humanMark);
    board[i] = null;
    best = isMaximizing ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}
