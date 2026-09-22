// src/server/functions.ts
//
// These are TanStack Start "server functions" — under the hood, TanStack
// Start compiles each of these into its own Nitro server route (an actual
// HTTP endpoint) and generates a typed client stub for the browser to call.
// That's the "Nitro server API" this app is built on: no separate Express
// server or hand-written fetch/JSON wiring needed.

import { createServerFn } from '@tanstack/react-start'
import * as store from './store'

// ---------- Registration ----------

export const registerPlayer = createServerFn({ method: 'POST' })
  .validator((d: { name: string; email: string }) => d)
  .handler(async ({ data }) => {
    if (!data.name.trim()) throw new Error('Name is required.')
    if (!/^\S+@\S+\.\S+$/.test(data.email)) throw new Error('Enter a valid email address.')
    const player = store.createPlayer(data.name, data.email)
    return { player }
  })

// ---------- Room / pairing ----------

export const createRoomFn = createServerFn({ method: 'POST' })
  .validator((d: { name: string; email: string }) => d)
  .handler(async ({ data }) => {
    if (!data.name.trim()) throw new Error('Name is required.')
    if (!/^\S+@\S+\.\S+$/.test(data.email)) throw new Error('Enter a valid email address.')
    const player = store.createPlayer(data.name, data.email)
    const room = store.createRoom(player)
    return { room, playerId: player.id, symbol: 'X' as const }
  })

export const joinRoomFn = createServerFn({ method: 'POST' })
  .validator((d: { code: string; name: string; email: string }) => d)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase()
    if (!code) throw new Error('Enter a room code.')
    if (!data.name.trim()) throw new Error('Name is required.')
    if (!/^\S+@\S+\.\S+$/.test(data.email)) throw new Error('Enter a valid email address.')

    const player = store.createPlayer(data.name, data.email)
    const result = store.joinRoom(code, player)
    if ('error' in result) throw new Error(result.error)
    return { room: result.room, playerId: player.id, symbol: result.symbol }
  })

export const getRoomState = createServerFn({ method: 'GET' })
  .validator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const room = store.getRoom(data.code.trim().toUpperCase())
    if (!room) throw new Error('Room not found.')
    return { room }
  })

// ---------- Gameplay ----------

export const makeMoveFn = createServerFn({ method: 'POST' })
  .validator((d: { code: string; symbol: 'X' | 'O'; index: number }) => d)
  .handler(async ({ data }) => {
    const result = store.makeMove(data.code.trim().toUpperCase(), data.symbol, data.index)
    if ('error' in result) throw new Error(result.error)
    return { room: result.room }
  })

export const resetGameFn = createServerFn({ method: 'POST' })
  .validator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const result = store.resetGame(data.code.trim().toUpperCase())
    if ('error' in result) throw new Error(result.error)
    return { room: result.room }
  })
