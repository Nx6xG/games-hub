import type WebSocket from "ws";
import type {
  GameId,
  PlayerRole,
  RoomInfo,
  RoomStatus,
  TicTacToeState,
} from "@games-hub/shared";
import { serialize } from "@games-hub/shared";
import { createTicTacToeState, applyMove } from "./games/tictactoe.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Client = {
  id: string;
  ws: WebSocket;
  name: string;
  roomCode: string | null;
  role: PlayerRole | null;
};

type Room = {
  code: string;
  gameId: GameId;
  status: RoomStatus;
  /** Ordered: index 0 = X, index 1 = O */
  playerIds: [string | null, string | null];
  spectatorIds: string[];
  /** null until both players are connected */
  gameState: TicTacToeState | null;
};

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

const clients = new Map<string, Client>();
const rooms = new Map<string, Room>();

// ---------------------------------------------------------------------------
// Client registry
// ---------------------------------------------------------------------------

export function registerClient(id: string, ws: WebSocket, name: string): void {
  clients.set(id, { id, ws, name, roomCode: null, role: null });
  log("connect", `${id} (${name})`);
}

export function removeClient(id: string): void {
  const client = clients.get(id);
  if (!client) return;

  if (client.roomCode) {
    const room = rooms.get(client.roomCode);
    if (room) handleDisconnect(room, client);
  }

  clients.delete(id);
  log("disconnect", id);
}

export function setClientName(clientId: string, name: string): void {
  const client = clients.get(clientId);
  if (!client) return;
  client.name = name;
  // If the client is a player in a room with an active game, update playerNames
  // in the stored state and rebroadcast so UIs reflect the new name.
  if (!client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room || !room.gameState) return;
  if (room.playerIds[0] === clientId) {
    room.gameState = { ...room.gameState, playerNames: { ...room.gameState.playerNames, X: name } };
    broadcastState(room);
  } else if (room.playerIds[1] === clientId) {
    room.gameState = { ...room.gameState, playerNames: { ...room.gameState.playerNames, O: name } };
    broadcastState(room);
  }
}

function getClient(id: string): Client | undefined {
  return clients.get(id);
}

// ---------------------------------------------------------------------------
// Room creation / join
// ---------------------------------------------------------------------------

export function createRoom(
  clientId: string,
  gameId: GameId,
): { ok: true; room: RoomInfo; role: PlayerRole } | { ok: false; error: string } {
  const client = getClient(clientId);
  if (!client) return { ok: false, error: "Unknown client." };
  if (client.roomCode) return { ok: false, error: "Already in a room." };

  const code = generateCode();
  const room: Room = {
    code,
    gameId,
    status: "waiting",
    playerIds: [clientId, null],
    spectatorIds: [],
    gameState: null,
  };

  rooms.set(code, room);
  client.roomCode = code;
  client.role = "X";

  log("room:create", `${code} game=${gameId} by ${clientId}`);

  return { ok: true, room: toRoomInfo(room), role: "X" };
}

export function joinRoom(
  clientId: string,
  code: string,
): { ok: true; room: RoomInfo; role: PlayerRole } | { ok: false; error: string } {
  const client = getClient(clientId);
  if (!client) return { ok: false, error: "Unknown client." };
  if (client.roomCode) return { ok: false, error: "Already in a room." };

  const room = rooms.get(code);
  if (!room) return { ok: false, error: "Room not found." };
  if (room.status === "finished") return { ok: false, error: "Room is finished." };

  let role: PlayerRole;

  if (room.playerIds[1] === null) {
    // Second player slot is open
    room.playerIds[1] = clientId;
    client.role = "O";
    role = "O";
  } else {
    // Spectator
    room.spectatorIds.push(clientId);
    client.role = "spectator";
    role = "spectator";
  }

  client.roomCode = code;

  log("room:join", `${clientId} -> ${code} as ${role}`);

  if (role === "O" && room.playerIds[0] !== null) {
    // Both players now seated — start the game
    room.status = "playing";
    const xClient = getClient(room.playerIds[0]);
    room.gameState = createTicTacToeState(
      xClient?.name ?? "Player X",
      client.name,
    );
    broadcastState(room);
  } else if (role === "spectator" && room.status === "playing" && room.gameState) {
    // Spectator joining a live game — send current state immediately (to them only)
    // and rebroadcast with updated spectatorCount to everyone.
    broadcastState(room);
  }

  return { ok: true, room: toRoomInfo(room), role };
}

// ---------------------------------------------------------------------------
// Move handling
// ---------------------------------------------------------------------------

export function handleMove(
  clientId: string,
  payload: unknown,
): { ok: false; error: string } | { ok: true } {
  const client = getClient(clientId);
  if (!client || !client.roomCode) return { ok: false, error: "Not in a room." };

  const room = rooms.get(client.roomCode);
  if (!room || room.status !== "playing" || !room.gameState) {
    return { ok: false, error: "Game is not active." };
  }

  if (client.role === "spectator") {
    return { ok: false, error: "Spectators cannot make moves." };
  }

  // Turn-authority check: ensure this client holds the active turn slot
  const expectedSlot = room.gameState.turn === "X" ? 0 : 1;
  if (room.playerIds[expectedSlot] !== clientId) {
    return { ok: false, error: "It is not your turn." };
  }

  const result = applyMove(room.gameState, payload);
  if (!result.ok) return { ok: false, error: result.error };

  room.gameState = result.state;

  if (result.state.winner !== null) {
    room.status = "finished";
    log("room:finish", `${room.code} winner=${result.state.winner}`);
  }

  broadcastState(room);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rematch handling
// ---------------------------------------------------------------------------

export function handleRematchRequest(
  clientId: string,
): { ok: false; error: string } | { ok: true } {
  const client = getClient(clientId);
  if (!client || !client.roomCode) return { ok: false, error: "Not in a room." };

  const room = rooms.get(client.roomCode);
  if (!room || room.status !== "finished" || !room.gameState) {
    return { ok: false, error: "Game is not finished." };
  }

  if (client.role === "spectator") {
    return { ok: false, error: "Spectators cannot request a rematch." };
  }

  const side = client.role as "X" | "O";

  // Mark this player ready (idempotent)
  room.gameState = {
    ...room.gameState,
    rematchReady: { ...room.gameState.rematchReady, [side]: true },
  };

  // When both players are ready, start the next match
  if (room.gameState.rematchReady.X && room.gameState.rematchReady.O) {
    const nextMatchId = room.gameState.matchId + 1;
    const { X: nameX, O: nameO } = room.gameState.playerNames;
    room.gameState = createTicTacToeState(nameX, nameO, nextMatchId);
    room.status = "playing";
    log("room:rematch", `${room.code} match ${nextMatchId}`);
  }

  broadcastState(room);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Disconnect handling
// ---------------------------------------------------------------------------

function handleDisconnect(room: Room, client: Client): void {
  const wasSpectator = client.role === "spectator";

  // Remove from spectators
  room.spectatorIds = room.spectatorIds.filter((id) => id !== client.id);

  // Remove from player slots
  if (room.playerIds[0] === client.id) room.playerIds[0] = null;
  if (room.playerIds[1] === client.id) room.playerIds[1] = null;

  // If game was playing and a player disconnected, pause the room
  if (!wasSpectator && room.status === "playing") {
    room.status = "waiting";
    room.gameState = null;
  }

  // If a spectator left a live game, rebroadcast to update spectatorCount
  if (wasSpectator && room.status === "playing" && room.gameState) {
    broadcastState(room);
  }

  // Clean up empty rooms
  if (room.playerIds[0] === null && room.playerIds[1] === null && room.spectatorIds.length === 0) {
    rooms.delete(room.code);
    log("room:delete", room.code);
  }
}

// ---------------------------------------------------------------------------
// Broadcast helpers
// ---------------------------------------------------------------------------

function broadcastState(room: Room): void {
  if (!room.gameState) return;

  // Stamp current spectator count into state before broadcasting
  room.gameState = { ...room.gameState, spectatorCount: room.spectatorIds.length };

  const msg = serialize({
    type: "STATE",
    gameId: room.gameId,
    state: room.gameState,
  });

  const all = [
    ...room.playerIds.filter(Boolean) as string[],
    ...room.spectatorIds,
  ];

  for (const id of all) {
    const c = getClient(id);
    if (c && c.ws.readyState === 1 /* OPEN */) {
      c.ws.send(msg);
    }
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function toRoomInfo(room: Room): RoomInfo {
  return {
    code: room.code,
    gameId: room.gameId,
    status: room.status,
    playerCount: room.playerIds.filter(Boolean).length,
    spectatorCount: room.spectatorIds.length,
  };
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  do {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  } while (rooms.has(code));
  return code;
}

function log(event: string, detail: string): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${event}] ${detail}`);
}
