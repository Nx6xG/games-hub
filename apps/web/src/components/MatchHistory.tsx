/**
 * MatchHistory — read-only panel displaying past TicTacToe matches.
 *
 * Props:
 *   records  — sourced from localStorage, managed by TicTacToeShell
 *   onClear  — called when the user clicks "Clear all"
 */

import type { MatchRecord } from "./historyStore";
import { formatRelativeTime } from "./historyStore";

type Props = {
  records: MatchRecord[];
  onClear: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MatchHistory({ records, onClear }: Props) {
  return (
    <section
      aria-label="Match history"
      className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-300">
          Match History
          {records.length > 0 && (
            <span className="text-xs font-normal bg-gray-800 border border-gray-700 text-gray-400
                             px-1.5 py-0.5 rounded-full tabular-nums">
              {records.length}
            </span>
          )}
        </span>

        {records.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors
                       focus:outline-none focus-visible:text-red-400"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Body */}
      {records.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2">
          <span className="text-3xl opacity-20 select-none">📋</span>
          <p className="text-sm text-gray-600">
            No matches yet — play a game to see results here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-800/70 max-h-72 overflow-y-auto">
          {records.map((record) => (
            <MatchRow key={record.id} record={record} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function MatchRow({ record }: { record: MatchRecord }) {
  const { winner, nameX, nameO, mode, roomCode, timestamp, difficulty, role } = record;

  // Winner label + color
  let winnerLabel: string;
  let winnerClass: string;

  if (winner === "draw") {
    winnerLabel = "Draw";
    winnerClass = "bg-yellow-900/40 text-yellow-300 border-yellow-800/60";
  } else {
    const winnerName = winner === "X" ? nameX : nameO;
    winnerLabel = `${winnerName} won`;
    const humanLost = mode === "ai" && winner === "O";
    winnerClass = humanLost
      ? "bg-red-900/40 text-red-300 border-red-800/60"
      : "bg-green-900/40 text-green-300 border-green-800/60";
  }

  return (
    <li className="flex items-center gap-2.5 px-5 py-3 text-sm">
      {/* Timestamp */}
      <span className="w-14 shrink-0 text-xs text-gray-600 tabular-nums">
        {formatRelativeTime(timestamp)}
      </span>

      {/* Mode badge */}
      <ModeBadge mode={mode} />

      {/* Extra badges */}
      {mode === "ai" && difficulty && (
        <DifficultyBadge difficulty={difficulty} />
      )}
      {mode === "online" && role === "spectator" && (
        <SpectatorBadge />
      )}

      {/* Players */}
      <span className="flex-1 min-w-0 text-gray-400 truncate">
        <span className="text-gray-200">{nameX}</span>
        <span className="text-gray-600 mx-1">vs</span>
        <span className="text-gray-200">{nameO}</span>
      </span>

      {/* Winner badge */}
      <span
        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${winnerClass}`}
      >
        {winnerLabel}
      </span>

      {/* Room code (online only) */}
      {roomCode && (
        <span className="shrink-0 text-xs font-mono text-gray-600 tracking-wide">
          {roomCode}
        </span>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const MODE_LABELS: Record<MatchRecord["mode"], string> = {
  ai:     "vs AI",
  local:  "Local",
  online: "Online",
};

const MODE_CLASSES: Record<MatchRecord["mode"], string> = {
  ai:     "bg-violet-900/30 text-violet-400 border-violet-800/50",
  local:  "bg-sky-900/30 text-sky-400 border-sky-800/50",
  online: "bg-indigo-900/30 text-indigo-400 border-indigo-800/50",
};

function ModeBadge({ mode }: { mode: MatchRecord["mode"] }) {
  return (
    <span
      className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border
                  ${MODE_CLASSES[mode]}`}
    >
      {MODE_LABELS[mode]}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: "easy" | "hard" }) {
  return (
    <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border
                     bg-gray-800/60 text-gray-500 border-gray-700/60">
      {difficulty === "easy" ? "Easy" : "Hard"}
    </span>
  );
}

function SpectatorBadge() {
  return (
    <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border
                     bg-gray-800/60 text-gray-500 border-gray-700/60">
      Spectator
    </span>
  );
}
