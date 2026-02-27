// ---------------------------------------------------------------------------
// Runtime validation helpers (no Zod — keep bundle tiny)
// ---------------------------------------------------------------------------
function isObject(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
export function parseClientMessage(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return null;
    }
    if (!isObject(parsed) || typeof parsed["type"] !== "string")
        return null;
    switch (parsed["type"]) {
        case "HELLO":
            return {
                type: "HELLO",
                name: typeof parsed["name"] === "string" ? parsed["name"].slice(0, 32) : undefined,
            };
        case "CREATE_ROOM":
            if (typeof parsed["gameId"] !== "string")
                return null;
            return { type: "CREATE_ROOM", gameId: parsed["gameId"] };
        case "JOIN_ROOM":
            if (typeof parsed["code"] !== "string")
                return null;
            return { type: "JOIN_ROOM", code: parsed["code"].toUpperCase().slice(0, 8) };
        case "SET_NAME":
            if (typeof parsed["name"] !== "string")
                return null;
            return { type: "SET_NAME", name: parsed["name"].slice(0, 32) };
        case "MOVE":
            return { type: "MOVE", payload: parsed["payload"] ?? null };
        case "REMATCH_REQUEST":
            return { type: "REMATCH_REQUEST" };
        default:
            return null;
    }
}
export function serialize(msg) {
    return JSON.stringify(msg);
}
//# sourceMappingURL=messages.js.map