# Couplet — Tic-Tac-Toe for Long-Distance Couples

A tiny full-stack app for two people to connect and play tic-tac-toe together,
even when they're not in the same place. Built with **Vite**, **TanStack
Start** (React), and **Nitro** (the server TanStack Start runs on).

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** in one browser tab (that's "Player 1"),
and open the room link/code it gives you in another tab, another browser, or
send it to your partner on another device (that's "Player 2").

Other scripts:

```bash
npm run build   # production build (outputs to .output/)
npm run start   # run the production build
```

## How it works

### 1. Registration
The landing page (`src/routes/index.tsx`) asks for a name and email and
submits them to a **server function** — `registerPlayer` / `createRoomFn` /
`joinRoomFn` in `src/server/functions.ts`. TanStack Start compiles each
server function into its own real HTTP endpoint served by **Nitro**, so this
is a genuine server-side API route, not a client-only mock.

### 2. Room / pairing system
- Player 1 clicks **"Start a room"** → `createRoomFn` registers them and
  generates a unique 6-character room code (e.g. `WR8JY4`).
- Player 1 shares that code with their partner however they like (text,
  email, whatever).
- Player 2 opens the app, clicks **"Join with a code"**, enters the code +
  their own name/email → `joinRoomFn` pairs them into the same room as
  Player 2.
- Player 2 can also just open a shared room link (`/room/CODE`) directly —
  the room page detects they're not registered yet and shows the same join
  form inline.

Each browser remembers "who am I in this room" via `localStorage` (see
`src/lib/identity.ts`) so refreshing the page doesn't lose your seat. The
actual game state lives entirely on the server, though — that's the source
of truth both players poll.

### 3. Data storage
`src/server/store.ts` is a lightweight JSON-file "database" (`data/db.json`),
good enough for prototyping and for two people playing casually. It stores:

- `players` — id, name, email, createdAt
- `rooms` — room code, the two paired players (`X` and `O`), and the game
  state (board, whose turn, winner)

This maps cleanly onto two SQL tables if you want to upgrade later:

```sql
players (id, name, email, created_at)
rooms   (code, player1_id, player2_id, board, turn, winner, status, created_at)
```

Swapping in SQLite (`better-sqlite3`), Postgres, or a KV store (Redis,
Cloudflare KV) only requires changing the functions in `store.ts` — the
server functions in `functions.ts` and all the UI stay the same.

### 4. Gameplay
The room page (`src/routes/room.$code.tsx`) polls `getRoomState` every 1.5
seconds so both players' screens stay in sync without needing WebSockets.
Moves go through `makeMoveFn`, which validates whose turn it is server-side
(so one player can't cheat by clicking out of turn), checks for a win or
draw, and persists the result. `resetGameFn` clears the board for a rematch
without breaking the pairing.

### 5. UI/UX
Tailwind CSS (v4, via `@tailwindcss/vite`), mobile-first, with a warm
gradient "for two" theme. The board is touch-friendly, and every screen
(landing, waiting-for-partner, playing, game-over) works down to small phone
widths.

## Project structure

```
src/
  routes/
    __root.tsx        # HTML shell
    index.tsx          # landing page: register + create/join a room
    room.$code.tsx      # game room: pairing status, board, rematch
  server/
    store.ts           # JSON-file data layer (players + rooms)
    functions.ts        # Nitro-backed server functions (the "API")
  components/
    Board.tsx           # the 3x3 tic-tac-toe grid
  lib/
    identity.ts          # per-device "who am I in this room" (localStorage)
  router.tsx
  styles.css
```

## Notes for production use

- Replace the JSON file store with a real database (see above) once more
  than a handful of concurrent rooms are expected — a single JSON file isn't
  safe under heavy concurrent writes.
- Player emails are currently only used to identify who's who in a room;
  add real email delivery (e.g. to notify a partner their room is ready) if
  you want that later.
- Polling is simple and good enough for a two-player casual game; swap in
  WebSockets or Server-Sent Events if you want lower latency at scale.
