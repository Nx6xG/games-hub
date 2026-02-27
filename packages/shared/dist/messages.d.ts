import type { GameId, PlayerRole, RoomInfo, TicTacToeState } from "./types.js";
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
    state: TicTacToeState;
};
export type ErrorMsg = {
    type: "ERROR";
    code: string;
    message: string;
};
export type ServerMessage = WelcomeMsg | RoomCreatedMsg | RoomJoinedMsg | StateMsg | ErrorMsg;
export declare function parseClientMessage(raw: string): ClientMessage | null;
export declare function serialize(msg: ServerMessage): string;
//# sourceMappingURL=messages.d.ts.map