/**
 * TicTacToeLocal — offline game for "Solo vs AI" and "Pass & Play" modes.
 *
 * Uses a small state machine (gameReducer) with three phases:
 *   setup    → configure names / difficulty
 *   playing  → game in progress
 *   finished → result shown, with "Rematch" and "Change settings"
 *
 * AI moves are triggered by a useEffect that watches phase + turn, then
 * dispatches AI_THINKING followed by MOVE after a brief delay.
 */

import { useReducer, useState, useEffect, useRef } from "react";
import { gameReducer, makeInitialState } from "./tictactoeReducer";
import type { Difficulty, GameConfig } from "./tictactoeReducer";
import { getEasyMove, getBestMove, getWinningLine } from "./tictactoeLogic";
import { Board, PlayerChip } from "./TicTacToeBoard";
import type { MatchResult } from "./historyStore";

type Props = {
  mode: "ai" | "local";
  /** Pre-filled name for the human player (from the top-level name input). */
  initialNameX: string;
  /** Called exactly once when a match finishes. Parent persists to localStorage. */
  onMatchEnd?: (result: MatchResult) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TicTacToeLocal({ mode, initialNameX, onMatchEnd }: Props) {
  const [state, dispatch] = useReducer(gameReducer, undefined, makeInitialState);

  // Setup-form state (ephemeral; committed to reducer on START)
  const [nameX, setNameX] = useState(initialNameX.trim() || (mode === "ai" ? "You" : "Player 1"));
  const [nameO, setNameO] = useState("Guest");
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");

  const onMatchEndRef = useRef(onMatchEnd);
  onMatchEndRef.current = onMatchEnd;

  // Sync nameX if the parent prop changes while still on setup screen
  useEffect(() => {
    if (state.phase === "setup") {
      setNameX(initialNameX.trim() || (mode === "ai" ? "You" : "Player 1"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNameX, mode]);

  // ── Match-end reporting ────────────────────────────────────────────────────
  const finishedRef = useRef(false);

  useEffect(() => {
    if (state.phase === "playing") {
      finishedRef.current = false;
      return;
    }
    if (state.phase !== "finished" || !state.config || !state.winner) return;
    if (finishedRef.current) return;

    finishedRef.current = true;
    const nameOResolved =
      state.config.mode === "local" ? state.config.nameO : "AI";

    onMatchEndRef.current?.({
      mode: state.config.mode,
      nameX: state.config.nameX,
      nameO: nameOResolved,
      winner: state.winner,
      ...(state.config.mode === "ai" ? { difficulty: state.config.difficulty } : {}),
    });
  }, [state.phase, state.config, state.winner]);

  // ── AI move trigger ────────────────────────────────────────────────────────
  useEffect(() => {
    const cfg = state.config;
    if (
      state.phase !== "playing" ||
      state.turn !== "O" ||
      cfg?.mode !== "ai" ||
      state.aiThinking
    ) return;

    dispatch({ type: "AI_THINKING" });

    const timer = setTimeout(() => {
      const idx =
        cfg.difficulty === "easy"
          ? getEasyMove(state.board)
          : getBestMove(state.board, "O");

      if (idx !== -1) dispatch({ type: "MOVE", index: idx });
    }, 480);

    return () => clearTimeout(timer);
  }, [state.phase, state.turn, state.config, state.aiThinking, state.board]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const handleStart = () => {
    const config: GameConfig =
      mode === "ai"
        ? { mode: "ai", nameX: nameX.trim() || "You", difficulty }
        : { mode: "local", nameX: nameX.trim() || "Player 1", nameO: nameO.trim() || "Guest" };
    dispatch({ type: "START", config });
  };

  const handleCellClick = (i: number) => {
    if (state.phase !== "playing" || state.aiThinking) return;
    if (state.config?.mode === "ai" && state.turn !== "X") return;
    dispatch({ type: "MOVE", index: i });
  };

  // ── Derived display values ─────────────────────────────────────────────────

  const cfg = state.config;
  const displayNameX = cfg ? cfg.nameX : nameX.trim() || "Player 1";
  const displayNameO = cfg ? (cfg.mode === "local" ? cfg.nameO : "AI") : (mode === "local" ? nameO : "AI");

  const winningLine = state.phase === "finished" && state.winner !== "draw"
    ? getWinningLine(state.board)
    : null;

  const canClick = (i: number): boolean => {
    if (state.phase !== "playing" || state.board[i] !== null || state.aiThinking) return false;
    if (state.config?.mode === "ai" && state.turn !== "X") return false;
    return true;
  };

  // currentMark: what would be placed on the next click (null when AI is thinking)
  const currentMark =
    state.phase === "playing" && !state.aiThinking ? state.turn : null;

  // ── Status ─────────────────────────────────────────────────────────────────

  let statusText = "";
  let statusClass = "";

  if (state.phase === "playing") {
    if (state.aiThinking) {
      statusText = "AI is thinking…";
      statusClass = "text-gray-400";
    } else {
      statusText = state.turn === "X" ? `${displayNameX}'s turn` : `${displayNameO}'s turn`;
      statusClass = state.turn === "X" ? "text-indigo-300" : "text-rose-300";
    }
  } else if (state.phase === "finished") {
    if (state.winner === "draw") {
      statusText = "It's a draw!";
      statusClass = "text-yellow-400";
    } else if (state.winner === "X") {
      statusText = `${displayNameX} wins!`;
      statusClass = "text-green-400";
    } else {
      statusText = mode === "ai" ? "AI wins this round." : `${displayNameO} wins!`;
      statusClass = mode === "ai" ? "text-red-400" : "text-green-400";
    }
  }

  // ── Render: setup ──────────────────────────────────────────────────────────

  if (state.phase === "setup") {
    return (
      <div className="flex flex-col gap-6 py-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
          {mode === "ai" ? "Set up your game" : "Who's playing?"}
        </h3>

        {/* Name input(s) */}
        <div className="flex flex-col gap-4">
          <Field
            label={mode === "ai" ? "Your name" : "Player X (goes first)"}
            value={nameX}
            placeholder={mode === "ai" ? "You" : "Player 1"}
            onChange={setNameX}
            accentClass="focus:ring-indigo-500"
          />
          {mode === "local" && (
            <Field
              label="Player O"
              value={nameO}
              placeholder="Guest"
              onChange={setNameO}
              accentClass="focus:ring-rose-500"
            />
          )}
        </div>

        {/* Difficulty (AI only) */}
        {mode === "ai" && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Difficulty
            </span>
            <DifficultyToggle value={difficulty} onChange={setDifficulty} />
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                     transition-all px-4 py-3 font-semibold text-white text-sm shadow-md
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          Start game →
        </button>
      </div>
    );
  }

  // ── Render: playing + finished ─────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Player chips */}
      <div className="flex gap-3">
        <PlayerChip
          name={displayNameX}
          mark="X"
          active={state.turn === "X" && state.phase === "playing"}
        />
        <PlayerChip
          name={displayNameO}
          mark="O"
          active={state.turn === "O" && state.phase === "playing"}
        />
      </div>

      {/* Status */}
      <p className={`text-base font-semibold tracking-wide ${statusClass}`}>
        {statusText}
      </p>

      {/* Difficulty badge (AI mode, during play) */}
      {cfg?.mode === "ai" && state.phase === "playing" && (
        <span className="text-xs text-gray-600 -mt-3">
          {cfg.difficulty === "easy" ? "Easy mode" : "Hard mode (minimax)"}
        </span>
      )}

      {/* Board */}
      <Board
        board={state.board}
        canClick={canClick}
        onCellClick={handleCellClick}
        winningLine={winningLine}
        currentMark={currentMark}
      />

      {/* Post-game actions */}
      {state.phase === "finished" && (
        <div className="flex gap-3 mt-1">
          <button
            onClick={() => dispatch({ type: "RESTART" })}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       text-white text-sm font-semibold transition-all shadow-md
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Rematch
          </button>
          <button
            onClick={() => dispatch({ type: "RECONFIGURE" })}
            className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-95
                       text-gray-300 text-sm font-medium transition-all border border-gray-700
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Change settings
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup form helpers
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  placeholder,
  onChange,
  accentClass,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  accentClass: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={32}
        autoComplete="off"
        className={`w-full rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5
                    text-white placeholder-gray-600 text-sm
                    focus:outline-none focus:ring-2 ${accentClass} focus:border-transparent
                    transition-colors`}
      />
    </div>
  );
}

function DifficultyToggle({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}) {
  return (
    <div className="flex rounded-xl bg-gray-800 border border-gray-700 p-1 gap-1">
      {(["easy", "hard"] as const).map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                      ${value === d
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-400 hover:text-gray-200"}`}
        >
          {d === "easy" ? "Easy" : "Hard"}
          {d === "hard" && (
            <span className="ml-1.5 text-xs opacity-60 font-normal hidden sm:inline">
              (minimax)
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
