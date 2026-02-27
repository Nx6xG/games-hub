import type { GameId, PlayerRole, RoomInfo, TicTacToeState } from "./types.js";

// ---------------------------------------------------------------------------
// Client → Server messages
// ---------------------------------------------------------------------------

export type HelloMsg = {
  type: "HELLO";
  /** Optional display name. TODO: replace with auth token. */
  name?: string;
};

export type CreateRoomMsg = {
  type: "CREATE_ROOM";
  gameId: GameId;
};

export type JoinRoomMsg = {
  type: "JOIN_ROOM";
  code: string;
};

export type SetNameMsg = {
  type: "SET_NAME";
  name: string;
};

export type MoveMsg = {
  type: "MOVE";
  /** Game-specific payload; for TicTacToe this is the cell index (0-8). */
  payload: unknown;
};

export type RematchRequestMsg = {
  type: "REMATCH_REQUEST";
};

export type ClientMessage = HelloMsg | SetNameMsg | CreateRoomMsg | JoinRoomMsg | MoveMsg | RematchRequestMsg;

// ---------------------------------------------------------------------------
// Server → Client messages
// ---------------------------------------------------------------------------

export type WelcomeMsg = {
  type: "WELCOME";
  clientId: string;
};

export type RoomCreatedMsg = {
  type: "ROOM_CREATED";
  room: RoomInfo;
  role: PlayerRole;
};

export type RoomJoinedMsg = {
  type: "ROOM_JOINED";
  room: RoomInfo;
  role: PlayerRole;
};

/** Generic state broadcast. The `state` field is narrowed by `gameId`. */
export type StateMsg = {
  type: "STATE";
  gameId: GameId;
  state: TicTacToeState; // extend as union when adding games
};

export type ErrorMsg = {
  type: "ERROR";
  code: string;
  message: string;
};

export type ServerMessage =
  | WelcomeMsg
  | RoomCreatedMsg
  | RoomJoinedMsg
  | StateMsg
  | ErrorMsg;

// ---------------------------------------------------------------------------
// Runtime validation helpers (no Zod — keep bundle tiny)
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isObject(parsed) || typeof parsed["type"] !== "string") return null;

  switch (parsed["type"]) {
    case "HELLO":
      return {
        type: "HELLO",
        name:
          typeof parsed["name"] === "string" ? parsed["name"].slice(0, 32) : undefined,
      };

    case "CREATE_ROOM":
      if (typeof parsed["gameId"] !== "string") return null;
      return { type: "CREATE_ROOM", gameId: parsed["gameId"] as GameId };

    case "JOIN_ROOM":
      if (typeof parsed["code"] !== "string") return null;
      return { type: "JOIN_ROOM", code: parsed["code"].toUpperCase().slice(0, 8) };

    case "SET_NAME":
      if (typeof parsed["name"] !== "string") return null;
      return { type: "SET_NAME", name: parsed["name"].slice(0, 32) };

    case "MOVE":
      return { type: "MOVE", payload: parsed["payload"] ?? null };

    case "REMATCH_REQUEST":
      return { type: "REMATCH_REQUEST" };

    default:
      return null;
  }
}

export function serialize(msg: ServerMessage): string {
  return JSON.stringify(msg);
}
