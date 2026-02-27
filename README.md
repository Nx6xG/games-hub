# Games Hub

A production-ready multiplayer web games platform built with **Astro + React** and a **Node WebSocket** backend.

## Architecture

```
games-hub/
├── apps/
│   ├── web/          # Astro frontend + React islands (Tailwind)
│   └── ws/           # Node WebSocket server (authoritative game logic)
├── packages/
│   └── shared/       # TypeScript types shared by web + ws
├── package.json      # Root workspace + scripts
└── pnpm-workspace.yaml
```

### How it works

1. A player opens `/games/tictactoe` — the Astro page renders a **GameShell** React island.
2. GameShell opens a WebSocket to `apps/ws` and receives a client ID.
3. The player creates or joins a room by room code.
4. Once two players are seated, the server creates the game state and broadcasts it.
5. Each move is sent to the server, validated there (authoritative), and the new state is broadcast to all room members.

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm i -g pnpm`)

---

## Running locally

```bash
# 1. Install all dependencies
pnpm install

# 2. Build the shared package first (required for type resolution)
pnpm --filter shared build

# 3. Start web + ws concurrently
pnpm dev
```

- Web → http://localhost:4321
- WebSocket → ws://localhost:8080

Individual apps:

```bash
pnpm dev:web   # Astro dev server only
pnpm dev:ws    # WebSocket server only (tsx watch)
```

Production build:

```bash
pnpm build     # builds shared → ws → web in order
```

---

## Environment variables

### `apps/web/.env`

| Variable | Default | Description |
|---|---|---|
| `PUBLIC_WS_URL` | `ws://localhost:8080` | WebSocket server URL |

### `apps/ws` (optional)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | WebSocket server port |

---

## How to add a new game

Adding **Chess** (or any other game) requires four small, isolated changes:

### 1 · Add the game ID to `packages/shared/src/types.ts`

```ts
// Before
export type GameId = "tictactoe";

// After
export type GameId = "tictactoe" | "chess";
```

### 2 · Add server game logic in `apps/ws/src/games/`

Create `apps/ws/src/games/chess.ts` exporting:

```ts
export function createChessState(xId: string, oId: string): ChessState { … }
export function applyMove(state: ChessState, playerId: string, payload: unknown)
  : { ok: true; state: ChessState } | { ok: false; error: string } { … }
```

Then wire it into `apps/ws/src/rooms.ts` alongside tictactoe.

### 3 · Add a React game component in `apps/web/src/components/`

Create `ChessGame.tsx` — it receives the same `GameChildProps`:

```tsx
export default function ChessGame({ state, role, sendMove }: GameChildProps) {
  // render chess board, call sendMove({ from, to }) on moves
}
```

### 4 · Add a page and hub card

- Create `apps/web/src/pages/games/chess.astro` (copy tictactoe.astro, swap component)
- Add an entry to the `games` array in `apps/web/src/pages/games/index.astro`

That's it — no changes to GameShell or the server framework are needed.

---

## Message protocol

All messages are JSON over WebSocket.

### Client → Server

| Type | Payload | Description |
|---|---|---|
| `HELLO` | `{ name? }` | Announce connection |
| `CREATE_ROOM` | `{ gameId }` | Create a new room |
| `JOIN_ROOM` | `{ code }` | Join by room code |
| `MOVE` | `{ payload }` | Game-specific move |

### Server → Client

| Type | Payload | Description |
|---|---|---|
| `WELCOME` | `{ clientId }` | Assigned ID |
| `ROOM_CREATED` | `{ room, role }` | Room created confirmation |
| `ROOM_JOINED` | `{ room, role }` | Room joined confirmation |
| `STATE` | `{ gameId, state }` | Authoritative game state |
| `ERROR` | `{ code, message }` | Error response |

---

## TODO / future work

- **Authentication** — replace display names with real auth (JWT / OAuth). The server already has `TODO:` markers.
- **Persistence** — add a database (e.g. Postgres/SQLite) to store game history.
- **Reconnection** — allow a player to reclaim their slot after disconnect.
- **Lobby browser** — list public rooms on the hub page.
- **Spectator UI** — spectators are supported server-side; add a "watch" button to the UI.
