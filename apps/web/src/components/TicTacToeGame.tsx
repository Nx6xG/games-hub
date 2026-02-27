/**
 * TicTacToeGame — online multiplayer board.
 *
 * Receives authoritative state from the server via GameShell.
 * All game logic lives on the server; this component is purely presentational.
 * Player names are read directly from state.playerNames (server-provided).
 */

import type { GameChildProps } from "./GameShell";
import { getWinningLine } from "./tictactoeLogic";
import { Board, PlayerChip } from "./TicTacToeBoard";

type Props = GameChildProps;

export default function TicTacToeGame({ state, role, sendMove, requestRematch }: Props) {
  const { board, turn, winner, playerNames, rematchReady, spectatorCount } = state;

  const isMyTurn = turn === role && winner === null;
  const isSpectator = role === "spectator";

  const winningLine =
    winner && winner !== "draw" ? getWinningLine(board) : null;

  const currentMark = !winner && !isSpectator && isMyTurn ? (role as "X" | "O") : null;

  // ── Status label ───────────────────────────────────────────────────────────

  let statusText: string;
  let statusClass: string;

  if (winner === "draw") {
    statusText = "It's a draw!";
    statusClass = "text-yellow-400";
  } else if (winner) {
    const winnerName = winner === "X" ? playerNames.X : playerNames.O;
    statusText = winner === role ? "You win! 🎉" : `${winnerName} wins.`;
    statusClass = winner === role ? "text-green-400" : "text-red-400";
  } else if (isSpectator) {
    const turnName = turn === "X" ? playerNames.X : playerNames.O;
    statusText = `${turnName}'s turn`;
    statusClass = "text-gray-400";
  } else {
    const opponentName = role === "X" ? playerNames.O : playerNames.X;
    statusText = isMyTurn ? "Your turn" : `Waiting for ${opponentName}…`;
    statusClass = isMyTurn ? "text-indigo-300" : "text-gray-400";
  }

  // ── Rematch state ──────────────────────────────────────────────────────────

  const myReady = !isSpectator && rematchReady[role as "X" | "O"];
  const theirReady = !isSpectator && rematchReady[role === "X" ? "O" : "X"];

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCellClick = (index: number) => {
    if (!isMyTurn || board[index] !== null) return;
    sendMove(index);
  };

  const canClick = (index: number) => isMyTurn && board[index] === null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Player indicators */}
      <div className="flex items-center gap-3">
        <PlayerChip name={playerNames.X} mark="X" active={turn === "X" && !winner} />
        {spectatorCount > 0 && (
          <span className="text-xs text-gray-600 px-1">
            {spectatorCount} 👁
          </span>
        )}
        <PlayerChip name={playerNames.O} mark="O" active={turn === "O" && !winner} />
      </div>

      {/* Status */}
      <p className={`text-base font-semibold tracking-wide ${statusClass}`}>
        {statusText}
      </p>

      {/* Board */}
      <Board
        board={board}
        canClick={canClick}
        onCellClick={handleCellClick}
        winningLine={winningLine}
        currentMark={currentMark}
      />

      {/* Post-game: player rematch actions */}
      {winner !== null && !isSpectator && (
        <div className="flex flex-col items-center gap-2 mt-1">
          <button
            onClick={requestRematch}
            disabled={myReady}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                       text-white text-sm font-semibold transition-all shadow-md
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Rematch
          </button>
          {myReady && !theirReady && (
            <p className="text-xs text-gray-500">Waiting for opponent…</p>
          )}
          {!myReady && theirReady && (
            <p className="text-xs text-indigo-400 font-medium">Opponent wants a rematch!</p>
          )}
        </div>
      )}

      {/* Post-game: spectator rematch hint */}
      {winner !== null && isSpectator && (rematchReady.X || rematchReady.O) && (
        <p className="text-xs text-gray-600 mt-1">
          {rematchReady.X && rematchReady.O
            ? "Starting rematch…"
            : `${rematchReady.X ? playerNames.X : playerNames.O} wants a rematch`}
        </p>
      )}
    </div>
  );
}
