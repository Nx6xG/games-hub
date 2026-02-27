/**
 * Match history — pure localStorage utilities.
 * No React imports; usable anywhere.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatchRecord = {
  /** nanoid-style unique key for React list rendering. */
  id: string;
  /** Unix ms timestamp of when the match ended. */
  timestamp: number;
  mode: "ai" | "local" | "online";
  nameX: string;
  nameO: string;
  winner: "X" | "O" | "draw";
  /** AI mode only. */
  difficulty?: "easy" | "hard";
  /** Online mode only. */
  roomCode?: string;
  /** Online mode only: was the recorder a player or a spectator? */
  role?: "player" | "spectator";
};

/**
 * The payload passed from game components to the shell's onMatchEnd callback.
 * `id` and `timestamp` are added by the shell before persisting.
 */
export type MatchResult = Omit<MatchRecord, "id" | "timestamp">;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "games-hub:ttt-history";
const MAX_RECORDS = 20;

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

export function loadHistory(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MatchRecord[];
  } catch {
    return [];
  }
}

/** Prepends `record` to history, trimming to MAX_RECORDS. */
export function saveRecord(record: MatchRecord): void {
  try {
    const existing = loadHistory();
    const next = [record, ...existing].slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* storage unavailable — silently skip */ }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Formatting helpers (used by MatchHistory.tsx)
// ---------------------------------------------------------------------------

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
