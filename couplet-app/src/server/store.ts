// src/server/store.ts
//
// Lightweight "database" for the prototype.
//
// Everything is persisted to a single JSON file on disk (data/db.json).
// This keeps the app dependency-free and easy to run anywhere, while still
// surviving server restarts (unlike a pure in-memory Map).
//
// --- Swapping in a real database later ---
// The shape below (`DB`) is intentionally simple and maps 1:1 onto two
// tables if you outgrow the JSON file:
//
//   players (id TEXT PK, name TEXT, email TEXT, created_at TEXT)
//   rooms   (code TEXT PK, player1_id TEXT, player2_id TEXT,
//            board TEXT /* json */, turn TEXT, winner TEXT,
//            status TEXT, created_at TEXT)
//
// Any lightweight SQL database (SQLite via better-sqlite3, Turso, Postgres)
// or a KV store (Redis, Cloudflare KV) would drop in cleanly here — only
// the functions in this file would need to change, not the server
// functions in `functions.ts` that call them.

import * as fs from 'node:fs'
import * as path from 'node:path'

export type Player = {
  id: string
  name: string
  email: string
  createdAt: string
}

export type Symbol = 'X' | 'O'

export type Room = {
  code: string
  createdAt: string
  status: 'waiting' | 'active' | 'finished'
  players: {
    X: Player | null
    O: Player | null
  }
  game: {
    board: (Symbol | null)[]
    turn: Symbol
    winner: Symbol | 'draw' | null
  }
}

type DB = {
  players: Record<string, Player>
  rooms: Record<string, Room>
}

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

function emptyDb(): DB {
  return { players: {}, rooms: {} }
}

function readDb(): DB {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8')
    return JSON.parse(raw) as DB
  } catch {
    return emptyDb()
  }
}

function writeDb(db: DB) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  // Write atomically-ish: write to a temp file then rename.
  const tmp = `${DB_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8')
  fs.renameSync(tmp, DB_FILE)
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Room codes: 6 chars, uppercase, digits+letters minus ambiguous ones.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function makeRoomCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

export function createPlayer(name: string, email: string): Player {
  const db = readDb()
  const player: Player = {
    id: makeId(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  }
  db.players[player.id] = player
  writeDb(db)
  return player
}

export function createRoom(player: Player): Room {
  const db = readDb()
  let code = makeRoomCode()
  while (db.rooms[code]) code = makeRoomCode() // avoid rare collision

  const room: Room = {
    code,
    createdAt: new Date().toISOString(),
    status: 'waiting',
    players: { X: player, O: null },
    game: { board: Array(9).fill(null), turn: 'X', winner: null },
  }
  db.rooms[code] = room
  writeDb(db)
  return room
}

export function joinRoom(
  code: string,
  player: Player,
): { room: Room; symbol: Symbol } | { error: string } {
  const db = readDb()
  const room = db.rooms[code]
  if (!room) return { error: 'Room not found. Check the code and try again.' }

  if (room.players.O && room.players.O.email === player.email) {
    return { room, symbol: 'O' } // rejoining
  }
  if (room.players.X && room.players.X.email === player.email) {
    return { room, symbol: 'X' } // rejoining
  }
  if (room.players.O) {
    return { error: 'This room already has two players.' }
  }

  room.players.O = player
  room.status = 'active'
  db.rooms[code] = room
  writeDb(db)
  return { room, symbol: 'O' }
}

export function getRoom(code: string): Room | null {
  const db = readDb()
  return db.rooms[code] ?? null
}

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function checkWinner(board: (Symbol | null)[]): Symbol | 'draw' | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  if (board.every((cell) => cell !== null)) return 'draw'
  return null
}

export function makeMove(
  code: string,
  symbol: Symbol,
  index: number,
): { room: Room } | { error: string } {
  const db = readDb()
  const room = db.rooms[code]
  if (!room) return { error: 'Room not found.' }
  if (room.status !== 'active') return { error: 'Waiting for both players to join.' }
  if (room.game.winner) return { error: 'The game is already over.' }
  if (room.game.turn !== symbol) return { error: "It's not your turn." }
  if (index < 0 || index > 8 || room.game.board[index] !== null) {
    return { error: 'Invalid move.' }
  }

  room.game.board[index] = symbol
  const winner = checkWinner(room.game.board)
  room.game.winner = winner
  room.game.turn = symbol === 'X' ? 'O' : 'X'
  if (winner) room.status = 'finished'

  db.rooms[code] = room
  writeDb(db)
  return { room }
}

export function resetGame(code: string): { room: Room } | { error: string } {
  const db = readDb()
  const room = db.rooms[code]
  if (!room) return { error: 'Room not found.' }

  room.game = { board: Array(9).fill(null), turn: 'X', winner: null }
  room.status = room.players.X && room.players.O ? 'active' : 'waiting'
  db.rooms[code] = room
  writeDb(db)
  return { room }
}
