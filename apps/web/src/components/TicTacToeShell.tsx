/**
 * TicTacToeShell — Astro island entry point for Tic-Tac-Toe.
 *
 * Orchestrates:
 *   - Persistent "your name" input (localStorage)
 *   - Mode selector: Solo vs AI / Pass & Play / Online
 *   - Renders TicTacToeLocal (offline) or GameShell + TicTacToeGame (online)
 *   - Match history panel (persisted in localStorage, max 20 entries)
 *
 * This is the client:load boundary. No render-prop functions cross it.
 */

import { useState, useCallback, useEffect } from "react";
import GameShell from "./GameShell";
import TicTacToeGame from "./TicTacToeGame";
import TicTacToeLocal from "./TicTacToeLocal";
import MatchHistory from "./MatchHistory";
import {
  loadHistory,
  saveRecord,
  clearHistory,
} from "./historyStore";
import type { MatchRecord, MatchResult } from "./historyStore";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Mode = "ai" | "local" | "online";

const MODES: { id: Mode; label: string; icon: string; hint: string }[] = [
  { id: "ai",     icon: "🤖", label: "vs AI",       hint: "Play against the computer" },
  { id: "local",  icon: "👥", label: "Pass & Play", hint: "Two players, one device" },
  { id: "online", icon: "🌐", label: "Online",       hint: "Play with a friend remotely" },
];

type Props = {
  wsUrl: string;
};

// ---------------------------------------------------------------------------
// localStorage helpers (safe for SSR/hydration — island runs client-only)
// ---------------------------------------------------------------------------

function readStorage(key: string): string {
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
}

function writeStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TicTacToeShell({ wsUrl }: Props) {
  // SSR-safe initial values — localStorage is read in useEffect after mount
  // to avoid hydration mismatches between server and first client render.
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("ai");
  const [history, setHistory] = useState<MatchRecord[]>([]);

  useEffect(() => {
    setName(readStorage("games-hub:name"));
    setHistory(loadHistory());
  }, []);

  const handleNameChange = (v: string) => {
    setName(v);
    writeStorage("games-hub:name", v);
  };

  // Called by TicTacToeLocal and GameShell when a match finishes.
  // Stable reference via useCallback so child effects don't re-run needlessly.
  const handleMatchEnd = useCallback((result: MatchResult) => {
    const record: MatchRecord = {
      ...result,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    saveRecord(record);
    // Prepend in-memory too so the panel updates instantly without re-reading storage.
    setHistory((prev) => [record, ...prev].slice(0, 20));
  }, []);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  // "Your name" is used by AI mode (pre-fills the player name in setup)
  // and Online mode (shown in the lobby). Local mode manages two names itself.
  const showNameInput = mode !== "local";

  return (
    <div className="flex flex-col gap-7 max-w-lg mx-auto">

      {/* ── Name input ──────────────────────────────────────────────────── */}
      {showNameInput && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="player-name"
            className="text-xs font-semibold uppercase tracking-widest text-gray-500"
          >
            Your name
          </label>
          <input
            id="player-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Anonymous"
            maxLength={32}
            autoComplete="off"
            className="w-full rounded-xl bg-gray-900 border border-gray-800 px-4 py-2.5
                       text-white placeholder-gray-600 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       transition-colors"
          />
        </div>
      )}

      {/* ── Mode selector ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Mode
        </span>
        <div
          role="tablist"
          aria-label="Game mode"
          className="flex rounded-xl bg-gray-900 border border-gray-800 p-1 gap-1"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition-all duration-150
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                          ${mode === m.id
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-gray-400 hover:text-gray-200"}`}
            >
              <span className="hidden sm:inline mr-1">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 text-center">
          {MODES.find((m) => m.id === mode)?.hint}
        </p>
      </div>

      {/* ── Game area ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/50 px-6 pb-8 pt-6 min-h-[22rem]">
        {(mode === "ai" || mode === "local") && (
          // key forces a full remount on mode switch, resetting all state.
          <TicTacToeLocal
            key={mode}
            mode={mode}
            initialNameX={name}
            onMatchEnd={handleMatchEnd}
          />
        )}

        {mode === "online" && (
          <GameShell
            gameId="tictactoe"
            wsUrl={wsUrl}
            playerName={name || "You"}
            onMatchEnd={handleMatchEnd}
          >
            {(props) => <TicTacToeGame {...props} />}
          </GameShell>
        )}
      </div>

      {/* ── Match history ────────────────────────────────────────────────── */}
      <MatchHistory records={history} onClear={handleClear} />

    </div>
  );
}
