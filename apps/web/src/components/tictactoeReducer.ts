/**
 * TicTacToe mode-based state machine.
 *
 * Phases:
 *   setup    → user configures names / difficulty before the game starts
 *   playing  → game in progress
 *   finished → a winner or draw has been determined
 *
 * Transitions:
 *   START(config)   : setup    → playing  (initialises a fresh board)
 *   MOVE(index)     : playing  → playing | finished
 *   AI_THINKING     : playing  → playing  (sets the aiThinking flag)
 *   RESTART         : finished → playing  (same config, brand-new board)
 *   RECONFIGURE     : any      → setup    (let the user change names/difficulty)
 */

import { checkWinner, applyMove, emptyBoard } from "./tictactoeLogic";
import type { Board } from "./tictactoeLogic";

// ---------------------------------------------------------------------------
// Config types (shape the setup form)
// ---------------------------------------------------------------------------

export type Difficulty = "easy" | "hard";

export type AiConfig = {
  mode: "ai";
  nameX: string;     // human player's name
  difficulty: Difficulty;
};

export type LocalConfig = {
  mode: "local";
  nameX: string;
  nameO: string;
};

export type GameConfig = AiConfig | LocalConfig;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type GamePhase = "setup" | "playing" | "finished";

export type GameState = {
  phase: GamePhase;
  /** null until the first START action. */
  config: GameConfig | null;
  board: Board;
  turn: "X" | "O";
  winner: "X" | "O" | "draw" | null;
  /** True while the AI is computing / waiting to reveal its move. */
  aiThinking: boolean;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type GameAction =
  | { type: "START"; config: GameConfig }
  | { type: "MOVE"; index: number }
  | { type: "AI_THINKING" }
  | { type: "RESTART" }
  | { type: "RECONFIGURE" };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export function makeInitialState(): GameState {
  return {
    phase: "setup",
    config: null,
    board: emptyBoard(),
    turn: "X",
    winner: null,
    aiThinking: false,
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START":
      return {
        phase: "playing",
        config: action.config,
        board: emptyBoard(),
        turn: "X",
        winner: null,
        aiThinking: false,
      };

    case "AI_THINKING":
      return { ...state, aiThinking: true };

    case "MOVE": {
      if (state.phase !== "playing") return state;
      if (state.board[action.index] !== null) return state;

      const board = applyMove(state.board, state.turn, action.index);
      const winner = checkWinner(board);
      const draw = winner === null && board.every((c) => c !== null);
      const result: GameState["winner"] = winner ?? (draw ? "draw" : null);

      return {
        ...state,
        board,
        turn: state.turn === "X" ? "O" : "X",
        winner: result,
        phase: result !== null ? "finished" : "playing",
        aiThinking: false,
      };
    }

    case "RESTART":
      // Keep existing config, reset the board for a new game.
      return {
        ...state,
        phase: "playing",
        board: emptyBoard(),
        turn: "X",
        winner: null,
        aiThinking: false,
      };

    case "RECONFIGURE":
      return { ...state, phase: "setup" };

    default:
      return state;
  }
}
