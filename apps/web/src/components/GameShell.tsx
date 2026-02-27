/**
 * GameShell — generic React component for any multiplayer game.
 *
 * Responsibilities:
 * - Manages the WebSocket connection lifecycle
 * - Handles room creation / joining by code
 * - Tracks connection state, room info, and player role
 * - Passes `gameState`, `role`, and `sendMove` to the game component
 *
 * Note: Uses a render-prop pattern internally. Do NOT use GameShell directly
 * as a client:load island in Astro — wrap it inside a game-specific shell
 * (e.g. TicTacToeShell.tsx) so no function crosses the hydration boundary.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  GameId,
  PlayerRole,
  RoomInfo,
  ServerMessage,
  TicTacToeState,
} from "@games-hub/shared";
import type { MatchResult } from "./historyStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameChildProps = {
  state: TicTacToeState;
  role: PlayerRole;
  sendMove: (payload: unknown) => void;
  requestRematch: () => void;
};

type ConnectionStatus = "connecting" | "open" | "closed" | "error";

type GameShellProps = {
  gameId: GameId;
  wsUrl: string;
  /** The player's chosen display name. */
  playerName: string;
  /** Called exactly once when a match finishes. Parent persists to localStorage. */
  onMatchEnd?: (result: MatchResult) => void;
  children: (props: GameChildProps) => React.ReactNode;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameShell({ gameId, wsUrl, playerName, onMatchEnd, children }: GameShellProps) {
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [gameState, setGameState] = useState<TicTacToeState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);

  // Stable ref for the callback — prevents the detection effect from
  // re-running just because the parent re-renders with a new function identity.
  const onMatchEndRef = useRef(onMatchEnd);
  onMatchEndRef.current = onMatchEnd;

  // Tracks the last winner value we already reported, so we never double-fire.
  // Reset to null when a new game begins (gameState.winner cleared).
  const reportedWinnerRef = useRef<string | null>(null);

  // Records the playerName that was sent inside HELLO so the SET_NAME effect
  // can skip firing when the name hasn't actually changed since connecting.
  const helloNameRef = useRef<string | null>(null);

  // ── WebSocket setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      helloNameRef.current = playerName; // record what we sent so SET_NAME can diff
      setStatus("open");
      ws.send(JSON.stringify({ type: "HELLO", name: playerName }));
    };

    ws.onmessage = (evt: MessageEvent<string>) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(evt.data) as ServerMessage;
      } catch {
        return;
      }
      handleServerMessage(msg);
    };

    ws.onerror = () => setStatus("error");
    ws.onclose = () => setStatus("closed");

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl]);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "WELCOME":
        // client ID acknowledged — no UI needed
        break;
      case "ROOM_CREATED":
      case "ROOM_JOINED":
        setRoom(msg.room);
        setRole(msg.role);
        setError(null);
        break;
      case "STATE":
        setGameState(msg.state);
        break;
      case "ERROR":
        if (import.meta.env.DEV) {
          console.warn("[GameShell] server error:", msg.code, msg.message);
        }
        setError(msg.message);
        break;
    }
  }, []);

  // ── Auto-dismiss transient errors ──────────────────────────────────────────
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  // ── Sync player name to server when it changes after connecting ───────────
  // HELLO already carries the name on initial connect. This effect only sends
  // SET_NAME when playerName changes while already connected (e.g. the user
  // edits the name input after the WS is open). Comparing against helloNameRef
  // prevents sending a redundant SET_NAME right after every new connection.
  useEffect(() => {
    if (status !== "open") {
      helloNameRef.current = null; // reset on disconnect
      return;
    }
    if (helloNameRef.current === playerName) return; // no change since HELLO
    helloNameRef.current = playerName;
    wsRef.current?.send(JSON.stringify({ type: "SET_NAME", name: playerName }));
  }, [playerName, status]);

  // ── Match-end detection ────────────────────────────────────────────────────
  // Fires onMatchEnd exactly once when the server broadcasts a winner.
  // Uses server-authoritative playerNames from the game state.
  useEffect(() => {
    const winner = gameState?.winner ?? null;

    if (!winner) {
      reportedWinnerRef.current = null;
      return;
    }

    if (reportedWinnerRef.current === winner) return;
    reportedWinnerRef.current = winner;

    onMatchEndRef.current?.({
      mode: "online",
      nameX: gameState?.playerNames.X ?? "Player X",
      nameO: gameState?.playerNames.O ?? "Player O",
      winner,
      roomCode: room?.code,
      role: role === "spectator" ? "spectator" : "player",
    });
  }, [gameState?.winner, gameState?.playerNames.X, gameState?.playerNames.O, room?.code]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const send = useCallback((payload: object) => {
    wsRef.current?.send(JSON.stringify(payload));
  }, []);

  const createRoom = () => {
    setError(null);
    send({ type: "CREATE_ROOM", gameId });
  };

  const joinRoom = () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setError(null);
    send({ type: "JOIN_ROOM", code });
  };

  const sendMove = useCallback(
    (payload: unknown) => send({ type: "MOVE", payload }),
    [send],
  );

  const requestRematch = useCallback(
    () => send({ type: "REMATCH_REQUEST" }),
    [send],
  );

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (status === "connecting") {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Spinner />
        <p className="text-sm text-gray-500">Connecting…</p>
      </div>
    );
  }

  if (status === "closed" || status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-3xl">🔌</span>
        <p className="text-base font-medium text-gray-300">Connection lost</p>
        <p className="text-sm text-gray-500">Refresh the page to try again.</p>
      </div>
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (!room) {
    return (
      <div className="flex flex-col items-center gap-7 py-8">
        <div className="flex flex-col items-center gap-1">
          <ConnectionBadge status={status} />
          <h3 className="text-lg font-semibold text-white mt-3">
            Invite a friend to play
          </h3>
          <p className="text-sm text-gray-500">
            Create a room and share the code, or paste a code from someone else.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-950/60 border border-red-800 px-4 py-2 text-sm text-red-300 text-center">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={createRoom}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       transition-all px-4 py-3 font-semibold text-white shadow-lg text-sm"
          >
            Create a new room
          </button>

          <div className="flex items-center gap-2 text-gray-700">
            <hr className="flex-1 border-current" />
            <span className="text-xs">or join one</span>
            <hr className="flex-1 border-current" />
          </div>

          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              placeholder="ROOM CODE"
              maxLength={8}
              className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-4 py-3
                         text-white placeholder-gray-600 font-mono text-sm uppercase
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={joinRoom}
              className="rounded-xl bg-gray-700 hover:bg-gray-600 active:scale-95
                         transition-all px-4 py-3 font-semibold text-white text-sm"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Waiting for second player ──────────────────────────────────────────────
  if (!gameState) {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <ConnectionBadge status={status} />
        <p className="text-gray-400 text-sm mt-1">
          Share this code with your friend:
        </p>

        <button
          onClick={() => copyCode(room.code)}
          title="Click to copy"
          className="group flex flex-col items-center gap-1 rounded-2xl bg-gray-800 border border-gray-700
                     hover:border-indigo-500/60 px-10 py-5 transition-all cursor-pointer"
        >
          <span className="text-3xl font-mono font-bold tracking-[0.22em] text-indigo-300">
            {room.code}
          </span>
          <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
            {copied ? "✓ Copied!" : "Click to copy"}
          </span>
        </button>

        <p className="text-xs text-gray-600">
          Waiting for an opponent to join… You are{" "}
          <span className="text-gray-300 font-semibold">{role}</span>
        </p>
      </div>
    );
  }

  // ── Game in progress ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span>
            Room{" "}
            <span className="font-mono text-gray-500 tracking-wide">{room.code}</span>
          </span>
          {role !== null && <RoleBadge role={role} />}
        </div>
        <div className="flex items-center gap-2">
          {gameState.spectatorCount > 0 && (
            <span className="text-gray-600">
              {gameState.spectatorCount} watching
            </span>
          )}
          <ConnectionBadge status={status} />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-950/60 border border-red-800 px-4 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {role !== null && children({ state: gameState, role, sendMove, requestRematch })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: PlayerRole }) {
  const label =
    role === "X" ? "Player X"
    : role === "O" ? "Player O"
    : "Spectator";

  const cls =
    role === "X"
      ? "text-indigo-300 bg-indigo-900/40 border-indigo-800/60"
      : role === "O"
        ? "text-rose-300 bg-rose-900/40 border-rose-800/60"
        : "text-gray-400 bg-gray-800/60 border-gray-700";

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const dotClass =
    status === "open"
      ? "bg-green-500"
      : status === "connecting"
        ? "bg-yellow-500 animate-pulse"
        : "bg-red-500";

  const label =
    status === "open" ? "Connected"
    : status === "connecting" ? "Connecting…"
    : "Disconnected";

  const labelClass =
    status === "open" ? "text-green-400"
    : status === "connecting" ? "text-yellow-400"
    : "text-red-400";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className={`text-xs ${labelClass}`}>{label}</span>
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="w-6 h-6 text-indigo-400 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
