import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
import { parseClientMessage, serialize } from "@games-hub/shared";
import { registerClient, removeClient, setClientName, createRoom, joinRoom, handleMove, handleRematchRequest, } from "./rooms.js";
import { isRateLimited, removeBucket } from "./rateLimiter.js";
const PORT = Number(process.env["PORT"] ?? 8080);
const wss = new WebSocketServer({ port: PORT });
console.log(`[server] WebSocket server listening on ws://localhost:${PORT}`);
wss.on("connection", (ws, req) => {
    const clientId = randomUUID();
    // TODO: extract and verify auth token from req.headers when auth is added
    const name = `player-${clientId.slice(0, 6)}`;
    registerClient(clientId, ws, name);
    // Send WELCOME immediately
    ws.send(serialize({ type: "WELCOME", clientId }));
    ws.on("message", (raw) => {
        // Rate limit guard
        if (isRateLimited(clientId)) {
            ws.send(serialize({ type: "ERROR", code: "RATE_LIMITED", message: "Too many messages. Slow down." }));
            return;
        }
        // Parse and validate
        const data = raw.toString();
        if (data.length > 1024) {
            ws.send(serialize({ type: "ERROR", code: "MSG_TOO_LARGE", message: "Message exceeds size limit." }));
            return;
        }
        const msg = parseClientMessage(data);
        if (!msg) {
            ws.send(serialize({ type: "ERROR", code: "INVALID_MSG", message: "Could not parse message." }));
            return;
        }
        // Dispatch
        switch (msg.type) {
            case "HELLO":
                if (msg.name)
                    setClientName(clientId, msg.name);
                break;
            case "SET_NAME":
                setClientName(clientId, msg.name);
                break;
            case "CREATE_ROOM": {
                const result = createRoom(clientId, msg.gameId);
                if (!result.ok) {
                    ws.send(serialize({ type: "ERROR", code: "CREATE_FAILED", message: result.error }));
                    return;
                }
                ws.send(serialize({ type: "ROOM_CREATED", room: result.room, role: result.role }));
                break;
            }
            case "JOIN_ROOM": {
                const result = joinRoom(clientId, msg.code);
                if (!result.ok) {
                    ws.send(serialize({ type: "ERROR", code: "JOIN_FAILED", message: result.error }));
                    return;
                }
                ws.send(serialize({ type: "ROOM_JOINED", room: result.room, role: result.role }));
                break;
            }
            case "MOVE": {
                const result = handleMove(clientId, msg.payload);
                if (!result.ok) {
                    ws.send(serialize({ type: "ERROR", code: "MOVE_FAILED", message: result.error }));
                }
                break;
            }
            case "REMATCH_REQUEST": {
                const result = handleRematchRequest(clientId);
                if (!result.ok) {
                    ws.send(serialize({ type: "ERROR", code: "REMATCH_FAILED", message: result.error }));
                }
                break;
            }
        }
    });
    ws.on("close", () => {
        removeClient(clientId);
        removeBucket(clientId);
    });
    ws.on("error", (err) => {
        console.error(`[server] error from ${clientId}:`, err.message);
    });
});
//# sourceMappingURL=index.js.map