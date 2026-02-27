const WINNING_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6], // diagonals
];
export function createTicTacToeState(nameX, nameO, matchId = 1) {
    return {
        board: [null, null, null, null, null, null, null, null, null],
        turn: "X",
        winner: null,
        playerNames: { X: nameX, O: nameO },
        spectatorCount: 0,
        matchId,
        rematchReady: { X: false, O: false },
    };
}
/**
 * Applies a move. Returns the updated state or an error string.
 * Turn-authority (is it this player's turn?) is checked in rooms.ts before
 * calling this function, so we only validate the payload here.
 */
export function applyMove(state, payload) {
    if (state.winner !== null) {
        return { ok: false, error: "Game is already over." };
    }
    // Validate payload
    if (typeof payload !== "number" || !Number.isInteger(payload) || payload < 0 || payload > 8) {
        return { ok: false, error: "Invalid move: index must be 0-8." };
    }
    const index = payload;
    if (state.board[index] !== null) {
        return { ok: false, error: "Invalid move: cell is already taken." };
    }
    // Apply move
    const board = [...state.board];
    board[index] = state.turn;
    const winner = checkWinner(board);
    const isDraw = winner === null && board.every((c) => c !== null);
    return {
        ok: true,
        state: {
            ...state,
            board,
            turn: state.turn === "X" ? "O" : "X",
            winner: winner ?? (isDraw ? "draw" : null),
        },
    };
}
function checkWinner(board) {
    for (const [a, b, c] of WINNING_LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}
//# sourceMappingURL=tictactoe.js.map