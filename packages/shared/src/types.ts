// ---------------------------------------------------------------------------
// Game IDs
// Add new game IDs here when extending the hub.
// ---------------------------------------------------------------------------

export type GameId = "tictactoe";

export const GAME_IDS: GameId[] = ["tictactoe"];

// ---------------------------------------------------------------------------
// TicTacToe state
// ---------------------------------------------------------------------------

/** null = empty, "X" | "O" = taken */
export type Cell = null | "X" | "O";

export type TicTacToeBoard = [
  Cell, Cell, Cell,
  Cell, Cell, Cell,
  Cell, Cell, Cell,
];

export type TicTacToeState = {
  board: TicTacToeBoard;
  /** Whose turn it is */
  turn: "X" | "O";
  /** null while game is in progress */
  winner: "X" | "O" | "draw" | null;
  /**
   * Display names for each player slot — set from SET_NAME / HELLO and kept
   * up-to-date by the server. Clients should use these for all UI labels.
   */
  playerNames: { X: string; O: string };
  /** Number of spectators currently in the room. */
  spectatorCount: number;
  /** Increments each time a rematch starts (1-based). */
  matchId: number;
  /** Which players have clicked "Rematch" after a finished game. */
  rematchReady: { X: boolean; O: boolean };
};

// ---------------------------------------------------------------------------
// Room metadata
// ---------------------------------------------------------------------------

export type PlayerRole = "X" | "O" | "spectator";

export type RoomStatus = "waiting" | "playing" | "finished";

export type RoomInfo = {
  code: string;
  gameId: GameId;
  status: RoomStatus;
  playerCount: number;
  spectatorCount: number;
};
